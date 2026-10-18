'use strict';
/**
 * Logique métier de Grand Marché : boutiques, produits, commandes (séquestre),
 * paiements, retraits, revenus de la plateforme.
 * Toutes les fonctions qui touchent la base de données sont asynchrones (compatible
 * aussi bien avec le moteur local qu'avec une base Turso distante — voir db.js).
 */
const { tx, bindQueries } = require('./db');
const { HttpError, bad, uuid, now, str, optStr, posInt, normCity } = require('./util');

const CATEGORIES = ['Alimentation locale', 'Électronique', 'Mode et Vêtements', 'Maison et Déco', 'Beauté et Soins', 'Sport et Jeux', 'Artisanat', 'Véhicules', 'Immobilier', 'Services', 'Animaux', 'Bébé et Enfant', 'Livres et Papeterie', 'Jeux vidéo', 'Santé et Bien-être', 'Agriculture', 'Restauration', 'Autre'];
const MAX_IMG = 450 * 1024; // taille max d'une image (URL ou data URI)
const PENDING_ORDER_TTL = 30 * 60 * 1000;
const AUTO_CONFIRM_MS = 72 * 3600 * 1000;

function createCore(db, provider, cfg, log = console) {
  const { get, run, all } = bindQueries(db);
  const b = (v) => (v ? 1 : 0);

  /* ---------- Vues ---------- */
  const shopView = (s, mine) => s && ({
    id: s.id, name: s.name, category: s.category, address: s.address, city: s.city, phone: s.phone,
    description: s.description, logo: s.logo, lat: s.lat, lng: s.lng,
    isCertified: !!s.is_certified,
    rating: s.rating_count ? Math.round((s.rating_sum / s.rating_count) * 10) / 10 : 0,
    reviewsCount: s.rating_count,
    critDelivery: s.crit_delivery, critQuality: s.crit_quality, critBehavior: s.crit_behavior,
    createdAt: s.created_at,
    ...(mine ? { balance: s.balance, pending: s.pending } : {})
  });
  const productView = (p) => ({
    id: p.id, shopId: p.shop_id, name: p.name, price: p.price, stock: p.stock, category: p.category,
    description: p.description, images: JSON.parse(p.images || '[]'),
    hasDelivery: !!p.has_delivery, hasWarranty: !!p.has_warranty, warrantyText: p.warranty_text || '',
    boostedUntil: p.boosted_until, createdAt: p.created_at
  });
  async function orderView(o, q) {
    const Q = q || { get, all };
    const items = await Q.all('SELECT product_id AS productId, name, price, qty FROM order_items WHERE order_id=?', o.id);
    const shop = await Q.get('SELECT name, phone FROM shops WHERE id=?', o.shop_id);
    const buyer = await Q.get('SELECT name, phone FROM users WHERE id=?', o.buyer_id);
    return {
      id: o.id, shopId: o.shop_id, shopName: shop && shop.name, shopPhone: shop && shop.phone,
      buyerId: o.buyer_id, buyerName: buyer && buyer.name, buyerPhone: buyer && buyer.phone,
      total: o.total, status: o.status, deliveryMode: o.delivery_mode, address: o.address, note: o.note,
      createdAt: o.created_at, updatedAt: o.updated_at, deliveredAt: o.delivered_at, reviewed: !!o.reviewed, items
    };
  }

  const shopOf = (user) => get('SELECT * FROM shops WHERE owner_id=?', user.id);
  async function requireShop(user) {
    const s = await shopOf(user);
    if (!s) throw new HttpError(403, 'Vous n\'avez pas de boutique.');
    return s;
  }

  /* ---------- Boutiques & produits ---------- */
  function cleanImages(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 6).map((x) => String(x)).filter((x) => {
      if (x.length > MAX_IMG) throw bad('Image trop lourde (max 450 Ko après compression).');
      return /^(https:\/\/|data:image\/(png|jpe?g|webp);base64,)/i.test(x);
    });
  }
  async function createShop(user, d) {
    if (await shopOf(user)) throw new HttpError(409, 'Vous avez déjà une boutique.');
    const name = str(d.name, 2, 60, 'Nom de la boutique');
    const category = CATEGORIES.includes(d.category) ? d.category : 'Autre';
    const logo = d.logo ? cleanImages([d.logo])[0] || null : null;
    const city = normCity(d.city) || user.city || null;
    const r = await run(`INSERT INTO shops(owner_id,name,category,address,city,phone,description,logo,lat,lng,created_at)
                   VALUES(?,?,?,?,?,?,?,?,?,?,?)`, user.id, name, category, optStr(d.address, 160), city, user.phone,
      optStr(d.description, 500), logo, Number.isFinite(+d.lat) && d.lat != null ? +d.lat : null,
      Number.isFinite(+d.lng) && d.lng != null ? +d.lng : null, now());
    return shopView(await get('SELECT * FROM shops WHERE id=?', r.lastInsertRowid), true);
  }
  async function updateShop(user, d) {
    const s = await requireShop(user);
    const name = d.name != null ? str(d.name, 2, 60, 'Nom de la boutique') : s.name;
    const category = d.category != null && CATEGORIES.includes(d.category) ? d.category : s.category;
    const logo = d.logo !== undefined ? (d.logo ? cleanImages([d.logo])[0] || null : null) : s.logo;
    const newCity = d.city !== undefined ? (normCity(d.city) || s.city) : s.city;
    await run('UPDATE shops SET name=?,category=?,address=?,city=?,description=?,logo=?,lat=?,lng=? WHERE id=?',
      name, category, d.address !== undefined ? optStr(d.address, 160) : s.address, newCity,
      d.description !== undefined ? optStr(d.description, 500) : s.description, logo,
      d.lat !== undefined && Number.isFinite(+d.lat) && d.lat !== null ? +d.lat : s.lat,
      d.lng !== undefined && Number.isFinite(+d.lng) && d.lng !== null ? +d.lng : s.lng, s.id);
    return shopView(await get('SELECT * FROM shops WHERE id=?', s.id), true);
  }
  function productFields(d, cur) {
    const c = cur || {};
    const name = d.name != null ? str(d.name, 2, 80, 'Nom du produit') : c.name;
    if (!name) throw bad('Nom du produit requis');
    const price = d.price != null ? posInt(d.price, 'Prix', 1e8) : c.price;
    if (!price) throw bad('Prix requis');
    const stock = d.stock != null ? (Number.isInteger(+d.stock) && +d.stock >= 0 && +d.stock <= 1e6 ? +d.stock : (() => { throw bad('Stock invalide'); })()) : (c.stock != null ? c.stock : 0);
    const images = d.images != null ? cleanImages(d.images) : JSON.parse(c.images || '[]');
    return {
      name, price, stock, images: JSON.stringify(images),
      category: d.category != null ? (CATEGORIES.includes(d.category) ? d.category : 'Autre') : (c.category ?? null),
      description: d.description != null ? optStr(d.description, 1000) : (c.description ?? null),
      hasDelivery: d.hasDelivery != null ? b(d.hasDelivery) : (c.has_delivery != null ? c.has_delivery : 1),
      hasWarranty: d.hasWarranty != null ? b(d.hasWarranty) : (c.has_warranty || 0),
      warrantyText: d.warrantyText != null ? optStr(d.warrantyText, 80) : (c.warranty_text ?? null)
    };
  }
  async function createProduct(user, d) {
    const s = await requireShop(user);
    if ((await get('SELECT COUNT(*) n FROM products WHERE shop_id=? AND active=1', s.id)).n >= 300) throw bad('Limite de 300 produits atteinte.');
    const f = productFields(d);
    const r = await run(`INSERT INTO products(shop_id,name,price,stock,category,description,images,has_delivery,has_warranty,warranty_text,created_at)
                   VALUES(?,?,?,?,?,?,?,?,?,?,?)`, s.id, f.name, f.price, f.stock, f.category || s.category, f.description, f.images,
      f.hasDelivery, f.hasWarranty, f.warrantyText, now());
    return productView(await get('SELECT * FROM products WHERE id=?', r.lastInsertRowid));
  }
  async function ownProduct(user, id) {
    const s = await requireShop(user);
    const p = await get('SELECT * FROM products WHERE id=? AND shop_id=? AND active=1', id, s.id);
    if (!p) throw new HttpError(404, 'Produit introuvable.');
    return p;
  }
  async function updateProduct(user, id, d) {
    const p = await ownProduct(user, id); const f = productFields(d, p);
    await run(`UPDATE products SET name=?,price=?,stock=?,category=?,description=?,images=?,has_delivery=?,has_warranty=?,warranty_text=? WHERE id=?`,
      f.name, f.price, f.stock, f.category, f.description, f.images, f.hasDelivery, f.hasWarranty, f.warrantyText, p.id);
    return productView(await get('SELECT * FROM products WHERE id=?', p.id));
  }
  async function deleteProduct(user, id) { const p = await ownProduct(user, id); await run('UPDATE products SET active=0 WHERE id=?', p.id); return { ok: true }; }

  async function catalog() {
    const t = now();
    const shops = await all('SELECT * FROM shops ORDER BY id');
    const prods = await all('SELECT * FROM products WHERE active=1 ORDER BY (boosted_until > ?) DESC, created_at DESC', t);
    const by = new Map();
    for (const p of prods) { if (!by.has(p.shop_id)) by.set(p.shop_id, []); by.get(p.shop_id).push(productView(p)); }
    return shops.map((s) => ({ ...shopView(s), products: by.get(s.id) || [] }));
  }

  /* ---------- Revenus plateforme ---------- */
  const addRevenue = (kind, amount, ref, q) => (q ? q.run : run)('INSERT INTO revenue(kind,amount,ref,created_at) VALUES(?,?,?,?)', kind, amount, ref || null, now());

  /* ---------- Paiements (encaissement) ---------- */
  async function startPayment(user, { purpose, refId, operator, phone }) {
    let amount, ref = String(refId == null ? '' : refId), msg;
    if (purpose === 'boost') {
      const p = await ownProduct(user, Number(refId));
      amount = cfg.BOOST_PRICE; msg = 'Boost ' + p.name;
    } else if (purpose === 'certification') {
      const s = await requireShop(user);
      if (s.is_certified) throw new HttpError(409, 'Boutique déjà certifiée.');
      amount = cfg.CERTIFICATION_PRICE; ref = String(s.id); msg = 'Certification';
    } else if (purpose === 'order') {
      const o = await get('SELECT * FROM orders WHERE id=?', ref);
      if (!o || o.buyer_id !== user.id) throw new HttpError(404, 'Commande introuvable.');
      if (o.status !== 'pending_payment') throw new HttpError(409, 'Cette commande n\'est plus payable.');
      amount = o.total; msg = 'Commande ' + o.id.slice(0, 10);
    } else throw bad('Type de paiement inconnu');

    const existing = await get(`SELECT * FROM payments WHERE user_id=? AND purpose=? AND ref_id=? AND status='PENDING' AND created_at>?`, user.id, purpose, ref, now() - 3 * 60 * 1000);
    if (existing) return existing;

    const id = uuid();
    await run(`INSERT INTO payments(id,user_id,purpose,ref_id,amount,provider,phone,status,created_at) VALUES(?,?,?,?,?,?,?,'PENDING',?)`,
      id, user.id, purpose, ref, amount, operator, phone, now());
    let r;
    try { r = await provider.deposit({ id, amount, phone, operator, message: msg }); }
    catch (e) { log.error('deposit error', e.message); r = { accepted: false, failure: 'PROVIDER_UNREACHABLE' }; }
    if (!r.accepted) await settlePayment(id, 'FAILED', null, r.failure);
    return get('SELECT * FROM payments WHERE id=?', id);
  }

  /** Idempotent : ne s'applique qu'une seule fois par paiement. */
  async function settlePayment(id, status, txn, failure) {
    await tx(db, async (q) => {
      const p = await q.get('SELECT * FROM payments WHERE id=?', id);
      if (!p) return;
      const upd = await q.run(`UPDATE payments SET status=?,completed_at=?,provider_txn=?,failure=? WHERE id=? AND status='PENDING'`, status, now(), txn || null, failure || null, id);
      if (upd.changes === 0 || status !== 'COMPLETED') return;
      let refund = null;
      if (p.purpose === 'boost') {
        const pr = await q.get('SELECT * FROM products WHERE id=?', Number(p.ref_id));
        if (pr) {
          const start = Math.max(now(), pr.boosted_until);
          await q.run('UPDATE products SET boosted_until=? WHERE id=?', start + cfg.BOOST_DAYS * 86400000, pr.id);
          await addRevenue('boost', p.amount, p.id, q);
        } else refund = p;
      } else if (p.purpose === 'certification') {
        const s = await q.get('SELECT * FROM shops WHERE id=?', Number(p.ref_id));
        if (s && !s.is_certified) { await q.run('UPDATE shops SET is_certified=1, certified_at=? WHERE id=?', now(), s.id); await addRevenue('certification', p.amount, p.id, q); }
        else refund = p;
      } else if (p.purpose === 'order') {
        const o = await q.get('SELECT * FROM orders WHERE id=?', p.ref_id);
        if (o && o.status === 'pending_payment') {
          await q.run(`UPDATE orders SET status='paid', updated_at=? WHERE id=?`, now(), o.id);
          await q.run('UPDATE shops SET pending=pending+? WHERE id=?', o.total, o.shop_id);
        } else refund = p; // payé après expiration/annulation -> remboursement automatique
      }
      if (refund) await queuePayout({ kind: 'refund', userId: p.user_id, orderId: p.purpose === 'order' ? p.ref_id : null, amount: p.amount, fee: 0, operator: p.provider, phone: p.phone }, q);
    });
    kick();
    return get('SELECT * FROM payments WHERE id=?', id);
  }

  /* ---------- Décaissements (retraits, remboursements) ---------- */
  async function queuePayout({ kind, shopId, userId, orderId, amount, fee, operator, phone }, q) {
    const Q = q || { run };
    const id = uuid();
    await Q.run(`INSERT INTO payouts(id,kind,shop_id,user_id,order_id,amount,fee,net,provider,phone,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,'QUEUED',?)`,
      id, kind, shopId || null, userId || null, orderId || null, amount, fee || 0, amount - (fee || 0), operator, phone, now());
    return id;
  }
  let kicking = false;
  function kick() { if (kicking) return; kicking = true; setImmediate(async () => { try { await dispatchQueued(); } finally { kicking = false; } }); }
  async function dispatchQueued() {
    for (const po of await all(`SELECT * FROM payouts WHERE status='QUEUED'`)) {
      if ((await run(`UPDATE payouts SET status='DISPATCHING' WHERE id=? AND status='QUEUED'`, po.id)).changes === 0) continue;
      let r;
      try { r = await provider.payout({ id: po.id, amount: po.net, phone: po.phone, operator: po.provider, message: po.kind === 'refund' ? 'Remboursement' : 'Retrait' }); }
      catch (e) { log.error('payout error', e.message); r = { accepted: false, failure: 'PROVIDER_UNREACHABLE' }; }
      if (r.accepted) await run(`UPDATE payouts SET status='PENDING' WHERE id=?`, po.id);
      else await settlePayout(po.id, 'FAILED', r.failure);
    }
  }
  async function settlePayout(id, status, failure) {
    await tx(db, async (q) => {
      const po = await q.get('SELECT * FROM payouts WHERE id=?', id);
      if (!po) return;
      const upd = await q.run(`UPDATE payouts SET status=?,failure=?,completed_at=? WHERE id=? AND status IN ('PENDING','DISPATCHING','QUEUED')`, status, failure || null, now(), id);
      if (upd.changes === 0) return;
      if (status === 'COMPLETED' && po.kind === 'withdrawal' && po.fee > 0) await addRevenue('withdrawal_fee', po.fee, po.id, q);
      if (status === 'FAILED' && po.kind === 'withdrawal') await q.run('UPDATE shops SET balance=balance+? WHERE id=?', po.amount, po.shop_id);
    });
  }
  async function withdraw(user, { amount, operator, phone }) {
    const s = await requireShop(user);
    amount = posInt(amount, 'Montant', 1e8);
    if (amount < cfg.MIN_WITHDRAWAL) throw bad(`Retrait minimum : ${cfg.MIN_WITHDRAWAL} FCFA`);
    const fee = Math.round(amount * cfg.WITHDRAWAL_FEE_RATE);
    const id = await tx(db, async (q) => {
      const cur = await q.get('SELECT balance FROM shops WHERE id=?', s.id);
      if (cur.balance < amount) throw bad('Solde insuffisant');
      await q.run('UPDATE shops SET balance=balance-? WHERE id=?', amount, s.id);
      return queuePayout({ kind: 'withdrawal', shopId: s.id, userId: user.id, amount, fee, operator, phone }, q);
    });
    kick();
    return { id, amount, fee, net: amount - fee, status: 'QUEUED' };
  }

  /* ---------- Commandes ---------- */
  async function createOrder(user, d) {
    const shop = await get('SELECT * FROM shops WHERE id=?', posInt(d.shopId, 'Boutique'));
    if (!shop) throw new HttpError(404, 'Boutique introuvable.');
    if (shop.owner_id === user.id) throw bad('Vous ne pouvez pas acheter dans votre propre boutique.');
    if (!Array.isArray(d.items) || d.items.length < 1 || d.items.length > 30) throw bad('Panier invalide');
    const deliveryMode = d.deliveryMode === 'home' ? 'home' : 'pickup';
    const merged = new Map();
    for (const it of d.items) { const pid = posInt(it.productId, 'Produit'); merged.set(pid, (merged.get(pid) || 0) + posInt(it.qty, 'Quantité', 1000)); }
    const orderId = 'GM' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 900 + 100);
    return tx(db, async (q) => {
      let total = 0; const lines = [];
      for (const [pid, qty] of merged) {
        const p = await q.get('SELECT * FROM products WHERE id=? AND shop_id=? AND active=1', pid, shop.id);
        if (!p) throw bad('Produit indisponible');
        if (p.stock < qty) throw bad(`Stock insuffisant pour « ${p.name} » (reste ${p.stock})`);
        if (deliveryMode === 'home' && !p.has_delivery) throw bad(`« ${p.name} » n'est pas livrable`);
        await q.run('UPDATE products SET stock=stock-? WHERE id=?', qty, p.id);
        total += p.price * qty; lines.push([p, qty]);
      }
      await q.run(`INSERT INTO orders(id,buyer_id,shop_id,total,status,delivery_mode,address,note,created_at,updated_at) VALUES(?,?,?,?, 'pending_payment',?,?,?,?,?)`,
        orderId, user.id, shop.id, total, deliveryMode, optStr(d.address, 200), optStr(d.note, 300), now(), now());
      for (const [p, qty] of lines) await q.run('INSERT INTO order_items(order_id,product_id,name,price,qty) VALUES(?,?,?,?,?)', orderId, p.id, p.name, p.price, qty);
      return orderView(await q.get('SELECT * FROM orders WHERE id=?', orderId), q);
    });
  }
  async function restoreStock(orderId, q) {
    for (const it of await q.all('SELECT * FROM order_items WHERE order_id=?', orderId)) if (it.product_id) await q.run('UPDATE products SET stock=stock+? WHERE id=?', it.qty, it.product_id);
  }
  async function releaseOrder(o, q) {
    await q.run('UPDATE shops SET pending=MAX(0,pending-?), balance=balance+? WHERE id=?', o.total, o.total, o.shop_id);
    await q.run(`UPDATE orders SET status='completed', updated_at=? WHERE id=?`, now(), o.id);
  }
  async function refundOrder(o, q) {
    await q.run('UPDATE shops SET pending=MAX(0,pending-?) WHERE id=?', o.total, o.shop_id);
    await restoreStock(o.id, q);
    await q.run(`UPDATE orders SET status='refunded', updated_at=? WHERE id=?`, now(), o.id);
    const pay = await q.get(`SELECT * FROM payments WHERE purpose='order' AND ref_id=? AND status='COMPLETED' ORDER BY completed_at DESC`, o.id);
    if (pay) await queuePayout({ kind: 'refund', userId: o.buyer_id, orderId: o.id, amount: o.total, fee: 0, operator: pay.provider, phone: pay.phone }, q);
  }
  async function orderAction(user, orderId, action) {
    const res = await tx(db, async (q) => {
      const o = await q.get('SELECT * FROM orders WHERE id=?', orderId);
      if (!o) throw new HttpError(404, 'Commande introuvable.');
      const shop = await q.get('SELECT * FROM shops WHERE id=?', o.shop_id);
      const isBuyer = o.buyer_id === user.id, isSeller = shop.owner_id === user.id;
      if (!isBuyer && !isSeller && user.role !== 'admin') throw new HttpError(403, 'Accès refusé.');
      const set = (st, extra) => q.run(`UPDATE orders SET status=?, updated_at=?${extra ? ', delivered_at=?' : ''} WHERE id=?`, ...(extra ? [st, now(), now(), o.id] : [st, now(), o.id]));
      const need = (cond, msg) => { if (!cond) throw new HttpError(409, msg || 'Action impossible dans l\'état actuel.'); };
      switch (action) {
        case 'accept': need(isSeller && o.status === 'paid'); await set('processing'); break;
        case 'ship': need(isSeller && o.status === 'processing'); await set('shipped'); break;
        case 'deliver': need(isSeller && o.status === 'shipped'); await set('delivered', true); break;
        case 'confirm': need(isBuyer && (o.status === 'shipped' || o.status === 'delivered')); await releaseOrder(o, q); break;
        case 'dispute': need(isBuyer && (o.status === 'shipped' || o.status === 'delivered')); await set('disputed'); break;
        case 'cancel':
          if (isBuyer && o.status === 'pending_payment') { await restoreStock(o.id, q); await set('cancelled'); }
          else { need((isBuyer && o.status === 'paid') || (isSeller && (o.status === 'paid' || o.status === 'processing'))); await refundOrder(o, q); }
          break;
        case 'resolve_release': need(user.role === 'admin' && o.status === 'disputed'); await releaseOrder(o, q); break;
        case 'resolve_refund': need(user.role === 'admin' && o.status === 'disputed'); await refundOrder(o, q); break;
        default: throw bad('Action inconnue');
      }
      return orderView(await q.get('SELECT * FROM orders WHERE id=?', o.id), q);
    });
    kick();
    return res;
  }
  async function listOrders(user) {
    const s = await shopOf(user);
    const rows = s
      ? await all('SELECT * FROM orders WHERE buyer_id=? OR shop_id=? ORDER BY created_at DESC LIMIT 200', user.id, s.id)
      : await all('SELECT * FROM orders WHERE buyer_id=? ORDER BY created_at DESC LIMIT 200', user.id);
    const views = await Promise.all(rows.map((o) => orderView(o)));
    return views.map((v, i) => ({ ...v, role: rows[i].buyer_id === user.id ? 'buyer' : 'seller' }));
  }
  async function reviewOrder(user, orderId, d) {
    return tx(db, async (q) => {
      const o = await q.get('SELECT * FROM orders WHERE id=? AND buyer_id=?', orderId, user.id);
      if (!o) throw new HttpError(404, 'Commande introuvable.');
      if (o.status !== 'completed') throw new HttpError(409, 'Vous pourrez noter après la confirmation de réception.');
      if (o.reviewed) throw new HttpError(409, 'Commande déjà notée.');
      const v = (x, n) => { const k = Number(x); if (!Number.isInteger(k) || k < 1 || k > 6) throw bad(n + ' : note de 1 à 6'); return k; };
      const dl = v(d.delivery, 'Livraison'), ql = v(d.quality, 'Qualité'), bh = v(d.behavior, 'Comportement');
      const s = await q.get('SELECT * FROM shops WHERE id=?', o.shop_id), n = s.rating_count;
      await q.run(`UPDATE shops SET rating_sum=?, rating_count=?, crit_delivery=?, crit_quality=?, crit_behavior=? WHERE id=?`,
        s.rating_sum + (dl + ql + bh) / 3, n + 1, (s.crit_delivery * n + dl) / (n + 1), (s.crit_quality * n + ql) / (n + 1), (s.crit_behavior * n + bh) / (n + 1), s.id);
      await q.run('UPDATE orders SET reviewed=1 WHERE id=?', o.id);
      return { ok: true };
    });
  }

  /* ---------- Messagerie ---------- */
  async function sendMessage(user, d) {
    const shop = await get('SELECT * FROM shops WHERE id=?', posInt(d.shopId, 'Boutique'));
    if (!shop) throw new HttpError(404, 'Boutique introuvable.');
    const body = str(d.body, 1, 1000, 'Message');
    let buyerId;
    if (shop.owner_id === user.id) {
      buyerId = posInt(d.buyerId, 'Client');
      if (!(await get('SELECT 1 x FROM messages WHERE shop_id=? AND buyer_id=?', shop.id, buyerId))) throw new HttpError(403, 'Le client doit écrire en premier.');
    } else buyerId = user.id;
    await run('INSERT INTO messages(shop_id,buyer_id,sender_id,body,created_at) VALUES(?,?,?,?,?)', shop.id, buyerId, user.id, body, now());
    return { ok: true };
  }
  async function threads(user) {
    const s = await shopOf(user);
    const out = await all(`SELECT m.shop_id, m.buyer_id, MAX(m.id) last_id, SUM(CASE WHEN m.sender_id<>? AND m.read=0 THEN 1 ELSE 0 END) unread
                     FROM messages m WHERE m.buyer_id=? ${s ? 'OR m.shop_id=?' : ''} GROUP BY m.shop_id, m.buyer_id ORDER BY last_id DESC`, ...(s ? [user.id, user.id, s.id] : [user.id, user.id]));
    return Promise.all(out.map(async (t) => {
      const last = await get('SELECT body, created_at FROM messages WHERE id=?', t.last_id);
      const sh = await get('SELECT name FROM shops WHERE id=?', t.shop_id), bu = await get('SELECT name FROM users WHERE id=?', t.buyer_id);
      return { shopId: t.shop_id, shopName: sh.name, buyerId: t.buyer_id, buyerName: bu.name, unread: t.unread, lastBody: last.body, lastAt: last.created_at, role: t.buyer_id === user.id ? 'buyer' : 'seller' };
    }));
  }
  async function thread(user, shopId, buyerId) {
    const shop = await get('SELECT * FROM shops WHERE id=?', shopId);
    if (!shop) throw new HttpError(404, 'Boutique introuvable.');
    const isOwner = shop.owner_id === user.id;
    const bid = isOwner ? buyerId : user.id;
    if (!isOwner && buyerId && buyerId !== user.id) throw new HttpError(403, 'Accès refusé.');
    await run('UPDATE messages SET read=1 WHERE shop_id=? AND buyer_id=? AND sender_id<>?', shop.id, bid, user.id);
    return all('SELECT id, sender_id AS senderId, body, created_at AS createdAt FROM messages WHERE shop_id=? AND buyer_id=? ORDER BY id LIMIT 500', shop.id, bid);
  }
  async function report(user, d) {
    await run('INSERT INTO reports(reporter_id,shop_id,order_id,type,details,created_at) VALUES(?,?,?,?,?,?)', user.id, d.shopId ? +d.shopId : null, d.orderId ? String(d.orderId).slice(0, 30) : null, str(d.type, 2, 40, 'Type'), optStr(d.details, 500), now());
    return { ok: true };
  }

  /* ---------- Tâches de fond ---------- */
  async function poll() {
    for (const p of await all(`SELECT * FROM payments WHERE status='PENDING' ORDER BY created_at LIMIT 100`)) {
      try {
        const r = await provider.depositStatus(p.id);
        if (r.status === 'COMPLETED') await settlePayment(p.id, 'COMPLETED', r.txn);
        else if (r.status === 'FAILED') await settlePayment(p.id, 'FAILED', null, r.failure);
        else if (now() - p.created_at > 15 * 60 * 1000 && r.notFound) await settlePayment(p.id, 'FAILED', null, 'EXPIRED');
      } catch (e) { log.error('poll deposit', p.id, e.message); }
    }
    for (const po of await all(`SELECT * FROM payouts WHERE status='PENDING' ORDER BY created_at LIMIT 100`)) {
      try {
        const r = await provider.payoutStatus(po.id);
        if (r.status === 'COMPLETED') await settlePayout(po.id, 'COMPLETED');
        else if (r.status === 'FAILED') await settlePayout(po.id, 'FAILED', r.failure);
      } catch (e) { log.error('poll payout', po.id, e.message); }
    }
    await dispatchQueued();
  }
  async function housekeeping() {
    const t = now();
    for (const o of await all(`SELECT * FROM orders WHERE status='pending_payment' AND created_at<?`, t - PENDING_ORDER_TTL)) {
      if (await get(`SELECT 1 x FROM payments WHERE purpose='order' AND ref_id=? AND status='PENDING'`, o.id)) continue;
      await tx(db, async (q) => {
        const cur = await q.get('SELECT status FROM orders WHERE id=?', o.id);
        if (cur.status === 'pending_payment') { await restoreStock(o.id, q); await q.run(`UPDATE orders SET status='cancelled', updated_at=? WHERE id=?`, t, o.id); }
      });
    }
    for (const o of await all(`SELECT * FROM orders WHERE status='delivered' AND delivered_at<?`, t - AUTO_CONFIRM_MS)) await tx(db, (q) => releaseOrder(o, q));
  }

  /* ---------- Admin ---------- */
  async function adminStats() {
    const t = now(), month = t - 30 * 86400000, week = t - 7 * 86400000;
    const rev = async (since) => Object.fromEntries((await all('SELECT kind, SUM(amount) total, COUNT(*) n FROM revenue WHERE created_at>=? GROUP BY kind', since)).map((r) => [r.kind, { total: r.total, count: r.n }]));
    const sum = (o) => Object.values(o).reduce((a, x) => a + x.total, 0);
    const [r30, r7, rAll] = await Promise.all([rev(month), rev(week), rev(0)]);
    const [usersN, shopsN, certShopsN, prodsN, ordersRows, escrow, owed, failedPayouts, disputes, recentPayments, reports] = await Promise.all([
      get('SELECT COUNT(*) n FROM users'), get('SELECT COUNT(*) n FROM shops'),
      get('SELECT COUNT(*) n FROM shops WHERE is_certified=1'), get('SELECT COUNT(*) n FROM products WHERE active=1'),
      all('SELECT status, COUNT(*) n FROM orders GROUP BY status'),
      get('SELECT COALESCE(SUM(pending),0) v FROM shops'), get('SELECT COALESCE(SUM(balance),0) v FROM shops'),
      all(`SELECT id, kind, amount, phone, failure, created_at FROM payouts WHERE status='FAILED' ORDER BY created_at DESC LIMIT 20`),
      all(`SELECT id, shop_id, buyer_id, total FROM orders WHERE status='disputed'`),
      all('SELECT id, purpose, amount, provider, status, created_at FROM payments ORDER BY created_at DESC LIMIT 20'),
      all('SELECT * FROM reports ORDER BY id DESC LIMIT 20')
    ]);
    return {
      revenue: { last7d: { total: sum(r7), byKind: r7 }, last30d: { total: sum(r30), byKind: r30 }, allTime: { total: sum(rAll), byKind: rAll } },
      goal100k: { target: 100000, last30d: sum(r30), reached: sum(r30) >= 100000 },
      users: usersN.n, shops: shopsN.n, certifiedShops: certShopsN.n, products: prodsN.n,
      orders: Object.fromEntries(ordersRows.map((r) => [r.status, r.n])),
      escrowHeld: escrow.v, owedToSellers: owed.v, failedPayouts, disputes, recentPayments, reports
    };
  }

  return { shopView, productView, orderView, shopOf, createShop, updateShop, createProduct, updateProduct, deleteProduct, catalog,
    startPayment, settlePayment, settlePayout, withdraw, createOrder, orderAction, listOrders, reviewOrder, sendMessage, threads, thread, report,
    poll, housekeeping, adminStats, dispatchQueued, kick, CATEGORIES };
}
module.exports = { createCore };
