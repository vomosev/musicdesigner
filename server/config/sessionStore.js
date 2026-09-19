'use strict';

const session = require('express-session');
const { pool } = require('./db');

const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

class MySQLSessionStore extends session.Store {
  constructor(databasePool = pool) {
    super();
    this.pool = databasePool;
  }

  get(sid, callback) {
    this._get(sid).then(
      (storedSession) => callback(null, storedSession),
      (error) => callback(error)
    );
  }

  set(sid, sessionData, callback) {
    this._set(sid, sessionData).then(
      () => callback(null),
      (error) => callback(error)
    );
  }

  destroy(sid, callback) {
    this._destroy(sid).then(
      () => callback(null),
      (error) => callback(error)
    );
  }

  touch(sid, sessionData, callback) {
    this._touch(sid, sessionData).then(
      () => callback(null),
      (error) => callback(error)
    );
  }

  async _get(sid) {
    await this._removeExpiredSessions();

    const [rows] = await this.pool.execute(
      `SELECT session_data
       FROM sessions
       WHERE session_id = ? AND expires_at > CURRENT_TIMESTAMP
       LIMIT 1`,
      [sid]
    );

    if (rows.length === 0) {
      return null;
    }

    const rawData = rows[0].session_data;

    if (rawData && typeof rawData === 'object' && !Buffer.isBuffer(rawData)) {
      return rawData;
    }

    const serializedData = Buffer.isBuffer(rawData)
      ? rawData.toString('utf8')
      : rawData;

    const parsedSession = JSON.parse(serializedData);

    if (!parsedSession || typeof parsedSession !== 'object') {
      throw new TypeError('Stored session data is invalid.');
    }

    return parsedSession;
  }

  async _set(sid, sessionData) {
    const expiresAt = this._getExpirationDate(sessionData);

    await this._removeExpiredSessions();

    if (expiresAt.getTime() <= Date.now()) {
      await this._deleteSession(sid);
      return;
    }

    const serializedData = this._serializeSession(sessionData);

    await this.pool.execute(
      `INSERT INTO sessions (session_id, session_data, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         session_data = VALUES(session_data),
         expires_at = VALUES(expires_at)`,
      [sid, serializedData, expiresAt]
    );
  }

  async _destroy(sid) {
    await this._removeExpiredSessions();
    await this._deleteSession(sid);
  }

  async _touch(sid, sessionData) {
    const expiresAt = this._getExpirationDate(sessionData);

    await this._removeExpiredSessions();

    if (expiresAt.getTime() <= Date.now()) {
      await this._deleteSession(sid);
      return;
    }

    const serializedData = this._serializeSession(sessionData);

    await this.pool.execute(
      `UPDATE sessions
       SET session_data = ?, expires_at = ?
       WHERE session_id = ?`,
      [serializedData, expiresAt, sid]
    );
  }

  async _deleteSession(sid) {
    await this.pool.execute(
      'DELETE FROM sessions WHERE session_id = ?',
      [sid]
    );
  }

  async _removeExpiredSessions() {
    await this.pool.execute(
      'DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP'
    );
  }

  _serializeSession(sessionData) {
    const serializedData = JSON.stringify(sessionData);

    if (typeof serializedData !== 'string') {
      throw new TypeError('Session data could not be serialized.');
    }

    return serializedData;
  }

  _getExpirationDate(sessionData) {
    const cookie = sessionData && sessionData.cookie
      ? sessionData.cookie
      : {};

    if (cookie.expires) {
      const expiresAt = new Date(cookie.expires);

      if (!Number.isNaN(expiresAt.getTime())) {
        return expiresAt;
      }
    }

    const maxAge = Number(
      cookie.maxAge !== undefined && cookie.maxAge !== null
        ? cookie.maxAge
        : cookie.originalMaxAge
    );

    if (Number.isFinite(maxAge) && maxAge >= 0) {
      return new Date(Date.now() + maxAge);
    }

    return new Date(Date.now() + DEFAULT_SESSION_TTL_MS);
  }
}

const sessionStore = new MySQLSessionStore();

module.exports = sessionStore;
module.exports.default = sessionStore;
module.exports.MySQLSessionStore = MySQLSessionStore;
module.exports.sessionStore = sessionStore;