/* =========================================================
   GRAND MARCHÉ — api.js : liaison avec le serveur (comptes, catalogue, paiements réels)
   Chargé AVANT script.js. Pour une appli mobile empaquetée, définir avant :
   window.GM_API_BASE = 'https://api.votre-domaine.com';
   ========================================================= */
var GM = (function () {
    var BASE = window.GM_API_BASE || '';
    var TOKEN_KEY = 'gm_token';
    var cfg = null, online = false;
    var syncing = false, syncAgain = false, syncTimer = null;

    function token() { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }
    function setToken(t) { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) {} }

    function req(method, path, body) {
        var headers = { 'Content-Type': 'application/json' };
        var t = token(); if (t) headers.Authorization = 'Bearer ' + t;
        return fetch(BASE + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined })
            .then(function (r) {
                return r.json().catch(function () { return {}; }).then(function (j) {
                    if (!r.ok) {
                        if (r.status === 401 && j.code === 'AUTH') setToken(null);
                        var e = new Error(j.error || 'Erreur serveur'); e.status = r.status; throw e;
                    }
                    online = true; return j;
                });
            }, function () {
                online = false;
                var e = new Error('Connexion au serveur impossible. Vérifiez votre internet.'); e.network = true; throw e;
            });
    }

    /* ---- Réduction d'image (le serveur limite à ~450 Ko par image) ---- */
    function shrinkImage(src) {
        return new Promise(function (resolve) {
            if (!src || src.indexOf('data:image') !== 0 || src.length < 300000) return resolve(src);
            var img = new Image();
            img.onload = function () {
                var w = img.width, h = img.height, max = 900, q = 0.72;
                var out = src;
                for (var k = 0; k < 4; k++) {
                    var s = Math.min(1, max / Math.max(w, h));
                    var c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
                    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                    out = c.toDataURL('image/jpeg', q);
                    if (out.length < 420000) break;
                    max = Math.round(max * 0.75); q = Math.max(0.5, q - 0.08);
                }
                resolve(out);
            };
            img.onerror = function () { resolve(src); };
            img.src = src;
        });
    }

    /* ---- Configuration & catalogue ---- */
    function init() {
        return req('GET', '/api/config').then(function (c) {
            cfg = c;
            if (typeof GM_FEES !== 'undefined') {
                GM_FEES.boostPrice7d = c.boostPrice; GM_FEES.boostDays = c.boostDays; GM_FEES.withdrawalRate = c.withdrawalFeeRate;
            }
            if (typeof CERTIFICATION_PRICE !== 'undefined') CERTIFICATION_PRICE = c.certificationPrice;
            var pct = Math.round(c.withdrawalFeeRate * 100);
            ['dash-commission-rate', 'wallet-commission-rate'].forEach(function (id) {
                var el = document.getElementById(id); if (el) el.textContent = 'Commission ' + pct + ' %';
            });
            ['reg-city', 'sel-city'].forEach(function (id) {
                var sel = document.getElementById(id); if (!sel || sel.options.length > 1) return;
                (c.cities || []).forEach(function (city) {
                    var o = document.createElement('option'); o.value = city; o.textContent = city; sel.appendChild(o);
                });
            });
            return loadCatalog();
        }).catch(function () { /* hors-ligne : on garde les données locales */ });
    }
    function mapShop(s) {
        /* s.city : ville de la boutique, renvoyée par le serveur */
        var mine = typeof myShop !== 'undefined' && myShop && (myShop.serverShopId === s.id || myShop.phone === s.phone);
        return {
            serverId: s.id, name: s.name, initials: getInitials(s.name), logo: s.logo || '', category: s.category, city: s.city || '',
            colorBg: 'bg-orange-600', isCertified: !!s.isCertified, isGoldenCertified: false,
            globalRating: s.rating, reviewsCount: s.reviewsCount, critDelivery: s.critDelivery, critQuality: s.critQuality, critBehavior: s.critBehavior,
            phone: s.phone, ownerPhone: s.phone, sixStarPoints: s.isCertified ? 1000 : 0, address: s.address || '', description: s.description || '',
            subscribers: [], isMyShop: !!mine,
            products: (s.products || []).map(function (p) {
                return { serverId: p.id, name: p.name, price: p.price, stock: p.stock, category: p.category || s.category,
                    image: p.images[0] || '', images: p.images, rating: '0', reviews: '0', desc: p.description || '',
                    hasDelivery: p.hasDelivery, hasWarranty: p.hasWarranty, warrantyText: p.warrantyText || '',
                    addedAt: p.createdAt, boostedUntil: p.boostedUntil || 0 };
            })
        };
    }
    function loadCatalog() {
        return req('GET', '/api/catalog').then(function (d) {
            var prevSubs = {};
            for (var i = 0; i < shopsCatalog.length; i++) if (shopsCatalog[i].serverId) prevSubs[shopsCatalog[i].serverId] = shopsCatalog[i].subscribers || [];
            shopsCatalog = d.shops.map(function (s) { var m = mapShop(s); m.subscribers = prevSubs[s.id] || []; return m; });
            // Mise à jour de ma boutique locale (certification, boosts) depuis la vérité du serveur
            if (myShop && myShop.serverShopId) {
                for (var k = 0; k < shopsCatalog.length; k++) {
                    var sc = shopsCatalog[k];
                    if (sc.serverId !== myShop.serverShopId) continue;
                    if (sc.isCertified && !myShop.isCertified) { myShop.isCertified = true; myShop.sixStarPoints = 1000; }
                    for (var a = 0; a < myShop.products.length; a++)
                        for (var b = 0; b < sc.products.length; b++)
                            if (myShop.products[a].serverId === sc.products[b].serverId) myShop.products[a].boostedUntil = sc.products[b].boostedUntil;
                }
            }
            _stateDirty = true;
            try { renderHomeTopShops(); renderProductsFeed(); if (activeCategory) renderCategoryResults(); if (myShop) { applyShopToDashboard(); } } catch (e) {}
            return d;
        });
    }

    /* ---- Comptes ---- */
    function register(o) { return req('POST', '/api/auth/register', o).then(function (s) { setToken(s.token); return s; }); }
    function login(phone, password) { return req('POST', '/api/auth/login', { phone: phone, password: password }).then(function (s) { setToken(s.token); return s; }); }
    function logout() { setToken(null); }
    function loggedIn() { return !!token(); }

    /** Reconstruit myShop à partir du compte serveur (connexion sur un nouvel appareil). */
    function adoptShop(sess) {
        return loadCatalog().then(function () {
            var sh = sess.shop; if (!sh) return null;
            if (myShop && myShop.serverShopId === sh.id) { myShop.phone = sess.user.phone; return myShop; }
            var found = null;
            for (var i = 0; i < shopsCatalog.length; i++) if (shopsCatalog[i].serverId === sh.id) found = shopsCatalog[i];
            myShop = {
                ownerName: sess.user.name, phone: sess.user.phone, pass: '', email: sess.user.email || '',
                shopName: sh.name, initials: getInitials(sh.name), category: sh.category, address: sh.address || '', description: sh.description || '',
                whatsapp: sess.user.phone, hasDelivery: true, hasCOD: false, isCertified: !!sh.isCertified, isGoldenCertified: false,
                sixStarPoints: sh.isCertified ? 1000 : 0, subscribers: [], logo: sh.logo || null,
                wallet: { balance: 0, pending: 0, transactions: [] }, serverShopId: sh.id,
                products: found ? found.products.map(function (p) { var c = JSON.parse(JSON.stringify(p)); return c; }) : []
            };
            if (found) found.isMyShop = true;
            return myShop;
        });
    }
    function createShop(o) {
        return shrinkImage(o.logo).then(function (logo) {
            o.logo = logo; return req('POST', '/api/shops', o);
        });
    }

    /* ---- Synchronisation boutique locale → serveur ---- */
    function productPayload(p) {
        return shrinkImages(p.images && p.images.length ? p.images : (p.image ? [p.image] : [])).then(function (imgs) {
            return { name: p.name, price: p.price, stock: Math.max(0, p.stock || 0), category: p.category, description: p.desc || '',
                images: imgs, hasDelivery: !!p.hasDelivery, hasWarranty: !!p.hasWarranty, warrantyText: p.warrantyText || '' };
        });
    }
    function shrinkImages(arr) { return Promise.all(arr.slice(0, 6).map(shrinkImage)); }

    function doSync() {
        if (!token() || !myShop || !myShop.serverShopId) return Promise.resolve();
        var chain = Promise.resolve();
        var infoKey = JSON.stringify([myShop.shopName, myShop.category, myShop.address, myShop.description, myShop.logo ? myShop.logo.length : 0]);
        if (myShop._infoKey !== infoKey) {
            chain = chain.then(function () { return shrinkImage(myShop.logo); }).then(function (logo) {
                return req('PUT', '/api/shop', { name: myShop.shopName, category: myShop.category, address: myShop.address, description: myShop.description, logo: logo || null });
            }).then(function () { myShop._infoKey = infoKey; });
        }
        myShop.products.forEach(function (p) {
            chain = chain.then(function () {
                return productPayload(p).then(function (pl) {
                    var key = JSON.stringify(pl);
                    if (p.serverId && p._syncKey === key) return;
                    var call = p.serverId ? req('PUT', '/api/products/' + p.serverId, pl) : req('POST', '/api/products', pl);
                    return call.then(function (r) { p.serverId = r.id; p._syncKey = key; _stateDirty = true; });
                });
            });
        });
        return chain;
    }
    /** Pousse la boutique vers le serveur (un seul envoi à la fois, regroupé). */
    function scheduleSync() {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(function () { syncNow().catch(function () {}); }, 1200);
    }
    function syncNow() {
        if (syncing) { syncAgain = true; return Promise.resolve(); }
        syncing = true;
        return doSync().then(function () { syncing = false; if (syncAgain) { syncAgain = false; return syncNow(); } },
            function (e) {
                syncing = false;
                if (e && !e.network && typeof toast === 'function') toast('Synchronisation : ' + e.message, 'error', 5000);
                throw e;
            });
    }
    function removeProduct(serverId) { if (serverId && token()) req('DELETE', '/api/products/' + serverId).catch(function () {}); }

    /* ---- Paiement Mobile Money réel (boost, certification) ---- */
    function pay(o) {
        var overlay = _ensureModal(), modal = overlay.querySelector('.gm-modal');
        var operator = 'mtn', phone = (typeof userPhone !== 'undefined' && userPhone) || '';
        var cancelled = false, poll = null;
        function fmt(n) { return Number(n).toLocaleString('fr-FR') + ' FCFA'; }
        function esc(s) { return escapeHtml(String(s)); }
        function close() { cancelled = true; clearInterval(poll); overlay.classList.remove('show'); setTimeout(function () { overlay.style.display = 'none'; }, 200); }
        function open() { overlay.style.display = 'flex'; requestAnimationFrame(function () { overlay.classList.add('show'); }); }

        function formStep(err) {
            modal.innerHTML =
                '<div class="gm-modal-title">' + esc(o.title) + '</div>' +
                '<div class="gm-modal-message" style="text-align:left">' + esc(o.description || '') + '<br><b>Montant : ' + fmt(o.amount) + '</b></div>' +
                '<div style="display:flex;gap:8px;margin:10px 0">' +
                '<button data-op="mtn" class="gm-modal-btn" style="flex:1;border:2px solid #d1d5db;background:#fff;color:#111">MTN MoMo</button>' +
                '<button data-op="airtel" class="gm-modal-btn" style="flex:1;border:2px solid #d1d5db;background:#fff;color:#111">Airtel Money</button></div>' +
                '<input id="gm-pay-phone" type="tel" inputmode="tel" placeholder="Numéro Mobile Money (06 123 45 67)" value="' + esc(phone) + '" style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:10px;margin-bottom:6px;color:#111;background:#fff">' +
                (err ? '<p style="color:#dc2626;font-size:12px;margin:4px 0">' + esc(err) + '</p>' : '') +
                '<div class="gm-modal-actions"><button class="gm-modal-btn cancel" data-action="cancel">Annuler</button><button class="gm-modal-btn confirm" data-action="ok">Payer ' + fmt(o.amount) + '</button></div>';
            function markOp() { [].forEach.call(modal.querySelectorAll('[data-op]'), function (b) { b.style.borderColor = b.getAttribute('data-op') === operator ? '#16a34a' : '#d1d5db'; b.style.background = b.getAttribute('data-op') === operator ? '#f0fdf4' : '#fff'; }); }
            [].forEach.call(modal.querySelectorAll('[data-op]'), function (b) { b.onclick = function () { operator = b.getAttribute('data-op'); markOp(); }; });
            markOp();
            modal.querySelector('[data-action="cancel"]').onclick = close;
            modal.querySelector('[data-action="ok"]').onclick = function () {
                phone = document.getElementById('gm-pay-phone').value.trim();
                if (phone.replace(/\D/g, '').length < 8) return formStep('Numéro invalide.');
                start();
            };
        }
        function waitStep() {
            modal.innerHTML = '<div class="gm-modal-title">Validation sur votre téléphone</div>' +
                '<div class="gm-modal-message">Une demande de paiement de <b>' + fmt(o.amount) + '</b> vient d\'être envoyée au <b>' + esc(phone) + '</b>.<br><br>Ouvrez le message reçu et saisissez votre code secret <b>sur votre téléphone</b> (jamais dans cette application).</div>' +
                '<div style="text-align:center;margin:8px 0"><div class="spinner" style="margin:0 auto"></div></div>' +
                '<div class="gm-modal-actions"><button class="gm-modal-btn cancel" data-action="cancel">Fermer</button></div>';
            modal.querySelector('[data-action="cancel"]').onclick = function () { close(); if (typeof toast === 'function') toast('Paiement en attente : il sera pris en compte dès validation.', 'info', 5000); setTimeout(function () { loadCatalog().catch(function () {}); }, 20000); };
        }
        function resultStep(ok, msg) {
            modal.innerHTML = '<div class="gm-modal-title">' + (ok ? 'Paiement réussi' : 'Paiement non abouti') + '</div><div class="gm-modal-message">' + esc(msg) + '</div>' +
                '<div class="gm-modal-actions">' + (ok ? '' : '<button class="gm-modal-btn cancel" data-action="cancel">Fermer</button>') + '<button class="gm-modal-btn confirm" data-action="ok">' + (ok ? 'OK' : 'Réessayer') + '</button></div>';
            var c = modal.querySelector('[data-action="cancel"]'); if (c) c.onclick = close;
            modal.querySelector('[data-action="ok"]').onclick = function () { if (ok) { close(); if (o.onSuccess) o.onSuccess(); } else formStep(); };
        }
        function start() {
            modal.innerHTML = '<div class="gm-modal-title">Envoi de la demande…</div><div style="text-align:center;margin:12px"><div class="spinner" style="margin:0 auto"></div></div>';
            req('POST', '/api/payments', { purpose: o.purpose, refId: o.refId, operator: operator, phone: phone }).then(function (p) {
                if (p.status === 'FAILED') return resultStep(false, failText(p.failure));
                waitStep();
                var started = Date.now();
                poll = setInterval(function () {
                    if (cancelled) return clearInterval(poll);
                    if (Date.now() - started > 150000) { clearInterval(poll); return resultStep(false, 'Délai dépassé. Si vous avez validé le paiement, il sera pris en compte automatiquement sous quelques minutes.'); }
                    req('GET', '/api/payments/' + p.id).then(function (r) {
                        if (cancelled) return;
                        if (r.status === 'COMPLETED') { clearInterval(poll); resultStep(true, o.successText || 'Votre paiement a été confirmé.'); }
                        else if (r.status === 'FAILED') { clearInterval(poll); resultStep(false, failText(r.failure)); }
                    }).catch(function () { /* on réessaie au prochain tour */ });
                }, 3000);
            }).catch(function (e) { formStep(e.message); });
        }
        function failText(code) {
            var m = { PAYER_LIMIT_REACHED: 'Plafond de votre compte atteint.', PAYER_NOT_FOUND: 'Numéro Mobile Money introuvable.', INSUFFICIENT_BALANCE: 'Solde insuffisant.', TRANSACTION_DECLINED: 'Paiement refusé ou non validé.', PROVIDER_UNREACHABLE: 'Opérateur momentanément indisponible.', EXPIRED: 'Demande expirée.' };
            return (m[code] || 'Le paiement n\'a pas abouti.') + ' Aucun montant n\'a été débité.';
        }
        formStep(); open();
    }

    /* ---- Commandes réelles (création, paiement, séquestre, cycle de vie) ---- */
    var STEP_AT = { paid: 'createdAt', seller_accepted: 'updatedAt', processing: 'updatedAt', shipped: 'updatedAt', delivered: 'deliveredAt', completed: 'updatedAt' };
    function fmtDate(ms) { try { return new Date(ms).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
    function mapOrder(o) {
        var idx = -1;
        for (var i = 0; i < shopsCatalog.length; i++) if (shopsCatalog[i].serverId === o.shopId) { idx = i; break; }
        var held = ['paid', 'processing', 'shipped', 'delivered', 'disputed'].indexOf(o.status) >= 0;
        var timeline = [{ step: 'created', label: 'Commande passée', at: fmtDate(o.createdAt) }];
        if (o.status !== 'pending_payment') timeline.push({ step: 'paid', label: 'Paiement en séquestre', at: fmtDate(o.createdAt) });
        var order = {
            id: o.id, shopIndex: idx, shopId: o.shopId, shopName: o.shopName, shopPhone: o.shopPhone,
            buyerId: o.buyerId, buyerName: o.buyerName, buyerPhone: o.buyerPhone,
            items: (o.items || []).map(function (it) { return { name: it.name, qty: it.qty, price: it.price, hasWarranty: false, warrantyText: '' }; }),
            total: o.total, status: o.status, escrowStatus: held ? 'held' : (o.status === 'completed' ? 'released' : (o.status === 'refunded' ? 'refunded' : null)),
            deliveryMode: o.deliveryMode, deliveryStatus: o.status === 'paid' ? 'pending' : 'accepted',
            deliveryAddress: o.address || '', trackingNumber: '',
            date: fmtDate(o.createdAt), createdAt: o.createdAt, validatedAt: fmtDate(o.updatedAt),
            buyerConfirmed: o.status === 'completed', sellerConfirmed: ['shipped', 'delivered', 'completed'].indexOf(o.status) >= 0,
            sellerAcceptedOrder: ['processing', 'shipped', 'delivered', 'completed', 'disputed', 'refunded'].indexOf(o.status) >= 0,
            disputed: o.status === 'disputed', disputeReason: '', rated: !!o.reviewed, rating: null,
            autoConfirmAt: o.deliveredAt ? o.deliveredAt + 72 * 3600 * 1000 : null,
            timeline: timeline, _serverRole: o.role
        };
        if (['processing', 'shipped', 'delivered', 'completed', 'disputed'].indexOf(o.status) >= 0) timeline.push({ step: 'seller_accepted', label: 'Acceptée par le vendeur', at: fmtDate(o.updatedAt) });
        if (o.status === 'shipped' || o.status === 'delivered' || o.status === 'completed') timeline.push({ step: 'shipped', label: 'Expédiée', at: fmtDate(o.updatedAt) });
        if (o.status === 'delivered' || o.status === 'completed') timeline.push({ step: 'delivered', label: 'Livrée', at: fmtDate(o.deliveredAt || o.updatedAt) });
        if (o.status === 'completed') timeline.push({ step: 'completed', label: 'Terminée', at: fmtDate(o.updatedAt) });
        return order;
    }
    function syncOrders() {
        if (!token()) return Promise.resolve();
        return req('GET', '/api/orders').then(function (d) {
            var mapped = d.orders.map(mapOrder);
            buyerOrders = mapped.filter(function (o) { return o._serverRole === 'buyer'; });
            sellerOrders = mapped.filter(function (o) { return o._serverRole === 'seller'; });
            return { buyerOrders: buyerOrders, sellerOrders: sellerOrders };
        });
    }
    function createOrder(payload) { return req('POST', '/api/orders', payload); }
    function orderAction(id, action, body) { return req('POST', '/api/orders/' + encodeURIComponent(id) + '/' + action, body || {}); }

    /* ---- Messagerie (réelle, via le serveur) ---- */
    function chatThreads() { return req('GET', '/api/chat').then(function (d) { return d.threads; }); }
    function chatMessages(shopId, buyerId) {
        var q = buyerId ? ('?buyerId=' + encodeURIComponent(buyerId)) : '';
        return req('GET', '/api/chat/' + shopId + q).then(function (d) { return d.messages; });
    }
    function sendChatMessage(shopId, body, buyerId) {
        var payload = { body: body }; if (buyerId) payload.buyerId = buyerId;
        return req('POST', '/api/chat/' + shopId, payload);
    }

    return { init: init, req: req, token: token, loggedIn: loggedIn, register: register, login: login, logout: logout,
        adoptShop: adoptShop, createShop: createShop, loadCatalog: loadCatalog, scheduleSync: scheduleSync, syncNow: syncNow,
        removeProduct: removeProduct, pay: pay, shrinkImage: shrinkImage, config: function () { return cfg; }, online: function () { return online; },
        syncOrders: syncOrders, createOrder: createOrder, orderAction: orderAction,
        chatThreads: chatThreads, chatMessages: chatMessages, sendChatMessage: sendChatMessage };
})();
