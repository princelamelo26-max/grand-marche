'use strict';
const crypto = require('node:crypto');

class HttpError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code || null; }
}
const bad = (m, c) => new HttpError(400, m, c);

/** Numéro congolais national à 9 chiffres (ex 061234567) ou null. */
function normPhone(p) {
  let d = String(p == null ? '' : p).replace(/\D/g, '');
  if (d.startsWith('242') && d.length >= 11) d = d.slice(3);
  if (d.length === 8) d = '0' + d;
  return /^0\d{8}$/.test(d) ? d : null;
}
const intlPhone = (national) => '242' + national;

const CITIES = ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Ouesso', 'Kintélé', 'Oyo', 'Bétou', 'Gamboma', 'Owando', 'Madingou', 'Impfondo', 'Makoua', 'Sibiti'];
function normCity(v) {
  const s = String(v == null ? '' : v).trim();
  const hit = CITIES.find((c) => c.toLowerCase() === s.toLowerCase());
  return hit || null;
}

const uuid = () => crypto.randomUUID();
const now = () => Date.now();

function str(v, min, max, field) {
  if (typeof v !== 'string') throw bad(`${field} invalide`);
  const s = v.trim();
  if (s.length < min || s.length > max) throw bad(`${field} : entre ${min} et ${max} caractères`);
  return s;
}
function optStr(v, max) {
  if (v == null || v === '') return null;
  return String(v).trim().slice(0, max);
}
function posInt(v, field, max = 1e9) {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0 || n > max) throw bad(`${field} invalide`);
  return n;
}

/** Limiteur de débit en mémoire (fenêtre glissante simple). */
function rateLimiter(limit, windowMs) {
  const hits = new Map();
  return (key) => {
    const t = Date.now();
    const arr = (hits.get(key) || []).filter((x) => t - x < windowMs);
    arr.push(t); hits.set(key, arr);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || t - v[v.length - 1] > windowMs) hits.delete(k);
    return arr.length <= limit;
  };
}
module.exports = { HttpError, bad, normPhone, intlPhone, uuid, now, str, optStr, posInt, rateLimiter, CITIES, normCity };
