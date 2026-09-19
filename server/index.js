'use strict';

require('dotenv').config();

const fs = require('fs');
const https = require('https');
const express = require('express');
const cors = require('cors');
const session = require('express-session');

const { pool, checkDatabaseConnection } = require('./config/db');
const sessionStoreModule = require('./config/sessionStore');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const { notFoundHandler, errorHandler } = require('./middleware/errors');

const CERTIFICATE_PATH = '/home/arx-app/backends/certs/certificate.crt';
const PRIVATE_KEY_PATH = '/home/arx-app/backends/certs/private.key';
const DEFAULT_BACKEND_PORT = 5096;
const SHUTDOWN_TIMEOUT_MS = 10000;
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function resolveSessionStore(storeModule) {
  const isStore = (value) =>
    value &&
    typeof value.get === 'function' &&
    typeof value.set === 'function' &&
    typeof value.destroy === 'function';

  if (isStore(storeModule)) {
    return storeModule;
  }

  const candidate =
    storeModule?.sessionStore ||
    storeModule?.default ||
    storeModule?.MySQLSessionStore ||
    storeModule?.SessionStore ||
    storeModule;

  if (isStore(candidate)) {
    return candidate;
  }

  if (typeof candidate === 'function') {
    const store = new candidate();

    if (isStore(store)) {
      return store;
    }
  }

  throw new Error('The configured session store is invalid.');
}

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  let parsedOrigin;

  try {
    parsedOrigin = new URL(origin);
  } catch {
    return false;
  }

  const hostname = parsedOrigin.hostname.toLowerCase();
  const isGeoDropsOrigin =
    parsedOrigin.protocol === 'https:' &&
    (hostname === 'geo-drops.com' || hostname.endsWith('.geo-drops.com'));

  if (isGeoDropsOrigin) {
    return true;
  }

  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  const isLocalhost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]';

  return (
    isLocalhost &&
    (parsedOrigin.protocol === 'http:' || parsedOrigin.protocol === 'https:')
  );
}

function createCorsOptions() {
  return {
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Accept', 'Content-Type'],
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      const error = new Error('Origin is not permitted by the CORS policy.');
      error.status = 403;
      error.statusCode = 403;
      callback(error);
    },
  };
}

function createApp(sessionStore, sessionSecret) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(cors(createCorsOptions()));
  app.use(express.json({ limit: '1mb', strict: true }));

  app.use(
    session({
      name: 'musicdesigner.sid',
      secret: sessionSecret,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: SESSION_MAX_AGE_MS,
        path: '/',
      },
    })
  );

  app.use(healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

function getBackendPort() {
  const rawPort = process.env.BACKEND_PORT || String(DEFAULT_BACKEND_PORT);
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('BACKEND_PORT must be an integer between 1 and 65535.');
  }

  return port;
}

async function startServer() {
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret || !sessionSecret.trim()) {
    throw new Error('SESSION_SECRET must be configured before starting the API.');
  }

  const databaseConnected = await checkDatabaseConnection();

  if (databaseConnected === false) {
    throw new Error('Unable to verify the MySQL database connection.');
  }

  const sessionStore = resolveSessionStore(sessionStoreModule);
  const app = createApp(sessionStore, sessionSecret);
  const port = getBackendPort();

  const tlsOptions = {
    cert: fs.readFileSync(CERTIFICATE_PATH),
    key: fs.readFileSync(PRIVATE_KEY_PATH),
  };

  const server = https.createServer(tlsOptions, app);

  await new Promise((resolve, reject) => {
    const handleStartupError = (error) => {
      reject(error);
    };

    server.once('error', handleStartupError);
    server.listen(port, () => {
      server.removeListener('error', handleStartupError);
      resolve();
    });
  });

  console.log(`musicdesigner HTTPS API listening on port ${port}`);

  let shuttingDown = false;
  let finalized = false;

  const finalize = async (exitCode) => {
    if (finalized) {
      return;
    }

    finalized = true;

    try {
      await pool.end();
    } catch (error) {
      console.error(`Failed to close the database pool: ${error.message}`);
      exitCode = 1;
    }

    process.exit(exitCode);
  };

  const shutdown = (signal, exitCode = 0) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.log(`${signal} received; shutting down gracefully.`);

    const forceShutdownTimer = setTimeout(() => {
      console.error('Graceful shutdown timed out; closing active connections.');

      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }

      void finalize(1);
    }, SHUTDOWN_TIMEOUT_MS);

    forceShutdownTimer.unref();

    if (typeof server.closeIdleConnections === 'function') {
      server.closeIdleConnections();
    }

    server.close((error) => {
      clearTimeout(forceShutdownTimer);

      if (error) {
        console.error(`HTTPS server shutdown failed: ${error.message}`);
        void finalize(1);
        return;
      }

      void finalize(exitCode);
    });
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));

  server.on('error', (error) => {
    console.error(`HTTPS server error: ${error.message}`);
    shutdown('HTTPS server error', 1);
  });
}

startServer().catch(async (error) => {
  console.error(`Failed to start the musicdesigner API: ${error.message}`);

  try {
    await pool.end();
  } catch (poolError) {
    console.error(`Failed to close the database pool: ${poolError.message}`);
  }

  process.exit(1);
});