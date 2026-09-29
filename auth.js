'use strict';
const crypto = require('node:crypto');

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw, salt, 64);
  return salt.toString('hex') + ':' + h.toString('hex');
}
function verifyPassword(pw, stored) {
  try {
    const [s, h] = String(stored).split(':');
    const calc = crypto.scryptSync(pw, Buffer.from(s, 'hex'), 64);
    return crypto.timingSafeEqual(calc, Buffer.from(h, 'hex'));
  } catch { return false; }
}
const b64 = (b) => Buffer.from(b).toString('base64url');

function makeTokens(secret) {
  if (!secret || secret.length < 32) throw new Error('TOKEN_SECRET manquant ou trop court (32 caractères minimum).');
  const sign = (data) => crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return {
    issue(uid, ttlMs = 30 * 24 * 3600 * 1000) {
      const body = b64(JSON.stringify({ uid, exp: Date.now() + ttlMs }));
      return body + '.' + sign(body);
    },
    verify(token) {
      if (typeof token !== 'string' || !token.includes('.')) return null;
      const [body, sig] = token.split('.');
      const good = sign(body);
      if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
      try {
        const p = JSON.parse(Buffer.from(body, 'base64url').toString());
        return p.exp > Date.now() ? p : null;
      } catch { return null; }
    }
  };
}
module.exports = { hashPassword, verifyPassword, makeTokens };
