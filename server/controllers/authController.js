const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

const BCRYPT_ROUNDS = 12;
const FIRST_USER_LOCK = `musicdesigner:${process.env.DB_NAME || 'database'}:first-user`.slice(0, 64);
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('invalid-credential-timing-value', BCRYPT_ROUNDS);

function normalizeEmail(value) {
  return typeof value === 'string'
    ? value.normalize('NFKC').trim().toLowerCase()
    : '';
}

function normalizeDisplayName(value) {
  return typeof value === 'string'
    ? value.normalize('NFKC').replace(/\s+/g, ' ').trim()
    : '';
}

function validateEmail(email) {
  if (!email) {
    return 'Email is required.';
  }

  if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address.';
  }

  return null;
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }

  if (Buffer.byteLength(password, 'utf8') > 72) {
    return 'Password must not exceed 72 bytes.';
  }

  return null;
}

function toSafeUser(user) {
  return {
    id: Number(user.id),
    displayName: user.displayName ?? user.display_name,
    email: user.email,
    role: user.role
  };
}

function establishSession(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        reject(regenerateError);
        return;
      }

      req.session.user = toSafeUser(user);
      req.session.save((saveError) => {
        if (saveError) {
          reject(saveError);
          return;
        }

        resolve();
      });
    });
  });
}

async function signup(req, res, next) {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const displayName = normalizeDisplayName(body.displayName);
  const email = normalizeEmail(body.email);
  const password = body.password;

  if (displayName.length < 2 || displayName.length > 120) {
    return res.status(400).json({
      error: 'Display name must be between 2 and 120 characters.'
    });
  }

  const emailError = validateEmail(email);
  if (emailError) {
    return res.status(400).json({ error: emailError });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  let connection;
  let transactionStarted = false;
  let lockAcquired = false;
  let user;

  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    connection = await pool.getConnection();

    const [lockRows] = await connection.query(
      'SELECT GET_LOCK(?, 10) AS acquired',
      [FIRST_USER_LOCK]
    );

    lockAcquired = Number(lockRows[0]?.acquired) === 1;

    if (!lockAcquired) {
      return res.status(503).json({
        error: 'Account registration is temporarily busy. Please try again.'
      });
    }

    await connection.beginTransaction();
    transactionStarted = true;

    const [countRows] = await connection.query(
      'SELECT COUNT(*) AS userCount FROM `users`'
    );

    const role = Number(countRows[0].userCount) === 0 ? 'admin' : 'member';

    const [result] = await connection.execute(
      `INSERT INTO \`users\`
        (\`display_name\`, \`email\`, \`password_hash\`, \`role\`)
       VALUES (?, ?, ?, ?)`,
      [displayName, email, passwordHash, role]
    );

    await connection.commit();
    transactionStarted = false;

    user = {
      id: result.insertId,
      displayName,
      email,
      role
    };
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch {
        // Preserve the original database error.
      }
    }

    if (error && (error.code === 'ER_DUP_ENTRY' || error.errno === 1062)) {
      return res.status(409).json({
        error: 'An account with that email address already exists.'
      });
    }

    return next(error);
  } finally {
    if (connection) {
      if (lockAcquired) {
        try {
          await connection.query('SELECT RELEASE_LOCK(?)', [FIRST_USER_LOCK]);
        } catch {
          // MySQL also releases advisory locks when the connection closes.
        }
      }

      connection.release();
    }
  }

  try {
    await establishSession(req, user);
    return res.status(201).json({ user: toSafeUser(user) });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const email = normalizeEmail(body.email);
  const password = body.password;

  const emailError = validateEmail(email);
  if (emailError) {
    return res.status(400).json({ error: emailError });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT
         \`id\`,
         \`display_name\`,
         \`email\`,
         \`password_hash\`,
         \`role\`
       FROM \`users\`
       WHERE \`email\` = ?
       LIMIT 1`,
      [email]
    );

    const account = rows[0];
    const passwordMatches = await bcrypt.compare(
      password,
      account ? account.password_hash : DUMMY_PASSWORD_HASH
    );

    if (!account || !passwordMatches) {
      return res.status(401).json({
        error: 'Invalid email address or password.'
      });
    }

    const user = toSafeUser(account);
    await establishSession(req, user);

    return res.json({ user });
  } catch (error) {
    return next(error);
  }
}

function logout(req, res, next) {
  if (!req.session) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const cookieOptions = {
    path: req.session.cookie?.path || '/'
  };

  if (req.session.cookie?.domain) {
    cookieOptions.domain = req.session.cookie.domain;
  }

  if (typeof req.session.cookie?.secure === 'boolean') {
    cookieOptions.secure = req.session.cookie.secure;
  }

  if (req.session.cookie?.sameSite) {
    cookieOptions.sameSite = req.session.cookie.sameSite;
  }

  req.session.destroy((error) => {
    if (error) {
      next(error);
      return;
    }

    res.clearCookie('connect.sid', cookieOptions);
    res.json({ message: 'Logged out successfully.' });
  });
}

function me(req, res) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  return res.json({ user: toSafeUser(req.session.user) });
}

module.exports = {
  signup,
  login,
  logout,
  me
};