'use strict';
/**
 * Fournisseurs de paiement Mobile Money.
 *  - mock    : simulateur pour tests/développement (aucun argent réel)
 *  - pawapay : vrai Mobile Money (MTN MoMo Congo + Airtel Money Congo) via l'API pawaPay v2
 *
 * Interface commune :
 *   deposit({id, amount, phone, operator, message}) -> {accepted, failure?}
 *   depositStatus(id)                               -> {status: PENDING|COMPLETED|FAILED, txn?, failure?}
 *   payout(...)  /  payoutStatus(id)                (mêmes formes)
 */
const { intlPhone } = require('./util');

const OPERATORS = { mtn: 'MTN_MOMO_COG', airtel: 'AIRTEL_COG' };

/* ---------- MOCK ---------- */
function mockProvider(opts = {}) {
  const delay = opts.delayMs != null ? opts.delayMs : 1500;
  const deposits = new Map(), payouts = new Map();
  const outcome = (rec) => {
    if (Date.now() < rec.due) return { status: 'PENDING' };
    return rec.fail ? { status: 'FAILED', failure: 'PAYER_LIMIT_REACHED' } : { status: 'COMPLETED', txn: 'MOCK-' + rec.id.slice(0, 8) };
  };
  return {
    name: 'mock',
    async deposit(p) {
      deposits.set(p.id, { id: p.id, due: Date.now() + delay, fail: p.phone.endsWith('0000') });
      return { accepted: true };
    },
    async depositStatus(id) { const r = deposits.get(id); return r ? outcome(r) : { status: 'FAILED', failure: 'NOT_FOUND' }; },
    async payout(p) {
      payouts.set(p.id, { id: p.id, due: Date.now() + Math.min(delay, 500), fail: p.phone.endsWith('0000') });
      return { accepted: true };
    },
    async payoutStatus(id) { const r = payouts.get(id); return r ? outcome(r) : { status: 'FAILED', failure: 'NOT_FOUND' }; },
    _deposits: deposits
  };
}

/* ---------- PAWAPAY (v2) ---------- */
function pawapayProvider({ token, baseUrl }) {
  if (!token) throw new Error('PAWAPAY_TOKEN manquant.');
  const base = String(baseUrl || 'https://api.sandbox.pawapay.io').replace(/\/$/, '');
  async function call(method, path, body) {
    const r = await fetch(base + path, {
      method,
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000)
    });
    const text = await r.text();
    let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
    return { http: r.status, json };
  }
  const mapStatus = (s) => (s === 'COMPLETED' ? 'COMPLETED' : s === 'FAILED' || s === 'REJECTED' ? 'FAILED' : 'PENDING');
  const failureOf = (j) => (j && (j.failureReason && (j.failureReason.failureCode || j.failureReason.failureMessage))) || (j && j.rejectionReason && j.rejectionReason.rejectionCode) || null;

  async function initiate(kind, p) {
    const provider = OPERATORS[p.operator];
    if (!provider) throw new Error('Opérateur inconnu');
    const isDeposit = kind === 'deposits';
    const party = { type: 'MMO', accountDetails: { phoneNumber: intlPhone(p.phone), provider } };
    const body = {
      [isDeposit ? 'depositId' : 'payoutId']: p.id,
      [isDeposit ? 'payer' : 'recipient']: party,
      amount: String(p.amount), currency: 'XAF',
      clientReferenceId: p.id.slice(0, 36),
      customerMessage: String(p.message || 'Grand Marche').replace(/[^A-Za-z0-9 ]/g, '').slice(0, 22).padEnd(4, ' ')
    };
    const r = await call('POST', '/v2/' + kind, body);
    const st = r.json && r.json.status;
    if (st === 'ACCEPTED' || st === 'DUPLICATE_IGNORED') return { accepted: true };
    return { accepted: false, failure: failureOf(r.json) || ('HTTP_' + r.http) };
  }
  async function status(kind, id) {
    const r = await call('GET', '/v2/' + kind + '/' + encodeURIComponent(id));
    const j = r.json || {};
    // Réponse de vérification : { status: "FOUND"|"NOT_FOUND", data: {...} }
    if (j.status === 'NOT_FOUND') return { status: 'PENDING', notFound: true };
    const d = j.data || j;
    return { status: mapStatus(d.status), txn: d.providerTransactionId || null, failure: failureOf(d) };
  }
  return {
    name: 'pawapay',
    deposit: (p) => initiate('deposits', p),
    depositStatus: (id) => status('deposits', id),
    payout: (p) => initiate('payouts', p),
    payoutStatus: (id) => status('payouts', id)
  };
}

function createProvider(cfg) {
  if (cfg.PAYMENT_PROVIDER === 'pawapay') return pawapayProvider({ token: cfg.PAWAPAY_TOKEN, baseUrl: cfg.PAWAPAY_BASE_URL });
  return mockProvider({ delayMs: cfg.MOCK_DELAY_MS });
}
module.exports = { createProvider, mockProvider, pawapayProvider, OPERATORS };
