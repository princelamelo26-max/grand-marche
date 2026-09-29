/* =========================================================
   GRAND MARCHÉ — script.js v14.7
   - Les ACHETEURS peuvent s'abonner à N'IMPORTE QUELLE boutique
     (y compris la leur / boutiques fraîchement créées)
   - Les VENDEURS purs (sans compte acheteur) ne voient pas le bouton Suivre
   - Trophées : chaque trophée a sa propre forme, design et ICÔNES COLORÉES
   ========================================================= */

if (typeof Object.assign !== 'function') {
    Object.assign = function(target) {
        if (target == null) throw new TypeError('Cannot convert undefined or null to object');
        var to = Object(target);
        for (var i = 1; i < arguments.length; i++) {
            var src = arguments[i];
            if (src == null) continue;
            for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) to[k] = src[k];
        }
        return to;
    };
}

var STORAGE_KEY = 'grandmarche_v9';
var _stateDirty = false;
var _noHistoryPush = false;

var SUPPORT_WHATSAPP = '242068428967';
var SUPPORT_WHATSAPP_DISPLAY = '+242 06 842 89 67';
var COMMUNITY_WHATSAPP_URL = 'https://chat.whatsapp.com/Je5hAMJl2SX44eb91gpiYj';
var CERTIFICATION_PRICE = 30000;
var GOLD_CERTIFICATION_THRESHOLD = 100000;
/* Tarifs de la plateforme (sources de revenus) — à modifier ici uniquement */
var GM_FEES = {
    withdrawalRate: 0.05,      // commission sur chaque retrait vendeur
    boostPrice7d: 1500,        // mise en avant d'un produit pendant 7 jours (FCFA)
    boostDays: 7
};

var ORDER_STATUS = {
    PENDING_PAYMENT: 'pending_payment', PAID: 'paid', PROCESSING: 'processing',
    SHIPPED: 'shipped', DELIVERED: 'delivered', COMPLETED: 'completed',
    CANCELLED: 'cancelled', DISPUTED: 'disputed', REFUNDED: 'refunded'
};

var STATUS_LABELS = {
    pending_payment: { label: 'En attente de paiement', color: 'bg-yellow-100 text-yellow-700' },
    paid:            { label: 'Payé (séquestre)',        color: 'bg-blue-100 text-blue-700' },
    processing:      { label: 'En préparation',          color: 'bg-orange-100 text-orange-700' },
    shipped:         { label: 'Expédié',                 color: 'bg-indigo-100 text-indigo-700' },
    delivered:       { label: 'Livré — à confirmer',     color: 'bg-purple-100 text-purple-700' },
    completed:       { label: 'Terminé',                 color: 'bg-green-100 text-green-700' },
    cancelled:       { label: 'Annulé',                  color: 'bg-red-100 text-red-700' },
    disputed:        { label: 'En litige',               color: 'bg-red-100 text-red-700' },
    refunded:        { label: 'Remboursé',               color: 'bg-gray-100 text-gray-700' }
};

/* ===== ÉTAT GLOBAL ===== */
var cart = [];
var selectedDelivery = 'home';
var selectedPayment = 'mobile';
var selectedCertPayment = 'mobile';
var userPhone = '061234567';
var userName = 'Jean Dupont';
var userPass = '123456';
var userEmail = 'jean.dupont@email.com';
var myShop = null;
var selectedCategory = '';
var isSeller = false;
var shopProfileOrigin = 'home-screen';
var productScreenOrigin = 'home-screen';
var settingsOrigin = 'home-screen';
var reportOrigin = 'shop-profile-screen';
var sellerMode = 'register';
var sellerOrdersFilter = 'active';
var pendingVerification = null;
var pendingResetPhone = null;
var currentShopIndex = 0;
var viewingMyShop = false;
var pendingLogoData = null;
var pendingProductImages = [];
var pendingPhotoQueue = [];
var buyerTab = 'orders';
var currentChatId = null;
var darkMode = false;
var notificationsOn = true;
var whatsappConnected = false;
var whatsappNumber = '';
var selectedReportType = '';
var reportTarget = null;
var reportTargetType = 'seller';
var reports = [];
var cropMode = 'logo';
var cropImageData = null;
var cropImg = null;
var cropOffset = { x: 0, y: 0 };
var cropZoom = 1;
var cropRatio = 'circle';
var cropCallback = null;
var cropReturnScreen = null;
var hasBuyerAccount = false;
var buyerAvatar = null;
var editShopLogoData = null;
var hasAcceptedTerms = false;
var pendingTermsCallback = null;
var termsReturnScreen = 'home-screen';
var notifications = [];
var searchHistory = [];
var recentlyViewed = [];
var activeCategory = null;
var _qrOriginScreen = 'shop-profile-screen';
var _qrShopIndex = -1;
var buyerReferrals = [];

var buyerWallet = {
    balance: 0, escrow: 0, totalSpent: 0, totalRefunded: 0, transactions: []
};

var CATEGORIES = [
    { id: 'Alimentation locale', label: 'Alim.' },
    { id: 'Électronique',         label: 'Élec.' },
    { id: 'Mode et Vêtements',    label: 'Mode' },
    { id: 'Maison et Déco',       label: 'Maison' },
    { id: 'Beauté et Soins',      label: 'Beauté' },
    { id: 'Sport et Jeux',        label: 'Sport' },
    { id: 'Artisanat',            label: 'Artisanat' },
    { id: 'Véhicules',            label: 'Véhicules' },
    { id: 'Immobilier',           label: 'Immobilier' },
    { id: 'Services',             label: 'Services' },
    { id: 'Animaux',              label: 'Animaux' },
    { id: 'Bébé et Enfant',       label: 'Bébé' },
    { id: 'Livres et Papeterie',  label: 'Livres' },
    { id: 'Jeux vidéo',           label: 'Jeux vidéo' },
    { id: 'Santé et Bien-être',   label: 'Santé' },
    { id: 'Agriculture',          label: 'Agriculture' },
    { id: 'Restauration',         label: 'Restauration' },
    { id: 'Autre',                label: 'Autre' }
];

var PRODUCT_CATEGORIES = [
    'Alimentation locale', 'Électronique', 'Mode et Vêtements', 'Maison et Déco',
    'Beauté et Soins', 'Sport et Jeux', 'Artisanat', 'Véhicules', 'Immobilier',
    'Services', 'Animaux', 'Bébé et Enfant', 'Livres et Papeterie', 'Jeux vidéo',
    'Santé et Bien-être', 'Agriculture', 'Restauration'
];

var WARRANTY_PRESETS = [
    '7 jours satisfait ou remboursé', '14 jours satisfait ou remboursé',
    '30 jours satisfait ou remboursé', 'Garantie constructeur 3 mois',
    'Garantie constructeur 6 mois', 'Garantie constructeur 12 mois',
    'Garantie pièces et main d\'oeuvre 6 mois'
];

var paymentFlow = {
    type: 'order', method: null, amount: 0, recipient: '',
    onSuccess: null, returnScreen: 'checkout-screen', pendingCartSnapshot: null
};

var _operatorMode = 'payment';
var _currentReceipt = null;
var _withdrawMethod = 'mobile';
var _withdrawContext = null;
var currentRating = { orderId: null, shopIndex: -1, delivery: 0, quality: 0, behavior: 0 };
var _productGallery = { images: [], currentIndex: 0 };
var _previewGallery = { images: [], currentIndex: 0 };
var _previewProductIndex = -1;
var _currentProductData = null;
var _productQty = 1;
var favoriteProducts = [];
var buyerOrdersFilter = 'all';

var _topupMethod = 'mobile';
var _topupAmount = 0;
var _topupReturnScreen = 'buyer-wallet-screen';
var _buyerWithdrawMethod = 'mobile';

var shopsCatalog = [
    { name: 'Boutique Chez Maman', initials: 'CM', logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=80', category: 'Alimentation locale', colorBg: 'bg-green-600', isCertified: true, globalRating: 4.9, reviewsCount: 124, critDelivery: 4.8, critQuality: 4.9, critBehavior: 4.7, phone: '0680000001', sixStarPoints: 1000, ownerPhone: '0680000001', address: 'Marché Total, Brazzaville', subscribers: [], products: [
        { name: 'Tomates locales', price: 1500, stock: 50, category: 'Alimentation locale', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&q=80', images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&q=80'], rating: '5', reviews: '32', desc: 'Tomates fraiches du jour, cultivées localement.', hasDelivery: true, hasWarranty: false, warrantyText: '' }
    ]},
    { name: 'Kimbembe Store', initials: 'KS', logo: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&q=80', category: 'Électronique', colorBg: 'bg-gray-700', isCertified: true, globalRating: 4.7, reviewsCount: 86, critDelivery: 4.6, critQuality: 4.9, critBehavior: 4.5, phone: '0680000002', sixStarPoints: 1000, ownerPhone: '0680000002', address: 'Avenue de la Paix, Brazzaville', subscribers: [], products: [
        { name: 'Samsung Galaxy A54', price: 120000, stock: 8, category: 'Électronique', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80', images: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80'], rating: '4.6', reviews: '18', desc: 'Smartphone 5G, 128 Go, double SIM.', hasDelivery: false, hasWarranty: true, warrantyText: 'Garantie constructeur 6 mois' }
    ]},
    { name: 'Pointe Mode', initials: 'PM', logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&q=80', category: 'Mode et Vêtements', colorBg: 'bg-orange-600', isCertified: true, globalRating: 4.6, reviewsCount: 72, critDelivery: 4.5, critQuality: 4.7, critBehavior: 4.6, phone: '0680000003', sixStarPoints: 1000, ownerPhone: '0680000003', address: 'Centre-ville, Pointe-Noire', subscribers: [], products: [
        { name: 'Robe wax', price: 25000, stock: 15, category: 'Mode et Vêtements', image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=80', images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=80'], rating: '4.7', reviews: '15', desc: 'Belle robe en wax, taille ajustable.', hasDelivery: true, hasWarranty: false, warrantyText: '' }
    ]}
];

var followedShops = [];
var buyerOrders = [];
var sellerOrders = [];
var conversations = [];

/* =========================================================
   HELPERS
   ========================================================= */
function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(function(w){return w[0];}).join('').substring(0,2).toUpperCase();
}
function renderStars(rating) {
    var filled = Math.round(rating || 0);
    var h = '';
    for (var i = 1; i <= 6; i++) h += i <= filled ? '★' : '<span class="text-gray-300">★</span>';
    return h;
}
function getProductMainImage(p) {
    if (!p) return '';
    if (p.images && p.images.length > 0) return p.images[0];
    return p.image || '';
}
function generateTransactionId() { return 'TX' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000); }
function generateOrderId() { return 'GM' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100); }
function generateBatchId() { return 'BATCH' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100); }
function findMyCatalogIndex() {
    if (!myShop) return -1;
    for (var i = 0; i < shopsCatalog.length; i++) if (shopsCatalog[i].ownerPhone === myShop.phone) return i;
    return -1;
}
function getTime() {
    var now = new Date();
    return now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
}
function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function isValidEmail(e) {
    if (!e) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}
function isLocalStorageAvailable() {
    try {
        var t = '__test__' + Date.now();
        localStorage.setItem(t, t); localStorage.removeItem(t);
        return true;
    } catch (e) { return false; }
}
function haptic(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern || 25); } catch(e) {} }
function formatDate() { var d = new Date(); return d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear(); }
function formatDateTime() { return new Date().toLocaleString('fr-FR'); }

/* =========================================================
   BADGE DE CERTIFICATION
   ========================================================= */
function renderShopBadge(shop) {
    if (!shop) return '';
    if (shop.isGoldenCertified) {
        return '<span class="shop-badge shop-badge-gold" title="Golden Certif" aria-label="Golden Certif">' +
            '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M12 2l2.9 6.9 7.1.6-5.5 4.7 1.8 7-6.3-4-6.3 4 1.8-7L2 9.5l7.1-.6z"/>' +
            '</svg></span>';
    }
    if (shop.isCertified) {
        return '<span class="shop-badge shop-badge-blue" title="Boutique certifiée" aria-label="Certifiée">' +
            '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M5 12l4.5 4.5L19 7" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</svg></span>';
    }
    return '';
}

/* =========================================================
   MATCHING CATÉGORIE
   ========================================================= */
function _matchCategory(input) {
    if (!input) return null;
    var norm = input.toLowerCase().trim();
    for (var i = 0; i < PRODUCT_CATEGORIES.length; i++) {
        if (PRODUCT_CATEGORIES[i].toLowerCase() === norm) return PRODUCT_CATEGORIES[i];
    }
    for (var i = 0; i < PRODUCT_CATEGORIES.length; i++) {
        var pc = PRODUCT_CATEGORIES[i].toLowerCase();
        if (pc.indexOf(norm) !== -1 || norm.indexOf(pc) !== -1) return PRODUCT_CATEGORIES[i];
    }
    var firstWord = norm.split(/[\s\-]/)[0];
    if (firstWord.length >= 3) {
        for (var i = 0; i < PRODUCT_CATEGORIES.length; i++) {
            if (PRODUCT_CATEGORIES[i].toLowerCase().indexOf(firstWord) === 0) return PRODUCT_CATEGORIES[i];
        }
    }
    return null;
}

/* =========================================================
   TOASTS / MODALES / LOADING
   ========================================================= */
function toast(message, type, duration) {
    type = type || 'info'; duration = duration || 3000;
    var c = document.getElementById('toast-container');
    if (!c) { alert(message); return; }
    var icons = { success: 'OK', error: '!', warn: '!', info: 'i' };
    var el = document.createElement('div');
    el.className = 'toast-item ' + type;
    el.innerHTML = '<span class="toast-icon">' + (icons[type] || '') + '</span><span>' + escapeHtml(message) + '</span>';
    c.appendChild(el);
    requestAnimationFrame(function(){ el.classList.add('show'); });
    setTimeout(function() {
        el.classList.remove('show');
        setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, 300);
    }, duration);
}
function _ensureModal() {
    var existing = document.getElementById('gm-modal-overlay');
    if (existing) return existing;
    var el = document.createElement('div');
    el.id = 'gm-modal-overlay';
    el.className = 'gm-modal-overlay';
    el.innerHTML = '<div class="gm-modal" role="dialog"></div>';
    document.body.appendChild(el);
    return el;
}
function gmAlert(message, title) {
    return new Promise(function(resolve) {
        var overlay = _ensureModal(); var modal = overlay.querySelector('.gm-modal');
        modal.innerHTML = '<div class="gm-modal-title">' + escapeHtml(title || 'Information') + '</div>' +
            '<div class="gm-modal-message">' + escapeHtml(message) + '</div>' +
            '<div class="gm-modal-actions"><button class="gm-modal-btn confirm" data-action="ok">OK</button></div>';
        overlay.style.display = 'flex';
        requestAnimationFrame(function(){ overlay.classList.add('show'); });
        function close() { overlay.classList.remove('show'); setTimeout(function(){ overlay.style.display = 'none'; }, 200); resolve(true); }
        modal.querySelector('[data-action="ok"]').onclick = close;
    });
}
function gmConfirm(message, title, opts) {
    opts = opts || {};
    return new Promise(function(resolve) {
        var overlay = _ensureModal(); var modal = overlay.querySelector('.gm-modal');
        var confirmText = opts.confirmText || 'Confirmer';
        var cancelText = opts.cancelText || 'Annuler';
        var danger = opts.danger ? 'danger' : 'confirm';
        modal.innerHTML = '<div class="gm-modal-title">' + escapeHtml(title || 'Confirmation') + '</div>' +
            '<div class="gm-modal-message">' + escapeHtml(message) + '</div>' +
            '<div class="gm-modal-actions">' +
                '<button class="gm-modal-btn cancel" data-action="cancel">' + escapeHtml(cancelText) + '</button>' +
                '<button class="gm-modal-btn ' + danger + '" data-action="ok">' + escapeHtml(confirmText) + '</button>' +
            '</div>';
        overlay.style.display = 'flex';
        requestAnimationFrame(function(){ overlay.classList.add('show'); });
        function close(v) { overlay.classList.remove('show'); setTimeout(function(){ overlay.style.display = 'none'; }, 200); resolve(v); }
        modal.querySelector('[data-action="ok"]').onclick = function(){ close(true); };
        modal.querySelector('[data-action="cancel"]').onclick = function(){ close(false); };
    });
}
function gmPrompt(message, defaultValue, title) {
    return new Promise(function(resolve) {
        var overlay = _ensureModal(); var modal = overlay.querySelector('.gm-modal');
        modal.innerHTML = '<div class="gm-modal-title">' + escapeHtml(title || 'Saisie') + '</div>' +
            '<div class="gm-modal-message">' + escapeHtml(message) + '</div>' +
            '<input type="text" class="gm-modal-input" id="gm-prompt-input" value="' + escapeHtml(defaultValue || '') + '">' +
            '<div class="gm-modal-actions"><button class="gm-modal-btn cancel" data-action="cancel">Annuler</button>' +
            '<button class="gm-modal-btn confirm" data-action="ok">Valider</button></div>';
        overlay.style.display = 'flex';
        requestAnimationFrame(function(){ overlay.classList.add('show'); });
        var input = modal.querySelector('#gm-prompt-input');
        setTimeout(function(){ input.focus(); input.select(); }, 220);
        function close(v) { overlay.classList.remove('show'); setTimeout(function(){ overlay.style.display = 'none'; }, 200); resolve(v); }
        modal.querySelector('[data-action="ok"]').onclick = function(){ close(input.value); };
        modal.querySelector('[data-action="cancel"]').onclick = function(){ close(null); };
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') close(input.value);
            if (e.key === 'Escape') close(null);
        });
    });
}
function showLoading(msg) {
    var el = document.getElementById('global-loading');
    if (!el) {
        el = document.createElement('div'); el.id = 'global-loading';
        el.innerHTML = '<div class="spinner"></div><div id="global-loading-msg"></div>';
        document.body.appendChild(el);
    }
    document.getElementById('global-loading-msg').textContent = msg || 'Chargement...';
    el.classList.add('show');
}
function hideLoading() { var el = document.getElementById('global-loading'); if (el) el.classList.remove('show'); }

var _lastSave = 0, _saveTimeout = null;
function saveStateThrottled(force) {
    var now = Date.now();
    if (force || now - _lastSave > 800) { _lastSave = now; saveState(); _stateDirty = false; }
    else { clearTimeout(_saveTimeout); _saveTimeout = setTimeout(function () { saveState(); _stateDirty = false; }, 900); }
}
setInterval(function() { if (_stateDirty) saveStateThrottled(); }, 3000);
window.addEventListener('beforeunload', function() { if (_stateDirty) saveState(); });
document.addEventListener('visibilitychange', function() {
    if (document.hidden && _stateDirty) { saveState(); _stateDirty = false; }
});

/* =========================================================
   WHATSAPP
   ========================================================= */
function openWhatsAppSupport() {
    var text = 'Bonjour Grand Marché, j\'ai besoin d\'aide.';
    var url = 'https://wa.me/' + SUPPORT_WHATSAPP + '?text=' + encodeURIComponent(text);
    window.open(url, '_blank');
}
function openWhatsAppCommunity() {
    window.open(COMMUNITY_WHATSAPP_URL, '_blank');
}

/* =========================================================
   FLUX DE RECONNEXION
   ========================================================= */
function openClientFlow() {
    if (hasBuyerAccount) {
        showScreen('buyer-login-screen');
        var inp = document.getElementById('buyer-login-phone');
        if (inp) inp.value = userPhone || '';
    } else {
        showScreen('inscription-screen');
    }
}
function openSellerFlow() {
    showScreen('seller-register-screen');
    if (myShop) {
        switchSellerMode('login');
        var inp = document.getElementById('login-phone');
        if (inp) inp.value = myShop.phone || '';
    } else {
        switchSellerMode('register');
    }
}

/* =========================================================
   NOTIFICATIONS
   ========================================================= */
function addNotification(recipient, title, message, type, orderId) {
    notifications.unshift({
        id: 'N' + Date.now() + Math.floor(Math.random()*100),
        recipient: recipient, title: title, message: message,
        type: type || 'info', orderId: orderId || null,
        read: false, date: formatDateTime()
    });
    if (notifications.length > 60) notifications = notifications.slice(0, 60);
    _stateDirty = true; updateNotificationsBadge();
}
function updateNotificationsBadge() {
    var role = isSeller ? 'seller' : 'buyer';
    var count = 0;
    for (var i = 0; i < notifications.length; i++) {
        var n = notifications[i];
        if (!n.read && (n.recipient === role || n.recipient === 'all')) count++;
    }
    var badge = document.getElementById('notif-badge');
    if (badge) {
        if (count > 0) { badge.textContent = count > 99 ? '99+' : count; badge.classList.remove('hidden'); }
        else badge.classList.add('hidden');
    }
}
function openNotifications() {
    var role = isSeller ? 'seller' : 'buyer';
    var list = [];
    for (var i = 0; i < notifications.length; i++) {
        var n = notifications[i];
        if (n.recipient === role || n.recipient === 'all') list.push(n);
    }
    var c = document.getElementById('notifications-list');
    if (c) {
        if (list.length === 0) {
            c.innerHTML = '<div class="text-center py-10 text-gray-400 text-sm">Rien pour le moment — tout est calme 🌿</div>';
        } else {
            var h = '';
            for (var i = 0; i < list.length; i++) {
                var n = list[i];
                var icon = n.type === 'success' ? 'OK' : n.type === 'warn' ? '!' : n.type === 'order' ? 'Cde' : 'N';
                var color = n.type === 'success' ? 'bg-green-100 text-green-600' :
                            n.type === 'warn' ? 'bg-yellow-100 text-yellow-700' :
                            n.type === 'order' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600';
                h += '<div class="bg-white rounded-xl p-3 flex items-start gap-3 mb-2 ' + (n.read ? 'opacity-70' : '') + '">';
                h += '<div class="' + color + ' rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">' + icon + '</div>';
                h += '<div class="flex-1 min-w-0"><p class="font-bold text-sm">' + escapeHtml(n.title) + '</p>';
                h += '<p class="text-xs text-gray-500 mt-0.5">' + escapeHtml(n.message) + '</p>';
                h += '<p class="text-[10px] text-gray-400 mt-1">' + n.date + '</p></div>';
                if (!n.read) h += '<span class="w-2 h-2 rounded-full bg-red-500 mt-2"></span>';
                h += '</div>';
            }
            c.innerHTML = h;
        }
    }
    for (var i = 0; i < notifications.length; i++) {
        if (notifications[i].recipient === role || notifications[i].recipient === 'all') notifications[i].read = true;
    }
    _stateDirty = true; updateNotificationsBadge();
    showScreen('notifications-screen');
}

/* =========================================================
   BADGES MESSAGES
   ========================================================= */
function _isConversationForMyShop(cv) {
    if (!myShop) return true;
    if (!cv.sellerPhone) return true;
    var sp = String(cv.sellerPhone).replace(/\D/g, '');
    var mp = String(myShop.phone).replace(/\D/g, '');
    return sp === mp;
}
function updateMessageBadges() {
    var totalSeller = 0;
    for (var i = 0; i < conversations.length; i++) {
        var cv = conversations[i];
        if (!cv.unreadSeller) continue;
        if (!_isConversationForMyShop(cv)) continue;
        totalSeller += cv.unreadSeller;
    }
    var sBadges = ['msg-badge', 'msg-badge2', 'msg-badge3', 'msg-badge4'];
    for (var j = 0; j < sBadges.length; j++) {
        var b = document.getElementById(sBadges[j]);
        if (b) {
            if (totalSeller > 0) { b.textContent = totalSeller > 99 ? '99+' : totalSeller; b.classList.remove('hidden'); }
            else b.classList.add('hidden');
        }
    }
    var totalBuyer = 0;
    for (var k = 0; k < conversations.length; k++) if (conversations[k].unreadBuyer) totalBuyer += conversations[k].unreadBuyer;
    var buyerBadge = document.getElementById('buyer-msg-badge');
    if (buyerBadge) {
        if (totalBuyer > 0) { buyerBadge.textContent = totalBuyer > 99 ? '99+' : totalBuyer; buyerBadge.classList.remove('hidden'); }
        else buyerBadge.classList.add('hidden');
    }
}

/* =========================================================
   CATÉGORIES
   ========================================================= */
function renderCategoriesStrip() {
    var c = document.getElementById('categories-strip'); if (!c) return;
    var h = '';
    for (var i = 0; i < CATEGORIES.length; i++) {
        var cat = CATEGORIES[i];
        var active = activeCategory === cat.id;
        h += '<div onclick="filterByCategory(\'' + cat.id.replace(/'/g,"\\'") + '\')" class="cat-pill ' + (active ? 'active' : '') + '">';
        h += '<span class="cat-label">' + escapeHtml(cat.label) + '</span></div>';
    }
    c.innerHTML = h;
}
function renderCategoryButtons(containerId, onSelectFn) {
    var c = document.getElementById(containerId); if (!c) return;
    var h = '';
    for (var i = 0; i < CATEGORIES.length; i++) {
        h += '<button type="button" onclick="' + onSelectFn + '(\'' + CATEGORIES[i].id.replace(/'/g,"\\'") + '\', this)" class="cat-btn border-2 border-gray-300 rounded-lg p-2 text-xs text-gray-700 bg-white text-left">' + escapeHtml(CATEGORIES[i].id) + '</button>';
    }
    c.innerHTML = h;
}
function renderEditCategoryButtons() {
    var c = document.getElementById('edit-category-buttons'); if (!c) return;
    var h = '';
    for (var i = 0; i < CATEGORIES.length; i++) {
        h += '<button type="button" onclick="selectEditCategory(this)" class="edit-cat-btn border-2 border-gray-300 rounded-lg p-2 text-xs text-gray-700 bg-white text-left">' + escapeHtml(CATEGORIES[i].id) + '</button>';
    }
    c.innerHTML = h;
}
function renderProductCategorySelect() {
    var sel = document.getElementById('prod-category'); if (!sel) return;
    var h = '';
    for (var i = 0; i < PRODUCT_CATEGORIES.length; i++) {
        h += '<option value="' + escapeHtml(PRODUCT_CATEGORIES[i]) + '">' + escapeHtml(PRODUCT_CATEGORIES[i]) + '</option>';
    }
    h += '<option value="__autre__">Autre (préciser)</option>';
    sel.innerHTML = h;
}
function filterByCategory(catId) {
    if (activeCategory === catId) activeCategory = null;
    else activeCategory = catId;
    renderCategoriesStrip(); renderCategoryResults();
}
function renderCategoryResults() {
    var section = document.getElementById('category-results'); if (!section) return;
    if (!activeCategory) { section.classList.add('hidden'); return; }
    section.classList.remove('hidden');
    var title = document.getElementById('cat-results-title');
    if (title) title.textContent = 'Produits dans « ' + activeCategory + ' »';
    var products = [];
    for (var i = 0; i < shopsCatalog.length; i++) {
        var s = shopsCatalog[i];
        for (var j = 0; j < s.products.length; j++) {
            var p = s.products[j];
            var pcat = p.category || s.category;
            if (activeCategory === 'Autre') {
                var known = false;
                for (var k = 0; k < PRODUCT_CATEGORIES.length; k++) {
                    if (PRODUCT_CATEGORIES[k] === pcat) { known = true; break; }
                }
                if (!known) products.push({ shopIndex: i, productIndex: j, product: p, shop: s });
            } else {
                if (pcat === activeCategory) products.push({ shopIndex: i, productIndex: j, product: p, shop: s });
            }
        }
    }
    var grid = document.getElementById('cat-results-grid'); if (!grid) return;
    if (products.length === 0) {
        grid.innerHTML = '<div class="col-span-2 text-center py-8 text-gray-400 text-sm">' +
            'Cette catégorie n\'a pas encore de produit.<br>' +
            '<span class="text-xs">Revenez bientôt, ça se remplit vite !</span></div>';
        return;
    }
    var h = '';
    for (var i = 0; i < products.length && i < 30; i++) h += renderProductCard(products[i].shopIndex, products[i].productIndex, products[i].product, products[i].shop);
    grid.innerHTML = h;
}

/* =========================================================
   FEED DE PRODUITS
   ========================================================= */
function renderProductsFeed() {
    var feed = document.getElementById('products-feed');
    var counter = document.getElementById('products-feed-count');
    if (!feed) return;
    var allProducts = [];
    for (var i = 0; i < shopsCatalog.length; i++) {
        var s = shopsCatalog[i];
        for (var j = 0; j < s.products.length; j++) {
            allProducts.push({
                shopIndex: i, productIndex: j,
                product: s.products[j], shop: s,
                addedAt: s.products[j].addedAt || (Date.now() - j * 1000)
            });
        }
    }
    var _now = Date.now();
    allProducts.sort(function(a, b) {
        var ba = (a.product.boostedUntil || 0) > _now ? 1 : 0, bb = (b.product.boostedUntil || 0) > _now ? 1 : 0;
        if (ba !== bb) return bb - ba;
        return (b.addedAt || 0) - (a.addedAt || 0);
    });
    if (counter) counter.textContent = allProducts.length + ' produit' + (allProducts.length > 1 ? 's' : '');
    if (allProducts.length === 0) {
        feed.innerHTML = '<div class="col-span-2 text-center py-10 text-gray-400 text-sm">Aucun produit pour le moment.<br>Les nouvelles publications apparaîtront ici.</div>';
        return;
    }
    var h = '';
    for (var i = 0; i < allProducts.length; i++) {
        var it = allProducts[i];
        h += renderProductCard(it.shopIndex, it.productIndex, it.product, it.shop);
    }
    feed.innerHTML = h;
}
function renderProductCard(shopIndex, productIndex, product, shop) {
    var img = getProductMainImage(product);
    var badge = '';
    if ((product.stock || 0) <= 0) badge = '<span class="prod-badge out">RUPTURE</span>';
    else if ((product.boostedUntil || 0) > Date.now()) badge = '<span class="prod-badge sponsored">SPONSORISÉ</span>';
    else if (parseFloat(product.rating) >= 4.5) badge = '<span class="prod-badge top">TOP</span>';
    else if (parseInt(product.reviews) > 20) badge = '<span class="prod-badge popular">POPULAIRE</span>';
    var h = '<div onclick="openProductFromSearch(' + shopIndex + ',' + productIndex + ')" class="bg-white rounded-xl overflow-hidden border cursor-pointer relative">';
    h += badge;
    h += '<img src="' + img + '" class="w-full h-32 object-cover">';
    h += '<div class="p-3"><h4 class="font-bold text-gray-800 text-sm truncate">' + escapeHtml(product.name) + '</h4>';
    h += '<p class="text-orange-500 font-bold text-sm mt-1">' + product.price.toLocaleString('fr-FR') + ' FCFA</p>';
    h += '<p class="text-[10px] text-gray-400 truncate mt-0.5">' + escapeHtml(shop.name) + renderShopBadge(shop) + '</p></div></div>';
    return h;
}

/* =========================================================
   HISTORIQUE / RÉCEMMENT VUS / TIMELINE
   ========================================================= */
function addToSearchHistory(q) {
    if (!q || q.length < 2) return;
    for (var i = 0; i < searchHistory.length; i++) if (searchHistory[i].toLowerCase() === q.toLowerCase()) { searchHistory.splice(i, 1); break; }
    searchHistory.unshift(q);
    if (searchHistory.length > 10) searchHistory = searchHistory.slice(0, 10);
    _stateDirty = true;
}
function clearSearchHistory() { searchHistory = []; _stateDirty = true; doSearch(''); }
function renderSearchHistory() {
    var c = document.getElementById('search-results'); if (!c) return;
    var h = '';
    if (searchHistory.length > 0) {
        h += '<div class="flex justify-between items-center mb-2"><p class="text-xs font-bold text-gray-400 uppercase">Recherches récentes</p><button onclick="clearSearchHistory()" class="text-[11px] text-red-500 font-bold">Effacer</button></div><div class="mb-5">';
        for (var i = 0; i < searchHistory.length; i++) {
            var q = searchHistory[i];
            h += '<span class="search-tag" onclick="document.getElementById(\'search-input\').value=\'' + q.replace(/'/g,"\\'") + '\'; doSearch(\'' + q.replace(/'/g,"\\'") + '\')">' + escapeHtml(q) + '</span>';
        }
        h += '</div>';
    }
    h += '<p class="text-xs font-bold text-gray-400 uppercase mb-2">Suggestions</p>';
    var suggestions = ['Tomates', 'Téléphone', 'Robe', 'Wax', 'Samsung', 'Meuble'];
    h += '<div>';
    for (var i = 0; i < suggestions.length; i++) {
        h += '<span class="search-tag" onclick="document.getElementById(\'search-input\').value=\'' + suggestions[i] + '\'; doSearch(\'' + suggestions[i] + '\')">' + suggestions[i] + '</span>';
    }
    h += '</div>'; c.innerHTML = h;
}
function trackRecentlyViewed() {
    if (!_currentProductData) return;
    var key = _currentProductData.name + '|' + currentShopIndex;
    buyerTrophyViewedProducts[key] = true;
    for (var i = 0; i < recentlyViewed.length; i++) if (recentlyViewed[i].key === key) { recentlyViewed.splice(i, 1); break; }
    recentlyViewed.unshift({
        key: key, shopIndex: currentShopIndex,
        productName: _currentProductData.name, image: _currentProductData.image,
        price: _currentProductData.price, priceLabel: _currentProductData.priceLabel,
        at: Date.now()
    });
    if (recentlyViewed.length > 10) recentlyViewed = recentlyViewed.slice(0, 10);
    refreshBuyerTrophies();
    _stateDirty = true;
}
function renderRecentlyViewed() {
    var section = document.getElementById('recently-viewed-section');
    var strip = document.getElementById('recently-viewed-strip');
    if (!section || !strip) return;
    if (recentlyViewed.length === 0) { section.classList.add('hidden'); return; }
    section.classList.remove('hidden');
    var h = '';
    for (var i = 0; i < recentlyViewed.length; i++) {
        var rv = recentlyViewed[i];
        h += '<div onclick="openProductFromSearch(' + rv.shopIndex + ', findProductIndexByName(' + rv.shopIndex + ', \'' + rv.productName.replace(/'/g,"\\'") + '\'))" class="reorder-card">';
        h += '<img src="' + (rv.image || '') + '">';
        h += '<div class="p-2"><h4 class="font-bold text-[11px] truncate">' + escapeHtml(rv.productName) + '</h4>';
        h += '<p class="text-orange-500 font-bold text-xs mt-0.5">' + rv.priceLabel + '</p></div></div>';
    }
    strip.innerHTML = h;
}
function findProductIndexByName(shopIdx, name) {
    var s = shopsCatalog[shopIdx]; if (!s) return 0;
    for (var i = 0; i < s.products.length; i++) if (s.products[i].name === name) return i;
    return 0;
}
var TIMELINE_STEPS = [
    { step: 'created', label: 'Commande passée' }, { step: 'paid', label: 'Paiement en séquestre' },
    { step: 'seller_accepted', label: 'Acceptée par le vendeur' },
    { step: 'processing', label: 'En préparation' }, { step: 'shipped', label: 'Expédiée' },
    { step: 'delivered', label: 'Livrée' }, { step: 'completed', label: 'Terminée' }
];
function renderTimeline(order) {
    if (!order.timeline) return '';
    var reached = {};
    for (var i = 0; i < order.timeline.length; i++) reached[order.timeline[i].step] = order.timeline[i].at;
    var currentStep = 'created';
    for (var i = 0; i < TIMELINE_STEPS.length; i++) if (reached[TIMELINE_STEPS[i].step]) currentStep = TIMELINE_STEPS[i].step;
    var h = '<div class="order-timeline">';
    for (var i = 0; i < TIMELINE_STEPS.length; i++) {
        var st = TIMELINE_STEPS[i];
        var done = !!reached[st.step];
        var isCurrent = st.step === currentStep && order.status !== 'completed';
        var cls = isCurrent ? 'current' : (done ? 'done' : '');
        h += '<div class="tl-step"><span class="tl-dot ' + cls + '"></span>';
        h += '<p class="tl-label" style="' + (done ? '' : 'color:#9ca3af;') + '">' + st.label + '</p>';
        if (reached[st.step]) h += '<p class="tl-date">' + reached[st.step] + '</p>';
        h += '</div>';
    }
    h += '</div>'; return h;
}
function toggleOrderTimeline(orderId) {
    var el = document.getElementById('tl-' + orderId); if (el) el.classList.toggle('hidden');
}
function shareOrderOnWhatsApp(orderId) {
    var o = findBuyerOrder(orderId) || findSellerOrder(orderId); if (!o) return;
    var items = o.items.map(function(it) { return '- ' + it.qty + 'x ' + it.name; }).join('\n');
    var text = 'Commande Grand Marché\nN° : ' + o.id + '\nBoutique : ' + o.shopName + '\n\n' + items + '\n\nTotal : ' + o.total.toLocaleString('fr-FR') + ' FCFA\nStatut : ' + (getStatusInfo(o.status).label);
    if (navigator.share) {
        navigator.share({ title: 'Commande ' + o.id, text: text }).catch(function(){});
    } else {
        window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    }
}

/* =========================================================
   SYNC BOUTIQUE → CATALOGUE
   ========================================================= */
function syncMyShopToCatalog() {
    if (!myShop) return;
    var existingIdx = findMyCatalogIndex();
    var existing = existingIdx >= 0 ? shopsCatalog[existingIdx] : null;
    var entry = {
        name: myShop.shopName, initials: myShop.initials, logo: myShop.logo,
        category: myShop.category, colorBg: 'bg-orange-600',
        isCertified: !!myShop.isCertified,
        isGoldenCertified: !!myShop.isGoldenCertified,
        globalRating: existing ? existing.globalRating : 0,
        reviewsCount: existing ? existing.reviewsCount : 0,
        critDelivery: existing ? existing.critDelivery : 0,
        critQuality: existing ? existing.critQuality : 0,
        critBehavior: existing ? existing.critBehavior : 0,
        phone: myShop.phone, sixStarPoints: myShop.sixStarPoints || 0,
        ownerPhone: myShop.phone, address: myShop.address || 'Brazzaville',
        isMyShop: true, serverId: myShop.serverShopId || undefined,
        subscribers: existing ? (existing.subscribers || []) : [],
        products: (myShop.products || []).map(function(p) {
            return {
                name: p.name, category: p.category, price: p.price, stock: p.stock,
                image: p.image, images: p.images,
                rating: p.rating, reviews: p.reviews, desc: p.desc,
                hasDelivery: p.hasDelivery,
                hasWarranty: !!p.hasWarranty, warrantyText: p.warrantyText || '',
                addedAt: p.addedAt || Date.now(),
                boostedUntil: p.boostedUntil || 0, serverId: p.serverId
            };
        })
    };
    if (existingIdx >= 0) shopsCatalog[existingIdx] = entry;
    else shopsCatalog.push(entry);
    if (typeof GM !== 'undefined') GM.scheduleSync();
}

/* =========================================================
   NAVIGATION
   ========================================================= */
function showScreen(screenId) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) { screens[i].classList.add('hidden'); screens[i].style.opacity = '0'; }
    var t = document.getElementById(screenId);
    if (t) { t.classList.remove('hidden'); setTimeout(function() { t.style.opacity = '1'; }, 30); }

    if (screenId === 'seller-dashboard-screen') applyShopToDashboard();
    if (screenId === 'seller-orders-screen') { renderSellerOrders(); if (typeof GM !== 'undefined') GM.syncOrders().then(renderSellerOrders).catch(function(){}); }
    if (screenId === 'buyer-profile-screen') { getBuyerTrophyStats(); renderBuyerTrophies(); openBuyerProfile(); }
    if (screenId === 'buyer-trophies-screen') renderBuyerTrophies();
    if (screenId === 'seller-messages-screen') renderSellerMessages();
    if (screenId === 'seller-products-screen') renderMyProducts();
    if (screenId === 'buyer-wallet-screen') renderBuyerWallet();
    if (screenId === 'home-screen') { renderHomeTopShops(); renderCategoriesStrip(); renderRecentlyViewed(); renderProductsFeed(); }
    if (screenId === 'wallet-screen') { updateWalletUI(); renderWalletHistory(); }
    if (screenId === 'cart-screen') renderCartScreen();
    if (screenId === 'checkout-screen') renderCheckoutScreen();
    if (screenId === 'search-screen') setTimeout(function(){ var i = document.getElementById('search-input'); if (i) i.focus(); }, 150);

    updateNotificationsBadge(); updateMessageBadges();
    if (_stateDirty) { _stateDirty = false; saveState(); }
    if (!_noHistoryPush) { try { history.pushState({ screen: screenId }, '', '#' + screenId); } catch(e) {} }
}

/* =========================================================
   PORTEFEUILLE ACHETEUR
   ========================================================= */
function addBuyerTransaction(type, amount, label, orderId) {
    buyerWallet.transactions.unshift({
        id: orderId || generateTransactionId(),
        type: type, amount: amount, label: label, date: formatDateTime()
    });
    if (buyerWallet.transactions.length > 100) buyerWallet.transactions = buyerWallet.transactions.slice(0, 100);
    _stateDirty = true;
}
function addToBuyerEscrow(amount, orderId, shopName) {
    buyerWallet.balance = Math.max(0, (buyerWallet.balance || 0) - amount);
    buyerWallet.escrow = (buyerWallet.escrow || 0) + amount;
    addBuyerTransaction('escrow', amount, 'Séquestre — ' + shopName, orderId);
}
function releaseBuyerEscrow(amount, orderId, shopName) {
    buyerWallet.escrow = Math.max(0, (buyerWallet.escrow || 0) - amount);
    buyerWallet.totalSpent = (buyerWallet.totalSpent || 0) + amount;
    addBuyerTransaction('spent', amount, 'Dépensé — ' + shopName, orderId);
}
function refundBuyerEscrow(amount, orderId, shopName) {
    buyerWallet.escrow = Math.max(0, (buyerWallet.escrow || 0) - amount);
    buyerWallet.balance = (buyerWallet.balance || 0) + amount;
    buyerWallet.totalRefunded = (buyerWallet.totalRefunded || 0) + amount;
    addBuyerTransaction('refund', amount, 'Remboursé — ' + shopName, orderId);
}
function topUpBuyerWallet(amount, method) {
    buyerWallet.balance = (buyerWallet.balance || 0) + amount;
    addBuyerTransaction('topup', amount, 'Rechargement via ' + method);
}
function withdrawBuyerWallet(amount, method) {
    buyerWallet.balance = Math.max(0, (buyerWallet.balance || 0) - amount);
    addBuyerTransaction('withdraw', amount, 'Retrait via ' + method);
}
function renderBuyerWallet() {
    var balEl = document.getElementById('buyer-wallet-balance');
    if (balEl) balEl.textContent = (buyerWallet.balance || 0).toLocaleString('fr-FR') + ' FCFA';
    var escrowEl = document.getElementById('buyer-wallet-escrow');
    if (escrowEl) escrowEl.textContent = (buyerWallet.escrow || 0).toLocaleString('fr-FR') + ' FCFA';
    var spentEl = document.getElementById('buyer-wallet-spent');
    if (spentEl) spentEl.textContent = (buyerWallet.totalSpent || 0).toLocaleString('fr-FR') + ' FCFA';
    var refEl = document.getElementById('buyer-wallet-refunded');
    if (refEl) refEl.textContent = (buyerWallet.totalRefunded || 0).toLocaleString('fr-FR') + ' FCFA';

    var c = document.getElementById('buyer-wallet-history');
    if (!c) return;
    var tx = buyerWallet.transactions || [];
    if (tx.length === 0) { c.innerHTML = '<div class="text-center py-10 text-gray-400 text-sm">Aucune transaction pour le moment.</div>'; return; }
    var h = '';
    for (var i = 0; i < tx.length; i++) {
        var t = tx[i];
        var color, bg, sign, icon;
        if (t.type === 'topup') { color = 'text-green-600'; bg = 'bg-green-100'; sign = '+'; icon = 'REC'; }
        else if (t.type === 'withdraw') { color = 'text-red-500'; bg = 'bg-red-100'; sign = '-'; icon = 'RET'; }
        else if (t.type === 'escrow') { color = 'text-yellow-600'; bg = 'bg-yellow-100'; sign = ''; icon = 'ESC'; }
        else if (t.type === 'spent') { color = 'text-gray-600'; bg = 'bg-gray-100'; sign = '-'; icon = 'DEP'; }
        else if (t.type === 'refund') { color = 'text-green-600'; bg = 'bg-green-100'; sign = '+'; icon = 'REM'; }
        else { color = 'text-gray-600'; bg = 'bg-gray-100'; sign = ''; icon = 'TX'; }
        h += '<div class="bg-white rounded-xl p-3 flex items-center gap-3">';
        h += '<div class="' + bg + ' ' + color + ' rounded-full w-10 h-10 flex items-center justify-center font-bold text-[10px]">' + icon + '</div>';
        h += '<div class="flex-1 min-w-0"><p class="font-bold text-sm text-gray-800 truncate">' + escapeHtml(t.label) + '</p>';
        h += '<p class="text-[11px] text-gray-400 mt-0.5">' + (t.date || '') + '</p></div>';
        h += '<div class="text-right"><p class="font-bold text-sm ' + color + '">' + sign + ' ' + t.amount.toLocaleString('fr-FR') + ' F</p></div>';
        h += '</div>';
    }
    c.innerHTML = h;
}
function openBuyerWallet() {
    if (!hasBuyerAccount) { toast('Créez un compte acheteur.', 'error'); return; }
    renderBuyerWallet();
    showScreen('buyer-wallet-screen');
}
function openBuyerTopUp(returnScreen) {
    if (!hasBuyerAccount) { toast('Créez un compte acheteur.', 'error'); return; }
    _topupReturnScreen = returnScreen || 'buyer-wallet-screen';
    _topupMethod = 'mobile';
    _topupAmount = 0;
    var inp = document.getElementById('topup-amount'); if (inp) inp.value = '';
    var errEl = document.getElementById('topup-error'); if (errEl) errEl.classList.add('hidden');
    var bal = document.getElementById('topup-current-balance');
    if (bal) bal.textContent = (buyerWallet.balance || 0).toLocaleString('fr-FR') + ' FCFA';
    selectTopupMethod('mobile');
    updateTopupPreview();
    showScreen('buyer-topup-screen');
}
function setTopupAmount(v) {
    var inp = document.getElementById('topup-amount'); if (inp) { inp.value = v; updateTopupPreview(); }
}
function updateTopupPreview() {
    var inp = document.getElementById('topup-amount'); if (!inp) return;
    _topupAmount = parseInt(inp.value) || 0;
    var err = document.getElementById('topup-error'); if (!err) return;
    if (_topupAmount > 0 && _topupAmount < 500) { err.textContent = 'Montant minimum : 500 FCFA.'; err.classList.remove('hidden'); }
    else if (_topupAmount > 1000000) { err.textContent = 'Montant maximum : 1 000 000 FCFA.'; err.classList.remove('hidden'); }
    else err.classList.add('hidden');
}
function selectTopupMethod(m) {
    _topupMethod = m;
    var ms = ['mobile','airtel','card'];
    for (var i = 0; i < ms.length; i++) {
        var el = document.getElementById('topup-method-' + ms[i]); if (!el) continue;
        if (ms[i] === m) el.className = 'border-2 border-green-500 rounded-xl p-3 cursor-pointer flex items-center gap-3 bg-green-50';
        else el.className = 'border-2 border-gray-200 rounded-xl p-3 cursor-pointer flex items-center gap-3';
    }
}
function confirmTopUp() {
    if (_topupAmount < 500) { toast('Minimum 500 FCFA.', 'error'); return; }
    if (_topupAmount > 1000000) { toast('Maximum 1 000 000 FCFA.', 'error'); return; }
    var methodLabel = _topupMethod === 'mobile' ? 'MTN' : (_topupMethod === 'airtel' ? 'Airtel' : 'Carte bancaire');
    var amt = _topupAmount;
    startPaymentFlow({
        type: 'topup',
        method: _topupMethod,
        amount: amt,
        recipient: 'Rechargement portefeuille',
        returnScreen: 'buyer-topup-screen',
        onSuccess: function() {
            topUpBuyerWallet(amt, methodLabel);
            renderBuyerWallet();
            haptic([20, 40, 20]);
            toast('Portefeuille rechargé : +' + amt.toLocaleString('fr-FR') + ' FCFA', 'success', 4000);
            showScreen(_topupReturnScreen);
        }
    });
}
function openBuyerWithdraw() {
    if (!hasBuyerAccount) { toast('Créez un compte acheteur.', 'error'); return; }
    var bal = buyerWallet.balance || 0;
    if (bal < 500) { toast('Solde minimum pour retirer : 500 FCFA.\nVotre solde : ' + bal.toLocaleString('fr-FR') + ' FCFA', 'warn', 4000); return; }
    _buyerWithdrawMethod = 'mobile';
    var inp = document.getElementById('buyer-withdraw-amount'); if (inp) inp.value = '';
    var errEl = document.getElementById('buyer-withdraw-error'); if (errEl) errEl.classList.add('hidden');
    var balEl = document.getElementById('buyer-withdraw-balance');
    if (balEl) balEl.textContent = bal.toLocaleString('fr-FR') + ' FCFA';
    selectBuyerWithdrawMethod('mobile');
    updateBuyerWithdrawPreview();
    showScreen('buyer-withdraw-screen');
}
function selectBuyerWithdrawMethod(m) {
    _buyerWithdrawMethod = m;
    var ms = ['mobile','airtel','card'];
    for (var i = 0; i < ms.length; i++) {
        var el = document.getElementById('bwd-method-' + ms[i]); if (!el) continue;
        if (ms[i] === m) el.className = 'border-2 border-green-500 rounded-xl p-3 cursor-pointer flex items-center gap-3 bg-green-50';
        else el.className = 'border-2 border-gray-200 rounded-xl p-3 cursor-pointer flex items-center gap-3';
    }
}
function updateBuyerWithdrawPreview() {
    var inp = document.getElementById('buyer-withdraw-amount');
    var errEl = document.getElementById('buyer-withdraw-error');
    if (!inp || !errEl) return;
    var amount = parseInt(inp.value) || 0;
    var bal = buyerWallet.balance || 0;
    if (amount > 0 && amount < 500) { errEl.textContent = 'Minimum 500 FCFA.'; errEl.classList.remove('hidden'); }
    else if (amount > bal) { errEl.textContent = 'Solde insuffisant (disponible : ' + bal.toLocaleString('fr-FR') + ' FCFA).'; errEl.classList.remove('hidden'); }
    else errEl.classList.add('hidden');
}
function buyerWithdrawAll() {
    var bal = buyerWallet.balance || 0;
    if (bal < 500) { toast('Solde minimum : 500 FCFA.', 'warn'); return; }
    var inp = document.getElementById('buyer-withdraw-amount');
    if (inp) { inp.value = bal; updateBuyerWithdrawPreview(); }
}
function confirmBuyerWithdrawal() {
    var amount = parseInt((document.getElementById('buyer-withdraw-amount')||{}).value) || 0;
    var bal = buyerWallet.balance || 0;
    if (amount < 500) { toast('Minimum 500 FCFA.', 'error'); return; }
    if (amount > bal) { toast('Solde insuffisant.', 'error'); return; }
    var methodLabel = _buyerWithdrawMethod === 'mobile' ? 'MTN' : (_buyerWithdrawMethod === 'airtel' ? 'Airtel' : 'Carte bancaire');
    gmConfirm('Confirmer le retrait de ' + amount.toLocaleString('fr-FR') + ' FCFA ?\n\nVers : ' + methodLabel, 'Confirmation', { confirmText: 'Retirer' })
    .then(function(ok) {
        if (!ok) return;
        withdrawBuyerWallet(amount, methodLabel);
        renderBuyerWallet();
        toast('Retrait effectué : ' + amount.toLocaleString('fr-FR') + ' FCFA', 'success', 4000);
        showScreen('buyer-wallet-screen');
    });
}

/* =========================================================
   QR CODE / PARTAGE
   ========================================================= */
function getShopShareUrl(shop) {
    var base = (location.origin && location.origin !== 'null') ? location.origin + location.pathname : 'https://grandmarche.cg/app/';
    return base + '?shop=' + encodeURIComponent(shop.phone || shop.name);
}
function generateShopQR(shop, containerId) {
    var container = document.getElementById(containerId); if (!container) return;
    container.innerHTML = '';
    var url = getShopShareUrl(shop);
    if (typeof QRCode !== 'undefined') {
        try {
            new QRCode(container, { text: url, width: 240, height: 240, colorDark: '#15803D', colorLight: '#FFFFFF', correctLevel: QRCode.CorrectLevel.H });
            return;
        } catch (e) {}
    }
    var img = document.createElement('img');
    img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent(url) + '&color=15803D&bgcolor=FFFFFF';
    img.alt = 'QR ' + shop.name;
    img.style.width = '240px'; img.style.height = '240px'; img.style.borderRadius = '12px';
    container.appendChild(img);
}
function openShopQR() {
    var shop = shopsCatalog[currentShopIndex]; if (!shop) { toast('Boutique introuvable.', 'error'); return; }
    _qrShopIndex = currentShopIndex;
    var cur = document.querySelector('.screen:not(.hidden)');
    _qrOriginScreen = cur ? cur.id : 'shop-profile-screen';
    var n = document.getElementById('qr-shop-name'); if (n) n.textContent = shop.name;
    var c = document.getElementById('qr-shop-category');
    if (c) c.textContent = shop.category + (shop.isCertified ? ' · Certifiée' : '');
    var u = document.getElementById('qr-shop-url'); if (u) u.textContent = getShopShareUrl(shop);
    showScreen('shop-qr-screen');
    setTimeout(function () { generateShopQR(shop, 'shop-qr-container'); }, 120);
}
function openMyShopQR() {
    if (!myShop) { toast('Aucune boutique.', 'error'); return; }
    syncMyShopToCatalog();
    var idx = findMyCatalogIndex();
    if (idx < 0) { toast('Boutique introuvable.', 'error'); return; }
    currentShopIndex = idx;
    _qrOriginScreen = 'seller-dashboard-screen';
    _qrShopIndex = idx;
    var shop = shopsCatalog[idx];
    var n = document.getElementById('qr-shop-name'); if (n) n.textContent = shop.name;
    var c = document.getElementById('qr-shop-category');
    if (c) c.textContent = shop.category + (shop.isCertified ? ' · Certifiée' : '');
    var u = document.getElementById('qr-shop-url'); if (u) u.textContent = getShopShareUrl(shop);
    showScreen('shop-qr-screen');
    setTimeout(function () { generateShopQR(shop, 'shop-qr-container'); }, 120);
}
function closeShopQR() { showScreen(_qrOriginScreen || 'shop-profile-screen'); _qrShopIndex = -1; }
function _nativeShare(title, text, url) {
    if (navigator.share) {
        var payload = { title: title };
        if (text) payload.text = text + (url ? '\n' + url : '');
        else if (url) payload.url = url;
        navigator.share(payload).catch(function(){});
        return true;
    }
    return false;
}
function _copyToClipboard(text) {
    if (navigator.clipboard) {
        return navigator.clipboard.writeText(text).then(function() { return true; }).catch(function() { return false; });
    }
    return Promise.resolve(false);
}
function shareShopQR() {
    var shop = shopsCatalog[_qrShopIndex]; if (!shop) return;
    var url = getShopShareUrl(shop);
    var text = 'Découvrez ma boutique "' + shop.name + '" sur Grand Marché !';
    if (_nativeShare(shop.name, text, url)) return;
    _copyToClipboard(text + '\n' + url).then(function(ok) {
        if (ok) toast('Lien copié dans le presse-papier.', 'success');
        else window.open('https://wa.me/?text=' + encodeURIComponent(text + '\n' + url), '_blank');
    });
}
function downloadShopQR() {
    var container = document.getElementById('shop-qr-container'); if (!container) return;
    var canvas = container.querySelector('canvas'), img = container.querySelector('img');
    var dataUrl = null;
    if (canvas) dataUrl = canvas.toDataURL('image/png');
    else if (img) dataUrl = img.src;
    if (!dataUrl) { toast('QR non disponible.', 'error'); return; }
    var a = document.createElement('a');
    a.href = dataUrl;
    var shop = shopsCatalog[_qrShopIndex];
    a.download = 'qr-' + (shop ? shop.name.replace(/\s+/g, '-') : 'boutique') + '.png';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast('QR code téléchargé.', 'success');
}
function handleShopDeepLink() {
    var params = new URLSearchParams(location.search);
    var shopParam = params.get('shop'); if (!shopParam) return false;
    var map = {};
    for (var i = 0; i < shopsCatalog.length; i++) {
        var s = shopsCatalog[i];
        if (s.ownerPhone) map[s.ownerPhone] = i;
        else if (s.phone) map[s.phone] = i;
    }
    var idx = map[shopParam];
    if (idx === undefined) {
        for (var j = 0; j < shopsCatalog.length; j++) if (shopsCatalog[j].name === shopParam) { idx = j; break; }
    }
    if (idx === undefined) { toast('Boutique introuvable.', 'warn'); return false; }
    setTimeout(function () {
        hasBuyerAccount = true;
        showScreen('home-screen');
        setTimeout(function () { openShopProfile(idx); }, 300);
    }, 400);
    return true;
}

/* =========================================================
   CONDITIONS
   ========================================================= */
function requireTermsAcceptance(callback, returnScreen) {
    if (hasAcceptedTerms) { callback(); return; }
    pendingTermsCallback = callback;
    var cur = document.querySelector('.screen:not(.hidden)');
    termsReturnScreen = returnScreen || (cur ? cur.id : 'home-screen');
    var cb = document.getElementById('terms-checkbox'); if (cb) cb.checked = false;
    onTermsCheckboxChange();
    showScreen('terms-acceptance-screen');
}
function onTermsCheckboxChange() {
    var cb = document.getElementById('terms-checkbox'), btn = document.getElementById('terms-accept-btn');
    if (!cb || !btn) return;
    if (cb.checked) { btn.disabled = false; btn.className = 'w-full bg-green-600 text-white font-bold py-3 rounded-lg'; }
    else { btn.disabled = true; btn.className = 'w-full bg-gray-300 text-white font-bold py-3 rounded-lg cursor-not-allowed'; }
}
function acceptTerms() {
    var cb = document.getElementById('terms-checkbox');
    if (!cb || !cb.checked) { toast('Vous devez accepter les conditions.', 'error'); return; }
    hasAcceptedTerms = true; _stateDirty = true;
    var cb2 = pendingTermsCallback; pendingTermsCallback = null;
    var target = termsReturnScreen;
    showScreen(target);
    if (typeof cb2 === 'function') setTimeout(cb2, 250);
}
function cancelTermsAcceptance() { pendingTermsCallback = null; showScreen(termsReturnScreen); }

/* =========================================================
   PAIEMENT
   ========================================================= */
function startPaymentFlow(opts) {
    paymentFlow.type = opts.type || 'order';
    paymentFlow.method = opts.method || 'mobile';
    paymentFlow.amount = opts.amount || 0;
    paymentFlow.recipient = opts.recipient || '';
    paymentFlow.onSuccess = opts.onSuccess || null;
    paymentFlow.returnScreen = opts.returnScreen || 'checkout-screen';
    paymentFlow.pendingCartSnapshot = opts.pendingCartSnapshot || null;

    document.getElementById('payment-amount').textContent = paymentFlow.amount.toLocaleString('fr-FR') + ' FCFA';
    document.getElementById('payment-recipient').textContent = paymentFlow.recipient;

    document.getElementById('payment-step-mobile').classList.add('hidden');
    document.getElementById('payment-step-airtel').classList.add('hidden');
    document.getElementById('payment-step-card').classList.add('hidden');
    ['card-number','card-expiry','card-cvv','card-pin'].forEach(function(id) {
        var el = document.getElementById(id); if (el) el.value = '';
    });

    var title = document.getElementById('payment-flow-title');
    var phone = (userPhone || '06...');
    document.getElementById('payment-phone-momo').textContent = phone;
    document.getElementById('payment-phone-airtel').textContent = phone;

    if (paymentFlow.method === 'mobile') {
        title.textContent = 'MTN Mobile Money';
        document.getElementById('payment-step-mobile').classList.remove('hidden');
    } else if (paymentFlow.method === 'airtel') {
        title.textContent = 'Airtel Money';
        document.getElementById('payment-step-airtel').classList.remove('hidden');
    } else {
        title.textContent = 'Carte bancaire';
        document.getElementById('payment-step-card').classList.remove('hidden');
        setTimeout(function(){ var e = document.getElementById('card-number'); if (e) e.focus(); }, 200);
    }
    showScreen('payment-flow-screen');
}
function cancelPaymentFlow() {
    showScreen(paymentFlow.returnScreen);
    paymentFlow.onSuccess = null; paymentFlow.pendingCartSnapshot = null;
}
function initiateMobileMoney() { openOperatorConfirm('mobile', 'payment'); }
function initiateAirtelMoney() { openOperatorConfirm('airtel', 'payment'); }
function openOperatorConfirm(method, mode) {
    mode = mode || 'payment';
    var msg, title, shopPhone, shopName;
    if (mode === 'withdrawal') {
        var w = _withdrawContext; if (!w) return;
        var netFmt = w.net.toLocaleString('fr-FR'), amtFmt = w.amount.toLocaleString('fr-FR'), comFmt = w.commission.toLocaleString('fr-FR');
        shopPhone = '+242 ' + (myShop && myShop.phone ? myShop.phone : userPhone);
        title = 'Notification de retrait';
        msg = 'Vous RECEVEZ ' + netFmt + ' CFA sur votre compte ' + (method === 'mobile' ? 'MTN Mobile Money' : 'Airtel Money') + '.\n\nMontant retiré : ' + amtFmt + ' CFA\nCommission : ' + comFmt + ' CFA\n\nVeuillez entrer votre code PIN pour confirmer.';
    } else {
        var total = paymentFlow.amount.toLocaleString('fr-FR');
        shopName = paymentFlow.recipient;
        shopPhone = '+242 ' + (userPhone || '06...');
        if (myShop && myShop.phone) shopPhone = '+242 ' + myShop.phone;
        else if (shopsCatalog[currentShopIndex] && shopsCatalog[currentShopIndex].phone) shopPhone = '+242 ' + shopsCatalog[currentShopIndex].phone;
        title = 'Notification de paiement';
        msg = 'Vous ENVOYEZ ' + total + ' CFA à ' + shopName + ' au ' + shopPhone + '.\n\nVeuillez entrer votre code PIN pour confirmer la transaction.';
    }
    document.getElementById('operator-message').textContent = msg;
    document.getElementById('operator-subtitle').textContent = title;
    var badge = document.getElementById('operator-badge'), logoText = document.getElementById('operator-logo-text'), name = document.getElementById('operator-name');
    if (method === 'mobile') {
        badge.style.background = '#F59E0B';
        logoText.textContent = 'MTN'; logoText.style.background = '#FFCC00';
        name.textContent = 'MTN Mobile Money';
    } else {
        badge.style.background = '#E30613';
        logoText.textContent = 'AM'; logoText.style.background = '#FFFFFF';
        name.textContent = 'Airtel Money';
    }
    document.getElementById('operator-pin').value = '';
    var hint = document.getElementById('operator-hint');
    hint.textContent = 'Votre code est strictement confidentiel.';
    hint.style.color = '#9CA3AF';
    document.getElementById('operator-time').textContent = getTime();
    _operatorMode = mode;
    showScreen('operator-confirm-screen');
    setTimeout(function() { document.getElementById('operator-pin').focus(); }, 250);
}
function cancelOperatorConfirm() { showScreen(_operatorMode === 'withdrawal' ? 'withdraw-screen' : 'payment-flow-screen'); }
function submitOperatorPin() {
    var pin = document.getElementById('operator-pin').value.trim();
    if (!pin || pin.length < 4) { toast('Saisissez votre code secret (4 à 5 chiffres).', 'error'); return; }
    if (!/^\d{4,5}$/.test(pin)) { toast('Le code PIN doit contenir uniquement des chiffres.', 'error'); return; }
    var hint = document.getElementById('operator-hint');
    hint.textContent = 'Vérification en cours...'; hint.style.color = '#3B82F6';
    showLoading('Vérification...');
    setTimeout(function() {
        hideLoading();
        if (_operatorMode === 'withdrawal') { _completeWithdrawal(); }
        else {
            var opName = paymentFlow.method === 'mobile' ? 'MTN Mobile Money' : 'Airtel Money';
            var amount = paymentFlow.amount.toLocaleString('fr-FR');
            var ref = generateTransactionId();
            haptic([20, 40, 20]);
            toast('Paiement de ' + amount + ' FCFA confirmé (Réf : ' + ref + ')', 'success', 4000);
            _paymentSuccess(opName);
        }
    }, 1200);
}
function confirmCardPayment() {
    var num = document.getElementById('card-number').value.replace(/\s/g,'');
    var exp = document.getElementById('card-expiry').value.trim();
    var cvv = document.getElementById('card-cvv').value.trim();
    var pin = document.getElementById('card-pin').value.trim();
    if (num.length !== 16 || !/^\d{16}$/.test(num)) { toast('Numéro de carte invalide (16 chiffres).', 'error'); return; }
    if (!/^\d{2}\/\d{2}$/.test(exp)) { toast('Date d\'expiration invalide (MM/AA).', 'error'); return; }
    if (cvv.length < 3) { toast('CVV invalide (3 chiffres).', 'error'); return; }
    if (pin.length < 6 || !/^\d{6}$/.test(pin)) { toast('Code 3D Secure invalide (6 chiffres).', 'error'); return; }
    showLoading('Traitement bancaire...');
    setTimeout(function() {
        hideLoading(); haptic(40);
        toast('Paiement par carte accepté', 'success', 3000);
        _paymentSuccess('Banque');
    }, 1400);
}
function _paymentSuccess(source) {
    var cb = paymentFlow.onSuccess;
    paymentFlow.onSuccess = null; paymentFlow.pendingCartSnapshot = null;
    var returnTarget = paymentFlow.returnScreen;
    if (typeof cb === 'function') { showScreen(returnTarget); setTimeout(cb, 250); }
    else showScreen(returnTarget);
}
document.addEventListener('input', function(e) {
    if (!e.target) return;
    if (e.target.id === 'card-number') {
        var v = e.target.value.replace(/\D/g,'').substring(0,16);
        e.target.value = v.replace(/(.{4})/g, '$1 ').trim();
    }
    if (e.target.id === 'card-expiry') {
        var v = e.target.value.replace(/\D/g,'').substring(0,4);
        if (v.length >= 3) e.target.value = v.substring(0,2) + '/' + v.substring(2);
        else e.target.value = v;
    }
    if (e.target.id === 'operator-pin') e.target.value = e.target.value.replace(/\D/g,'').substring(0,5);
    if (e.target.id === 'prod-warranty-custom') e.target.value = e.target.value.replace(/[<>]/g, '').substring(0, 80);
});

/* ===== GARANTIE PRODUIT ===== */
function toggleProductWarranty() {
    var cb = document.getElementById('prod-warranty'), fields = document.getElementById('prod-warranty-fields');
    if (!cb || !fields) return;
    if (cb.checked) fields.classList.remove('hidden');
    else {
        fields.classList.add('hidden');
        var preset = document.getElementById('prod-warranty-preset'); if (preset) preset.value = '';
        var custom = document.getElementById('prod-warranty-custom'); if (custom) { custom.value = ''; custom.classList.add('hidden'); }
    }
}
function onWarrantyPresetChange() {
    var preset = document.getElementById('prod-warranty-preset'), custom = document.getElementById('prod-warranty-custom');
    if (!preset || !custom) return;
    if (preset.value === '__custom__') { custom.classList.remove('hidden'); custom.focus(); }
    else { custom.classList.add('hidden'); custom.value = ''; }
}
function getWarrantyTextFromForm() {
    var cb = document.getElementById('prod-warranty');
    if (!cb || !cb.checked) return { hasW: false, text: '' };
    var preset = document.getElementById('prod-warranty-preset'), custom = document.getElementById('prod-warranty-custom');
    if (preset && preset.value === '__custom__') {
        var txt = custom ? custom.value.trim() : '';
        if (txt.length < 5) return { hasW: true, text: '', error: 'Le texte de garantie doit contenir au moins 5 caractères.' };
        if (txt.length > 80) return { hasW: true, text: '', error: 'Le texte ne doit pas dépasser 80 caractères.' };
        if (!/[a-zA-ZÀ-ÿ]/.test(txt)) return { hasW: true, text: '', error: 'Le texte doit contenir des lettres.' };
        return { hasW: true, text: txt };
    } else if (preset && preset.value) return { hasW: true, text: preset.value };
    return { hasW: true, text: '', error: 'Choisissez une garantie dans la liste.' };
}
function selectProductDelivery(mode) {
    var hidden = document.getElementById('prod-delivery-mode'); if (hidden) hidden.value = mode;
    var home = document.getElementById('prod-delivery-home'), pickup = document.getElementById('prod-delivery-pickup');
    if (!home || !pickup) return;
    if (mode === 'home') {
        home.className = 'border-2 border-orange-500 rounded-lg p-3 cursor-pointer flex items-center gap-3 bg-orange-50';
        pickup.className = 'border-2 border-gray-200 rounded-lg p-3 cursor-pointer flex items-center gap-3 bg-white';
    } else {
        pickup.className = 'border-2 border-orange-500 rounded-lg p-3 cursor-pointer flex items-center gap-3 bg-orange-50';
        home.className = 'border-2 border-gray-200 rounded-lg p-3 cursor-pointer flex items-center gap-3 bg-white';
    }
}

/* ===== LOCALISATION ===== */
function detectLocation() {
    var el = document.getElementById('user-location'); if (!el) return;
    el.textContent = 'Localisation...';
    var done = false;
    function setCity(city) { if (done) return; done = true; el.textContent = city || 'Congo'; }
    setTimeout(function() { if (!done) fallbackIP(setCity); }, 8000);
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(pos) {
                fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + pos.coords.latitude + '&lon=' + pos.coords.longitude + '&accept-language=fr&zoom=10')
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        var city = '';
                        if (data.address) city = data.address.city || data.address.town || data.address.village || data.address.county || data.address.state;
                        setCity(city);
                    }).catch(function() { fallbackIP(setCity); });
            },
            function() { fallbackIP(setCity); }, { timeout: 6000, enableHighAccuracy: false }
        );
    } else fallbackIP(setCity);
}
function fallbackIP(setCity) {
    fetch('https://ipapi.co/json/').then(function(r) { return r.json(); }).then(function(d) {
        if (d.city) setCity(d.city); else if (d.region) setCity(d.region); else fallbackIP2(setCity);
    }).catch(function() { fallbackIP2(setCity); });
}
function fallbackIP2(setCity) {
    fetch('https://ip-api.com/json/').then(function(r) { return r.json(); }).then(function(d) {
        setCity(d.city || d.regionName || 'Congo');
    }).catch(function() { setCity('Congo'); });
}

/* =========================================================
   RECADRAGE PHOTO
   ========================================================= */
function getCropFrameSize(ratio) {
    var maxW = Math.min(280, Math.floor(window.innerWidth * 0.75));
    var maxH = Math.min(280, Math.floor(window.innerHeight * 0.5));
    var base = Math.min(maxW, maxH);
    if (ratio === 'rect') return { w: base, h: Math.round(base * 0.62) };
    return { w: base, h: base };
}
function openCropScreen(ratio, imgSrc) {
    var cur = document.querySelector('.screen:not(.hidden)');
    cropReturnScreen = cur ? cur.id : null;
    cropImg = new Image(); cropZoom = 1; cropOffset = { x: 0, y: 0 }; cropRatio = ratio;
    setCropRatioFrame(ratio); setCropRatioButton(ratio);
    var slider = document.getElementById('crop-zoom'); if (slider) slider.value = 1;
    var imgEl = document.getElementById('crop-image');
    if (imgEl) {
        imgEl.src = ''; imgEl.style.width = ''; imgEl.style.height = '';
        delete imgEl.dataset.baseWidth; delete imgEl.dataset.baseHeight;
    }
    showScreen('crop-screen');
    cropImg.onload = function() {
        if (imgEl) imgEl.src = imgSrc;
        requestAnimationFrame(function() { layoutCropImage(); setupCropDrag(); });
    };
    cropImg.onerror = function() { toast('Impossible de charger l\'image.', 'error'); cancelCrop(); };
    cropImg.src = imgSrc;
}
function layoutCropImage() {
    if (!cropImg || !cropImg.width || !cropImg.height) return;
    var img = document.getElementById('crop-image'); if (!img) return;
    var size = getCropFrameSize(cropRatio);
    var scale = Math.max(size.w / cropImg.width, size.h / cropImg.height);
    var dW = cropImg.width * scale, dH = cropImg.height * scale;
    img.style.width = dW + 'px'; img.style.height = dH + 'px';
    img.dataset.baseWidth = dW; img.dataset.baseHeight = dH;
    updateCropTransform();
}
function setCropRatioFrame(ratio) {
    var frame = document.getElementById('crop-frame'); if (!frame) return;
    var size = getCropFrameSize(ratio);
    frame.style.width = size.w + 'px'; frame.style.height = size.h + 'px';
    frame.style.borderRadius = ratio === 'circle' ? '50%' : (ratio === 'square' ? '16px' : '12px');
}
function setCropRatio(ratio) {
    cropRatio = ratio; setCropRatioFrame(ratio); setCropRatioButton(ratio);
    cropZoom = 1; cropOffset = { x: 0, y: 0 };
    var slider = document.getElementById('crop-zoom'); if (slider) slider.value = 1;
    requestAnimationFrame(layoutCropImage);
}
function setCropRatioButton(ratio) {
    ['square','circle','rect'].forEach(function(r) {
        var btn = document.getElementById('crop-ratio-'+r); if (!btn) return;
        btn.className = r === ratio ? 'px-3 py-1.5 rounded-full bg-orange-500 font-bold' : 'px-3 py-1.5 rounded-full bg-gray-700';
    });
}
function updateCropZoom(val) { cropZoom = parseFloat(val); clampCropOffset(); updateCropTransform(); }
function adjustCropZoom(delta) {
    var s = document.getElementById('crop-zoom'); if (!s) return;
    var nv = Math.max(1, Math.min(3, parseFloat(s.value) + delta));
    s.value = nv; updateCropZoom(nv);
}
function clampCropOffset() {
    var img = document.getElementById('crop-image'); if (!img) return;
    var bw = parseFloat(img.dataset.baseWidth), bh = parseFloat(img.dataset.baseHeight);
    if (!bw || !bh) return;
    var size = getCropFrameSize(cropRatio);
    var mx = Math.max(0, (bw * cropZoom - size.w) / 2);
    var my = Math.max(0, (bh * cropZoom - size.h) / 2);
    cropOffset.x = Math.max(-mx, Math.min(mx, cropOffset.x));
    cropOffset.y = Math.max(-my, Math.min(my, cropOffset.y));
}
function updateCropTransform() {
    var img = document.getElementById('crop-image'); if (!img) return;
    img.style.transform = 'translate(-50%, -50%) translate(' + cropOffset.x + 'px, ' + cropOffset.y + 'px) scale(' + cropZoom + ')';
}
var _cropPointers = {}, _cropDragState = null, _cropPinchState = null;
function setupCropDrag() {
    var area = document.getElementById('crop-area'); if (!area) return;
    _cropPointers = {}; _cropDragState = null; _cropPinchState = null;
    area.style.cursor = 'grab';
    area.onpointerdown = onCropPointerDown;
    area.onpointermove = onCropPointerMove;
    area.onpointerup = onCropPointerUp;
    area.onpointercancel = onCropPointerUp;
}
function onCropPointerDown(e) {
    var area = document.getElementById('crop-area');
    if (e.target.closest('input') || e.target.closest('button')) return;
    _cropPointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    try { area.setPointerCapture(e.pointerId); } catch(err) {}
    var ids = Object.keys(_cropPointers);
    if (ids.length === 1) {
        _cropDragState = { startX: e.clientX, startY: e.clientY, startOffX: cropOffset.x, startOffY: cropOffset.y };
        area.style.cursor = 'grabbing';
    } else if (ids.length === 2) {
        _cropDragState = null;
        var p1 = _cropPointers[ids[0]], p2 = _cropPointers[ids[1]];
        var dx = p2.x - p1.x, dy = p2.y - p1.y;
        _cropPinchState = { startDist: Math.sqrt(dx*dx + dy*dy) || 1, startZoom: cropZoom };
    }
    e.preventDefault();
}
function onCropPointerMove(e) {
    if (!_cropPointers[e.pointerId]) return;
    _cropPointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(_cropPointers);
    if (ids.length >= 2 && _cropPinchState) {
        var p1 = _cropPointers[ids[0]], p2 = _cropPointers[ids[1]];
        var dx = p2.x - p1.x, dy = p2.y - p1.y;
        var dist = Math.sqrt(dx*dx + dy*dy) || 1;
        cropZoom = Math.max(1, Math.min(3, _cropPinchState.startZoom * (dist / _cropPinchState.startDist)));
        var s = document.getElementById('crop-zoom'); if (s) s.value = cropZoom;
        clampCropOffset(); updateCropTransform();
    } else if (_cropDragState) {
        cropOffset.x = _cropDragState.startOffX + (e.clientX - _cropDragState.startX);
        cropOffset.y = _cropDragState.startOffY + (e.clientY - _cropDragState.startY);
        clampCropOffset(); updateCropTransform();
    }
    e.preventDefault();
}
function onCropPointerUp(e) {
    var area = document.getElementById('crop-area');
    delete _cropPointers[e.pointerId];
    try { area.releasePointerCapture(e.pointerId); } catch(err) {}
    var ids = Object.keys(_cropPointers);
    if (ids.length < 2) _cropPinchState = null;
    if (ids.length === 0) { _cropDragState = null; area.style.cursor = 'grab'; }
    else if (ids.length === 1) {
        var p = _cropPointers[ids[0]];
        _cropDragState = { startX: p.x, startY: p.y, startOffX: cropOffset.x, startOffY: cropOffset.y };
    }
}
function cancelCrop() {
    cropImageData = null; cropCallback = null;
    _cropPointers = {}; _cropDragState = null; _cropPinchState = null;
    pendingPhotoQueue = [];
    var target = cropReturnScreen; cropReturnScreen = null;
    if (target) { showScreen(target); return; }
    if (cropMode === 'logo') { if (myShop) showScreen('seller-dashboard-screen'); else showScreen('seller-register-screen'); }
    else if (cropMode === 'product') showScreen('add-product-screen');
    else if (cropMode === 'buyer') showScreen('edit-buyer-profile-screen');
    else showScreen('home-screen');
}
function applyCrop() {
    if (!cropImg || !cropImg.width) { toast('L\'image n\'est pas prête.', 'error'); return; }
    var img = document.getElementById('crop-image');
    if (!img || !img.dataset.baseWidth) { toast('Erreur : image non initialisée.', 'error'); return; }
    var bw = parseFloat(img.dataset.baseWidth), bh = parseFloat(img.dataset.baseHeight);
    var fw = bw * cropZoom, fh = bh * cropZoom;
    var size = getCropFrameSize(cropRatio);
    var dx = fw / 2 - size.w / 2 - cropOffset.x;
    var dy = fh / 2 - size.h / 2 - cropOffset.y;
    var ts = (bw / cropImg.width) * cropZoom;
    var sx = dx / ts, sy = dy / ts, sw = size.w / ts, sh = size.h / ts;
    sx = Math.max(0, Math.min(cropImg.width - sw, sx));
    sy = Math.max(0, Math.min(cropImg.height - sh, sy));
    if (sx + sw > cropImg.width) sw = cropImg.width - sx;
    if (sy + sh > cropImg.height) sh = cropImg.height - sy;
    var maxSize = 600, outW, outH;
    if (cropRatio === 'rect') { outW = Math.min(maxSize, sw); outH = Math.round(outW * sh / sw); }
    else { var ref = Math.min(sw, sh); outW = Math.min(maxSize, ref); outH = Math.min(maxSize, ref); }
    var canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(outW));
    canvas.height = Math.max(1, Math.round(outH));
    var ctx = canvas.getContext('2d');
    if (cropRatio !== 'circle') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    if (cropRatio === 'circle') {
        ctx.save();
        ctx.beginPath();
        ctx.arc(canvas.width/2, canvas.height/2, Math.min(canvas.width, canvas.height)/2, 0, Math.PI*2);
        ctx.clip();
    }
    ctx.drawImage(cropImg, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    if (cropRatio === 'circle') ctx.restore();
    var result;
    try {
        var mime = (cropRatio === 'circle') ? 'image/png' : 'image/jpeg';
        result = (mime === 'image/jpeg') ? canvas.toDataURL(mime, 0.9) : canvas.toDataURL(mime);
    } catch (err) { result = canvas.toDataURL(); }
    if (cropCallback) cropCallback(result);
    cropImageData = null; cropCallback = null;
    _cropPointers = {}; _cropDragState = null; _cropPinchState = null;
    var target = cropReturnScreen; cropReturnScreen = null;
    if (target) { showScreen(target); return; }
    if (cropMode === 'logo') { if (myShop) showScreen('seller-dashboard-screen'); else showScreen('seller-register-screen'); }
    else if (cropMode === 'product') showScreen('add-product-screen');
    else if (cropMode === 'buyer') showScreen('edit-buyer-profile-screen');
    else showScreen('home-screen');
}

/* =========================================================
   UPLOADS
   ========================================================= */
function handleLogoUpload(input) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];
    if (file.size > 15*1024*1024) { toast('Image trop lourde (max 15 Mo).', 'error'); input.value=''; return; }
    var reader = new FileReader();
    reader.onload = function(e) {
        cropMode = 'logo';
        cropCallback = function(url) {
            pendingLogoData = url;
            var img = document.getElementById('shop-logo-img'), ini = document.getElementById('shop-logo-initials');
            if (img) { img.src = url; img.classList.remove('hidden'); }
            if (ini) ini.classList.add('hidden');
        };
        openCropScreen('circle', e.target.result);
    };
    reader.readAsDataURL(file);
}
function handleProductPhotosUpload(input) {
    if (!input.files || input.files.length === 0) return;
    var files = Array.prototype.slice.call(input.files); input.value = '';
    var valid = [], rejected = 0;
    for (var i = 0; i < files.length; i++) {
        if (files[i].size > 15 * 1024 * 1024) { rejected++; continue; }
        valid.push(files[i]);
    }
    if (rejected > 0) toast(rejected + ' image(s) ignorée(s) (> 15 Mo).', 'warn');
    if (valid.length === 0) return;
    pendingPhotoQueue = valid;
    processNextProductPhoto();
}
function processNextProductPhoto() {
    if (pendingPhotoQueue.length === 0) { renderPendingGallery(); return; }
    var file = pendingPhotoQueue.shift();
    var reader = new FileReader();
    reader.onload = function(e) {
        cropMode = 'product';
        cropCallback = function(url) {
            pendingProductImages.push(url);
            renderPendingGallery();
            setTimeout(processNextProductPhoto, 200);
        };
        openCropScreen('square', e.target.result);
    };
    reader.readAsDataURL(file);
}
function renderPendingGallery() {
    var c = document.getElementById('prod-photo-gallery'); if (!c) return;
    if (pendingProductImages.length === 0) { c.innerHTML = ''; return; }
    var h = '';
    for (var i = 0; i < pendingProductImages.length; i++) {
        h += '<div class="relative rounded-lg overflow-hidden bg-gray-100" style="aspect-ratio:1;">';
        h += '<img src="' + pendingProductImages[i] + '" class="w-full h-full object-cover">';
        h += '<button type="button" onclick="removePendingImage(' + i + ')" class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow">x</button>';
        if (i === 0) h += '<span class="absolute bottom-1 left-1 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Principale</span>';
        h += '</div>';
    }
    c.innerHTML = h;
}
function removePendingImage(i) { pendingProductImages.splice(i, 1); renderPendingGallery(); }
function resetProductForm() {
    pendingProductImages = []; pendingPhotoQueue = [];
    renderPendingGallery();
    ['prod-name','prod-price','prod-stock','prod-desc'].forEach(function(id) {
        var e = document.getElementById(id); if (e) e.value = '';
    });
    var cc = document.getElementById('prod-category-custom'); if (cc) { cc.value = ''; cc.classList.add('hidden'); }
    var pc = document.getElementById('prod-category'); if (pc) pc.value = PRODUCT_CATEGORIES[0];
    var mode = document.getElementById('prod-delivery-mode'); if (mode) mode.value = '';
    var home = document.getElementById('prod-delivery-home'), pickup = document.getElementById('prod-delivery-pickup');
    if (home) home.className = 'border-2 border-gray-200 rounded-lg p-3 cursor-pointer flex items-center gap-3 bg-white';
    if (pickup) pickup.className = 'border-2 border-gray-200 rounded-lg p-3 cursor-pointer flex items-center gap-3 bg-white';
    var w = document.getElementById('prod-warranty'); if (w) w.checked = false;
    var fields = document.getElementById('prod-warranty-fields'); if (fields) fields.classList.add('hidden');
    var preset = document.getElementById('prod-warranty-preset'); if (preset) preset.value = '';
    var custom = document.getElementById('prod-warranty-custom'); if (custom) { custom.value = ''; custom.classList.add('hidden'); }
}
function onProductCategoryChange() {
    var sel = document.getElementById('prod-category'), custom = document.getElementById('prod-category-custom');
    if (!sel || !custom) return;
    if (sel.value === '__autre__') custom.classList.remove('hidden');
    else custom.classList.add('hidden');
}
function promptProductUrl() {
    gmPrompt('Collez le lien de l\'image (https://...) :', '', 'Lien image').then(function(url) {
        if (!url) return;
        if (url.indexOf('http') !== 0) { toast('Lien invalide.', 'error'); return; }
        pendingProductImages.push(url); renderPendingGallery();
    });
}
function promptLogoUrl() {
    gmPrompt('Collez le lien de l\'image (https://...) :', '', 'Lien logo').then(function(url) {
        if (!url) return;
        if (url.indexOf('http') !== 0) { toast('Lien invalide.', 'error'); return; }
        pendingLogoData = url;
        var img = document.getElementById('shop-logo-img'), ini = document.getElementById('shop-logo-initials');
        if (img) { img.src = url; img.classList.remove('hidden'); }
        if (ini) ini.classList.add('hidden');
    });
}
function updateShopLogoInitials() {
    if (pendingLogoData) return;
    var sn = document.getElementById('sel-shop-name');
    var name = sn ? sn.value.trim() : '';
    var initials = name ? name.split(' ').map(function(w) { return w[0]; }).join('').substring(0, 2).toUpperCase() : '?';
    var el = document.getElementById('shop-logo-initials'); if (el) el.textContent = initials;
}
function renderLogo(imgId, iniId, logoData, initials) {
    var img = document.getElementById(imgId), ini = document.getElementById(iniId);
    if (logoData && img) { img.src = logoData; img.classList.remove('hidden'); if (ini) ini.classList.add('hidden'); }
    else {
        if (img) img.classList.add('hidden');
        if (ini) { ini.textContent = initials || '?'; ini.classList.remove('hidden'); }
    }
}
function renderHomeLogos() { renderHomeTopShops(); }
function renderHomeTopShops() {
    var c = document.getElementById('home-top-shops'); if (!c) return;
    var cards = [
        { border: 'border-yellow-300', bg: 'from-yellow-50 to-yellow-100', medal: 'medal-1' },
        { border: 'border-gray-300',   bg: 'from-gray-50 to-gray-100',     medal: 'medal-2' },
        { border: 'border-orange-300', bg: 'from-orange-50 to-orange-100', medal: 'medal-3' }
    ];
    var h = '';
    for (var i = 0; i < shopsCatalog.length && i < 3; i++) {
        var s = shopsCatalog[i], cfg = cards[i];
        var logoHtml = s.logo ? '<img src="' + s.logo + '" class="w-full h-full object-cover">' : escapeHtml(s.initials);
        h += '<div onclick="openShopProfile(' + i + ')" class="bg-gradient-to-r ' + cfg.bg + ' border-2 ' + cfg.border + ' rounded-xl p-3 cursor-pointer flex items-center gap-3 mb-2">';
        h += '<div class="relative"><div class="' + s.colorBg + ' text-white rounded-full w-12 h-12 flex items-center justify-center font-bold overflow-hidden">' + logoHtml + '</div>';
        h += '<span class="medal ' + cfg.medal + ' absolute -top-2 -left-2">' + (i + 1) + '</span></div>';
        h += '<div class="flex-1"><h4 class="font-bold text-gray-800 text-sm flex items-center min-w-0"><span class="truncate">' + escapeHtml(s.name) + '</span>' + renderShopBadge(s) + '</h4>';
        h += '<p class="text-xs text-gray-500">' + escapeHtml(s.category) + '</p>';
        h += '<div class="text-xs mt-1 text-yellow-500">' + renderStars(s.globalRating) + ' <span class="text-gray-500 font-bold">' + (s.globalRating || 0) + '/6</span></div></div></div>';
    }
    c.innerHTML = h;
}

/* =========================================================
   FAVORIS / PROFILS
   ========================================================= */
function isFavorite(shopIndex, productName) {
    for (var i = 0; i < favoriteProducts.length; i++) if (favoriteProducts[i].shopIndex === shopIndex && favoriteProducts[i].productName === productName) return true;
    return false;
}
function toggleFavorite() {
    if (!_currentProductData) return;
    var idx = currentShopIndex, name = _currentProductData.name;
    for (var i = 0; i < favoriteProducts.length; i++) {
        if (favoriteProducts[i].shopIndex === idx && favoriteProducts[i].productName === name) {
            favoriteProducts.splice(i, 1);
            toast('Retiré de vos coups de cœur', 'info');
            _stateDirty = true; updateFavoriteBtn();
            renderBuyerFavorites();
            return;
        }
    }
    favoriteProducts.push({ shopIndex: idx, productName: name });
    refreshBuyerTrophies();
    haptic(30);
    toast('Ajouté à vos coups de cœur ❤️', 'success');
    _stateDirty = true; updateFavoriteBtn();
}
function updateFavoriteBtn() {
    var btn = document.getElementById('fav-product-btn');
    if (!btn || !_currentProductData) return;
    var fav = isFavorite(currentShopIndex, _currentProductData.name);
    btn.innerHTML = fav ? '&#9829;' : '&#9825;';
    btn.className = fav ? 'text-red-500 text-2xl' : 'text-gray-400 text-2xl';
}

/* ===== MES FAVORIS ===== */
function openBuyerFavorites() {
    if (!hasBuyerAccount) { toast('Créez un compte acheteur.', 'error'); return; }
    renderBuyerFavorites();
    showScreen('buyer-favorites-screen');
}
function renderBuyerFavorites() {
    var grid = document.getElementById('buyer-favorites-grid'); if (!grid) return;
    var summary = document.getElementById('buyer-favorites-summary');
    if (summary) summary.textContent = favoriteProducts.length + ' produit' + (favoriteProducts.length>1?'s':'') + ' favori' + (favoriteProducts.length>1?'s':'');
    if (favoriteProducts.length === 0) {
        grid.innerHTML = '<div class="col-span-2 text-center py-12 text-gray-400 text-sm">' +
            'Pas encore de coup de cœur.<br>' +
            '<span class="text-xs">Touchez ♥ sur un produit pour le garder ici.</span></div>';
        return;
    }
    var h = '';
    for (var i = 0; i < favoriteProducts.length; i++) {
        var f = favoriteProducts[i];
        var s = shopsCatalog[f.shopIndex]; if (!s) continue;
        var pIdx = -1;
        for (var j = 0; j < s.products.length; j++) if (s.products[j].name === f.productName) { pIdx = j; break; }
        if (pIdx < 0) continue;
        var p = s.products[pIdx];
        var img = getProductMainImage(p);
        h += '<div class="bg-white rounded-xl overflow-hidden border relative">';
        h += '<button onclick="event.stopPropagation(); removeFavoriteFromList(' + i + ')" class="absolute top-1 right-1 z-10 bg-white bg-opacity-90 rounded-full w-7 h-7 flex items-center justify-center text-red-500 text-sm font-bold shadow">×</button>';
        h += '<div onclick="openProductFromSearch(' + f.shopIndex + ',' + pIdx + ')" class="cursor-pointer">';
        h += '<img src="' + img + '" class="w-full h-32 object-cover">';
        h += '<div class="p-3"><h4 class="font-bold text-gray-800 text-sm truncate">' + escapeHtml(p.name) + '</h4>';
        h += '<p class="text-orange-500 font-bold text-sm mt-1">' + p.price.toLocaleString('fr-FR') + ' FCFA</p>';
        h += '<p class="text-[10px] text-gray-400 truncate mt-0.5">' + escapeHtml(s.name) + renderShopBadge(s) + '</p></div></div></div>';
    }
    grid.innerHTML = h;
}
function removeFavoriteFromList(i) {
    if (i < 0 || i >= favoriteProducts.length) return;
    favoriteProducts.splice(i, 1);
    _stateDirty = true;
    refreshBuyerTrophies();
    renderBuyerFavorites();
    toast('Retiré de vos coups de cœur', 'info');
}

/* ===== PARRAINAGE ===== */
function getReferralCode() {
    var phone = (userPhone || '').replace(/\D/g, '');
    var tail = phone.slice(-4) || '0000';
    return 'GM' + tail;
}
function openBuyerReferral() {
    if (!hasBuyerAccount) { toast('Créez un compte acheteur.', 'error'); return; }
    renderReferralScreen();
    showScreen('buyer-referral-screen');
}
function renderReferralScreen() {
    var code = getReferralCode();
    var codeEl = document.getElementById('referral-code-display');
    if (codeEl) codeEl.textContent = code;
    var count = buyerReferrals.length;
    var countEl = document.getElementById('referral-count');
    if (countEl) countEl.textContent = count + ' filleul' + (count>1?'s':'');
    var list = document.getElementById('referral-list');
    if (list) {
        if (count === 0) {
            list.innerHTML = '<p class="text-xs text-gray-400 text-center py-3">Personne encore… partagez votre code pour commencer 🌱</p>';
        } else {
            var h = '';
            for (var i = 0; i < buyerReferrals.length; i++) {
                var r = buyerReferrals[i];
                h += '<div class="flex items-center gap-2 py-2 border-b last:border-b-0">';
                h += '<div class="bg-green-100 text-green-600 rounded-full w-8 h-8 flex items-center justify-center font-bold text-xs">' + getInitials(r.name) + '</div>';
                h += '<div class="flex-1"><p class="font-bold text-xs">' + escapeHtml(r.name) + '</p>';
                h += '<p class="text-[10px] text-gray-400">' + (r.date || '') + '</p></div></div>';
            }
            list.innerHTML = h;
        }
    }
    var refs = count;
    var targets = [10, 25, 50];
    for (var idx = 0; idx < 3; idx++) {
        var target = targets[idx];
        var n = String(idx + 1);
        var pct = Math.min((refs/target)*100, 100);
        var p = document.getElementById('ref-p' + n); if (p) p.textContent = Math.min(refs,target) + ' / ' + target;
        var b = document.getElementById('ref-bar' + n); if (b) b.style.width = pct + '%';
    }
    var summary = document.getElementById('buyer-referral-summary');
    if (summary) summary.textContent = count + ' filleul' + (count>1?'s':'') + ' parrainé' + (count>1?'s':'');
}
function copyReferralCode() {
    var code = getReferralCode();
    if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(function(){ toast('Code copié : ' + code, 'success'); });
    } else { toast('Code : ' + code, 'info', 5000); }
}
function shareReferral() {
    var code = getReferralCode();
    var text = 'Rejoins Grand Marché, la marketplace congolaise ! Utilise mon code parrain : ' + code;
    var url = (location.origin && location.origin !== 'null') ? location.origin + location.pathname + '?ref=' + code : '';
    if (navigator.share) {
        navigator.share({ title: 'Grand Marché', text: text + (url ? '\n' + url : '') }).catch(function(){});
        return;
    }
    window.open('https://wa.me/?text=' + encodeURIComponent(text + (url ? '\n' + url : '')), '_blank');
}
function addReferralManually() {
    gmPrompt('Nom du filleul :', '', 'Nouveau filleul').then(function(name) {
        if (!name || !name.trim()) return;
        buyerReferrals.push({ name: name.trim(), date: formatDate() });
        updateBuyerTrophyActivity();
        refreshBuyerTrophies();
        _stateDirty = true;
        renderReferralScreen();
        toast('Filleul enregistré : ' + name.trim(), 'success');
    });
}

function openEditBuyerProfile() {
    document.getElementById('edit-buyer-name').value = userName;
    document.getElementById('edit-buyer-phone').value = userPhone;
    var emailEl = document.getElementById('edit-buyer-email'); if (emailEl) emailEl.value = userEmail || '';
    var img = document.getElementById('edit-buyer-avatar-img'), ini = document.getElementById('edit-buyer-avatar-initials');
    if (buyerAvatar) { img.src = buyerAvatar; img.classList.remove('hidden'); ini.classList.add('hidden'); }
    else { img.classList.add('hidden'); img.src = ''; ini.textContent = getInitials(userName); ini.classList.remove('hidden'); }
    showScreen('edit-buyer-profile-screen');
}
function handleBuyerAvatarUpload(input) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];
    if (file.size > 15*1024*1024) { toast('Image trop lourde (max 15 Mo).', 'error'); input.value = ''; return; }
    var reader = new FileReader();
    reader.onload = function(e) {
        cropMode = 'buyer';
        cropCallback = function(url) {
            buyerAvatar = url;
            _stateDirty = true;
            var imgEdit = document.getElementById('edit-buyer-avatar-img');
            var iniEdit = document.getElementById('edit-buyer-avatar-initials');
            if (imgEdit) { imgEdit.src = url; imgEdit.classList.remove('hidden'); }
            if (iniEdit) iniEdit.classList.add('hidden');
            var pav = document.getElementById('buyer-avatar');
            if (pav) pav.innerHTML = '<img src="' + url + '" class="w-full h-full object-cover">';
            haptic(30);
            toast('Photo de profil mise à jour.', 'success');
        };
        openCropScreen('circle', e.target.result);
    };
    reader.readAsDataURL(file);
}
function saveBuyerProfile() {
    var n = document.getElementById('edit-buyer-name').value.trim();
    var p = document.getElementById('edit-buyer-phone').value.trim();
    var emailEl = document.getElementById('edit-buyer-email');
    var em = emailEl ? emailEl.value.trim() : '';
    if (n.length < 3) { toast('Nom requis.', 'error'); return; }
    if (p.replace(/[^0-9]/g,'').length < 8) { toast('Numéro invalide.', 'error'); return; }
    if (em && !isValidEmail(em)) { toast('Adresse email invalide.', 'error'); return; }
    var c = p.replace(/\s/g,''); if (c.indexOf('0') !== 0 && c.length === 8) c = '0' + c;
    userName = n; userPhone = c; userEmail = em; hasBuyerAccount = true;
    _stateDirty = true; toast('Profil mis à jour.', 'success');
    showScreen('buyer-profile-screen');
}
function openEditSellerProfile() {
    if (!myShop) { toast('Pas de boutique.', 'error'); return; }
    editShopLogoData = null;
    document.getElementById('edit-sel-name').value = myShop.ownerName || '';
    document.getElementById('edit-sel-phone').value = myShop.phone || '';
    var emailEl = document.getElementById('edit-sel-email'); if (emailEl) emailEl.value = myShop.email || '';
    document.getElementById('edit-sel-shop-name').value = myShop.shopName || '';
    document.getElementById('edit-sel-shop-address').value = myShop.address || '';
    document.getElementById('edit-sel-shop-desc').value = myShop.description || '';
    document.getElementById('edit-sel-whatsapp').value = myShop.whatsapp || '';
    document.getElementById('edit-sel-delivery').checked = !!myShop.hasDelivery;
    document.getElementById('edit-sel-cod').checked = !!myShop.hasCOD;
    renderEditCategoryButtons();
    var bs = document.querySelectorAll('.edit-cat-btn');
    for (var i = 0; i < bs.length; i++) {
        if (bs[i].textContent.trim() === myShop.category) {
            bs[i].className = 'edit-cat-btn border-2 border-orange-500 rounded-lg p-2 text-xs text-orange-600 bg-orange-50 text-left font-bold';
        }
    }
    renderLogo('edit-shop-logo-img', 'edit-shop-logo-initials', myShop.logo, myShop.initials);
    showScreen('edit-seller-profile-screen');
}
function cancelEditSellerProfile() { editShopLogoData = null; showScreen('seller-dashboard-screen'); }
function selectEditCategory(btn) {
    var bs = document.querySelectorAll('.edit-cat-btn');
    for (var i = 0; i < bs.length; i++) bs[i].className = 'edit-cat-btn border-2 border-gray-300 rounded-lg p-2 text-xs text-gray-700 bg-white text-left';
    btn.className = 'edit-cat-btn border-2 border-orange-500 rounded-lg p-2 text-xs text-orange-600 bg-orange-50 text-left font-bold';
}
function handleEditShopLogoUpload(input) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];
    if (file.size > 15*1024*1024) { toast('Image trop lourde.', 'error'); input.value = ''; return; }
    var reader = new FileReader();
    reader.onload = function(e) {
        cropMode = 'logo';
        cropCallback = function(url) {
            editShopLogoData = url;
            var img = document.getElementById('edit-shop-logo-img'), ini = document.getElementById('edit-shop-logo-initials');
            if (img) { img.src = url; img.classList.remove('hidden'); }
            if (ini) ini.classList.add('hidden');
        };
        openCropScreen('circle', e.target.result);
    };
    reader.readAsDataURL(file);
}
function saveSellerProfile() {
    if (!myShop) return;
    var n = document.getElementById('edit-sel-name').value.trim();
    var p = document.getElementById('edit-sel-phone').value.trim();
    var emailEl = document.getElementById('edit-sel-email');
    var em = emailEl ? emailEl.value.trim() : '';
    var sn = document.getElementById('edit-sel-shop-name').value.trim();
    var a = document.getElementById('edit-sel-shop-address').value.trim();
    var d = document.getElementById('edit-sel-shop-desc').value.trim();
    var w = document.getElementById('edit-sel-whatsapp').value.trim();
    var hd = document.getElementById('edit-sel-delivery').checked;
    var hc = document.getElementById('edit-sel-cod').checked;
    var catSel = null;
    var bs = document.querySelectorAll('.edit-cat-btn');
    for (var i = 0; i < bs.length; i++) if (bs[i].className.indexOf('border-orange-500') !== -1) { catSel = bs[i].textContent.trim(); break; }
    if (n.length < 3) { toast('Nom requis.', 'error'); return; }
    if (p.replace(/[^0-9]/g,'').length < 8) { toast('Numéro invalide.', 'error'); return; }
    if (em && !isValidEmail(em)) { toast('Adresse email invalide.', 'error'); return; }
    if (sn.length < 3) { toast('Nom boutique requis.', 'error'); return; }
    if (!catSel) { toast('Catégorie requise.', 'error'); return; }
    if (a.length < 3) { toast('Adresse requise.', 'error'); return; }
    var cp = p.replace(/\s/g,''); if (cp.indexOf('0') !== 0 && cp.length === 8) cp = '0' + cp;
    var wp = w ? w.replace(/\s/g,'') : cp; if (wp.indexOf('0') !== 0 && wp.length === 8) wp = '0' + wp;
    myShop.ownerName = n; if (!myShop.serverShopId) myShop.phone = cp; myShop.email = em; myShop.shopName = sn;
    myShop.category = catSel; myShop.address = a; myShop.description = d;
    myShop.whatsapp = wp; myShop.hasDelivery = hd; myShop.hasCOD = hc;
    if (editShopLogoData) { myShop.logo = editShopLogoData; editShopLogoData = null; }
    myShop.initials = getInitials(sn);
    syncMyShopToCatalog(); applyShopToDashboard();
    _stateDirty = true; toast('Profil mis à jour.', 'success');
    showScreen('seller-dashboard-screen');
}

/* =========================================================
   SUIVRE / SUIVI (v14.7)
   → Les ACHETEURS peuvent s'abonner à N'IMPORTE QUELLE boutique
   → Y compris la leur / boutiques fraîchement créées
   → Les VENDEURS purs (sans compte acheteur) ne voient pas le bouton
   ========================================================= */
function _isMyOwnShop(shopIdx) {
    var s = shopsCatalog[shopIdx];
    if (!s || !myShop || !myShop.phone) return false;
    var sp = String(s.ownerPhone || s.phone || '').replace(/\s/g, '');
    var mp = String(myShop.phone).replace(/\s/g, '');
    return !!(sp && mp && sp === mp);
}

function isFollowing(shopIdx) {
    var s = shopsCatalog[shopIdx];
    if (!s || !s.subscribers) return false;
    if (!hasBuyerAccount || !userPhone) return false;
    var myPhone = String(userPhone).replace(/\s/g, '');
    for (var i = 0; i < s.subscribers.length; i++) {
        var sp = String(s.subscribers[i].phone || '').replace(/\s/g, '');
        if (sp === myPhone) return true;
    }
    return false;
}

function toggleFollow() {
    // 🔒 Réservé aux acheteurs
    if (!hasBuyerAccount || !userPhone) {
        toast('Seuls les acheteurs peuvent s\'abonner à une boutique.', 'warn', 4000);
        return;
    }
    var i = currentShopIndex;
    var s = shopsCatalog[i];
    if (!s) return;

    if (!s.subscribers) s.subscribers = [];
    var myPhone = String(userPhone).replace(/\s/g, '');

    if (isFollowing(i)) {
        for (var j = 0; j < s.subscribers.length; j++) {
            var sp = String(s.subscribers[j].phone || '').replace(/\s/g, '');
            if (sp === myPhone) { s.subscribers.splice(j, 1); break; }
        }
        for (var k = 0; k < followedShops.length; k++) {
            if (followedShops[k] === i) { followedShops.splice(k, 1); break; }
        }
        _stateDirty = true;
        haptic(15);
        toast('Vous ne suivez plus ' + s.name, 'info');
    } else {
        s.subscribers.push({ name: userName || 'Client', phone: myPhone, date: formatDate() });
        if (followedShops.indexOf(i) < 0) followedShops.push(i);
        _stateDirty = true;
        haptic([20, 40, 20]);
        toast('Vous suivez ' + s.name + ' ✓', 'success');
        // Notifier le vendeur — sauf si c'est notre propre boutique
        if (s.ownerPhone && String(s.ownerPhone).replace(/\s/g,'') !== myPhone) {
            addNotification('seller', 'Nouvel abonné',
                (userName || 'Un client') + ' suit désormais votre boutique', 'success');
        }
    }
    if (myShop) syncMyShopToCatalog();
    updateFollowBtn();
    updateProductFollowBtn();
    updateShopSubscribersCount();
    applyShopToDashboard();
    renderSubscriptions();
}

function toggleFollowFromProduct() {
    if (!hasBuyerAccount) {
        toast('Créez un compte acheteur pour suivre une boutique.', 'warn', 4000);
        return;
    }
    toggleFollow();
}

/* ✅ Bouton Suivre :
   - visible pour les ACHETEURS (connectés ou non)
   - masqué uniquement si VENDEUR sans compte acheteur */
function updateFollowBtn() {
    var b = document.getElementById('follow-btn');
    if (!b) return;

    if (isSeller && !hasBuyerAccount) {
        b.classList.add('hidden');
        return;
    }
    b.classList.remove('hidden');
    if (!hasBuyerAccount) {
        b.textContent = 'Suivre';
        b.className = 'flex-1 bg-green-600 text-white font-bold py-2 rounded-lg text-sm';
        return;
    }
    if (isFollowing(currentShopIndex)) {
        b.textContent = 'Suivi ✓';
        b.className = 'flex-1 bg-gray-200 text-gray-700 font-bold py-2 rounded-lg text-sm';
    } else {
        b.textContent = 'Suivre';
        b.className = 'flex-1 bg-green-600 text-white font-bold py-2 rounded-lg text-sm';
    }
}

function updateProductFollowBtn() {
    var btn = document.getElementById('product-follow-btn');
    if (!btn) return;

    if (isSeller && !hasBuyerAccount) {
        btn.classList.add('hidden');
        return;
    }
    btn.classList.remove('hidden');
    if (!hasBuyerAccount) {
        btn.textContent = 'Suivre';
        btn.className = 'mt-2 w-full bg-green-600 text-white font-bold py-2 rounded-lg text-xs';
        return;
    }
    if (isFollowing(currentShopIndex)) {
        btn.textContent = 'Suivi ✓';
        btn.className = 'mt-2 w-full border-2 border-gray-300 bg-gray-100 text-gray-700 font-bold py-2 rounded-lg text-xs';
    } else {
        btn.textContent = 'Suivre';
        btn.className = 'mt-2 w-full bg-green-600 text-white font-bold py-2 rounded-lg text-xs';
    }
}

function unfollowShop(i) {
    if (!hasBuyerAccount) return;
    var s = shopsCatalog[i]; if (!s) return;
    if (!s.subscribers) s.subscribers = [];
    var myPhone = String(userPhone).replace(/\s/g, '');
    for (var j = 0; j < s.subscribers.length; j++) {
        var sp = String(s.subscribers[j].phone || '').replace(/\s/g, '');
        if (sp === myPhone) { s.subscribers.splice(j, 1); break; }
    }
    for (var k = 0; k < followedShops.length; k++) {
        if (followedShops[k] === i) { followedShops.splice(k, 1); break; }
    }
    if (currentShopIndex === i) updateFollowBtn();
    updateProductFollowBtn();
    updateShopSubscribersCount();
    renderSubscriptions();
    _stateDirty = true;
    toast('Vous ne suivez plus cette boutique', 'info');
}

function updateShopSubscribersCount() {
    var s = shopsCatalog[currentShopIndex];
    var el = document.getElementById('profile-subscribers-count');
    if (!s || !el) return;
    var n = (s.subscribers || []).length;
    el.textContent = n + ' Abonné' + (n > 1 ? 's' : '');
}

function openSellerSubscribers() {
    if (!myShop) return;
    syncMyShopToCatalog();
    var idx = findMyCatalogIndex();
    var s = idx >= 0 ? shopsCatalog[idx] : null;
    var subs = (s && s.subscribers) ? s.subscribers : [];
    var totalEl = document.getElementById('subscribers-total');
    if (totalEl) totalEl.textContent = subs.length;
    var list = document.getElementById('subscribers-list');
    if (!list) return;
    if (subs.length === 0) {
        list.innerHTML = '<div class="text-center py-10 text-gray-400 text-sm">Aucun abonné pour le moment.<br>Partagez votre boutique pour attirer des clients !</div>';
    } else {
        var h = '';
        var sorted = subs.slice().sort(function(a, b) {
            return (b.date || '').localeCompare(a.date || '');
        });
        for (var i = 0; i < sorted.length; i++) {
            var sub = sorted[i];
            h += '<div class="bg-white p-3 rounded-xl flex items-center gap-3">';
            h += '<div class="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm">' + getInitials(sub.name || 'Client') + '</div>';
            h += '<div class="flex-1 min-w-0"><p class="font-bold text-sm text-gray-800 truncate">' + escapeHtml(sub.name || 'Client') + '</p>';
            h += '<p class="text-[11px] text-gray-500">+242 ' + escapeHtml(sub.phone || '') + '</p></div>';
            h += '<div class="text-right"><p class="text-[10px] text-gray-400">' + (sub.date || '') + '</p></div>';
            h += '</div>';
        }
        list.innerHTML = h;
    }
    showScreen('seller-subscribers-screen');
}

/* =========================================================
   WHATSAPP / SIGNALEMENT / CERTIFICATION
   ========================================================= */
function connectWhatsApp() {
    if (whatsappConnected) {
        gmConfirm('Déconnecter WhatsApp Business ?', 'WhatsApp', { danger: true }).then(function(ok) {
            if (!ok) return;
            whatsappConnected = false; whatsappNumber = '';
            updateWhatsAppUI(); _stateDirty = true;
            toast('WhatsApp déconnecté.', 'info');
        });
    } else {
        gmPrompt('Entrez votre numéro WhatsApp Business (+242) :', userPhone || '06...', 'Connexion WhatsApp').then(function(num) {
            if (!num) return;
            var clean = num.replace(/[^0-9]/g, '');
            if (clean.indexOf('0') !== 0 && clean.length === 8) clean = '0' + clean;
            if (clean.length < 8) { toast('Numéro invalide.', 'error'); return; }
            whatsappNumber = clean; whatsappConnected = true;
            updateWhatsAppUI(); _stateDirty = true;
            toast('WhatsApp connecté : +242 ' + whatsappNumber, 'success');
        });
    }
}
function updateWhatsAppUI() {
    var dot = document.getElementById('wa-status-dot'), txt = document.getElementById('wa-status-text'),
        num = document.getElementById('wa-status-number'), btn = document.getElementById('wa-connect-btn'),
        banner = document.getElementById('whatsapp-banner'), bt = document.getElementById('wa-banner-title'), bs = document.getElementById('wa-banner-subtitle');
    if (whatsappConnected) {
        if (dot) dot.className = 'w-3 h-3 rounded-full bg-green-500';
        if (txt) { txt.textContent = 'Connecté'; txt.className = 'font-bold text-sm text-green-600'; }
        if (num) num.textContent = '+242 ' + whatsappNumber;
        if (btn) { btn.textContent = 'Déconnecter'; btn.className = 'w-full bg-red-500 text-white font-bold py-2 rounded-lg text-sm'; }
        if (banner) banner.className = 'bg-green-500 text-white rounded-xl p-3 flex items-center gap-3 cursor-pointer';
        if (bt) bt.textContent = 'WhatsApp Business connecté';
        if (bs) bs.textContent = '+242 ' + whatsappNumber;
    } else {
        if (dot) dot.className = 'w-3 h-3 rounded-full bg-gray-300';
        if (txt) { txt.textContent = 'Non connecté'; txt.className = 'font-bold text-sm text-gray-800'; }
        if (num) num.textContent = 'Aucun numéro associé';
        if (btn) { btn.textContent = 'Connecter WhatsApp'; btn.className = 'w-full bg-green-500 text-white font-bold py-2 rounded-lg text-sm'; }
        if (banner) banner.className = 'bg-gray-400 text-white rounded-xl p-3 flex items-center gap-3 cursor-pointer';
        if (bt) bt.textContent = 'WhatsApp non connecté';
        if (bs) bs.textContent = 'Appuyez pour connecter';
    }
}
function toggleWhatsAppConnection() { connectWhatsApp(); }
function openReportShop() {
    reportTarget = shopsCatalog[currentShopIndex];
    reportTargetType = 'seller';
    reportOrigin = 'shop-profile-screen';
    document.getElementById('report-target-name').textContent = reportTarget ? reportTarget.name : 'cet utilisateur';
    _resetReportForm();
    showScreen('report-screen');
}
function openReportFromChat() {
    var cv = null;
    for (var i = 0; i < conversations.length; i++) if (conversations[i].id === currentChatId) { cv = conversations[i]; break; }
    if (cv) {
        reportTarget = { name: cv.participantName };
        document.getElementById('report-target-name').textContent = cv.participantName;
    }
    reportTargetType = isSeller ? 'buyer' : 'seller';
    reportOrigin = 'chat-screen';
    _resetReportForm();
    showScreen('report-screen');
}
function openReportBuyer(orderId) {
    var order = findSellerOrder(orderId); if (!order) return;
    reportTarget = { name: order.buyerName || 'Client', phone: order.buyerPhone, orderId: orderId };
    reportTargetType = 'buyer';
    reportOrigin = 'seller-orders-screen';
    document.getElementById('report-target-name').textContent = (order.buyerName || 'ce client') + ' (commande ' + orderId + ')';
    _resetReportForm();
    if (order.status === ORDER_STATUS.DELIVERED) {
        var btns = document.querySelectorAll('.report-type-btn');
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].textContent.indexOf('pas confirmé') !== -1) {
                selectReportType('Client n\'a pas confirmé la réception', btns[i]);
                break;
            }
        }
    }
    showScreen('report-screen');
}
function _resetReportForm() {
    selectedReportType = '';
    var d = document.getElementById('report-details'); if (d) d.value = '';
    var btns = document.querySelectorAll('.report-type-btn');
    for (var i = 0; i < btns.length; i++) btns[i].className = 'report-type-btn w-full text-left border-2 border-gray-200 rounded-lg p-3 text-sm';
}
function selectReportType(type, btn) {
    selectedReportType = type;
    var btns = document.querySelectorAll('.report-type-btn');
    for (var i = 0; i < btns.length; i++) btns[i].className = 'report-type-btn w-full text-left border-2 border-gray-200 rounded-lg p-3 text-sm';
    btn.className = 'report-type-btn w-full text-left border-2 border-red-500 rounded-lg p-3 text-sm bg-red-50 font-bold text-red-700';
}
function submitReport() {
    if (!selectedReportType) { toast('Choisissez un type de signalement.', 'error'); return; }
    var details = document.getElementById('report-details').value.trim();
    var reporterRole = isSeller ? 'vendeur' : 'acheteur';
    reports.push({
        target: reportTarget ? reportTarget.name : 'Inconnu',
        targetType: reportTargetType,
        orderId: (reportTarget && reportTarget.orderId) || null,
        type: selectedReportType,
        details: details,
        reporter: userName,
        reporterRole: reporterRole,
        date: formatDateTime()
    });
    _stateDirty = true;
    toast('Signalement envoyé. Merci.', 'success', 4000);
    closeReport();
}
function closeReport() {
    if (reportOrigin === 'seller-orders-screen') showScreen('seller-orders-screen');
    else showScreen(reportOrigin);
}
function openCertification() {
    if (!myShop) { toast('Créez votre boutique.', 'error'); return; }
    var points = myShop.sixStarPoints || 0;
    var progress = Math.min((points/1000)*100, 100);
    document.getElementById('cert-modal-progress').style.width = progress + '%';
    document.getElementById('cert-modal-status').textContent = points + ' / 1000 points';
    if (myShop.isCertified) document.getElementById('cert-modal-status').textContent = 'Boutique déjà certifiée.';
    showScreen('certification-screen');
}
function closeCertification() { showScreen('seller-dashboard-screen'); }
function openGoldenCertification() {
    if (!myShop) { toast('Créez votre boutique.', 'error'); return; }
    var points = myShop.sixStarPoints || 0;
    var progress = Math.min((points/GOLD_CERTIFICATION_THRESHOLD)*100, 100);
    var bar = document.getElementById('gold-progress-bar');
    var label = document.getElementById('gold-progress-label');
    if (bar) bar.style.width = progress + '%';
    if (label) label.textContent = points.toLocaleString('fr-FR') + ' / ' + GOLD_CERTIFICATION_THRESHOLD.toLocaleString('fr-FR');
    showScreen('gold-certification-screen');
}
function selectCertPayment(m) {
    selectedCertPayment = m;
    var ms = ['mobile','airtel','card'];
    for (var i = 0; i < ms.length; i++) {
        var el = document.getElementById('cert-pay-'+ms[i]), ch = document.getElementById('cert-check-'+ms[i]);
        if (!el || !ch) continue;
        if (ms[i] === m) {
            el.className = 'border-2 border-green-500 rounded-lg p-3 cursor-pointer flex items-center space-x-2 bg-green-50';
            ch.className = 'w-4 h-4 rounded-full border-2 border-green-500 flex items-center justify-center';
            ch.innerHTML = '<div class="w-2 h-2 rounded-full bg-green-500"></div>';
        } else {
            el.className = 'border-2 border-gray-200 rounded-lg p-3 cursor-pointer flex items-center space-x-2';
            ch.className = 'w-4 h-4 rounded-full border-2 border-gray-300'; ch.innerHTML = '';
        }
    }
}
function payCertification() {
    if (!myShop) return;
    if (myShop.isCertified) { toast('Déjà certifiée.', 'info'); return; }
    if (!GM.loggedIn() || !myShop.serverShopId) { toast('Reconnectez-vous pour payer.', 'error'); return; }
    requireTermsAcceptance(function () {
        GM.pay({
            purpose: 'certification', amount: CERTIFICATION_PRICE, title: 'Certification de ' + myShop.shopName,
            description: 'Badge de confiance affiché sur votre boutique et vos produits.',
            successText: 'Votre boutique est certifiée.',
            onSuccess: function () {
                myShop.isCertified = true; myShop.sixStarPoints = 1000;
                syncMyShopToCatalog(); applyShopToDashboard(); _stateDirty = true;
                GM.loadCatalog().catch(function () {});
                toast('Votre boutique est certifiée.', 'success', 4000);
                showScreen('seller-dashboard-screen');
            }
        });
    }, 'certification-screen');
}
function shareOnWhatsApp() {
    if (!_currentProductData) return;
    var text = 'Regardez sur Grand Marché : ' + _currentProductData.name + ' - ' + _currentProductData.priceLabel;
    if (_nativeShare(_currentProductData.name, text, '')) return;
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}
function shareOnWhatsAppShop() {
    if (!myShop) return;
    syncMyShopToCatalog();
    var idx = findMyCatalogIndex();
    var url = idx >= 0 ? getShopShareUrl(shopsCatalog[idx]) : '';
    var text = 'Découvrez ma boutique "' + myShop.shopName + '" sur Grand Marché !' + (myShop.category ? '\nCatégorie : ' + myShop.category : '');
    if (_nativeShare(myShop.shopName, text, url)) return;
    _copyToClipboard(text + (url ? '\n' + url : '')).then(function(ok) {
        if (ok) toast('Texte copié dans le presse-papier.', 'success');
        else window.open('https://wa.me/?text=' + encodeURIComponent(text + (url ? '\n' + url : '')), '_blank');
    });
}
function sendWhatsAppNotification(phone, message) { if (whatsappConnected) console.log('WhatsApp -> ' + phone + ': ' + message); }

/* =========================================================
   PARAMÈTRES
   ========================================================= */
function openSettings(origin) {
    if (origin) settingsOrigin = origin;
    else {
        var cur = document.querySelector('.screen:not(.hidden)');
        settingsOrigin = cur ? cur.id : (isSeller ? 'seller-dashboard-screen' : 'home-screen');
    }
    var name = isSeller ? (myShop ? myShop.ownerName : 'Vendeur') : userName;
    var phone = isSeller ? (myShop ? myShop.phone : userPhone) : userPhone;
    document.getElementById('settings-avatar').textContent = getInitials(name);
    document.getElementById('settings-name').textContent = name;
    document.getElementById('settings-phone').textContent = '+242 ' + phone;
    document.getElementById('settings-role').textContent = isSeller ? 'Vendeur' : 'Acheteur';
    document.getElementById('switch-role-text').textContent = isSeller ? 'Passer en mode acheteur' : 'Passer en mode vendeur';
    updateWhatsAppUI();
    showScreen('settings-screen');
}
function closeSettings() { showScreen(settingsOrigin); }
function openAbout() { showScreen('about-screen'); }
function openPrivacy() { showScreen('privacy-screen'); }
function openTerms() { showScreen('terms-screen'); }
function openHelp() { showScreen('help-screen'); }
function toggleRole() {
    if (isSeller) {
        if (!hasBuyerAccount) {
            gmConfirm('Vous n\'avez pas encore de compte acheteur.\n\nCréer un compte maintenant ?', 'Compte acheteur').then(function(go) {
                if (go) { closeSettings(); showScreen('inscription-screen'); }
            });
            return;
        }
        isSeller = false; closeSettings(); _stateDirty = true;
        toast('Mode Acheteur', 'info'); showScreen('home-screen');
    } else {
        if (!myShop) {
            gmConfirm('Vous n\'avez pas encore de boutique vendeur.\n\nEn créer une maintenant ?', 'Compte vendeur').then(function(go) {
                if (go) { closeSettings(); showScreen('seller-register-screen'); }
            });
            return;
        }
        isSeller = true; applyShopToDashboard(); closeSettings();
        _stateDirty = true; toast('Mode Vendeur', 'info');
        showScreen('seller-dashboard-screen');
    }
}
function logout() {
    gmConfirm('Se déconnecter ?', 'Déconnexion', { danger: true }).then(function(ok) {
        if (!ok) return;
        GM.logout(); cart = []; isSeller = false; updateCartUI(); closeSettings();
        _stateDirty = true; showScreen('role-screen');
    });
}
function deleteAccount() {
    gmConfirm('Supprimer votre compte ? Cette action est irréversible.', 'Attention', { danger: true, confirmText: 'Supprimer' })
    .then(function(ok) {
        if (!ok) return;
        return gmConfirm('Vraiment sûr ? Toutes vos données seront effacées.', 'Confirmation finale', { danger: true, confirmText: 'Tout supprimer' });
    })
    .then(function(ok2) {
        if (!ok2) return;
        return GM.req('DELETE', '/api/me').then(function () { return true; }, function (e) {
            if (e.status === 401) return true;
            toast(e.message, 'error', 6000); return false;
        });
    })
    .then(function (done) {
        if (!done) return;
        GM.logout();
        myShop = null; isSeller = false; cart = [];
        hasBuyerAccount = false; buyerAvatar = null;
        buyerOrders = []; sellerOrders = [];
        followedShops = []; conversations = []; favoriteProducts = [];
        notifications = []; searchHistory = []; recentlyViewed = [];
        buyerReferrals = [];
        hasAcceptedTerms = false;
        buyerWallet = { balance: 0, escrow: 0, totalSpent: 0, totalRefunded: 0, transactions: [] };
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
        updateCartUI(); toast('Compte supprimé.', 'info');
        closeSettings(); showScreen('role-screen');
    });
}
function changePassword() {
    document.getElementById('old-pass').value = '';
    document.getElementById('change-new-pass').value = '';
    document.getElementById('change-confirm-pass').value = '';
    showScreen('change-password-screen');
}
function saveNewPassword() {
    var oldP = document.getElementById('old-pass').value;
    var newP = document.getElementById('change-new-pass').value;
    var conf = document.getElementById('change-confirm-pass').value;
    if (!oldP) { toast('Mot de passe actuel requis.', 'error'); return; }
    if (newP.length < 6) { toast('6 caractères minimum.', 'error'); return; }
    if (newP !== conf) { toast('Les mots de passe ne correspondent pas.', 'error'); return; }
    GM.req('POST', '/api/me/password', { oldPassword: oldP, newPassword: newP }).then(function () {
        toast('Mot de passe changé.', 'success'); showScreen('settings-screen');
    }).catch(function (e) { toast(e.message, 'error', 5000); });
}
function shareApp() {
    var text = 'Découvrez Grand Marché, la marketplace congolaise !';
    if (_nativeShare('Grand Marché', text, '')) return;
    _copyToClipboard(text).then(function(ok) { if (ok) toast('Texte copié.', 'success'); });
}
function toggleDarkMode() {
    darkMode = !darkMode;
    var ac = document.getElementById('app-container');
    var tog = document.getElementById('dark-toggle'), knob = document.getElementById('dark-knob');
    if (darkMode) {
        ac.classList.add('dark'); document.body.classList.add('dark-body');
        if (tog) tog.className = 'w-12 h-6 rounded-full bg-blue-500 relative';
        if (knob) knob.style.transform = 'translateX(24px)';
    } else {
        ac.classList.remove('dark'); document.body.classList.remove('dark-body');
        if (tog) tog.className = 'w-12 h-6 rounded-full bg-gray-300 relative';
        if (knob) knob.style.transform = 'translateX(0)';
    }
    _stateDirty = true;
}
function toggleNotifications() {
    notificationsOn = !notificationsOn;
    var t = document.getElementById('notif-toggle'), k = document.getElementById('notif-knob');
    if (notificationsOn) { t.className = 'w-12 h-6 rounded-full bg-green-500 relative'; k.style.transform = 'translateX(0)'; }
    else { t.className = 'w-12 h-6 rounded-full bg-gray-300 relative'; k.style.transform = 'translateX(-24px)'; }
    _stateDirty = true;
}

/* =========================================================
   INSCRIPTION / VENDEUR
   ========================================================= */
function switchSellerMode(mode) {
    sellerMode = mode;
    var tr = document.getElementById('tab-register'), tl = document.getElementById('tab-login');
    var rf = document.getElementById('seller-register-form'), lf = document.getElementById('seller-login-form');
    var si = document.getElementById('step-indicators');
    if (mode === 'register') {
        tr.className = 'flex-1 bg-white text-orange-500 font-bold py-2 rounded-lg text-sm';
        tl.className = 'flex-1 text-white font-bold py-2 rounded-lg text-sm border border-white border-opacity-40';
        rf.classList.remove('hidden'); lf.classList.add('hidden'); si.classList.remove('hidden');
    } else {
        tl.className = 'flex-1 bg-white text-orange-500 font-bold py-2 rounded-lg text-sm';
        tr.className = 'flex-1 text-white font-bold py-2 rounded-lg text-sm border border-white border-opacity-40';
        rf.classList.add('hidden'); lf.classList.remove('hidden'); si.classList.add('hidden');
    }
}
function updateSellerSteps() {
    var n = (document.getElementById('sel-name')||{}).value||'';
    var p = (document.getElementById('sel-phone')||{}).value||'';
    var ps = (document.getElementById('sel-pass')||{}).value||'';
    var sn = (document.getElementById('sel-shop-name')||{}).value||'';
    var c = (document.getElementById('sel-shop-category')||{}).value||'';
    var a = (document.getElementById('sel-shop-address')||{}).value||'';
    var s1 = (n.trim().length>=3 && p.replace(/[^0-9]/g,'').length>=8 && ps.length>=6);
    var s2 = s1 && (sn.trim().length>=3 && c && a.trim().length>=3);
    var s2c = document.getElementById('step-2-circle'), s2l = document.getElementById('step-2-label');
    var s3c = document.getElementById('step-3-circle'), s3l = document.getElementById('step-3-label');
    var l1 = document.getElementById('step-1-line'), l2 = document.getElementById('step-2-line');
    if (s1) { s2c.className = 'w-6 h-6 rounded-full bg-white text-orange-500 flex items-center justify-center font-bold text-xs'; s2l.className = 'text-[10px] text-white mt-1 font-bold'; l1.className = 'h-0.5 bg-white flex-1'; }
    else { s2c.className = 'w-6 h-6 rounded-full bg-white text-orange-500 flex items-center justify-center font-bold text-xs opacity-60'; s2l.className = 'text-[10px] text-white mt-1 opacity-70'; l1.className = 'h-0.5 bg-white flex-1 opacity-40'; }
    if (s2) { s3c.className = 'w-6 h-6 rounded-full bg-white text-orange-500 flex items-center justify-center font-bold text-xs'; s3l.className = 'text-[10px] text-white mt-1 font-bold'; l2.className = 'h-0.5 bg-white flex-1'; }
    else { s3c.className = 'w-6 h-6 rounded-full bg-white text-orange-500 flex items-center justify-center font-bold text-xs opacity-60'; s3l.className = 'text-[10px] text-white mt-1 opacity-70'; l2.className = 'h-0.5 bg-white flex-1 opacity-40'; }
}
function selectCategory(v, btn) {
    selectedCategory = v;
    document.getElementById('sel-shop-category').value = v;
    var bs = document.querySelectorAll('.cat-btn');
    for (var i=0;i<bs.length;i++) bs[i].className = 'cat-btn border-2 border-gray-300 rounded-lg p-2 text-xs text-gray-700 bg-white text-left';
    btn.className = 'cat-btn border-2 border-orange-500 rounded-lg p-2 text-xs text-orange-600 bg-orange-50 text-left font-bold';
    updateSellerSteps();
}
function saveRegistrationAndGoHome() {
    var n = document.getElementById('reg-name').value.trim();
    var p = document.getElementById('reg-phone').value.trim();
    var ps = document.getElementById('reg-pass').value;
    var emailEl = document.getElementById('reg-email');
    var em = emailEl ? emailEl.value.trim() : '';
    var refEl = document.getElementById('reg-referral');
    var refCode = refEl ? refEl.value.trim().toUpperCase() : '';
    if (n.length < 3) { toast('Nom requis.', 'error'); return; }
    if (p.replace(/[^0-9]/g,'').length < 8) { toast('Numéro invalide.', 'error'); return; }
    if (!em) { toast('Adresse email requise.', 'error'); return; }
    if (!isValidEmail(em)) { toast('Adresse email invalide.', 'error'); return; }
    if (ps.length < 6) { toast('Mot de passe : 6 min.', 'error'); return; }
    var c = p.replace(/\s/g,''); if (c.indexOf('0') !== 0 && c.length === 8) c = '0' + c;
    showLoading('Création du compte...');
    GM.register({ name: n, phone: c, password: ps, email: em, referral: refCode }).then(function (sess) {
        hideLoading();
        userName = sess.user.name; userPass = ''; userEmail = em; userPhone = sess.user.phone; isSeller = false; hasBuyerAccount = true;
        buyerTrophyStats.account = 1; updateBuyerTrophyActivity();
        _stateDirty = true;
        if (sess.referralApplied) toast('Code parrain ' + refCode + ' appliqué. Bienvenue !', 'success', 4000);
        else toast('Bienvenue ' + n.split(' ')[0] + '.', 'success');
        showScreen('home-screen'); GM.loadCatalog().catch(function () {});
    }).catch(function (e) { hideLoading(); toast(e.message, 'error', 5000); });
}
function buyerLogin() {
    var p = document.getElementById('buyer-login-phone').value.trim();
    var ps = document.getElementById('buyer-login-pass').value;
    if (!p || p.replace(/[^0-9]/g,'').length < 8) { toast('Numéro requis.', 'error'); return; }
    if (!ps) { toast('Mot de passe requis.', 'error'); return; }
    var c = p.replace(/\s/g,''); if (c.indexOf('0') !== 0 && c.length === 8) c = '0' + c;
    showLoading('Connexion...');
    GM.login(c, ps).then(function (sess) {
        userName = sess.user.name; userPhone = sess.user.phone; userEmail = sess.user.email || ''; userPass = '';
        isSeller = false; hasBuyerAccount = true; _stateDirty = true;
        return (sess.shop ? GM.adoptShop(sess) : GM.loadCatalog()).then(function () {
            hideLoading(); toast('Bienvenue ' + userName + '.', 'success'); showScreen('home-screen');
        });
    }).catch(function (e) { hideLoading(); toast(e.message, 'error', 5000); });
}
function createShop() {
    var n = document.getElementById('sel-name').value.trim();
    var p = document.getElementById('sel-phone').value.trim();
    var ps = document.getElementById('sel-pass').value;
    var emailEl = document.getElementById('sel-email');
    var em = emailEl ? emailEl.value.trim() : '';
    var sn = document.getElementById('sel-shop-name').value.trim();
    var c = document.getElementById('sel-shop-category').value;
    var a = document.getElementById('sel-shop-address').value.trim();
    var d = document.getElementById('sel-shop-desc').value.trim();
    var w = document.getElementById('sel-whatsapp').value.trim();
    var hd = document.getElementById('sel-delivery').checked;
    var hc = document.getElementById('sel-cod').checked;
    if (n.length < 3) { toast('Nom requis.', 'error'); return; }
    if (p.replace(/[^0-9]/g,'').length < 8) { toast('Numéro invalide.', 'error'); return; }
    if (!em) { toast('Adresse email requise.', 'error'); return; }
    if (!isValidEmail(em)) { toast('Adresse email invalide.', 'error'); return; }
    if (ps.length < 6) { toast('Mot de passe 6 min.', 'error'); return; }
    if (sn.length < 3) { toast('Nom boutique requis.', 'error'); return; }
    if (!c) { toast('Catégorie requise.', 'error'); return; }
    if (a.length < 3) { toast('Adresse requise.', 'error'); return; }
    var initials = getInitials(sn);
    var cp = p.replace(/\s/g,''); if (cp.indexOf('0') !== 0 && cp.length === 8) cp = '0' + cp;
    var wp = w ? w.replace(/\s/g,'') : cp; if (wp.indexOf('0') !== 0 && wp.length === 8) wp = '0' + wp;
    showLoading('Création de votre boutique...');
    GM.register({ name: n, phone: cp, password: ps, email: em }).catch(function (e) {
        if (e.status === 409) return GM.login(cp, ps); throw e;
    }).then(function (sess) {
        if (sess.shop) throw new Error('Ce compte a déjà une boutique. Utilisez « Se connecter ».');
        return GM.createShop({ name: sn, category: c, address: a, description: d, logo: pendingLogoData || null });
    }).then(function (srvShop) {
        hideLoading();
        _createShopLocal(n, cp, em, sn, initials, c, a, d, wp, hd, hc, srvShop.id);
    }).catch(function (e) { hideLoading(); toast(e.message, 'error', 5000); });
}
function _createShopLocal(n, cp, em, sn, initials, c, a, d, wp, hd, hc, serverShopId) {
    userName = n; userPhone = cp; userEmail = em;
    myShop = {
        serverShopId: serverShopId,
        ownerName: n, phone: cp, pass: '', email: em, shopName: sn, initials: initials,
        category: c, address: a, description: d, whatsapp: wp,
        hasDelivery: hd, hasCOD: hc,
        isCertified: false, isGoldenCertified: false,
        sixStarPoints: 0,
        subscribers: [],
        products: [], logo: pendingLogoData || null,
        wallet: { balance: 0, pending: 0, transactions: [] }
    };
    pendingLogoData = null;
    if (wp) { whatsappConnected = true; whatsappNumber = wp; }
    syncMyShopToCatalog(); applyShopToDashboard();
    isSeller = true; _stateDirty = true;
    toast('Félicitations ' + n.split(' ')[0] + ', votre boutique est créée.', 'success', 4000);
    showScreen('seller-dashboard-screen');
}
function applyShopToDashboard() {
    if (!myShop) return;
    var st = function(id,v){var el=document.getElementById(id);if(el)el.textContent=v;};
    st('dash-shop-name', myShop.shopName);
    st('dash-category', myShop.category);
    st('dash-address', myShop.address);
    var productsWithWarranty = (myShop.products || []).filter(function(p){ return p.hasWarranty && p.warrantyText; }).length;
    st('dash-warranty', productsWithWarranty > 0 ? productsWithWarranty + ' produit(s) garanti(s)' : 'Aucune');
    st('stat-products', myShop.products.length);
    st('stat-sixstar', myShop.sixStarPoints || 0);
    st('stat-orders', sellerOrders.length);
    var pendingDel = 0;
    for (var i = 0; i < sellerOrders.length; i++) if (sellerOrders[i].deliveryStatus === 'pending') pendingDel++;
    st('stat-delivery-req', pendingDel);
    var bids = ['orders-badge','orders-badge0','orders-badge2','orders-badge3'];
    for (var i = 0; i < bids.length; i++) {
        var b = document.getElementById(bids[i]);
        if (b) {
            if (pendingDel > 0) { b.textContent = pendingDel; b.classList.remove('hidden'); }
            else b.classList.add('hidden');
        }
    }
    renderLogo('dash-logo-img', 'dash-logo-initials', myShop.logo, myShop.initials);
    var points = myShop.sixStarPoints || 0, progress = Math.min((points/1000)*100, 100);
    var ct = document.getElementById('cert-title'), cs = document.getElementById('cert-subtitle');
    var cp = document.getElementById('cert-progress'), cb = document.getElementById('cert-banner');
    if (myShop.isCertified) {
        ct.textContent = 'Boutique certifiée';
        cs.textContent = points + ' points';
        cb.className = 'w-full text-left rounded-xl p-4 text-white bg-gradient-to-r from-blue-500 to-blue-600';
    } else {
        ct.textContent = 'Non certifiée';
        cs.textContent = points + ' / 1000 points';
        cb.className = 'w-full text-left rounded-xl p-4 text-white bg-gradient-to-r from-gray-500 to-gray-600';
    }
    cp.style.width = progress + '%';

    var goldPoints = myShop.sixStarPoints || 0;
    var goldProg = Math.min((goldPoints/GOLD_CERTIFICATION_THRESHOLD)*100, 100);
    var gt = document.getElementById('gold-cert-title');
    var gs = document.getElementById('gold-cert-subtitle');
    var gp = document.getElementById('gold-cert-progress');
    if (gt) {
        if (myShop.isGoldenCertified) {
            gt.textContent = 'Golden Certif ✓';
            gs.textContent = goldPoints.toLocaleString('fr-FR') + ' points';
        } else {
            gt.textContent = 'Golden Certif';
            gs.textContent = goldPoints.toLocaleString('fr-FR') + ' / ' + GOLD_CERTIFICATION_THRESHOLD.toLocaleString('fr-FR') + ' points';
        }
    }
    if (gp) gp.style.width = goldProg + '%';

    var shopIdx = findMyCatalogIndex();
    var shopEntry = shopIdx >= 0 ? shopsCatalog[shopIdx] : null;
    var subsCount = (shopEntry && shopEntry.subscribers) ? shopEntry.subscribers.length : 0;
    var subEl = document.getElementById('dash-subscribers-count');
    if (subEl) subEl.textContent = subsCount + ' abonné' + (subsCount > 1 ? 's' : '');

    updateWhatsAppUI(); updateWalletUI(); updateMessageBadges();
}

/* =========================================================
   ACHAT / VENTE
   ========================================================= */
function getStatusInfo(status) { return STATUS_LABELS[status] || { label: status, color: 'bg-gray-100 text-gray-600' }; }
function getCartGrouped() {
    var groups = {};
    for (var i = 0; i < cart.length; i++) {
        var it = cart[i];
        var si = (typeof it.shopIndex === 'undefined') ? currentShopIndex : it.shopIndex;
        if (!groups[si]) groups[si] = { shopIndex: si, items: [], subtotal: 0 };
        groups[si].items.push(it);
        groups[si].subtotal += (it.priceNum || 0) * it.qty;
    }
    var result = [];
    for (var k in groups) {
        var g = groups[k];
        var shop = shopsCatalog[g.shopIndex];
        g.shopName = shop ? shop.name : 'Boutique';
        g.shopLogo = shop ? shop.logo : null;
        g.shopInitials = shop ? shop.initials : '?';
        g.shopColorBg = shop ? shop.colorBg : 'bg-orange-600';
        result.push(g);
    }
    return result;
}
function cartTotal() { var t = 0; for (var i = 0; i < cart.length; i++) t += (cart[i].priceNum || 0) * cart[i].qty; return t; }
function cartItemCount() { var c = 0; for (var i = 0; i < cart.length; i++) c += cart[i].qty; return c; }
function _normalizeCartItems() {
    for (var i = 0; i < cart.length; i++) {
        var it = cart[i];
        if (typeof it.priceNum === 'undefined') it.priceNum = parseInt(String(it.price).replace(/[^0-9]/g, '')) || 0;
        if (typeof it.shopIndex === 'undefined') it.shopIndex = currentShopIndex;
    }
}
function _addItemToCart(item) {
    var existing = null;
    for (var i = 0; i < cart.length; i++) if (cart[i].name === item.name && cart[i].shopIndex === item.shopIndex) { existing = cart[i]; break; }
    if (existing) existing.qty += item.qty;
    else cart.push(item);
}
function _getAvailableStock(shopIndex, productName) {
    var shop = shopsCatalog[shopIndex];
    if (!shop || !shop.products) return null;
    for (var i = 0; i < shop.products.length; i++) if (shop.products[i].name === productName) return shop.products[i].stock || 0;
    return null;
}
function _getQtyInCart(shopIndex, productName) {
    var qty = 0;
    for (var i = 0; i < cart.length; i++) if (cart[i].name === productName && cart[i].shopIndex === shopIndex) qty += cart[i].qty;
    return qty;
}
function addToCartWithQty() {
    if (!_currentProductData) return;
    var availableStock = _getAvailableStock(currentShopIndex, _currentProductData.name);
    if (availableStock !== null && availableStock <= 0) { toast('Produit en rupture de stock.', 'error', 4000); return; }
    var inCart = _getQtyInCart(currentShopIndex, _currentProductData.name);
    if (availableStock !== null && (inCart + _productQty) > availableStock) {
        var remain = availableStock - inCart;
        toast('Stock insuffisant. Disponible : ' + remain + ' (déjà ' + inCart + ' dans votre panier).', 'error', 5000);
        return;
    }
    _addItemToCart({
        shopIndex: _currentProductData.shopIndex, name: _currentProductData.name,
        price: _currentProductData.priceLabel, priceNum: _currentProductData.price,
        image: _currentProductData.image, qty: _productQty,
        hasDelivery: _currentProductData.hasDelivery,
        hasWarranty: _currentProductData.hasWarranty,
        warrantyText: _currentProductData.warrantyText
    });
    updateCartUI(); _stateDirty = true;
    haptic([10, 30, 10]);
    toast(_productQty + 'x ' + _currentProductData.name + ' ajouté au panier.', 'success');
    showScreen('home-screen');
}
function buyNow() { if (!_currentProductData) return; addToCartWithQty(); setTimeout(function() { goToCheckout(); }, 250); }

function renderCartScreen() {
    _normalizeCartItems();
    var container = document.getElementById('cart-items-container');
    var footer = document.getElementById('cart-footer');
    if (!container) return;
    if (cart.length === 0) {
        container.innerHTML = '<div class="text-center py-10">' +
            '<p class="text-gray-500 font-bold">Votre panier attend ses premiers articles 🛒</p>' +
            '<p class="text-xs text-gray-400 mt-1 mb-4">Faites un tour, il y a de belles choses à découvrir.</p>' +
            '<button onclick="showScreen(\'home-screen\')" class="bg-green-600 text-white font-bold py-2 px-6 rounded-lg text-sm">Explorer les boutiques</button></div>';
        if (footer) footer.classList.add('hidden');
        return;
    }
    if (footer) footer.classList.remove('hidden');
    var groups = getCartGrouped();
    var h = '';
    for (var gi = 0; gi < groups.length; gi++) {
        var g = groups[gi];
        h += '<div class="bg-white rounded-xl overflow-hidden mb-3">';
        h += '<div class="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b">';
        h += '<div class="' + g.shopColorBg + ' text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0">';
        if (g.shopLogo) h += '<img src="' + g.shopLogo + '" class="w-full h-full object-cover">';
        else h += escapeHtml(g.shopInitials);
        h += '</div><p class="font-bold text-sm flex-1 truncate">' + escapeHtml(g.shopName) + '</p>';
        h += '<span class="text-[10px] text-gray-500">' + g.items.length + ' article' + (g.items.length > 1 ? 's' : '') + '</span></div>';
        for (var ii = 0; ii < g.items.length; ii++) {
            var it = g.items[ii];
            var globalIdx = cart.indexOf(it);
            var stock = _getAvailableStock(g.shopIndex, it.name);
            var stockWarn = '';
            if (stock !== null && it.qty > stock) stockWarn = '<p class="text-[10px] text-red-500 font-bold mt-0.5">Stock insuffisant (dispo : ' + stock + ')</p>';
            h += '<div class="p-3 flex items-center gap-3 border-b last:border-b-0">';
            h += '<img src="' + it.image + '" class="w-16 h-16 object-cover rounded-lg flex-shrink-0">';
            h += '<div class="flex-1 min-w-0"><h4 class="font-bold text-sm truncate">' + escapeHtml(it.name) + '</h4>';
            h += '<p class="text-orange-500 font-bold text-sm mt-0.5">' + it.price + '</p>';
            h += stockWarn;
            h += '<div class="flex items-center justify-between mt-2">';
            h += '<div class="flex items-center border rounded-lg text-sm">';
            h += '<button onclick="changeCartQty(' + globalIdx + ',-1)" class="px-3 py-1">−</button>';
            h += '<span class="px-3 font-bold">' + it.qty + '</span>';
            h += '<button onclick="changeCartQty(' + globalIdx + ',1)" class="px-3 py-1">+</button></div>';
            h += '<button onclick="removeFromCart(' + globalIdx + ')" class="text-red-500 text-xs font-bold">Supprimer</button>';
            h += '</div></div></div>';
        }
        h += '<div class="px-3 py-2 bg-gray-50 flex justify-between text-xs"><span class="text-gray-600">Sous-total boutique</span>';
        h += '<span class="font-bold text-gray-800">' + g.subtotal.toLocaleString('fr-FR') + ' FCFA</span></div></div>';
    }
    container.innerHTML = h;
    var total = cartTotal();
    var se = document.getElementById('cart-subtotal'); if (se) se.textContent = total.toLocaleString('fr-FR') + ' FCFA';
    var te = document.getElementById('cart-total'); if (te) te.textContent = total.toLocaleString('fr-FR') + ' FCFA';
}
function updateCartUI() {
    var count = cartItemCount();
    var b = document.getElementById('cart-badge'); if (b) b.textContent = count;
    var bb = document.getElementById('cart-badge-bottom'); if (bb) bb.textContent = count;
    var cc = document.getElementById('cart-count'); if (cc) cc.textContent = count;
    var cur = document.querySelector('.screen:not(.hidden)');
    if (cur && cur.id === 'cart-screen') renderCartScreen();
}
function changeCartQty(i, d) {
    if (i < 0 || i >= cart.length) return;
    var item = cart[i];
    if (d > 0) {
        var stock = _getAvailableStock(item.shopIndex, item.name);
        if (stock !== null && item.qty >= stock) { toast('Stock maximum atteint (' + stock + ').', 'warn'); return; }
    }
    item.qty += d;
    if (item.qty < 1) item.qty = 1;
    _stateDirty = true; renderCartScreen(); updateCartUI();
}
function removeFromCart(i) { if (i < 0 || i >= cart.length) return; cart.splice(i, 1); _stateDirty = true; renderCartScreen(); updateCartUI(); }

function renderCheckoutScreen() {
    _normalizeCartItems();
    var groups = getCartGrouped();
    var total = cartTotal();
    var cn = document.getElementById('checkout-name'); if (cn) cn.textContent = userName;
    var cp = document.getElementById('checkout-phone'); if (cp) cp.textContent = '+242 ' + userPhone;
    var ct = document.getElementById('checkout-total'); if (ct) ct.textContent = total.toLocaleString('fr-FR') + ' FCFA';

    var recap = document.getElementById('checkout-recap');
    if (!recap) {
        var checkoutContainer = document.querySelector('#checkout-screen .overflow-y-auto');
        if (checkoutContainer) {
            recap = document.createElement('div');
            recap.id = 'checkout-recap';
            checkoutContainer.insertBefore(recap, checkoutContainer.firstChild);
        }
    }
    if (recap) {
        var h = '<div class="bg-white border rounded-xl p-3 mb-2">';
        h += '<p class="text-xs font-bold text-gray-500 uppercase mb-3">Récapitulatif de commande</p>';
        for (var gi = 0; gi < groups.length; gi++) {
            var g = groups[gi];
            h += '<div class="mb-3 pb-3 border-b last:border-b-0 last:pb-0 last:mb-0">';
            h += '<div class="flex items-center gap-2 mb-2">';
            h += '<div class="' + g.shopColorBg + ' text-white rounded-full w-7 h-7 flex items-center justify-center text-[10px] font-bold overflow-hidden flex-shrink-0">';
            if (g.shopLogo) h += '<img src="' + g.shopLogo + '" class="w-full h-full object-cover">';
            else h += escapeHtml(g.shopInitials);
            h += '</div><p class="font-bold text-xs flex-1 truncate">' + escapeHtml(g.shopName) + '</p>';
            h += '<span class="text-xs font-bold text-orange-500">' + g.subtotal.toLocaleString('fr-FR') + ' F</span></div>';
            for (var ii = 0; ii < g.items.length; ii++) {
                var it = g.items[ii];
                h += '<div class="flex justify-between text-xs text-gray-600 ml-9">';
                h += '<span class="truncate flex-1 pr-2">' + it.qty + 'x ' + escapeHtml(it.name) + '</span>';
                h += '<span class="font-bold">' + ((it.priceNum || 0) * it.qty).toLocaleString('fr-FR') + ' F</span></div>';
            }
            h += '</div>';
        }
        h += '<div class="flex justify-between items-center pt-2 border-t font-bold"><span class="text-sm">Total (' + groups.length + ' boutique' + (groups.length > 1 ? 's' : '') + ')</span>';
        h += '<span class="text-orange-500">' + total.toLocaleString('fr-FR') + ' FCFA</span></div></div>';
        recap.innerHTML = h;
    }

    var bal = buyerWallet.balance || 0;
    var wb = document.getElementById('checkout-wallet-balance'); if (wb) wb.textContent = bal.toLocaleString('fr-FR') + ' FCFA';
    var wt = document.getElementById('checkout-wallet-total'); if (wt) wt.textContent = total.toLocaleString('fr-FR') + ' FCFA';
    var msg = document.getElementById('checkout-wallet-msg');
    var btn = document.getElementById('checkout-action-btn');
    if (bal >= total) {
        if (msg) { msg.textContent = 'Solde suffisant ✓'; msg.className = 'text-xs text-center font-bold text-green-700 mt-2'; }
        if (btn) { btn.textContent = 'Payer depuis mon portefeuille'; btn.className = 'w-full bg-green-600 text-white font-bold py-3 rounded-lg active:bg-green-700'; }
    } else {
        var manque = total - bal;
        if (msg) { msg.textContent = 'Solde insuffisant — Recharger ' + manque.toLocaleString('fr-FR') + ' FCFA'; msg.className = 'text-xs text-center font-bold text-red-600 mt-2'; }
        if (btn) { btn.textContent = 'Recharger mon portefeuille'; btn.className = 'w-full bg-orange-500 text-white font-bold py-3 rounded-lg active:bg-orange-600'; }
    }
}
function goToCheckout() {
    if (cart.length === 0) { toast('Votre panier est vide.', 'warn'); return; }
    _normalizeCartItems();
    for (var i = 0; i < cart.length; i++) {
        var item = cart[i];
        var stock = _getAvailableStock(item.shopIndex, item.name);
        if (stock !== null && stock < item.qty) { toast('Stock insuffisant pour "' + item.name + '". Disponible : ' + stock, 'error', 5000); return; }
    }
    showScreen('checkout-screen');
}
function selectDelivery(mode) {
    selectedDelivery = mode;
    var h = document.getElementById('delivery-home'), p = document.getElementById('delivery-pickup');
    if (h) h.className = mode === 'home' ? 'border-2 border-green-500 rounded-xl p-4 bg-green-50 cursor-pointer flex justify-between items-center' : 'border-2 border-gray-200 rounded-xl p-4 cursor-pointer flex justify-between items-center';
    if (p) p.className = mode === 'pickup' ? 'border-2 border-green-500 rounded-xl p-4 bg-green-50 cursor-pointer flex justify-between items-center' : 'border-2 border-gray-200 rounded-xl p-4 cursor-pointer flex justify-between items-center';
}

function confirmOrder() {
    if (cart.length === 0) { toast('Panier vide.', 'error'); return; }
    if (!GM.loggedIn()) { toast('Connectez-vous pour commander.', 'error'); return; }
    _normalizeCartItems();
    requireTermsAcceptance(function() {
        _placeServerOrders(JSON.parse(JSON.stringify(cart)));
    }, 'checkout-screen');
}
function _placeServerOrders(cartSnapshot) {
    var groups = {};
    for (var i = 0; i < cartSnapshot.length; i++) {
        var it = cartSnapshot[i];
        var si = (typeof it.shopIndex === 'undefined') ? currentShopIndex : it.shopIndex;
        if (!groups[si]) groups[si] = { shopIndex: si, items: [] };
        groups[si].items.push(it);
    }
    var groupList = [];
    for (var k in groups) groupList.push(groups[k]);
    showLoading('Création de la commande...');
    _placeNextGroup(groupList, 0);
}
function _placeNextGroup(groupList, idx) {
    if (idx >= groupList.length) {
        hideLoading(); cart = []; updateCartUI();
        GM.syncOrders().then(function () { renderBuyerOrders(); }).catch(function () {});
        showScreen('buyer-orders-screen'); setBuyerOrdersFilter('to_ship');
        return;
    }
    var g = groupList[idx];
    var shop = shopsCatalog[g.shopIndex];
    if (!shop || !shop.serverId) { hideLoading(); toast('Boutique indisponible, réessayez.', 'error', 5000); return; }
    var items = g.items.map(function (it) { return { productId: it.serverId, qty: it.qty }; });
    if (items.some(function (x) { return !x.productId; })) { hideLoading(); toast('Un produit n\'est plus disponible, actualisez le catalogue.', 'error', 5000); return; }
    var addrEl = document.getElementById('checkout-address');
    var addr = addrEl ? addrEl.value.trim() : '';
    if (selectedDelivery === 'home' && addr.length < 3) { hideLoading(); toast('Indiquez une adresse pour la livraison à domicile.', 'error', 5000); return; }
    GM.createOrder({ shopId: shop.serverId, items: items, deliveryMode: selectedDelivery, address: addr }).then(function (order) {
        hideLoading();
        GM.pay({
            purpose: 'order', refId: order.id, amount: order.total,
            title: 'Commande chez ' + shop.name, description: order.items.length + ' article(s) — ' + order.total.toLocaleString('fr-FR') + ' FCFA. Les fonds resteront en séquestre jusqu\'à votre confirmation de réception.',
            successText: 'Commande payée. Les fonds sont en séquestre jusqu\'à votre confirmation.',
            onSuccess: function () { for (var i = 0; i < g.items.length; i++) { var it = g.items[i]; if (shop.products) for (var p = 0; p < shop.products.length; p++) if (shop.products[p].serverId === it.serverId) shop.products[p].stock = Math.max(0, shop.products[p].stock - it.qty); } _placeNextGroup(groupList, idx + 1); }
        });
    }).catch(function (e) { hideLoading(); toast(e.message, 'error', 6000); });
}
function _finalizeOrderAfterPayment(cartSnapshot) {

    _normalizeCartItems();
    var groups = {};
    for (var i = 0; i < cartSnapshot.length; i++) {
        var it = cartSnapshot[i];
        var si = (typeof it.shopIndex === 'undefined') ? currentShopIndex : it.shopIndex;
        if (!groups[si]) groups[si] = { shopIndex: si, items: [] };
        groups[si].items.push(it);
    }
    var batchId = generateBatchId();
    var dateStr = formatDate();
    var dateTimeStr = formatDateTime();
    var createdOrders = [];

    var total = 0;
    for (var k in groups) for (var j = 0; j < groups[k].items.length; j++) {
        var it = groups[k].items[j];
        var pn = it.priceNum || parseInt(String(it.price).replace(/[^0-9]/g,'')) || 0;
        total += pn * it.qty;
    }
    if ((buyerWallet.balance || 0) < total) { toast('Solde insuffisant.', 'error'); return; }

    for (var k in groups) {
        var g = groups[k];
        var shop = shopsCatalog[g.shopIndex];
        var items = [], subtotal = 0;
        for (var j = 0; j < g.items.length; j++) {
            var it = g.items[j];
            var pn = it.priceNum || parseInt(String(it.price).replace(/[^0-9]/g,'')) || 0;
            items.push({ name: it.name, qty: it.qty, price: pn, hasWarranty: !!it.hasWarranty, warrantyText: it.warrantyText || '' });
            subtotal += pn * it.qty;
            if (shop && shop.products) {
                for (var pi = 0; pi < shop.products.length; pi++) if (shop.products[pi].name === it.name) {
                    shop.products[pi].stock = Math.max(0, (shop.products[pi].stock || 0) - it.qty); break;
                }
            }
            if (myShop && shop && shop.ownerPhone === myShop.phone && myShop.products) {
                for (var mpi = 0; mpi < myShop.products.length; mpi++) if (myShop.products[mpi].name === it.name) {
                    myShop.products[mpi].stock = Math.max(0, (myShop.products[mpi].stock || 0) - it.qty); break;
                }
            }
        }
        var orderId = generateOrderId();
        var order = {
            id: orderId, batchId: batchId, shopIndex: g.shopIndex,
            shopName: shop ? shop.name : 'Boutique', shopPhone: shop ? shop.phone : '',
            buyerName: userName, buyerPhone: userPhone, items: items, total: subtotal,
            status: ORDER_STATUS.PAID, escrowStatus: 'held',
            deliveryMode: selectedDelivery,
            deliveryStatus: 'pending',
            deliveryAddress: 'Avenue de la Paix, Brazzaville',
            paymentMethod: 'wallet', trackingNumber: '',
            date: dateStr, createdAt: Date.now(), validatedAt: dateTimeStr,
            buyerConfirmed: false, sellerConfirmed: false, rated: false,
            sellerAcceptedOrder: false,
            disputed: false, disputeReason: '',
            autoConfirmAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
            timeline: [
                { step: 'created', label: 'Commande créée', at: dateTimeStr },
                { step: 'paid', label: 'Paiement reçu — en séquestre', at: dateTimeStr }
            ]
        };
        buyerOrders.push(order);
        refreshBuyerTrophies();
        createdOrders.push(order);

        addToBuyerEscrow(subtotal, orderId, order.shopName);

        addNotification('seller', 'Nouvelle commande',
            order.buyerName + ' a commandé ' + items.length + ' article(s) — ' + subtotal.toLocaleString('fr-FR') + ' FCFA',
            'order', orderId);
        addNotification('buyer', 'Commande confirmée',
            'Votre paiement de ' + subtotal.toLocaleString('fr-FR') + ' FCFA est en séquestre. En attente d\'acceptation du vendeur.',
            'success', orderId);

        var isMyShopOrder = myShop && shop && shop.ownerPhone === myShop.phone;
        if (isMyShopOrder) {
            sellerOrders.push(order);
            if (selectedDelivery === 'home') sendWhatsAppNotification(myShop.whatsapp, 'Nouvelle commande ' + orderId + ' — à accepter');
            addToEscrow(subtotal, orderId, order.shopName);
        }
    }
    cart = [];
    updateCartUI(); applyShopToDashboard();
    if (myShop) syncMyShopToCatalog();
    _stateDirty = true;
    renderBuyerWallet();
    toast('Commande' + (createdOrders.length > 1 ? 's' : '') + ' confirmée' + (createdOrders.length > 1 ? 's' : '') + '.', 'success', 3500);
    showScreen('confirmation-screen');
}
function resetAndGoHome() {
    cart = []; updateCartUI();
    applyShopToDashboard(); _stateDirty = true;
    showScreen('home-screen');
}

/* =========================================================
   COMMANDES
   ========================================================= */
function renderBuyerOrders() {
    var c = document.getElementById('buyer-orders-tab'); if (!c) return;
    var my = [];
    for (var i = 0; i < buyerOrders.length; i++) if (buyerOrders[i].buyerPhone === userPhone) my.push(buyerOrders[i]);
    my.sort(function(a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    var filtered = [];
    for (var i = 0; i < my.length; i++) {
        var st = my[i].status;
        if (buyerOrdersFilter === 'all') filtered.push(my[i]);
        else if (buyerOrdersFilter === 'to_pay' && st === ORDER_STATUS.PENDING_PAYMENT) filtered.push(my[i]);
        else if (buyerOrdersFilter === 'to_ship' && (st === ORDER_STATUS.PAID || st === ORDER_STATUS.PROCESSING)) filtered.push(my[i]);
        else if (buyerOrdersFilter === 'to_receive' && (st === ORDER_STATUS.SHIPPED || st === ORDER_STATUS.DELIVERED)) filtered.push(my[i]);
        else if (buyerOrdersFilter === 'completed' && (st === ORDER_STATUS.COMPLETED || st === ORDER_STATUS.CANCELLED || st === ORDER_STATUS.REFUNDED)) filtered.push(my[i]);
    }
    var h = '<div class="flex gap-1 mb-3 overflow-x-auto pb-1">';
    var tabs = [
        { id: 'all', label: 'Toutes' }, { id: 'to_pay', label: 'À payer' },
        { id: 'to_ship', label: 'À expédier' }, { id: 'to_receive', label: 'À recevoir' },
        { id: 'completed', label: 'Terminées' }
    ];
    for (var i = 0; i < tabs.length; i++) {
        var active = buyerOrdersFilter === tabs[i].id;
        h += '<button onclick="setBuyerOrdersFilter(\'' + tabs[i].id + '\')" class="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ' + (active ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border') + '">' + tabs[i].label + '</button>';
    }
    h += '</div>';
    if (filtered.length === 0) {
        h += '<div class="text-center py-10 text-gray-400 text-sm">' +
             'Pas encore de commande ici.<br>' +
             '<span class="text-xs">Vos futures commandes apparaîtront au fur et à mesure.</span></div>';
        c.innerHTML = h; return;
    }
    for (var i = 0; i < filtered.length; i++) h += renderOrderCard(filtered[i], 'buyer');
    c.innerHTML = h;
}
function setBuyerOrdersFilter(f) { buyerOrdersFilter = f; renderBuyerOrders(); }

function renderOrderCard(order, viewer) {
    var st = getStatusInfo(order.status);
    var itemsHtml = '';
    for (var j = 0; j < order.items.length; j++) {
        var it = order.items[j];
        itemsHtml += '<div class="flex justify-between text-xs text-gray-600 mt-1">';
        itemsHtml += '<span class="truncate flex-1 pr-2">' + it.qty + 'x ' + escapeHtml(it.name) + '</span>';
        itemsHtml += '<span class="font-bold">' + (it.price * it.qty).toLocaleString('fr-FR') + ' F</span></div>';
    }
    var _shopForOrder = shopsCatalog[order.shopIndex];
    var _shopBadge = _shopForOrder ? renderShopBadge(_shopForOrder) : '';
    var h = '<div class="bg-white p-4 rounded-xl shadow-sm mb-3">';
    h += '<div class="flex justify-between items-start mb-2 gap-2">';
    h += '<div class="min-w-0 flex-1"><p class="text-[10px] text-gray-400">' + order.id + '</p>';
    h += '<p class="font-bold text-sm flex items-center min-w-0"><span class="truncate">' + escapeHtml(order.shopName) + '</span>' + _shopBadge + '</p></div>';
    h += '<span class="text-[10px] px-2 py-1 rounded-full font-bold whitespace-nowrap ' + st.color + '">' + st.label + '</span></div>';
    var delivLabel = order.deliveryMode === 'home' ? 'Livraison à domicile' : 'Retrait en boutique';
    h += '<div class="flex items-center justify-between text-[10px] text-gray-500 mt-1 mb-2">';
    h += '<span>' + delivLabel + '</span><span>' + (order.date || '') + '</span></div>';

    if (viewer === 'buyer' && !order.sellerAcceptedOrder && order.status !== ORDER_STATUS.CANCELLED && order.status !== ORDER_STATUS.REFUNDED && order.status !== ORDER_STATUS.DISPUTED) {
        h += '<div class="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-2">';
        h += '<p class="text-[11px] text-amber-800 font-bold">⏳ En attente du vendeur</p>';
        h += '<p class="text-[10px] text-amber-700 mt-1 leading-relaxed">Vous pouvez l\'annuler maintenant pour être remboursé immédiatement.</p></div>';
    }

    if (order.trackingNumber) {
        h += '<div class="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2">';
        h += '<p class="text-[10px] text-blue-700">Numéro de suivi : <strong>' + escapeHtml(order.trackingNumber) + '</strong></p></div>';
    }
    h += '<div class="border-t pt-2">' + itemsHtml + '</div>';
    h += '<div class="flex justify-between items-center mt-3 pt-3 border-t"><span class="text-xs text-gray-500">Total</span>';
    h += '<span class="font-bold text-orange-500">' + order.total.toLocaleString('fr-FR') + ' FCFA</span></div>';
    if (order.escrowStatus === 'held') h += '<div class="mt-2 text-center"><span class="escrow-badge escrow-pending">Montant en séquestre</span></div>';
    else if (order.escrowStatus === 'released') h += '<div class="mt-2 text-center"><span class="escrow-badge escrow-released">Paiement libéré</span></div>';
    else if (order.escrowStatus === 'refunded') h += '<div class="mt-2 text-center"><span class="escrow-badge escrow-refunded">Remboursé</span></div>';
    h += '<button onclick="toggleOrderTimeline(\'' + order.id + '\')" class="w-full text-xs text-gray-500 font-bold py-2 mt-2 border-t">Suivi de commande</button>';
    h += '<div id="tl-' + order.id + '" class="hidden">' + renderTimeline(order) + '</div>';
    h += renderOrderActions(order, viewer);
    h += '</div>';
    return h;
}

function renderOrderActions(order, viewer) {
    var h = '';
    var isCancelled = (order.status === ORDER_STATUS.CANCELLED || order.status === ORDER_STATUS.REFUNDED);
    var isCompleted = (order.status === ORDER_STATUS.COMPLETED);

    if (viewer === 'buyer') {
        if ((order.status === ORDER_STATUS.PAID || order.status === ORDER_STATUS.PROCESSING) && order.escrowStatus === 'held')
            h += '<button onclick="cancelOrderBuyer(\'' + order.id + '\')" class="w-full bg-white border-2 border-red-500 text-red-500 font-bold py-2 rounded-lg text-xs mt-3">Annuler la commande</button>';

        if (!order.sellerAcceptedOrder && !isCancelled) {
            h += '<button onclick="openChatFromOrder(\'' + order.id + '\')" class="w-full bg-white border border-green-600 text-green-600 font-bold py-2 rounded-lg text-xs mt-2">Contacter le vendeur</button>';
            return h;
        }

        if (order.status === ORDER_STATUS.SHIPPED) {
            h += '<button onclick="buyerMarkDelivered(\'' + order.id + '\')" class="w-full bg-purple-600 text-white font-bold py-2 rounded-lg text-xs mt-3">J\'ai reçu le colis</button>';
            h += '<button onclick="openDispute(\'' + order.id + '\')" class="w-full bg-white border-2 border-red-500 text-red-500 font-bold py-2 rounded-lg text-xs mt-2">Ouvrir un litige</button>';
        }
        if (order.status === ORDER_STATUS.DELIVERED) {
            h += '<button onclick="buyerConfirmReception(\'' + order.id + '\')" class="w-full bg-green-600 text-white font-bold py-2 rounded-lg text-xs mt-3">Confirmer la réception</button>';
            h += '<button onclick="openDispute(\'' + order.id + '\')" class="w-full bg-white border-2 border-red-500 text-red-500 font-bold py-2 rounded-lg text-xs mt-2">Ouvrir un litige</button>';
        }
        if (isCompleted && !order.rated)
            h += '<button onclick="openRateOrder(\'' + order.id + '\')" class="w-full bg-orange-500 text-white font-bold py-2 rounded-lg text-xs mt-3">Noter la boutique</button>';
        if (isCompleted && order.rated && order.rating) {
            var avgR = (order.rating.delivery + order.rating.quality + order.rating.behavior) / 3;
            h += '<div class="mt-3 pt-3 border-t text-xs text-gray-500 flex items-center gap-2 flex-wrap">';
            h += '<span class="text-yellow-400">' + renderStars(avgR) + '</span>';
            h += '<span>Livr. ' + order.rating.delivery + '/6 · Qual. ' + order.rating.quality + '/6 · Comp. ' + order.rating.behavior + '/6</span></div>';
        }
        if (order.receipt && !order.receipt.deleted)
            h += '<button onclick="openReceipt(\'' + order.id + '\')" class="w-full bg-green-600 text-white font-bold py-2 rounded-lg text-xs mt-2">Voir le ticket</button>';
        if (!isCancelled)
            h += '<button onclick="openChatFromOrder(\'' + order.id + '\')" class="w-full bg-white border border-green-600 text-green-600 font-bold py-2 rounded-lg text-xs mt-2">Contacter le vendeur</button>';
        h += '<button onclick="shareOrderOnWhatsApp(\'' + order.id + '\')" class="w-full bg-white border border-green-500 text-green-600 font-bold py-2 rounded-lg text-xs mt-2">Partager</button>';
        return h;
    }

    if (order.status === ORDER_STATUS.PAID && !order.sellerAcceptedOrder) {
        h += '<button onclick="sellerAcceptOrder(\'' + order.id + '\')" class="w-full bg-green-600 text-white font-bold py-2.5 rounded-lg text-xs mt-3 flex items-center justify-center gap-2">';
        h += '✓ Accepter la commande';
        h += '</button>';
        h += '<p class="text-[10px] text-gray-500 text-center mt-2">L\'acheteur sera notifié immédiatement de votre acceptation.</p>';
        if (!isCancelled) {
            h += '<button onclick="openReportBuyer(\'' + order.id + '\')" class="w-full bg-white border-2 border-red-500 text-red-500 font-bold py-2 rounded-lg text-xs mt-3">Signaler ce client</button>';
        }
        h += '<button onclick="openChatFromOrder(\'' + order.id + '\')" class="w-full bg-white border border-orange-500 text-orange-500 font-bold py-2 rounded-lg text-xs mt-2">Contacter l\'acheteur</button>';
        return h;
    }

    if (order.status === ORDER_STATUS.PROCESSING) h += '<button onclick="sellerShipOrder(\'' + order.id + '\')" class="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg text-xs mt-3">Marquer comme expédié</button>';
    if (order.status === ORDER_STATUS.SHIPPED && !order.sellerConfirmed) h += '<button onclick="sellerConfirmDelivery(\'' + order.id + '\')" class="w-full bg-green-600 text-white font-bold py-2 rounded-lg text-xs mt-3">Confirmer la livraison</button>';
    if (order.deliveryMode === 'home' && order.deliveryStatus === 'pending') {
        h += '<div class="flex gap-2 mt-2">';
        h += '<button onclick="acceptDelivery(\'' + order.id + '\')" class="flex-1 bg-green-600 text-white font-bold py-2 rounded-lg text-xs">Accepter la livraison</button>';
        h += '<button onclick="refuseDelivery(\'' + order.id + '\')" class="flex-1 bg-red-500 text-white font-bold py-2 rounded-lg text-xs">Refuser</button></div>';
    }
    if (isCompleted) h += '<div class="bg-green-50 text-green-700 rounded-lg p-2 mt-3 text-xs text-center font-bold">Commande terminée — fonds disponibles</div>';

    if (!isCancelled) {
        h += '<button onclick="openReportBuyer(\'' + order.id + '\')" class="w-full bg-white border-2 border-red-500 text-red-500 font-bold py-2 rounded-lg text-xs mt-3">Signaler ce client</button>';
    }
    h += '<button onclick="openChatFromOrder(\'' + order.id + '\')" class="w-full bg-white border border-orange-500 text-orange-500 font-bold py-2 rounded-lg text-xs mt-2">Contacter l\'acheteur</button>';
    h += '<button onclick="shareOrderOnWhatsApp(\'' + order.id + '\')" class="w-full bg-white border border-green-500 text-green-600 font-bold py-2 rounded-lg text-xs mt-2">Partager</button>';
    return h;
}

function sellerAcceptOrder(orderId) {
    var order = findSellerOrder(orderId); if (!order) return;
    gmConfirm('Accepter cette commande ?\n\nL\'acheteur sera informé.\n\nMontant : ' + order.total.toLocaleString('fr-FR') + ' FCFA', 'Accepter la commande', { confirmText: 'Oui, j\'accepte' })
    .then(function(ok) {
        if (!ok) return;
        GM.orderAction(orderId, 'accept').then(function () {
            return GM.syncOrders();
        }).then(function () {
            renderSellerOrders(); applyShopToDashboard(); haptic([20, 40, 20]);
            toast('Commande acceptée. Le client est prévenu !', 'success', 4000);
        }).catch(function (e) { toast(e.message, 'error', 5000); });
    });
}
function cancelOrderBuyer(orderId) {
    var order = findBuyerOrder(orderId); if (!order) return;
    if (order.escrowStatus !== 'held' && order.status !== 'pending_payment') { toast('Cette commande a déjà été traitée.', 'error'); return; }
    var msg = order.sellerAcceptedOrder
        ? 'Annuler cette commande ?\n\nVotre paiement sera remboursé.\nLe stock sera restauré.'
        : 'Annuler cette commande (en attente d\'acceptation du vendeur) ?\n\nVotre paiement sera immédiatement remboursé.';
    gmConfirm(msg, 'Annulation', { danger: true, confirmText: 'Annuler la commande' })
    .then(function(ok) {
        if (!ok) return;
        GM.orderAction(orderId, 'cancel').then(function () {
            return GM.loadCatalog().catch(function () {}).then(function () { return GM.syncOrders(); });
        }).then(function () {
            renderBuyerOrders(); applyShopToDashboard();
            toast('Commande annulée. Le remboursement est en cours.', 'success', 4000);
        }).catch(function (e) { toast(e.message, 'error', 5000); });
    });
}
function buyerMarkDelivered(orderId) {
    var order = findBuyerOrder(orderId); if (!order) return;
    gmConfirm('Confirmer que vous avez bien reçu le colis ?', 'Réception', { confirmText: 'Oui, reçu' })
    .then(function(ok) {
        if (!ok) return;
        GM.orderAction(orderId, 'confirm').then(function () { return GM.syncOrders(); }).then(function () {
            renderBuyerOrders(); toast('Merci ! Le paiement a été transmis au vendeur.', 'success', 4000);
        }).catch(function (e) { toast(e.message, 'error', 5000); });
    });
}
function buyerConfirmReception(orderId) {
    var order = findBuyerOrder(orderId); if (!order) return;
    if (order.escrowStatus !== 'held') { toast('Commande déjà traitée.', 'info'); return; }
    gmConfirm('Confirmer la réception ?\n\nCette action libère définitivement le paiement au vendeur.', 'Confirmation', { confirmText: 'Confirmer' })
    .then(function(ok) {
        if (!ok) return;
        GM.orderAction(orderId, 'confirm').then(function () { return GM.syncOrders(); }).then(function () {
            renderBuyerOrders(); applyShopToDashboard();
            toast('Merci ! Le paiement a été transmis au vendeur.', 'success', 4000);
        }).catch(function (e) { toast(e.message, 'error', 5000); });
    });
}
function openDispute(orderId) {
    var order = findBuyerOrder(orderId); if (!order) return;
    gmPrompt('Décrivez brièvement le problème :', '', 'Ouvrir un litige').then(function(reason) {
        if (!reason || !reason.trim()) return;
        GM.orderAction(orderId, 'dispute').then(function () {
            return GM.req('POST', '/api/reports', { type: 'order_dispute', orderId: orderId, shopId: order.shopId, details: reason.trim() }).catch(function () {});
        }).then(function () { return GM.syncOrders(); }).then(function () {
            renderBuyerOrders(); toast('Litige ouvert. Notre équipe va examiner votre commande.', 'warn', 5000);
        }).catch(function (e) { toast(e.message, 'error', 5000); });
    });
}
function sellerShipOrder(orderId) {
    var order = findSellerOrder(orderId); if (!order) return;
    var action = order.status === 'processing' ? 'ship' : 'deliver';
    gmConfirm(action === 'ship' ? 'Marquer cette commande comme expédiée ?' : 'Marquer cette commande comme livrée/remise au client ?', 'Livraison', { confirmText: 'Confirmer' })
    .then(function(ok) {
        if (!ok) return;
        GM.orderAction(orderId, action).then(function () { return GM.syncOrders(); }).then(function () {
            renderSellerOrders(); applyShopToDashboard();
            toast(action === 'ship' ? 'Commande marquée comme expédiée.' : 'Commande marquée comme livrée.', 'success');
        }).catch(function (e) { toast(e.message, 'error', 5000); });
    });
}
function sellerConfirmDelivery(orderId) {
    sellerShipOrder(orderId);
}
function acceptDelivery(orderId) {
    var order = findSellerOrder(orderId); if (!order) return;
    GM.orderAction(orderId, 'accept').then(function () { return GM.syncOrders(); }).then(function () {
        renderSellerOrders(); applyShopToDashboard(); toast('Livraison acceptée.', 'success');
    }).catch(function (e) { toast(e.message, 'error', 5000); });
}
function refuseDelivery(orderId) {
    toast('Pour refuser une livraison à domicile, contactez le client dans la messagerie puis annulez la commande si besoin.', 'info', 6000);
}
function findBuyerOrder(orderId) { for (var i = 0; i < buyerOrders.length; i++) if (buyerOrders[i].id === orderId) return buyerOrders[i]; return null; }
function findSellerOrder(orderId) { for (var i = 0; i < sellerOrders.length; i++) if (sellerOrders[i].id === orderId) return sellerOrders[i]; return null; }
function _syncSellerOrder(buyerOrd) { for (var i = 0; i < sellerOrders.length; i++) if (sellerOrders[i].id === buyerOrd.id) { Object.assign(sellerOrders[i], buyerOrd); break; } }
function _syncBuyerOrder(sellerOrd) { for (var i = 0; i < buyerOrders.length; i++) if (buyerOrders[i].id === sellerOrd.id) { Object.assign(buyerOrders[i], sellerOrd); break; } }
function _restoreStockForOrder(order) {
    var shop = shopsCatalog[order.shopIndex];
    if (!shop || !shop.products) return;
    for (var i = 0; i < order.items.length; i++) {
        var it = order.items[i];
        for (var j = 0; j < shop.products.length; j++) if (shop.products[j].name === it.name) {
            shop.products[j].stock = (shop.products[j].stock || 0) + it.qty; break;
        }
    }
    if (myShop && shop.ownerPhone === myShop.phone && myShop.products) {
        for (var k = 0; k < order.items.length; k++) {
            var it2 = order.items[k];
            for (var l = 0; l < myShop.products.length; l++) if (myShop.products[l].name === it2.name) {
                myShop.products[l].stock = (myShop.products[l].stock || 0) + it2.qty; break;
            }
        }
    }
}
function checkAutoConfirmOrders() {
    var now = Date.now(), changed = false;
    for (var i = 0; i < buyerOrders.length; i++) {
        var o = buyerOrders[i];
        if (o.status === ORDER_STATUS.DELIVERED && o.autoConfirmAt && now >= o.autoConfirmAt) {
            o.status = ORDER_STATUS.COMPLETED; o.escrowStatus = 'released';
            o.timeline.push({ step: 'auto_confirmed', label: 'Réception auto-confirmée', at: formatDateTime() });
            _syncSellerOrder(o);
            releaseFromEscrow(o.id);
            releaseBuyerEscrow(o.total, o.id, o.shopName);
            generateReceiptForOrder(o);
            changed = true;
        }
    }
    if (changed) { _stateDirty = true; renderBuyerOrders(); }
}

function renderSellerOrders() {
    var c = document.getElementById('seller-orders-list'); if (!c) return;
    var active = [], done = [];
    for (var i = 0; i < sellerOrders.length; i++) {
        var o = sellerOrders[i];
        var st = o.status;
        if (st === ORDER_STATUS.CANCELLED || st === ORDER_STATUS.REFUNDED || st === ORDER_STATUS.COMPLETED) done.push(o);
        else active.push(o);
    }
    active.sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
    done.sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });

    var h = '<div class="flex gap-2 mb-3">';
    h += '<button onclick="setSellerOrdersFilter(\'active\')" class="flex-1 py-2 rounded-lg text-xs font-bold ' + (sellerOrdersFilter==='active' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border') + '">En cours (' + active.length + ')</button>';
    h += '<button onclick="setSellerOrdersFilter(\'done\')" class="flex-1 py-2 rounded-lg text-xs font-bold ' + (sellerOrdersFilter==='done' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border') + '">Terminées (' + done.length + ')</button>';
    h += '</div>';

    var list = sellerOrdersFilter === 'active' ? active : done;
    if (list.length === 0) {
        h += '<div class="text-center py-10 text-gray-400 text-sm">' + (sellerOrdersFilter==='active' ? 'Aucune commande en cours.' : 'Aucune commande terminée.') + '</div>';
        c.innerHTML = h; return;
    }
    for (var i = 0; i < list.length; i++) h += renderOrderCard(list[i], 'seller');
    c.innerHTML = h;
}
function setSellerOrdersFilter(f) { sellerOrdersFilter = f; renderSellerOrders(); }

/* =========================================================
   WALLET VENDEUR
   ========================================================= */
function addToEscrow(amount, orderId, shopName) {
    if (!myShop) return;
    if (!myShop.wallet) myShop.wallet = { balance: 0, pending: 0, transactions: [] };
    if (typeof myShop.wallet.pending === 'undefined') myShop.wallet.pending = 0;
    myShop.wallet.pending += amount;
    myShop.wallet.transactions.unshift({ id: orderId, type: 'escrow', amount: amount, net: amount, label: 'Séquestre — ' + (shopName || 'Boutique'), date: formatDateTime() });
    _stateDirty = true; updateWalletUI();
}
function releaseFromEscrow(orderId) {
    if (!myShop || !myShop.wallet) return;
    var order = findSellerOrder(orderId); if (!order) return;
    var amount = order.total;
    myShop.wallet.pending = Math.max(0, (myShop.wallet.pending || 0) - amount);
    myShop.wallet.balance = (myShop.wallet.balance || 0) + amount;
    myShop.wallet.transactions.unshift({ id: orderId, type: 'sale', amount: amount, net: amount, label: 'Vente — ' + (order.buyerName || 'Client'), date: formatDateTime() });
    _stateDirty = true; updateWalletUI();
}
function refundEscrow(orderId) {
    if (!myShop || !myShop.wallet) return;
    var order = findSellerOrder(orderId); if (!order) return;
    var amount = order.total;
    myShop.wallet.pending = Math.max(0, (myShop.wallet.pending || 0) - amount);
    myShop.wallet.transactions.unshift({ id: orderId, type: 'refund', amount: amount, net: amount, label: 'Remboursement — ' + (order.buyerName || 'Client'), date: formatDateTime() });
    _stateDirty = true; updateWalletUI();
}
function updateWalletUI() {
    var bal = (myShop && myShop.wallet) ? (myShop.wallet.balance || 0) : 0;
    var pend = (myShop && myShop.wallet) ? (myShop.wallet.pending || 0) : 0;
    var d = document.getElementById('dash-wallet-balance'); if (d) d.textContent = bal.toLocaleString('fr-FR') + ' FCFA';
    var dp = document.getElementById('dash-wallet-pending'); if (dp) dp.textContent = pend.toLocaleString('fr-FR') + ' FCFA en attente';
    var w = document.getElementById('wallet-balance'); if (w) w.textContent = bal.toLocaleString('fr-FR') + ' FCFA';
    var wp = document.getElementById('wallet-pending'); if (wp) wp.textContent = pend.toLocaleString('fr-FR') + ' FCFA en attente';
    var wd = document.getElementById('withdraw-balance'); if (wd) wd.textContent = bal.toLocaleString('fr-FR') + ' FCFA';
}
function openWallet() {
    if (!myShop) { toast('Créez une boutique d\'abord.', 'error'); return; }
    if (!myShop.wallet) myShop.wallet = { balance: 0, pending: 0, transactions: [] };
    if (typeof myShop.wallet.pending === 'undefined') myShop.wallet.pending = 0;
    updateWalletUI(); renderWalletHistory();
    showScreen('wallet-screen');
}
function renderWalletHistory() {
    var c = document.getElementById('wallet-history');
    if (!c || !myShop || !myShop.wallet) return;
    var tx = myShop.wallet.transactions || [];
    if (tx.length === 0) { c.innerHTML = '<div class="text-center py-10 text-gray-400 text-sm">Aucune transaction.</div>'; return; }
    var h = '';
    for (var i = 0; i < tx.length; i++) {
        var t = tx[i];
        var isSale = t.type === 'sale', isEscrow = t.type === 'escrow', isRefund = t.type === 'refund';
        var color, sign, iconBg, icon;
        if (isSale) { color = 'text-green-600'; sign = '+'; iconBg = 'bg-green-100 text-green-600'; icon = 'VTE'; }
        else if (isEscrow) { color = 'text-yellow-600'; sign = ''; iconBg = 'bg-yellow-100 text-yellow-600'; icon = 'ESC'; }
        else if (isRefund) { color = 'text-orange-500'; sign = ''; iconBg = 'bg-orange-100 text-orange-500'; icon = 'REM'; }
        else { color = 'text-red-500'; sign = '-'; iconBg = 'bg-red-100 text-red-500'; icon = 'RET'; }
        h += '<div class="bg-white rounded-xl p-3 flex items-center gap-3">';
        h += '<div class="' + iconBg + ' rounded-full w-10 h-10 flex items-center justify-center font-bold text-[10px]">' + icon + '</div>';
        h += '<div class="flex-1 min-w-0"><p class="font-bold text-sm text-gray-800 truncate">' + escapeHtml(t.label) + '</p>';
        h += '<p class="text-[11px] text-gray-400 mt-0.5">' + (t.date || '') + '</p></div>';
        h += '<div class="text-right"><p class="font-bold text-sm ' + color + '">' + sign + ' ' + t.amount.toLocaleString('fr-FR') + ' FCFA</p></div></div>';
    }
    c.innerHTML = h;
}
function openWithdraw() {
    if (!myShop) return;
    if (!myShop.wallet) myShop.wallet = { balance: 0, pending: 0, transactions: [] };
    _withdrawMethod = 'mobile'; selectWithdrawMethod('mobile');
    var a = document.getElementById('withdraw-amount'); if (a) a.value = '';
    document.getElementById('withdraw-error').classList.add('hidden');
    updateWithdrawPreview(); updateWalletUI();
    showScreen('withdraw-screen');
}
function selectWithdrawMethod(m) {
    _withdrawMethod = m;
    var ms = ['mobile','airtel','card'];
    for (var i = 0; i < ms.length; i++) {
        var el = document.getElementById('wd-method-' + ms[i]); if (!el) continue;
        if (ms[i] === m) el.className = 'border-2 border-green-500 rounded-xl p-3 cursor-pointer flex items-center gap-3 bg-green-50';
        else el.className = 'border-2 border-gray-200 rounded-xl p-3 cursor-pointer flex items-center gap-3';
    }
}
function updateWithdrawPreview() {
    var input = document.getElementById('withdraw-amount');
    var errEl = document.getElementById('withdraw-error');
    var amount = input ? parseFloat(input.value) || 0 : 0;
    var commission = Math.round(amount * GM_FEES.withdrawalRate);
    var net = Math.max(0, amount - commission);
    document.getElementById('wd-amount-preview').textContent = amount.toLocaleString('fr-FR') + ' FCFA';
    document.getElementById('wd-commission-preview').textContent = '- ' + commission.toLocaleString('fr-FR') + ' FCFA';
    document.getElementById('wd-net-preview').textContent = net.toLocaleString('fr-FR') + ' FCFA';
    var bal = (myShop && myShop.wallet) ? (myShop.wallet.balance || 0) : 0;
    if (amount > 0 && amount < 500) { errEl.textContent = 'Le montant minimum de retrait est de 500 FCFA.'; errEl.classList.remove('hidden'); }
    else if (amount > bal) { errEl.textContent = 'Solde insuffisant.'; errEl.classList.remove('hidden'); }
    else errEl.classList.add('hidden');
}
function withdrawAll() {
    if (!myShop || !myShop.wallet) return;
    var bal = myShop.wallet.balance || 0;
    if (bal < 500) { toast('Solde minimum : 500 FCFA.', 'warn', 4000); return; }
    var inp = document.getElementById('withdraw-amount'); if (inp) inp.value = bal;
    updateWithdrawPreview();
}
function confirmWithdrawal() {
    if (!myShop || !myShop.wallet) return;
    var amount = parseFloat(document.getElementById('withdraw-amount').value) || 0;
    var bal = myShop.wallet.balance || 0;
    if (amount < 500) { toast('Minimum de retrait : 500 FCFA.', 'error'); return; }
    if (amount > bal) { toast('Solde insuffisant.', 'error'); return; }
    var commission = Math.round(amount * GM_FEES.withdrawalRate);
    var net = amount - commission;
    _withdrawContext = { amount: amount, commission: commission, net: net, method: _withdrawMethod };
    if (_withdrawMethod === 'mobile') openOperatorConfirm('mobile', 'withdrawal');
    else if (_withdrawMethod === 'airtel') openOperatorConfirm('airtel', 'withdrawal');
    else {
        gmPrompt('Code 3D Secure (6 chiffres) :', '', 'Code 3D Secure').then(function(pin) {
            if (pin === null) return;
            if (!/^\d{6}$/.test(pin)) { toast('Code invalide.', 'error'); return; }
            _completeWithdrawal();
        });
    }
}
function _completeWithdrawal() {
    if (!_withdrawContext || !myShop || !myShop.wallet) return;
    myShop.wallet.balance = (myShop.wallet.balance || 0) - _withdrawContext.amount;
    myShop.wallet.transactions.unshift({
        id: generateTransactionId(), type: 'withdraw',
        amount: _withdrawContext.amount, net: _withdrawContext.net,
        commission: _withdrawContext.commission, method: _withdrawContext.method,
        label: 'Retrait — ' + (_withdrawContext.method === 'mobile' ? 'Mobile Money' : (_withdrawContext.method === 'airtel' ? 'Airtel Money' : 'Carte bancaire')),
        date: formatDateTime()
    });
    _withdrawContext = null;
    _stateDirty = true; updateWalletUI(); renderWalletHistory();
    showScreen('wallet-screen');
    setTimeout(function() { toast('Retrait confirmé.', 'success', 5000); }, 200);
}

/* =========================================================
   TICKET
   ========================================================= */
function generateReceiptForOrder(order) {
    var now = Date.now();
    var expiresAt = now + (30 * 24 * 60 * 60 * 1000);
    var ref = 'TKT-' + Math.floor(100000 + Math.random() * 900000);
    var shop = shopsCatalog[order.shopIndex];
    var itemWarranties = [];
    (order.items || []).forEach(function(it) {
        var prod = null;
        if (shop && shop.products) for (var i = 0; i < shop.products.length; i++) if (shop.products[i].name === it.name) { prod = shop.products[i]; break; }
        if (prod && prod.hasWarranty && prod.warrantyText) itemWarranties.push(it.name + ' : ' + prod.warrantyText);
    });
    order.receipt = {
        ref: ref, issuedAt: now, expiresAt: expiresAt, deleted: false,
        validatedAt: order.validatedAt || formatDateTime(),
        shopName: order.shopName, warranties: itemWarranties
    };
    _stateDirty = true;
}
function openReceipt(orderId) {
    var o = findBuyerOrder(orderId); if (!o || !o.receipt) { toast('Aucun ticket disponible.', 'error'); return; }
    if (o.receipt.deleted) { toast('Ce ticket a été supprimé.', 'warn'); return; }
    var now = Date.now(), expired = now > o.receipt.expiresAt;
    _currentReceipt = orderId;
    document.getElementById('tkt-ref').textContent = o.receipt.ref;
    document.getElementById('tkt-date').textContent = 'Émis le ' + new Date(o.receipt.issuedAt).toLocaleString('fr-FR');
    var expEl = document.getElementById('tkt-expiry');
    if (expired) { expEl.textContent = 'Ticket expiré'; expEl.className = 'text-[10px] text-red-500 mt-0.5 font-bold'; }
    else {
        var daysLeft = Math.ceil((o.receipt.expiresAt - now) / (24 * 60 * 60 * 1000));
        expEl.textContent = 'Expire dans ' + daysLeft + ' jour' + (daysLeft > 1 ? 's' : '');
        expEl.className = 'text-[10px] text-orange-500 mt-0.5';
    }
    document.getElementById('tkt-shop').textContent = o.shopName;
    document.getElementById('tkt-buyer').textContent = o.buyerName || userName;
    document.getElementById('tkt-phone').textContent = '+242 ' + (o.buyerPhone || userPhone);
    var pm = o.paymentMethod || 'wallet';
    document.getElementById('tkt-payment').textContent = pm === 'wallet' ? 'Portefeuille Grand Marché' : (pm === 'mobile' ? 'Mobile Money' : (pm === 'airtel' ? 'Airtel Money' : 'Carte bancaire'));
    document.getElementById('tkt-delivery').textContent = o.deliveryMode === 'home' ? 'Livraison à domicile' : 'Retrait en boutique';
    var items = o.items || [], subtotal = 0, html = '';
    for (var i = 0; i < items.length; i++) {
        var it = items[i], lineTotal = it.price * it.qty;
        subtotal += lineTotal;
        html += '<div class="flex justify-between"><span>' + escapeHtml(it.qty + 'x ' + it.name) + '</span><span>' + lineTotal.toLocaleString('fr-FR') + ' F</span></div>';
    }
    document.getElementById('tkt-items').innerHTML = html;
    document.getElementById('tkt-subtotal').textContent = subtotal.toLocaleString('fr-FR') + ' FCFA';
    document.getElementById('tkt-total').textContent = o.total.toLocaleString('fr-FR') + ' FCFA';
    var wBlock = document.getElementById('tkt-warranty-block');
    if (o.receipt.warranties && o.receipt.warranties.length > 0) {
        document.getElementById('tkt-warranty-text').innerHTML = o.receipt.warranties.map(escapeHtml).join('<br>');
        wBlock.classList.remove('hidden');
    } else wBlock.classList.add('hidden');
    document.getElementById('tkt-validation').textContent = o.receipt.validatedAt || '—';
    showScreen('receipt-screen');
}
function closeReceipt() { _currentReceipt = null; showScreen('buyer-profile-screen'); }
function deleteReceipt() {
    if (!_currentReceipt) return;
    gmConfirm('Supprimer définitivement ce ticket ?', 'Suppression', { danger: true, confirmText: 'Supprimer' })
    .then(function(ok) {
        if (!ok) return;
        for (var i = 0; i < buyerOrders.length; i++) if (buyerOrders[i].id === _currentReceipt && buyerOrders[i].receipt) { buyerOrders[i].receipt.deleted = true; break; }
        _stateDirty = true; _currentReceipt = null;
        toast('Ticket supprimé.', 'info');
        showScreen('buyer-profile-screen');
    });
}
function cleanExpiredReceipts() {
    var now = Date.now(), changed = false;
    for (var i = 0; i < buyerOrders.length; i++) {
        var r = buyerOrders[i].receipt;
        if (r && !r.deleted && now > r.expiresAt) { r.deleted = true; changed = true; }
    }
    if (changed) _stateDirty = true;
}

/* =========================================================
   SMS / VÉRIFICATION
   ========================================================= */
function generateCode() { var c = ''; for (var i = 0; i < 6; i++) c += Math.floor(Math.random() * 10); return c; }
function formatPhoneDisplay(p) {
    var c = p.replace(/\D/g,'');
    if (c.length === 9) return '+242 ' + c.substring(0,2) + ' ' + c.substring(2,4) + ' ' + c.substring(4,6) + ' ' + c.substring(6,9);
    return '+242 ' + p;
}
function sendSmsCode(phone, code, ctx) {
    var t = ctx === 'login' ? 'connexion' : 'réinitialisation';
    setTimeout(function() { toast('SMS au ' + formatPhoneDisplay(phone) + ' — Code ' + t + ' : ' + code, 'info', 8000); }, 500);
}
function sellerLogin() {
    var p = document.getElementById('login-phone').value.trim();
    var ps = document.getElementById('login-pass').value;
    if (!p || p.replace(/[^0-9]/g,'').length < 8) { toast('Numéro requis.', 'error'); return; }
    if (!ps || ps.length < 6) { toast('Mot de passe : 6 min.', 'error'); return; }
    var cp = p.replace(/\s/g,''); if (cp.indexOf('0') !== 0 && cp.length === 8) cp = '0' + cp;
    showLoading('Connexion...');
    GM.login(cp, ps).then(function (sess) {
        if (!sess.shop) { hideLoading(); toast('Aucune boutique sur ce compte. Créez votre boutique.', 'warn', 5000); switchSellerMode('register'); return; }
        return GM.adoptShop(sess).then(function () {
            hideLoading();
            userName = sess.user.name; userPhone = sess.user.phone; userEmail = sess.user.email || '';
            isSeller = true; applyShopToDashboard(); syncMyShopToCatalog(); _stateDirty = true;
            toast('Connexion réussie.', 'success'); showScreen('seller-dashboard-screen');
        });
    }).catch(function (e) { hideLoading(); toast(e.message, 'error', 5000); });
}
function moveToNext(inp, i) { if (inp.value.length === 1) { var ins = document.querySelectorAll('#code-inputs input'); if (i < ins.length-1) ins[i+1].focus(); } }
function moveToPrev(e, inp, i) { if (e.key === 'Backspace' && inp.value === '') { var ins = document.querySelectorAll('#code-inputs input'); if (i > 0) ins[i-1].focus(); } }
function clearCodeInputs() { var ins = document.querySelectorAll('#code-inputs input'); for (var i=0;i<ins.length;i++) ins[i].value=''; }
function getEnteredCode() { var ins = document.querySelectorAll('#code-inputs input'); var c=''; for (var i=0;i<ins.length;i++) c+=ins[i].value; return c; }
function verifyCode() {
    var c = getEnteredCode();
    if (c.length !== 6) { toast('6 chiffres requis.', 'error'); return; }
    if (!pendingVerification) { showScreen('seller-register-screen'); return; }
    if (c === pendingVerification.code) {
        if (pendingVerification.action === 'login') {
            isSeller = true; applyShopToDashboard();
            pendingVerification = null; _stateDirty = true;
            toast('Connexion réussie.', 'success');
            showScreen('seller-dashboard-screen');
        } else {
            pendingResetPhone = pendingVerification.phone;
            pendingVerification = null;
            showScreen('reset-password-screen');
        }
    } else {
        pendingVerification.attempts++;
        if (pendingVerification.attempts >= 3) {
            toast('3 tentatives échouées.', 'error');
            pendingVerification = null;
            showScreen('seller-register-screen'); switchSellerMode('login');
        } else { clearCodeInputs(); toast('Code incorrect (' + (3 - pendingVerification.attempts) + ' essai(s))', 'warn'); }
    }
}
function resendCode() {
    if (!pendingVerification) return;
    var nc = generateCode(); pendingVerification.code = nc;
    clearCodeInputs(); sendSmsCode(pendingVerification.phone, nc, pendingVerification.action);
}
function cancelVerification() { pendingVerification = null; showScreen('seller-register-screen'); switchSellerMode('login'); }
function sendResetCode() {
    toast('Pour réinitialiser votre mot de passe, contactez le support : nous vérifions votre identité puis vous aidons.', 'info', 6000);
    openWhatsAppSupport();
}
function resetPassword() {
    var p = document.getElementById('new-password').value, c = document.getElementById('new-password-confirm').value;
    if (p.length < 6) { toast('6 caractères minimum.', 'error'); return; }
    if (p !== c) { toast('Les mots de passe diffèrent.', 'error'); return; }
    myShop.pass = p; pendingResetPhone = null; _stateDirty = true;
    toast('Mot de passe réinitialisé.', 'success');
    showScreen('seller-register-screen'); switchSellerMode('login');
}

/* =========================================================
   BOUTIQUE / ABONNEMENTS
   ========================================================= */
function openShopProfile(index) {
    if (typeof index !== 'number' || index < 0 || index >= shopsCatalog.length) index = 0;
    currentShopIndex = index;
    var shop = shopsCatalog[index];
    viewingMyShop = _isMyOwnShop(index);
    var le = document.getElementById('profile-logo');
    if (le) le.className = shop.colorBg + ' text-white rounded-full w-16 h-16 flex items-center justify-center font-bold text-2xl overflow-hidden';
    renderLogo('profile-logo-img', 'profile-logo-initials', shop.logo, shop.initials);
    var st = function(id,v){var el=document.getElementById(id);if(el)el.textContent=v;};
    var pnEl = document.getElementById('profile-shop-name');
    if (pnEl) pnEl.innerHTML = escapeHtml(shop.name) + renderShopBadge(shop);
    st('profile-shop-category', shop.category);
    st('profile-product-count', shop.products.length + ' Produits');
    st('profile-reviews-count', (shop.reviewsCount || 0) + ' Avis');
    st('profile-global-rating', shop.globalRating || 0);
    st('profile-reviews-strong', (shop.reviewsCount || 0) + ' avis');
    var starsEl = document.getElementById('profile-global-stars');
    if (starsEl) starsEl.innerHTML = renderStars(shop.globalRating || 0);
    setCrit('delivery', shop.critDelivery || 0, 'orange');
    setCrit('quality', shop.critQuality || 0, 'blue');
    setCrit('behavior', shop.critBehavior || 0, 'green');
    renderShopArticles(shop.products);

    var followBtn = document.getElementById('follow-btn');
    var contactBtn = document.getElementById('contact-seller-btn');

    // Bouton Suivre : visible pour les ACHETEURS (et vendeurs avec compte acheteur)
    // Masqué uniquement si vendeur sans compte acheteur
    if (followBtn) {
        if (isSeller && !hasBuyerAccount) {
            followBtn.classList.add('hidden');
        } else {
            followBtn.classList.remove('hidden');
            updateFollowBtn();
        }
    }
    // Bouton Contact : masqué uniquement sur sa propre boutique
    if (contactBtn) {
        if (_isMyOwnShop(index)) contactBtn.classList.add('hidden');
        else contactBtn.classList.remove('hidden');
    }
    updateShopSubscribersCount();
    shopProfileOrigin = 'home-screen';
    showScreen('shop-profile-screen');
}
function openMyShopProfile() {
    if (!myShop) { toast('Créez votre boutique.', 'error'); return; }
    syncMyShopToCatalog();
    var idx = findMyCatalogIndex();
    if (idx >= 0) openShopProfile(idx);
    shopProfileOrigin = 'seller-dashboard-screen';
}
function setCrit(t, v, c) {
    var vEl = document.getElementById('crit-'+t+'-val'); if (vEl) vEl.textContent = (v === 0 ? '-' : v) + '/6';
    var bEl = document.getElementById('crit-'+t+'-bar');
    if (bEl) { bEl.className = 'bg-'+c+'-500 h-2 rounded-full'; bEl.style.width = (v === 0 ? 0 : Math.round((v/6)*100)) + '%'; }
}
function renderShopArticles(ps) {
    var c = document.getElementById('shop-articles-list'), ce = document.getElementById('articles-count');
    if (!c) return;
    if (ce) ce.textContent = ps.length + ' produits';
    if (ps.length === 0) { c.innerHTML = '<div class="col-span-2 text-center text-gray-400 text-sm py-6">Aucun article.</div>'; return; }
    var h = '';
    for (var i = 0; i < ps.length; i++) {
        var p = ps[i], img = getProductMainImage(p);
        var badge = '';
        if ((p.stock || 0) <= 0) badge = '<span class="prod-badge out">RUPTURE</span>';
        else if (parseFloat(p.rating) >= 4.5) badge = '<span class="prod-badge top">TOP</span>';
        else if (parseInt(p.reviews) > 20) badge = '<span class="prod-badge popular">POPULAIRE</span>';
        h += '<div onclick="openShopProduct('+i+')" class="bg-gray-50 rounded-xl overflow-hidden cursor-pointer relative">';
        h += badge;
        h += '<img src="'+img+'" class="w-full h-24 object-cover">';
        h += '<div class="p-2"><h4 class="font-bold text-xs truncate">'+escapeHtml(p.name)+'</h4>';
        h += '<p class="text-orange-500 font-bold text-xs mt-1">'+p.price.toLocaleString('fr-FR')+' FCFA</p></div></div>';
    }
    c.innerHTML = h;
}
function openShopProduct(i) {
    var s = shopsCatalog[currentShopIndex]; if (!s) return;
    var p = s.products[i]; if (!p) return;
    productScreenOrigin = 'shop-profile-screen';
    showProductScreen(p.name, p.price.toLocaleString('fr-FR')+' FCFA', getProductMainImage(p), p.rating, p.reviews, p.desc, p.hasDelivery, 'shop-profile-screen', p.images, p.hasWarranty, p.warrantyText, { stock: p.stock, category: p.category });
}
function closeShopProfile() { showScreen(shopProfileOrigin === 'seller-dashboard-screen' ? 'seller-dashboard-screen' : 'home-screen'); }
function closeProductScreen() { showScreen(productScreenOrigin === 'shop-profile-screen' ? 'shop-profile-screen' : 'home-screen'); }
function openSubscriptions() {
    if (!hasBuyerAccount) {
        toast('Les abonnements sont réservés aux acheteurs.', 'warn', 4000);
        return;
    }
    renderSubscriptions();
    showScreen('subscriptions-screen');
}
function renderSubscriptions() {
    var c = document.getElementById('subscriptions-list'), b = document.getElementById('subs-badge');
    if (!c) return;
    if (!hasBuyerAccount) {
        if (b) b.classList.add('hidden');
        c.innerHTML = '<div class="text-center py-10 text-gray-400 text-sm">Réservé aux comptes acheteurs.</div>';
        return;
    }
    if (b) {
        if (followedShops.length > 0) { b.textContent = followedShops.length; b.classList.remove('hidden'); }
        else b.classList.add('hidden');
    }
    if (followedShops.length === 0) {
        c.innerHTML = '<div class="text-center py-10"><p class="text-gray-500 font-bold">Aucun abonnement</p><button onclick="showScreen(\'home-screen\')" class="mt-4 bg-green-600 text-white font-bold py-2 px-6 rounded-lg text-sm">Découvrir</button></div>';
        return;
    }
    var h = '';
    for (var i = 0; i < followedShops.length; i++) {
        var idx = followedShops[i], s = shopsCatalog[idx]; if (!s) continue;
        h += '<div class="bg-white p-3 rounded-xl flex items-center gap-3">';
        h += '<div onclick="openShopProfile('+idx+')" class="flex items-center gap-3 flex-1 cursor-pointer">';
        h += '<div class="'+s.colorBg+' text-white rounded-full w-12 h-12 flex items-center justify-center font-bold overflow-hidden">';
        if (s.logo) h += '<img src="'+s.logo+'" class="w-full h-full object-cover">'; else h += escapeHtml(s.initials);
        h += '</div><div class="flex-1 min-w-0"><h4 class="font-bold text-sm flex items-center min-w-0"><span class="truncate">'+escapeHtml(s.name)+'</span>'+renderShopBadge(s)+'</h4><p class="text-xs text-gray-500">'+escapeHtml(s.category)+'</p></div></div>';
        h += '<button onclick="unfollowShop('+idx+')" class="bg-gray-200 text-gray-700 font-bold text-xs py-1.5 px-3 rounded-full">Suivi</button></div>';
    }
    c.innerHTML = h;
}

/* =========================================================
   CHAT
   ========================================================= */
function contactSeller() {
    var s = shopsCatalog[currentShopIndex]; if (!s) return;
    var convId = 'conv-buyer-' + currentShopIndex;
    var conv = null;
    for (var i = 0; i < conversations.length; i++) if (conversations[i].id === convId) { conv = conversations[i]; break; }
    if (!conv) {
        conv = {
            id: convId, participantName: s.name,
            buyerName: userName, buyerPhone: userPhone,
            sellerName: s.name, sellerPhone: s.phone,
            participantRole: 'seller', shopIndex: currentShopIndex,
            messages: [], unreadSeller: 0, unreadBuyer: 0,
            createdAt: Date.now()
        };
        conversations.push(conv);
    }
    openChat(convId);
}
function openChatFromOrder(orderId) {
    var order = findBuyerOrder(orderId) || findSellerOrder(orderId); if (!order) return;
    var convId = 'conv-buyer-' + order.shopIndex;
    var conv = null;
    for (var i = 0; i < conversations.length; i++) if (conversations[i].id === convId) { conv = conversations[i]; break; }
    if (!conv) {
        var shop = shopsCatalog[order.shopIndex];
        conv = {
            id: convId, participantName: shop ? shop.name : order.shopName,
            buyerName: order.buyerName, buyerPhone: order.buyerPhone,
            sellerName: order.shopName, sellerPhone: order.shopPhone,
            participantRole: 'seller', shopIndex: order.shopIndex,
            messages: [], unreadSeller: 0, unreadBuyer: 0,
            createdAt: Date.now()
        };
        conversations.push(conv);
    }
    var sysMsg = 'Commande ' + orderId + ' — ' + order.total.toLocaleString('fr-FR') + ' FCFA';
    var exists = false;
    for (var i = 0; i < conv.messages.length; i++) if (conv.messages[i].text === sysMsg) { exists = true; break; }
    if (!exists) conv.messages.push({ fromRole: 'system', text: sysMsg, time: getTime(), isSystem: true, at: Date.now() });
    openChat(convId);
}
function openBuyerProfile() {
    document.getElementById('buyer-name').textContent = userName;
    document.getElementById('buyer-phone').textContent = '+242 ' + userPhone;
    var av = document.getElementById('buyer-avatar');
    if (buyerAvatar) av.innerHTML = '<img src="' + buyerAvatar + '" class="w-full h-full object-cover">';
    else av.textContent = getInitials(userName);
    renderBuyerTab(); updateMessageBadges();
    if (typeof GM !== 'undefined') GM.syncOrders().then(renderBuyerTab).catch(function(){});
}
function switchBuyerTab(t) {
    buyerTab = t;
    if (t === 'orders') {
        document.getElementById('buyer-tab-orders').className = 'flex-1 bg-green-600 text-white font-bold py-2 rounded-lg text-sm';
        document.getElementById('buyer-tab-messages').className = 'flex-1 bg-white text-gray-600 font-bold py-2 rounded-lg text-sm border relative';
        document.getElementById('buyer-orders-tab').classList.remove('hidden');
        document.getElementById('buyer-messages-tab').classList.add('hidden');
    } else {
        document.getElementById('buyer-tab-messages').className = 'flex-1 bg-green-600 text-white font-bold py-2 rounded-lg text-sm relative';
        document.getElementById('buyer-tab-orders').className = 'flex-1 bg-white text-gray-600 font-bold py-2 rounded-lg text-sm border';
        document.getElementById('buyer-orders-tab').classList.add('hidden');
        document.getElementById('buyer-messages-tab').classList.remove('hidden');
    }
    renderBuyerTab();
}
function renderBuyerTab() { if (buyerTab === 'orders') renderBuyerOrders(); else renderBuyerMessages(); }
function renderBuyerMessages() {
    var c = document.getElementById('buyer-messages-tab');
    var my = [];
    for (var i = 0; i < conversations.length; i++) {
        var cv = conversations[i];
        if (cv.buyerPhone && cv.buyerPhone !== userPhone) continue;
        if (!cv.buyerPhone && cv.buyerName !== userName) continue;
        my.push(cv);
    }
    if (my.length === 0) {
        c.innerHTML = '<div class="text-center py-10 text-gray-400 text-sm">Aucune conversation pour l\'instant.<br><span class="text-xs">Échangez avec un vendeur pour démarrer.</span></div>';
        return;
    }
    var h = '';
    for (var i = 0; i < my.length; i++) {
        var cv = my[i];
        var last = cv.messages.length > 0 ? cv.messages[cv.messages.length-1].text : 'Nouvelle conversation';
        var name = cv.sellerName || cv.participantName || '?';
        var _cvShop = shopsCatalog[cv.shopIndex];
        var _cvBadge = _cvShop ? renderShopBadge(_cvShop) : '';
        h += '<div onclick="openChat(\''+cv.id+'\')" class="bg-white p-3 rounded-xl flex items-center gap-3 cursor-pointer">';
        h += '<div class="bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold">'+escapeHtml(name[0])+'</div>';
        h += '<div class="flex-1 min-w-0"><h4 class="font-bold text-sm flex items-center min-w-0"><span class="truncate">'+escapeHtml(name)+'</span>'+_cvBadge+'</h4><p class="text-xs text-gray-500 truncate">'+escapeHtml(last)+'</p></div>';
        if (cv.unreadBuyer && cv.unreadBuyer > 0) {
            h += '<span class="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">' + (cv.unreadBuyer > 99 ? '99+' : cv.unreadBuyer) + '</span>';
        }
        h += '</div>';
    }
    c.innerHTML = h;
}
function renderSellerMessages() {
    var c = document.getElementById('seller-messages-list');
    var mine = [];
    for (var i = 0; i < conversations.length; i++) {
        var cv = conversations[i];
        if (cv.id.indexOf('buyer-') !== 0 && cv.id.indexOf('conv-buyer-') !== 0) continue;
        if (!_isConversationForMyShop(cv)) continue;
        mine.push(cv);
    }
    if (mine.length === 0) {
        c.innerHTML = '<div class="text-center py-10 text-gray-400 text-sm">Aucun message client pour le moment.<br><span class="text-xs">Vos échanges avec les acheteurs apparaîtront ici.</span></div>';
        updateMessageBadges(); return;
    }
    mine.sort(function(a,b) {
        var ua = a.unreadSeller || 0, ub = b.unreadSeller || 0;
        if (ua > 0 && ub === 0) return -1;
        if (ub > 0 && ua === 0) return 1;
        return 0;
    });
    var h = '';
    for (var i = 0; i < mine.length; i++) {
        var cv = mine[i];
        var last = cv.messages.length > 0 ? cv.messages[cv.messages.length-1].text : 'Nouveau message';
        var name = cv.buyerName || cv.participantName || '?';
        h += '<div onclick="openChat(\''+cv.id+'\')" class="bg-white p-3 rounded-xl flex items-center gap-3 cursor-pointer">';
        h += '<div class="bg-orange-500 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold">'+escapeHtml(name[0])+'</div>';
        h += '<div class="flex-1 min-w-0"><h4 class="font-bold text-sm truncate">'+escapeHtml(name)+'</h4>';
        h += '<p class="text-xs text-gray-500 truncate">'+escapeHtml(last)+'</p></div>';
        if (cv.unreadSeller && cv.unreadSeller > 0) {
            h += '<span class="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">' + (cv.unreadSeller > 99 ? '99+' : cv.unreadSeller) + '</span>';
        }
        h += '</div>';
    }
    c.innerHTML = h;
    updateMessageBadges();
}
function openChat(convId) {
    currentChatId = convId;
    var cv = null;
    for (var i = 0; i < conversations.length; i++) if (conversations[i].id === convId) { cv = conversations[i]; break; }
    if (!cv) return;
    if (isSeller) cv.unreadSeller = 0; else cv.unreadBuyer = 0;
    updateMessageBadges();
    var displayName = isSeller ? (cv.buyerName || cv.participantName) : (cv.sellerName || cv.participantName);
    displayName = displayName || 'Contact';
    var _chatShop = shopsCatalog[cv.shopIndex];
    var _chatBadge = (!isSeller && _chatShop) ? renderShopBadge(_chatShop) : '';
    document.getElementById('chat-header-name').innerHTML = escapeHtml(displayName) + _chatBadge;
    document.getElementById('chat-header-avatar').textContent = displayName[0];
    renderChatMessages(); renderChatProductBanner();
    showScreen('chat-screen');
}
function renderChatMessages() {
    var cv = null;
    for (var i = 0; i < conversations.length; i++) if (conversations[i].id === currentChatId) { cv = conversations[i]; break; }
    if (!cv) return;
    var c = document.getElementById('chat-messages'), h = '';
    var myRole = isSeller ? 'seller' : 'buyer';
    if (!cv.messages || cv.messages.length === 0) { h = '<div class="text-center py-10 text-gray-400 text-xs">Aucun message.<br>Envoyez le premier.</div>'; }
    else {
        for (var i = 0; i < cv.messages.length; i++) {
            var m = cv.messages[i];
            if (m.isSystem || m.fromRole === 'system') {
                h += '<div class="chat-bubble-system">' + escapeHtml(m.text) + '<div class="text-[9px] opacity-70 mt-0.5">' + m.time + '</div></div>';
                continue;
            }
            var isMine = (m.fromRole === myRole);
            var bubbleClass = isMine ? 'chat-bubble-me' : 'chat-bubble-other';
            if (m.isNegotiation || m.isProductInquiry) bubbleClass += ' negotiation-message';
            h += '<div class="' + bubbleClass + '" style="white-space: pre-line;">' + escapeHtml(m.text) + '<div class="text-[9px] opacity-70 mt-1">' + m.time + '</div></div>';
        }
    }
    c.innerHTML = h;
    setTimeout(function(){ c.scrollTop = c.scrollHeight; }, 100);
}
function sendMessage() {
    var inp = document.getElementById('chat-input');
    var txt = inp.value.trim(); if (!txt) return;
    if (txt.length > 2000) { toast('Message trop long.', 'error'); return; }
    var cv = null;
    for (var i = 0; i < conversations.length; i++) if (conversations[i].id === currentChatId) { cv = conversations[i]; break; }
    if (!cv) return;
    var time = getTime();
    var fromRole = isSeller ? 'seller' : 'buyer';
    cv.messages.push({
        fromRole: fromRole,
        text: txt, time: time, at: Date.now(),
        senderName: isSeller ? (myShop ? myShop.shopName : 'Vendeur') : userName,
        senderPhone: isSeller ? (myShop ? myShop.phone : '') : userPhone
    });
    if (fromRole === 'seller') { cv.unreadBuyer = (cv.unreadBuyer || 0) + 1; cv.unreadSeller = 0; }
    else { cv.unreadSeller = (cv.unreadSeller || 0) + 1; cv.unreadBuyer = 0; }
    inp.value = '';
    renderChatMessages(); updateMessageBadges();
    var role = isSeller ? 'buyer' : 'seller';
    addNotification(role, 'Nouveau message', txt.substring(0, 80), 'info');
    _stateDirty = true;
}
function closeChat() { if (isSeller) showScreen('seller-messages-screen'); else showScreen('buyer-profile-screen'); }

function renderChatProductBanner() {
    var banner = document.getElementById('chat-product-banner');
    var actions = document.getElementById('chat-product-actions');
    var statusEl = document.getElementById('chat-product-status');
    if (!banner) return;
    var cv = null;
    for (var i = 0; i < conversations.length; i++) if (conversations[i].id === currentChatId) { cv = conversations[i]; break; }
    if (!cv || !cv.negotiatedProduct) { banner.classList.add('hidden'); return; }
    var p = cv.negotiatedProduct;
    document.getElementById('chat-product-img').src = p.image || '';
    document.getElementById('chat-product-name').textContent = p.name;
    document.getElementById('chat-product-price').textContent = p.priceLabel + ' × ' + (p.qty || 1);
    if (cv.negotiationStatus === 'pending') {
        if (isSeller) { actions.classList.add('hidden'); statusEl.textContent = 'En attente de la décision de l\'acheteur'; statusEl.className = 'text-xs text-center mt-2 font-bold text-orange-500'; statusEl.classList.remove('hidden'); }
        else { actions.classList.remove('hidden'); statusEl.classList.add('hidden'); }
    } else if (cv.negotiationStatus === 'accepted') {
        actions.classList.add('hidden'); statusEl.textContent = 'Produit accepté — ajouté au panier';
        statusEl.className = 'text-xs text-center mt-2 font-bold text-green-600'; statusEl.classList.remove('hidden');
    } else {
        actions.classList.add('hidden'); statusEl.textContent = 'Négociation refusée';
        statusEl.className = 'text-xs text-center mt-2 font-bold text-red-500'; statusEl.classList.remove('hidden');
    }
    banner.classList.remove('hidden');
}
function acceptChatProduct() {
    if (isSeller) { toast('Seul l\'acheteur peut accepter.', 'warn'); return; }
    var cv = null;
    for (var i = 0; i < conversations.length; i++) if (conversations[i].id === currentChatId) { cv = conversations[i]; break; }
    if (!cv || !cv.negotiatedProduct) return;
    if (cv.negotiationStatus !== 'pending') return;
    var p = cv.negotiatedProduct;
    var stock = _getAvailableStock(p.shopIndex, p.name);
    if (stock !== null && stock < (p.qty || 1)) { toast('Stock insuffisant.', 'error'); return; }
    _addItemToCart({ shopIndex: p.shopIndex, name: p.name, price: p.priceLabel, priceNum: p.price, image: p.image, qty: p.qty || 1, hasDelivery: true, hasWarranty: false, warrantyText: '' });
    cv.negotiationStatus = 'accepted';
    cv.messages.push({ fromRole: 'buyer', text: 'J\'accepte ce produit.', time: getTime(), isSystem: true, at: Date.now() });
    updateCartUI(); _stateDirty = true;
    renderChatMessages(); renderChatProductBanner();
    haptic([20, 30, 20]);
    setTimeout(function() {
        gmConfirm('Produit ajouté au panier.\n\nAller au panier ?', 'Panier', { confirmText: 'Voir le panier' })
        .then(function(ok) { if (ok) { closeChat(); showScreen('cart-screen'); } });
    }, 400);
}
function refuseChatProduct() {
    if (isSeller) { toast('Seul l\'acheteur peut refuser.', 'warn'); return; }
    var cv = null;
    for (var i = 0; i < conversations.length; i++) if (conversations[i].id === currentChatId) { cv = conversations[i]; break; }
    if (!cv || !cv.negotiatedProduct) return;
    if (cv.negotiationStatus !== 'pending') return;
    gmConfirm('Refuser cette négociation ?', 'Refus', { danger: true, confirmText: 'Refuser' })
    .then(function(ok) {
        if (!ok) return;
        cv.negotiationStatus = 'refused';
        cv.messages.push({ fromRole: 'buyer', text: 'Je décide de ne pas donner suite.', time: getTime(), isSystem: true, at: Date.now() });
        _stateDirty = true;
        renderChatMessages(); renderChatProductBanner();
    });
}

/* =========================================================
   FICHE PRODUIT
   ========================================================= */
function showProductScreen(name, price, image, rating, reviews, desc, hasDelivery, origin, images, hasWarranty, warrantyText, extra) {
    extra = extra || {};
    productScreenOrigin = origin || 'home-screen';
    var priceNum = parseInt(String(price).replace(/[^0-9]/g, '')) || 0;
    _currentProductData = {
        name: name, price: priceNum, priceLabel: price, image: image,
        rating: rating || '0', reviews: reviews || '0', desc: desc || '',
        hasDelivery: !!hasDelivery,
        images: images || (image ? [image] : []),
        hasWarranty: !!hasWarranty, warrantyText: warrantyText || '',
        stock: extra.stock !== undefined ? extra.stock : '—',
        category: extra.category || '—',
        shopIndex: currentShopIndex
    };
    _productQty = 1;
    document.getElementById('product-name').textContent = name;
    document.getElementById('product-price').textContent = price;
    document.getElementById('product-rating').textContent = rating || '0';
    document.getElementById('product-reviews').textContent = (reviews || '0') + ' avis';
    document.getElementById('product-cat').textContent = _currentProductData.category;
    document.getElementById('product-desc').textContent = desc || 'Aucune description.';
    var stockEl = document.getElementById('product-stock');
    var stockVal = parseInt(_currentProductData.stock) || 0;
    if (stockVal <= 0) { stockEl.textContent = 'Rupture'; stockEl.className = 'font-bold text-sm mt-0.5 text-red-500'; }
    else if (stockVal <= 5) { stockEl.textContent = stockVal + ' restant' + (stockVal > 1 ? 's' : ''); stockEl.className = 'font-bold text-sm mt-0.5 text-orange-500'; }
    else { stockEl.textContent = stockVal; stockEl.className = 'font-bold text-sm mt-0.5'; }
    var starsEl = document.getElementById('product-rating-stars');
    if (starsEl) starsEl.innerHTML = renderStars(parseFloat(rating) || 0);
    var soldEl = document.getElementById('product-sold');
    if (soldEl) soldEl.textContent = (50 + Math.floor(Math.random() * 450)) + ' vendus';

    var shop = shopsCatalog[currentShopIndex];
    if (shop) {
        var se = document.getElementById('product-seller-name');
        if (se) se.innerHTML = escapeHtml(shop.name);
        var sl = document.getElementById('product-seller-logo');
        if (sl) {
            if (shop.logo) sl.innerHTML = '<img src="' + shop.logo + '" class="w-full h-full object-cover">';
            else sl.textContent = shop.initials;
            sl.className = (shop.colorBg || 'bg-green-600') + ' text-white rounded-full w-12 h-12 flex items-center justify-center font-bold overflow-hidden flex-shrink-0';
        }
        var sc = document.getElementById('product-seller-cert');
        if (sc) {
            var badgeHtml = renderShopBadge(shop);
            if (badgeHtml) {
                sc.className = 'product-seller-badge inline-flex items-center';
                sc.innerHTML = badgeHtml;
            } else {
                sc.className = 'hidden';
                sc.innerHTML = '';
            }
        }
        var sloc = document.getElementById('product-seller-loc'); if (sloc) sloc.textContent = shop.address || 'Brazzaville';
        var sst = document.getElementById('product-seller-stats');
        if (sst) sst.textContent = 'Taux de réponse : ' + (85 + Math.floor(Math.random() * 14)) + '%';
    }
    var dd = document.getElementById('product-delivery-detail');
    if (dd) {
        if (hasDelivery) {
            dd.innerHTML = '<div class="flex items-start gap-2"><div><p class="font-bold text-sm">Livraison possible</p><p class="text-xs text-gray-500">Frais et délai à négocier dans le chat</p></div></div>' +
                '<div class="flex items-start gap-2"><div><p class="font-bold text-sm">Retrait en boutique</p><p class="text-xs text-gray-500">Gratuit · Retrait sur place</p></div></div>';
        } else {
            dd.innerHTML = '<div class="flex items-start gap-2"><div><p class="font-bold text-sm">Retrait en boutique uniquement</p><p class="text-xs text-gray-500">Ce produit n\'est pas livrable</p><p class="text-xs text-gray-500">Adresse : ' + escapeHtml((shop && shop.address) || 'Boutique') + '</p></div></div>';
        }
    }
    var wc = document.getElementById('product-warranty-card'), wd = document.getElementById('product-warranty-detail');
    if (wc && wd) {
        if (hasWarranty && warrantyText) { wd.textContent = warrantyText; wc.classList.remove('hidden'); }
        else wc.classList.add('hidden');
    }
    var gallery = _currentProductData.images.slice();
    if (!gallery.length && image) gallery = [image];
    _productGallery = { images: gallery, currentIndex: 0 };
    renderProductMedia(); updateProductQtyUI(); loadProductReviews(); loadRelatedProducts();
    updateFavoriteBtn(); trackRecentlyViewed(); updateProductFollowBtn();
    setTimeout(function() {
        var addBtn = document.querySelector('#product-screen button[onclick="addToCartWithQty()"]');
        var buyBtn = document.querySelector('#product-screen button[onclick="buyNow()"]');
        var outOfStock = stockVal <= 0;
        [addBtn, buyBtn].forEach(function(b) {
            if (!b) return;
            if (outOfStock) { b.disabled = true; b.style.opacity = '0.5'; b.style.cursor = 'not-allowed'; b.textContent = 'Rupture de stock'; }
            else { b.disabled = false; b.style.opacity = '1'; b.style.cursor = 'pointer'; }
        });
        if (addBtn && !outOfStock) addBtn.textContent = 'Ajouter au panier';
        if (buyBtn && !outOfStock) buyBtn.textContent = 'Acheter';
    }, 50);
    showScreen('product-screen');
}
function renderProductMedia() {
    var main = document.getElementById('product-main-media'), thumbs = document.getElementById('product-thumbnails');
    if (!main || !thumbs) return;
    var img = _productGallery.images[_productGallery.currentIndex];
    if (img) main.innerHTML = '<img src="' + img + '" class="w-full h-full object-contain">';
    else main.innerHTML = '<div class="text-gray-500 text-sm">Aucun média</div>';
    var h = '';
    for (var i = 0; i < _productGallery.images.length; i++) {
        var active = (i === _productGallery.currentIndex);
        h += '<div onclick="selectProductMedia(' + i + ')" class="w-14 h-14 rounded-lg overflow-hidden cursor-pointer border-2 flex-shrink-0 ' + (active ? 'border-orange-500' : 'border-transparent') + '">';
        h += '<img src="' + _productGallery.images[i] + '" class="w-full h-full object-cover"></div>';
    }
    thumbs.innerHTML = h;
}
function selectProductMedia(idx) {
    _productGallery.currentIndex = idx;
    renderProductMedia();
}
function updateProductQtyUI() {
    if (!_currentProductData) return;
    var q = document.getElementById('product-qty'); if (q) q.textContent = _productQty;
    var lt = document.getElementById('product-line-total');
    if (lt) lt.textContent = (_currentProductData.price * _productQty).toLocaleString('fr-FR') + ' FCFA';
}
function productQtyChange(delta) {
    var newQty = Math.max(1, _productQty + delta);
    var stock = _getAvailableStock(currentShopIndex, _currentProductData.name);
    if (stock !== null && newQty > stock) { toast('Stock maximum : ' + stock, 'warn'); return; }
    _productQty = newQty; updateProductQtyUI();
}
function viewSellerShop() {
    var idx = currentShopIndex;
    showScreen('home-screen');
    setTimeout(function() { openShopProfile(idx); }, 200);
}
function loadProductReviews() {
    var c = document.getElementById('product-reviews-list'); if (!c) return;
    var h = '', count = 0;
    for (var i = 0; i < buyerOrders.length && count < 3; i++) {
        var o = buyerOrders[i];
        if (o.shopIndex === currentShopIndex && o.rated && o.rating) {
            var avg = (o.rating.delivery + o.rating.quality + o.rating.behavior) / 3;
            h += '<div class="product-review-item">';
            h += '<div class="flex items-center gap-2 mb-1">';
            h += '<div class="bg-gray-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-[10px] font-bold">' + getInitials(o.buyerName || 'Client') + '</div>';
            h += '<span class="text-xs font-bold text-gray-700">' + escapeHtml((o.buyerName || 'Client').split(' ')[0]) + '</span>';
            h += '<span class="text-yellow-400 text-xs ml-auto">' + renderStars(avg) + '</span></div>';
            if (o.rating.comment) h += '<p class="text-xs text-gray-600 leading-relaxed">' + escapeHtml(o.rating.comment) + '</p>';
            h += '<p class="text-[10px] text-gray-400 mt-1">' + escapeHtml(o.rating.date || '') + '</p></div>';
            count++;
        }
    }
    if (count === 0) {
        h += '<div class="product-review-item"><div class="flex items-center gap-2 mb-1"><div class="bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-[10px] font-bold">MK</div><span class="text-xs font-bold text-gray-700">Marie K.</span><span class="text-yellow-400 text-xs ml-auto">' + renderStars(5) + '</span></div><p class="text-xs text-gray-600 leading-relaxed">Produit conforme, livraison rapide.</p><p class="text-[10px] text-gray-400 mt-1">Il y a 3 jours</p></div>';
    }
    c.innerHTML = h;
}
function loadRelatedProducts() {
    var c = document.getElementById('product-related'); if (!c) return;
    var shop = shopsCatalog[currentShopIndex];
    if (!shop) { c.innerHTML = ''; return; }
    var h = '', shown = 0;
    for (var i = 0; i < shop.products.length && shown < 4; i++) {
        var p = shop.products[i];
        if (_currentProductData && p.name === _currentProductData.name) continue;
        var img = getProductMainImage(p);
        h += '<div onclick="openShopProduct(' + i + ')" class="bg-gray-50 rounded-xl overflow-hidden cursor-pointer border border-gray-100">';
        h += '<img src="' + img + '" class="w-full h-24 object-cover">';
        h += '<div class="p-2"><h4 class="font-bold text-[11px] truncate">' + escapeHtml(p.name) + '</h4>';
        h += '<p class="text-orange-500 font-bold text-xs mt-0.5">' + p.price.toLocaleString('fr-FR') + ' F</p></div></div>';
        shown++;
    }
    if (shown === 0) {
        for (var s = 0; s < shopsCatalog.length && shown < 4; s++) {
            if (s === currentShopIndex) continue;
            var other = shopsCatalog[s];
            if (!other.products || !other.products.length) continue;
            var op = other.products[0], oimg = getProductMainImage(op);
            h += '<div onclick="closeProductScreen(); openShopProductFromOtherShop(' + s + ',0)" class="bg-gray-50 rounded-xl overflow-hidden cursor-pointer border border-gray-100">';
            h += '<img src="' + oimg + '" class="w-full h-24 object-cover">';
            h += '<div class="p-2"><h4 class="font-bold text-[11px] truncate">' + escapeHtml(op.name) + '</h4>';
            h += '<p class="text-orange-500 font-bold text-xs mt-0.5">' + op.price.toLocaleString('fr-FR') + ' F</p></div></div>';
            shown++;
        }
    }
    if (shown === 0) h = '<p class="col-span-2 text-center text-xs text-gray-400 py-4">Aucun autre produit</p>';
    c.innerHTML = h;
}
function openShopProductFromOtherShop(shopIdx, prodIdx) {
    currentShopIndex = shopIdx;
    var s = shopsCatalog[shopIdx]; if (!s) return;
    var p = s.products[prodIdx]; if (!p) return;
    productScreenOrigin = 'shop-profile-screen';
    showProductScreen(p.name, p.price.toLocaleString('fr-FR') + ' FCFA', getProductMainImage(p), p.rating, p.reviews, p.desc, p.hasDelivery, 'shop-profile-screen', p.images, p.hasWarranty, p.warrantyText, { stock: p.stock, category: p.category });
}
function openProductChat() {
    if (!_currentProductData) return;
    var s = shopsCatalog[currentShopIndex]; if (!s) return;
    var convId = 'conv-buyer-' + currentShopIndex;
    var conv = null;
    for (var i = 0; i < conversations.length; i++) if (conversations[i].id === convId) { conv = conversations[i]; break; }
    if (!conv) {
        conv = {
            id: convId, participantName: s.name,
            buyerName: userName, buyerPhone: userPhone,
            sellerName: s.name, sellerPhone: s.phone,
            participantRole: 'seller', shopIndex: currentShopIndex,
            messages: [], unreadSeller: 0, unreadBuyer: 0,
            createdAt: Date.now()
        };
        conversations.push(conv);
    }
    conv.productContext = _currentProductData.name;
    conv.negotiatedProduct = {
        name: _currentProductData.name, price: _currentProductData.price,
        priceLabel: _currentProductData.priceLabel, image: _currentProductData.image,
        shopIndex: currentShopIndex, qty: _productQty || 1
    };
    conv.negotiationStatus = 'pending';
    if (conv.messages.length === 0) {
        conv.messages.push({
            fromRole: 'buyer',
            text: 'Bonjour, je suis intéressé(e) par votre produit "' + _currentProductData.name + '" à ' + _currentProductData.priceLabel + '. Est-il disponible ?',
            time: getTime(), isProductInquiry: true, at: Date.now(),
            senderName: userName, senderPhone: userPhone
        });
    }
    _stateDirty = true;
    openChat(convId);
}
function openNegotiateDelivery() {
    if (!_currentProductData) return;
    var s = shopsCatalog[currentShopIndex]; if (!s) return;
    var msg = 'Bonjour, je suis intéressé(e) par "' + _currentProductData.name + '" (' + _currentProductData.priceLabel + ').\n\nJe souhaite discuter des modalités de livraison.';
    sendNegotiationMessage(msg);
}
function sendNegotiationMessage(text) {
    var s = shopsCatalog[currentShopIndex]; if (!s) return;
    var convId = 'conv-buyer-' + currentShopIndex;
    var conv = null;
    for (var i = 0; i < conversations.length; i++) if (conversations[i].id === convId) { conv = conversations[i]; break; }
    if (!conv) {
        conv = {
            id: convId, participantName: s.name,
            buyerName: userName, buyerPhone: userPhone,
            sellerName: s.name, sellerPhone: s.phone,
            participantRole: 'seller', shopIndex: currentShopIndex,
            messages: [], unreadSeller: 0, unreadBuyer: 0,
            createdAt: Date.now()
        };
        conversations.push(conv);
    }
    if (!conv.negotiatedProduct && _currentProductData) {
        conv.negotiatedProduct = {
            name: _currentProductData.name, price: _currentProductData.price,
            priceLabel: _currentProductData.priceLabel, image: _currentProductData.image,
            shopIndex: currentShopIndex, qty: _productQty || 1
        };
        conv.negotiationStatus = 'pending';
    }
    conv.productContext = _currentProductData ? _currentProductData.name : null;
    conv.messages.push({ fromRole: 'buyer', text: text, time: getTime(), isNegotiation: true, at: Date.now(), senderName: userName, senderPhone: userPhone });
    _stateDirty = true;
    openChat(convId);
}

/* =========================================================
   APERÇU PRODUIT VENDEUR
   ========================================================= */
function openSellerProductPreview(index) {
    if (!myShop || !myShop.products[index]) return;
    var p = myShop.products[index];
    _previewProductIndex = index;
    var imgs = (p.images && p.images.length) ? p.images.slice() : (p.image ? [p.image] : []);
    _previewGallery = { images: imgs, currentIndex: 0 };
    document.getElementById('preview-name').textContent = p.name || '—';
    document.getElementById('preview-price').textContent = (p.price || 0).toLocaleString('fr-FR') + ' FCFA';
    document.getElementById('preview-rating').textContent = p.rating || '0';
    document.getElementById('preview-desc').textContent = p.desc || 'Aucune description.';
    var stockBadge = document.getElementById('preview-stock-badge');
    if (stockBadge) {
        if ((p.stock || 0) <= 0) { stockBadge.innerHTML = '<span class="w-2 h-2 bg-red-500 rounded-full"></span>Rupture'; stockBadge.className = 'text-red-500 flex items-center gap-1'; }
        else if ((p.stock || 0) <= 5) { stockBadge.innerHTML = '<span class="w-2 h-2 bg-orange-500 rounded-full"></span>' + p.stock + ' restant(s)'; stockBadge.className = 'text-orange-500 flex items-center gap-1'; }
        else { stockBadge.innerHTML = '<span class="w-2 h-2 bg-green-500 rounded-full"></span>En stock (' + p.stock + ')'; stockBadge.className = 'text-green-600 flex items-center gap-1'; }
    }
    var di = document.getElementById('preview-delivery-info');
    di.innerHTML = p.hasDelivery ? 'Livraison possible (frais à négocier)' : 'Retrait en boutique uniquement';
    var wi = document.getElementById('preview-warranty-info');
    if (wi) {
        if (p.hasWarranty && p.warrantyText) { wi.innerHTML = '<strong>Garantie :</strong> ' + escapeHtml(p.warrantyText); wi.classList.remove('hidden'); }
        else wi.classList.add('hidden');
    }
    renderPreviewMedia();
    showScreen('seller-product-preview-screen');
}
function renderPreviewMedia() {
    var main = document.getElementById('preview-main-media'), thumbs = document.getElementById('preview-thumbnails');
    if (!main || !thumbs) return;
    var img = _previewGallery.images[_previewGallery.currentIndex];
    if (img) main.innerHTML = '<img src="' + img + '" class="w-full h-full object-contain">';
    else main.innerHTML = '<div class="text-gray-500 text-sm">Aucun média</div>';
    var h = '';
    for (var i = 0; i < _previewGallery.images.length; i++) {
        var active = (i === _previewGallery.currentIndex);
        h += '<div onclick="selectPreviewMedia(' + i + ')" class="w-14 h-14 rounded-lg overflow-hidden cursor-pointer border-2 flex-shrink-0 ' + (active ? 'border-orange-500' : 'border-transparent') + '">';
        h += '<img src="' + _previewGallery.images[i] + '" class="w-full h-full object-cover"></div>';
    }
    thumbs.innerHTML = h;
}
function selectPreviewMedia(idx) {
    _previewGallery.currentIndex = idx;
    renderPreviewMedia();
}
function closeSellerProductPreview() { _previewProductIndex = -1; showScreen('seller-products-screen'); }
function deleteSellerProductFromPreview() {
    if (_previewProductIndex < 0 || !myShop) return;
    gmConfirm('Supprimer ce produit ?', 'Suppression', { danger: true, confirmText: 'Supprimer' })
    .then(function(ok) {
        if (!ok) return;
        myShop.products.splice(_previewProductIndex, 1);
        _previewProductIndex = -1;
        renderMyProducts(); syncMyShopToCatalog(); applyShopToDashboard();
        _stateDirty = true;
        showScreen('seller-products-screen');
    });
}

/* =========================================================
   PRODUITS VENDEUR
   ========================================================= */
function publishProduct() {
    if (!myShop) { toast('Créez votre boutique.', 'error'); return; }
    requireTermsAcceptance(function() { _doPublishProduct(); }, 'add-product-screen');
}
function _doPublishProduct() {
    var n = document.getElementById('prod-name').value.trim();
    var catSel = document.getElementById('prod-category').value;
    var c = catSel;
    if (catSel === '__autre__') {
        var custom = document.getElementById('prod-category-custom').value.trim();
        if (!custom) { toast('Précisez la catégorie.', 'error'); return; }
        var matched = _matchCategory(custom);
        c = matched || 'Autre';
        if (matched && matched !== custom) {
            toast('Classé automatiquement dans « ' + matched + ' ».', 'info', 3000);
        }
    }
    var p = document.getElementById('prod-price').value;
    var s = document.getElementById('prod-stock').value;
    var d = document.getElementById('prod-desc').value.trim();
    if (!n) { toast('Nom requis.', 'error'); return; }
    if (!p || parseInt(p) <= 0) { toast('Prix invalide.', 'error'); return; }
    if (!s || parseInt(s) <= 0) { toast('Stock invalide.', 'error'); return; }
    var deliveryMode = document.getElementById('prod-delivery-mode').value;
    if (deliveryMode !== 'home' && deliveryMode !== 'pickup') { toast('Choisissez le mode de récupération.', 'error', 4000); return; }
    var warrantyInfo = getWarrantyTextFromForm();
    if (warrantyInfo.error) { toast(warrantyInfo.error, 'error'); return; }
    var hasW = warrantyInfo.hasW;
    var wText = warrantyInfo.text;

    var imgs;
    if (pendingProductImages.length > 0) {
        imgs = pendingProductImages.slice();
    } else {
        imgs = ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80'];
    }

    var newProduct = {
        name: n, category: c, price: parseInt(p), stock: parseInt(s), desc: d,
        hasDelivery: deliveryMode === 'home',
        image: imgs[0], images: imgs,
        rating: '0', reviews: '0',
        hasWarranty: hasW, warrantyText: wText,
        addedAt: Date.now()
    };
    myShop.products.push(newProduct);
    resetProductForm();
    renderMyProducts();
    syncMyShopToCatalog();
    applyShopToDashboard();
    renderProductsFeed();
    if (activeCategory) renderCategoryResults();
    _stateDirty = true; haptic(30);
    toast('Produit publié.', 'success', 3500);
    showScreen('seller-products-screen');
}
function renderMyProducts() {
    var c = document.getElementById('my-products-list');
    if (!c || !myShop) return;
    if (myShop.products.length === 0) { c.innerHTML = '<p class="text-center text-gray-400 text-sm py-10">Aucun produit.</p>'; return; }
    var h = '';
    for (var i = 0; i < myShop.products.length; i++) {
        var p = myShop.products[i];
        var img = getProductMainImage(p);
        var imgCount = (p.images && p.images.length) ? p.images.length : 1;
        var stockClass = p.stock <= 0 ? 'text-red-500 font-bold' : (p.stock <= 5 ? 'text-orange-500 font-bold' : 'text-gray-500');
        h += '<div class="bg-white p-3 rounded-xl flex items-center gap-3">';
        h += '<div class="flex-1 flex items-center gap-3 cursor-pointer" onclick="openSellerProductPreview(' + i + ')">';
        h += '<div class="relative"><img src="'+img+'" class="w-16 h-16 object-cover rounded-lg">';
        if (imgCount > 1) h += '<span class="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center">'+imgCount+'</span>';
        h += '</div>';
        h += '<div class="flex-1"><h4 class="font-bold text-sm">'+escapeHtml(p.name)+'</h4>';
        h += '<p class="text-orange-500 font-bold text-sm mt-1">'+p.price.toLocaleString('fr-FR')+' FCFA</p>';
        h += '<p class="text-[10px] text-gray-500 mt-1">' + (p.hasDelivery ? 'Livraison' : 'Retrait') + (p.hasWarranty ? ' · Garantie' : '') + '</p>';
        h += '<p class="text-xs mt-0.5 ' + stockClass + '">Stock : '+p.stock+(p.stock <= 0 ? ' (rupture)' : '')+'</p></div></div>';
        var _boosted = (p.boostedUntil || 0) > Date.now();
        h += '<div class="flex flex-col items-end gap-2">';
        if (_boosted) h += '<span class="text-[10px] font-bold text-amber-600">Sponsorisé jusqu\'au ' + new Date(p.boostedUntil).toLocaleDateString('fr-FR') + '</span>';
        else h += '<button onclick="event.stopPropagation(); boostProduct('+i+')" class="bg-amber-500 text-white text-[11px] font-bold px-2 py-1 rounded-lg">Booster</button>';
        h += '<button onclick="event.stopPropagation(); deleteProduct('+i+')" class="text-red-500 text-xs font-bold">Suppr.</button></div></div>';
    }
    c.innerHTML = h;
}
function boostProduct(i) {
    if (!myShop || !myShop.products[i]) return;
    var p = myShop.products[i];
    if ((p.boostedUntil || 0) > Date.now()) { toast('Ce produit est déjà sponsorisé.', 'info'); return; }
    if (!GM.loggedIn()) { toast('Reconnectez-vous pour payer.', 'error'); return; }
    requireTermsAcceptance(function () {
        showLoading('Préparation...');
        GM.syncNow().then(function () {
            hideLoading();
            if (!p.serverId) { toast('Produit en cours de synchronisation, réessayez dans un instant.', 'warn'); return; }
            GM.pay({
                purpose: 'boost', refId: p.serverId, amount: GM_FEES.boostPrice7d,
                title: 'Booster « ' + p.name + ' »',
                description: 'Votre produit sera affiché en tête du fil avec le badge SPONSORISÉ pendant ' + GM_FEES.boostDays + ' jours.',
                successText: 'Votre produit est sponsorisé pendant ' + GM_FEES.boostDays + ' jours.',
                onSuccess: function () {
                    GM.loadCatalog().then(function () { renderMyProducts(); }).catch(function () {});
                    p.boostedUntil = Date.now() + GM_FEES.boostDays * 86400000; renderMyProducts(); _stateDirty = true;
                }
            });
        }).catch(function (e) { hideLoading(); toast(e.message, 'error', 5000); });
    }, 'seller-products-screen');
}
function deleteProduct(i) {
    if (!myShop) return;
    gmConfirm('Supprimer ce produit ?', 'Suppression', { danger: true, confirmText: 'Supprimer' })
    .then(function(ok) {
        if (!ok) return;
        GM.removeProduct(myShop.products[i] && myShop.products[i].serverId);
        myShop.products.splice(i,1);
        renderMyProducts(); syncMyShopToCatalog(); applyShopToDashboard();
        renderProductsFeed();
        if (activeCategory) renderCategoryResults();
        _stateDirty = true; toast('Produit supprimé.', 'info');
    });
}

/* =========================================================
   RECHERCHE
   ========================================================= */
var _searchTimer = null;
function openSearch() {
    var inp = document.getElementById('search-input');
    inp.value = '';
    renderSearchHistory();
    showScreen('search-screen');
    setTimeout(function() { inp.focus(); }, 150);
    inp.oninput = function() {
        clearTimeout(_searchTimer);
        var val = this.value;
        _searchTimer = setTimeout(function(){ doSearch(val); }, 250);
    };
}
function closeSearch() { showScreen('home-screen'); }
function clearSearchInput() { document.getElementById('search-input').value = ''; doSearch(''); }
function doSearch(q) {
    q = (q || '').trim().toLowerCase();
    var clearBtn = document.getElementById('search-clear');
    if (clearBtn) { if (q) clearBtn.classList.remove('hidden'); else clearBtn.classList.add('hidden'); }
    var c = document.getElementById('search-results');
    if (!q) { renderSearchHistory(); return; }
    var shopResults = [], productResults = [];
    for (var i = 0; i < shopsCatalog.length; i++) {
        var s = shopsCatalog[i];
        if (s.name.toLowerCase().indexOf(q) !== -1 || s.category.toLowerCase().indexOf(q) !== -1) shopResults.push({ shop: s, index: i });
        for (var j = 0; j < s.products.length; j++) {
            var p = s.products[j];
            if (p.name.toLowerCase().indexOf(q) !== -1 || (p.desc || '').toLowerCase().indexOf(q) !== -1)
                productResults.push({ product: p, shop: s, shopIndex: i, productIndex: j });
        }
    }
    if (shopResults.length > 0 || productResults.length > 0) addToSearchHistory(q);
    if (shopResults.length === 0 && productResults.length === 0) {
        c.innerHTML = '<div class="text-center py-10">' +
            '<p class="text-gray-400 text-sm">Hmm, rien trouvé pour « ' + escapeHtml(q) + ' »</p>' +
            '<p class="text-xs text-gray-400 mt-2">Essayez un autre mot-clé ou parcourez les catégories.</p></div>';
        return;
    }
    var h = '';
    if (shopResults.length > 0) {
        h += '<p class="text-xs font-bold text-gray-400 uppercase mb-2">Boutiques (' + shopResults.length + ')</p>';
        for (var i = 0; i < shopResults.length; i++) {
            var sr = shopResults[i];
            h += '<div onclick="closeSearch(); openShopProfile(' + sr.index + ')" class="bg-white p-3 rounded-xl flex items-center gap-3 mb-2 cursor-pointer">';
            h += '<div class="' + sr.shop.colorBg + ' text-white rounded-full w-12 h-12 flex items-center justify-center font-bold overflow-hidden">';
            if (sr.shop.logo) h += '<img src="' + sr.shop.logo + '" class="w-full h-full object-cover">';
            else h += escapeHtml(sr.shop.initials);
            h += '</div><div class="flex-1 min-w-0"><h4 class="font-bold text-sm flex items-center min-w-0"><span class="truncate">' + escapeHtml(sr.shop.name) + '</span>' + renderShopBadge(sr.shop) + '</h4>';
            h += '<p class="text-xs text-gray-500">' + escapeHtml(sr.shop.category) + '</p></div></div>';
        }
    }
    if (productResults.length > 0) {
        h += '<p class="text-xs font-bold text-gray-400 uppercase mt-4 mb-2">Produits (' + productResults.length + ')</p><div class="grid grid-cols-2 gap-3">';
        for (var i = 0; i < productResults.length; i++) {
            var pr = productResults[i];
            h += renderProductCard(pr.shopIndex, pr.productIndex, pr.product, pr.shop);
        }
        h += '</div>';
    }
    c.innerHTML = h;
}
function openProductFromSearch(shopIndex, productIndex) {
    currentShopIndex = shopIndex;
    var s = shopsCatalog[shopIndex]; if (!s) return;
    var p = s.products[productIndex]; if (!p) return;
    showProductScreen(p.name, p.price.toLocaleString('fr-FR') + ' FCFA', getProductMainImage(p), p.rating, p.reviews, p.desc, p.hasDelivery, 'home-screen', p.images, p.hasWarranty, p.warrantyText, { stock: p.stock, category: p.category });
}

/* =========================================================
   AVIS
   ========================================================= */
function openRateOrder(orderId) {
    var o = findBuyerOrder(orderId); if (!o) return;
    if (o.buyerPhone !== userPhone) { toast('Action non autorisée.', 'error'); return; }
    if (!o.sellerAcceptedOrder) { toast('Le vendeur n\'a pas encore accepté.', 'warn'); return; }
    if (o.status !== ORDER_STATUS.COMPLETED) { toast('Commande non terminée.', 'warn'); return; }
    if (o.rated) { toast('Déjà noté.', 'info'); return; }
    currentRating = { orderId: orderId, shopIndex: o.shopIndex, delivery: 0, quality: 0, behavior: 0 };
    document.getElementById('rate-shop-name').textContent = o.shopName;
    document.getElementById('rate-order-id').textContent = 'Commande ' + o.id;
    document.getElementById('rate-comment').value = '';
    renderStarRow('rate-delivery', 'delivery');
    renderStarRow('rate-quality', 'quality');
    renderStarRow('rate-behavior', 'behavior');
    updateRateValues();
    showScreen('rate-order-screen');
}
function renderStarRow(containerId, criterion) {
    var c = document.getElementById(containerId); if (!c) return;
    var h = '';
    for (var i = 1; i <= 6; i++) {
        var active = currentRating[criterion] >= i;
        h += '<button type="button" onclick="setRating(\'' + criterion + '\', ' + i + ')" class="flex-1 text-3xl transition-colors ' + (active ? 'text-yellow-400' : 'text-gray-300') + '" style="line-height:1;">★</button>';
    }
    c.innerHTML = h;
}
function setRating(criterion, value) {
    currentRating[criterion] = value;
    var map = { delivery: 'rate-delivery', quality: 'rate-quality', behavior: 'rate-behavior' };
    renderStarRow(map[criterion], criterion);
    updateRateValues();
}
function updateRateValues() {
    var dv = document.getElementById('rate-delivery-val'); if (dv) dv.textContent = currentRating.delivery + ' / 6';
    var qv = document.getElementById('rate-quality-val'); if (qv) qv.textContent = currentRating.quality + ' / 6';
    var bv = document.getElementById('rate-behavior-val'); if (bv) bv.textContent = currentRating.behavior + ' / 6';
}
function closeRateOrder() { showScreen('buyer-profile-screen'); }
function submitRating() {
    if (currentRating.delivery === 0 || currentRating.quality === 0 || currentRating.behavior === 0) { toast('Notez les 3 critères.', 'error'); return; }
    var o = findBuyerOrder(currentRating.orderId); if (!o) return;
    var avg = (currentRating.delivery + currentRating.quality + currentRating.behavior) / 3;
    var sixCount = 0;
    if (currentRating.delivery === 6) sixCount++;
    if (currentRating.quality === 6) sixCount++;
    if (currentRating.behavior === 6) sixCount++;
    var comment = document.getElementById('rate-comment').value.trim();
    o.rated = true;
    refreshBuyerTrophies();
    o.rating = { delivery: currentRating.delivery, quality: currentRating.quality, behavior: currentRating.behavior, comment: comment, date: formatDate(), sixPoints: sixCount };
    var shop = shopsCatalog[currentRating.shopIndex];
    if (shop) {
        var tr = shop.reviewsCount || 0, nc = tr + 1;
        shop.globalRating = Math.round((((shop.globalRating || 0) * tr + avg) / nc) * 10) / 10;
        shop.critDelivery = Math.round((((shop.critDelivery || 0) * tr + currentRating.delivery) / nc) * 10) / 10;
        shop.critQuality  = Math.round((((shop.critQuality  || 0) * tr + currentRating.quality ) / nc) * 10) / 10;
        shop.critBehavior = Math.round((((shop.critBehavior || 0) * tr + currentRating.behavior) / nc) * 10) / 10;
        shop.reviewsCount = nc;
        shop.sixStarPoints = (shop.sixStarPoints || 0) + sixCount;
        if (myShop && shop.ownerPhone === myShop.phone) {
            myShop.sixStarPoints = (myShop.sixStarPoints || 0) + sixCount;
            if (myShop.sixStarPoints >= 1000 && !myShop.isCertified) {
                myShop.isCertified = true;
                setTimeout(function() { toast('Boutique certifiée gratuitement (1000 points).', 'success', 5000); }, 500);
            }
            if (myShop.sixStarPoints >= GOLD_CERTIFICATION_THRESHOLD && !myShop.isGoldenCertified) {
                myShop.isGoldenCertified = true;
                setTimeout(function() { toast('🏆 Félicitations ! Golden Certif débloquée (100 000 avis 6★).', 'success', 6000); }, 900);
            }
            syncMyShopToCatalog();
        }
    }
    applyShopToDashboard(); renderHomeTopShops();
    _stateDirty = true;
    var extraMsg = '';
    if (sixCount > 0) extraMsg = ' (+' + sixCount + ' point' + (sixCount > 1 ? 's' : '') + ' de certification)';
    toast('Merci pour votre avis !' + extraMsg, 'success', 4000);
    showScreen('buyer-profile-screen');
}

/* =========================================================
   TROPHÉES ACHETEUR
   ========================================================= */
var BUYER_TROPHIES = [
    {id:'first_step',name:'Premier pas',desc:'Créer un compte Grand Marché',target:1,stat:'account',tier:'bronze',icon:'star'},
    {id:'first_purchase',name:'Premier achat',desc:'Terminer 1 commande validée',target:1,stat:'orders',tier:'bronze',icon:'cart'},
    {id:'explorer',name:'Explorateur',desc:'Consulter 20 produits différents',target:20,stat:'productsViewed',tier:'silver',icon:'compass'},
    {id:'favorite',name:'Coup de cœur',desc:'Ajouter 10 produits aux favoris',target:10,stat:'favorites',tier:'silver',icon:'heart'},
    {id:'regular',name:'Habitué',desc:'Terminer 5 commandes validées',target:5,stat:'orders',tier:'silver',icon:'cart'},
    {id:'loyal',name:'Client fidèle',desc:'Terminer 10 commandes validées',target:10,stat:'orders',tier:'gold',icon:'star'},
    {id:'big_client',name:'Grand client',desc:'Terminer 25 commandes validées',target:25,stat:'orders',tier:'gold',icon:'gem'},
    {id:'super_client',name:'Super client',desc:'Terminer 50 commandes validées',target:50,stat:'orders',tier:'platinum',icon:'crown'},
    {id:'reviewer',name:'Donneur d’avis',desc:'Publier 5 avis après achat',target:5,stat:'reviews',tier:'silver',icon:'message'},
    {id:'critic',name:'Critique confirmé',desc:'Publier 15 avis après achat',target:15,stat:'reviews',tier:'gold',icon:'medal'},
    {id:'sponsor',name:'Parrain',desc:'Faire inscrire 10 utilisateurs grâce à votre invitation',target:10,stat:'referrals',tier:'gold',icon:'users'},
    {id:'super_sponsor',name:'Super parrain',desc:'Faire inscrire 25 utilisateurs grâce à votre invitation',target:25,stat:'referrals',tier:'platinum',icon:'users'},
    {id:'ambassador',name:'Ambassadeur',desc:'Faire inscrire 50 utilisateurs grâce à votre invitation',target:50,stat:'referrals',tier:'diamond',icon:'crown'},
    {id:'active',name:'Membre actif',desc:'Être actif pendant 4 semaines différentes',target:4,stat:'activeWeeks',tier:'silver',icon:'bolt'}
];
var buyerTrophyStats = {account:0,orders:0,productsViewed:0,favorites:0,reviews:0,referrals:0,activeWeeks:0};
var buyerTrophyUnlocked = {};
var buyerTrophyWeeks = {};
var buyerTrophyViewedProducts = {};

function buyerCompletedOrdersCount(){
    var n=0; for(var i=0;i<buyerOrders.length;i++) if(buyerOrders[i] && buyerOrders[i].status==='completed') n++; return n;
}
function buyerReviewedOrdersCount(){
    var n=0; for(var i=0;i<buyerOrders.length;i++) if(buyerOrders[i] && buyerOrders[i].rated) n++; return n;
}
function uniqueViewedProductsCount(){
    var seen={}; for(var i=0;i<recentlyViewed.length;i++){var r=recentlyViewed[i]; if(r) seen[(r.key||r.productName||i)] = true;} return Object.keys(seen).length;
}
function getBuyerTrophyStats(){
    buyerTrophyStats.account = hasBuyerAccount ? 1 : 0;
    buyerTrophyStats.orders = buyerCompletedOrdersCount();
    buyerTrophyStats.productsViewed = Object.keys(buyerTrophyViewedProducts||{}).length || uniqueViewedProductsCount();
    buyerTrophyStats.favorites = favoriteProducts.length;
    buyerTrophyStats.reviews = buyerReviewedOrdersCount();
    buyerTrophyStats.referrals = buyerReferrals.length;
    buyerTrophyStats.activeWeeks = Object.keys(buyerTrophyWeeks||{}).length;
    return buyerTrophyStats;
}

/* =========================================================
   TROPHÉES UNIQUES v14.7 — chaque trophée a sa propre forme
   ET ses icônes intérieures COLORÉES
   ========================================================= */
var _trophyUidCounter = 0;
function _trophyUid() { return 'tg' + (++_trophyUidCounter) + 'x' + Math.floor(Math.random()*1000); }

function _starPath(cx, cy, outer, inner, points, rotation) {
    points = points || 5;
    rotation = (rotation === undefined) ? -Math.PI/2 : rotation;
    var d = '';
    for (var i = 0; i < points * 2; i++) {
        var r = (i % 2 === 0) ? outer : inner;
        var a = rotation + i * Math.PI / points;
        var x = cx + Math.cos(a) * r;
        var y = cy + Math.sin(a) * r;
        d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ',' + y.toFixed(2);
    }
    return d + 'Z';
}

function trophySvg(trophyId, tier, locked) {
    var P = {
        bronze:   { light:'#f7d0a4', main:'#c97a3a', dark:'#7a4118', stroke:'#5c3210' },
        silver:   { light:'#f5f7fa', main:'#b8c1cd', dark:'#6d7885', stroke:'#4e5865' },
        gold:     { light:'#fff2b0', main:'#edb83b', dark:'#996d0e', stroke:'#6e4f08' },
        platinum: { light:'#f0f6ff', main:'#a9bfdd', dark:'#5f7898', stroke:'#3f5570' },
        diamond:  { light:'#d0f8ff', main:'#54c8dd', dark:'#0f7a92', stroke:'#0a5e70' }
    };
    var c = P[tier] || P.gold;
    if (locked) c = { light:'#eef1f4', main:'#cbd0d6', dark:'#8c939c', stroke:'#6a7079' };

    var uid = _trophyUid();
    var A = 'url(#' + uid + 'A)';
    var C = 'url(#' + uid + 'C)';
    var S = c.stroke;
    var sw = 1.6;

    /* 🎨 Palette pour les icônes intérieures
       → Vives quand débloqué, grises quand verrouillé */
    var IC = locked ? {
        gold:'#9aa0a8', goldD:'#6a7078', goldL:'#cfd4da',
        red:'#9aa0a8',  redD:'#6a7078',  redL:'#cfd4da',
        green:'#9aa0a8',greenD:'#6a7078',greenL:'#cfd4da',
        blue:'#9aa0a8', blueD:'#6a7078', blueL:'#cfd4da',
        cyan:'#9aa0a8', cyanD:'#6a7078',
        orange:'#9aa0a8', orangeD:'#6a7078',
        skin:'#c4c9d0', skinD:'#8a9098',
        white:'#f7f8fa', cream:'#eef0f3'
    } : {
        gold:'#fbbf24', goldD:'#92400e', goldL:'#fde68a',
        red:'#ef4444',  redD:'#991b1b',  redL:'#fecaca',
        green:'#22c55e',greenD:'#15803d',greenL:'#bbf7d0',
        blue:'#3b82f6', blueD:'#1e40af', blueL:'#bfdbfe',
        cyan:'#22d3ee', cyanD:'#0e7490',
        orange:'#f97316', orangeD:'#9a3412',
        skin:'#fbbf24', skinD:'#b45309',
        white:'#ffffff', cream:'#fef9e7'
    };

    var defs =
        '<defs>' +
        '<linearGradient id="' + uid + 'A" x1="0.15" y1="0" x2="0.75" y2="1">' +
            '<stop offset="0" stop-color="' + c.light + '"/>' +
            '<stop offset="0.45" stop-color="' + c.main + '"/>' +
            '<stop offset="1" stop-color="' + c.dark + '"/>' +
        '</linearGradient>' +
        '<radialGradient id="' + uid + 'C" cx="0.32" cy="0.28" r="0.75">' +
            '<stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/>' +
            '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/>' +
        '</radialGradient>' +
        '</defs>';

    var body = '';

    /* ⭐ 1. Premier pas — Médaille ronde, étoile dorée */
    if (trophyId === 'first_step') {
        var star = _starPath(32, 27, 10.5, 4.4, 5, -Math.PI/2);
        body =
            '<path d="M23 45 L18 72 L32 65 L46 72 L41 45 Z" fill="' + A + '" stroke="' + S + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' +
            '<path d="M32 47 L32 63" stroke="' + S + '" stroke-width="0.9" opacity="0.5"/>' +
            '<circle cx="32" cy="27" r="21" fill="' + A + '" stroke="' + S + '" stroke-width="' + sw + '"/>' +
            '<circle cx="32" cy="27" r="21" fill="' + C + '"/>' +
            '<circle cx="32" cy="27" r="17.5" fill="' + IC.cream + '" stroke="' + S + '" stroke-width="0.9"/>' +
            '<path d="' + star + '" fill="' + IC.gold + '" stroke="' + IC.goldD + '" stroke-width="1.2" stroke-linejoin="round"/>' +
            '<path d="' + star + '" fill="none" stroke="' + IC.goldL + '" stroke-width="0.6" opacity="0.7"/>';

    /* 🛍️ 2. Premier achat — Sac de courses, roues rouges */
    } else if (trophyId === 'first_purchase') {
        body =
            '<path d="M12 26 L52 26 L56 70 L8 70 Z" fill="' + A + '" stroke="' + S + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' +
            '<path d="M12 26 L52 26 L53.2 36 L10.8 36 Z" fill="#ffffff" opacity="0.25"/>' +
            '<path d="M22 26 C22 13, 42 13, 42 26" fill="none" stroke="' + S + '" stroke-width="2.4" stroke-linecap="round"/>' +
            '<path d="M20 43 L25 43 L28 55 L42 55 L46 44 L26 44" fill="none" stroke="' + IC.goldD + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<circle cx="30" cy="62" r="2.7" fill="' + IC.red + '" stroke="' + IC.redD + '" stroke-width="0.8"/>' +
            '<circle cx="41" cy="62" r="2.7" fill="' + IC.red + '" stroke="' + IC.redD + '" stroke-width="0.8"/>' +
            '<circle cx="30" cy="62" r="1" fill="' + IC.white + '" opacity="0.9"/>' +
            '<circle cx="41" cy="62" r="1" fill="' + IC.white + '" opacity="0.9"/>';

    /* 🧭 3. Explorateur — Boussole rouge/blanc/bleu */
    } else if (trophyId === 'explorer') {
        body =
            '<circle cx="32" cy="38" r="26" fill="' + A + '" stroke="' + S + '" stroke-width="' + sw + '"/>' +
            '<circle cx="32" cy="38" r="26" fill="' + C + '"/>' +
            '<circle cx="32" cy="38" r="22" fill="' + IC.cream + '" stroke="' + S + '" stroke-width="1.1"/>' +
            '<circle cx="32" cy="38" r="19" fill="none" stroke="' + S + '" stroke-width="0.5" opacity="0.35"/>' +
            '<path d="M32 17 L32 20" stroke="' + S + '" stroke-width="1" opacity="0.6"/>' +
            '<path d="M53 38 L50 38" stroke="' + S + '" stroke-width="1" opacity="0.6"/>' +
            '<path d="M32 59 L32 56" stroke="' + S + '" stroke-width="1" opacity="0.6"/>' +
            '<path d="M11 38 L14 38" stroke="' + S + '" stroke-width="1" opacity="0.6"/>' +
            '<path d="M32 20 L36 38 L32 42 L28 38 Z" fill="' + IC.red + '" stroke="' + IC.redD + '" stroke-width="0.9" stroke-linejoin="round"/>' +
            '<path d="M32 56 L28 38 L32 34 L36 38 Z" fill="' + IC.blue + '" stroke="' + IC.blueD + '" stroke-width="0.9" stroke-linejoin="round"/>' +
            '<circle cx="32" cy="38" r="2.6" fill="' + IC.gold + '" stroke="' + IC.goldD + '" stroke-width="0.7"/>' +
            '<text x="32" y="25" text-anchor="middle" font-family="Arial Black, Arial" font-size="5.5" font-weight="900" fill="' + IC.red + '">N</text>';

    /* ❤️ 4. Coup de cœur — Cœur rouge vif */
    } else if (trophyId === 'favorite') {
        var heart = 'M32 68 C10 50, 8 33, 18 25 C25 20, 32 25, 32 31 C32 25, 39 20, 46 25 C56 33, 54 50, 32 68 Z';
        body =
            '<path d="M20 16 L32 28 L44 16 L40 6 L32 15 L24 6 Z" fill="' + A + '" stroke="' + S + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' +
            '<path d="' + heart + '" fill="' + IC.red + '" stroke="' + IC.redD + '" stroke-width="1.8" stroke-linejoin="round"/>' +
            '<path d="M21 34 Q20 28 27 26" fill="none" stroke="' + IC.white + '" stroke-width="2.4" stroke-linecap="round" opacity="0.85"/>' +
            '<circle cx="26" cy="32" r="1.8" fill="' + IC.white + '" opacity="0.95"/>';

    /* ✓ 5. Habitué — Médaille avec coche verte + perles dorées */
    } else if (trophyId === 'regular') {
        body =
            '<circle cx="32" cy="32" r="24" fill="' + A + '" stroke="' + S + '" stroke-width="' + sw + '"/>' +
            '<circle cx="32" cy="32" r="24" fill="' + C + '"/>' +
            '<circle cx="32" cy="32" r="20" fill="' + IC.cream + '" stroke="' + S + '" stroke-width="1"/>' +
            '<circle cx="32" cy="11.5" r="2.8" fill="' + IC.gold + '" stroke="' + IC.goldD + '" stroke-width="0.8"/>' +
            '<circle cx="52.5" cy="32" r="2.8" fill="' + IC.gold + '" stroke="' + IC.goldD + '" stroke-width="0.8"/>' +
            '<circle cx="32" cy="52.5" r="2.8" fill="' + IC.gold + '" stroke="' + IC.goldD + '" stroke-width="0.8"/>' +
            '<circle cx="11.5" cy="32" r="2.8" fill="' + IC.gold + '" stroke="' + IC.goldD + '" stroke-width="0.8"/>' +
            '<path d="M22 32 L29 40 L43 24" fill="none" stroke="' + IC.greenD + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<path d="M22 32 L29 40 L43 24" fill="none" stroke="' + IC.green + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<path d="M22 32 L29 40 L43 24" fill="none" stroke="' + IC.greenL + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>';

    /* 🛡️ 6. Client fidèle — Bouclier avec étoile dorée */
    } else if (trophyId === 'loyal') {
        var lstar = _starPath(32, 37, 15, 6.8, 5, -Math.PI/2);
        body =
            '<path d="M32 5 L54 13 L54 38 C54 52 44 64 32 72 C20 64 10 52 10 38 L10 13 Z" fill="' + A + '" stroke="' + S + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' +
            '<path d="M32 5 L54 13 L54 38 C54 52 44 64 32 72 C20 64 10 52 10 38 L10 13 Z" fill="' + C + '"/>' +
            '<path d="M32 11 L49 17.5 L49 38 C49 49 42 59 32 64.5 C22 59 15 49 15 38 L15 17.5 Z" fill="' + IC.cream + '" stroke="' + S + '" stroke-width="0.8" opacity="0.95"/>' +
            '<path d="' + lstar + '" fill="' + IC.gold + '" stroke="' + IC.goldD + '" stroke-width="1.3" stroke-linejoin="round"/>' +
            '<path d="' + lstar + '" fill="none" stroke="' + IC.goldL + '" stroke-width="0.6" opacity="0.7"/>';

    /* 💎 7. Grand client — Diamant facetté + étincelle cyan */
    } else if (trophyId === 'big_client') {
        body =
            '<path d="M16 26 L32 6 L48 26 L32 70 Z" fill="' + A + '" stroke="' + S + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' +
            '<path d="M16 26 L48 26 L32 70 Z" fill="#ffffff" opacity="0.22"/>' +
            '<path d="M16 26 L48 26" stroke="' + S + '" stroke-width="1.2" fill="none"/>' +
            '<path d="M32 6 L22 26 L32 70" fill="none" stroke="' + S + '" stroke-width="0.9" opacity="0.5"/>' +
            '<path d="M32 6 L42 26 L32 70" fill="none" stroke="' + S + '" stroke-width="0.9" opacity="0.5"/>' +
            '<path d="M32 20 L34.5 30 L44 32 L34.5 34 L32 44 L29.5 34 L20 32 L29.5 30 Z" fill="' + IC.cyan + '" stroke="' + IC.cyanD + '" stroke-width="0.9" stroke-linejoin="round"/>' +
            '<circle cx="32" cy="32" r="2.5" fill="' + IC.white + '" opacity="0.95"/>';

    /* 👑 8. Super client — Couronne 5 pointes + joyaux colorés */
    } else if (trophyId === 'super_client') {
        body =
            '<path d="M9 58 L14 20 L23 36 L32 12 L41 36 L50 20 L55 58 Z" fill="' + A + '" stroke="' + S + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' +
            '<path d="M9 58 L55 58" stroke="' + S + '" stroke-width="1.6" fill="none"/>' +
            '<rect x="9" y="58" width="46" height="9" rx="1.5" fill="' + A + '" stroke="' + S + '" stroke-width="' + sw + '"/>' +
            '<circle cx="14" cy="20" r="3.4" fill="' + IC.red + '" stroke="' + IC.redD + '" stroke-width="0.9"/>' +
            '<circle cx="32" cy="12" r="3.8" fill="' + IC.cyan + '" stroke="' + IC.cyanD + '" stroke-width="0.9"/>' +
            '<circle cx="50" cy="20" r="3.4" fill="' + IC.green + '" stroke="' + IC.greenD + '" stroke-width="0.9"/>' +
            '<circle cx="13" cy="19" r="1" fill="' + IC.white + '" opacity="0.9"/>' +
            '<circle cx="31" cy="11" r="1.2" fill="' + IC.white + '" opacity="0.9"/>' +
            '<circle cx="49" cy="19" r="1" fill="' + IC.white + '" opacity="0.9"/>' +
            '<circle cx="20" cy="62.5" r="2" fill="' + IC.red + '" stroke="' + IC.redD + '" stroke-width="0.5"/>' +
            '<circle cx="32" cy="62.5" r="2" fill="' + IC.gold + '" stroke="' + IC.goldD + '" stroke-width="0.5"/>' +
            '<circle cx="44" cy="62.5" r="2" fill="' + IC.cyan + '" stroke="' + IC.cyanD + '" stroke-width="0.5"/>';

    /* 💬 9. Donneur d'avis — Bulle + 3 étoiles dorées */
    } else if (trophyId === 'reviewer') {
        var st1 = _starPath(20, 32, 5.5, 2.4);
        var st2 = _starPath(32, 32, 5.5, 2.4);
        var st3 = _starPath(44, 32, 5.5, 2.4);
        body =
            '<path d="M8 12 L56 12 L56 50 L35 50 L32 68 L22 50 L8 50 Z" fill="' + A + '" stroke="' + S + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' +
            '<path d="M8 12 L56 12 L56 50 L35 50 L32 68 L22 50 L8 50 Z" fill="' + C + '"/>' +
            '<path d="M11 15 L53 15 L53 47 L33.5 47 L32 58 L24 47 L11 47 Z" fill="' + IC.cream + '" stroke="' + S + '" stroke-width="0.5" opacity="0.9"/>' +
            '<path d="' + st1 + '" fill="' + IC.gold + '" stroke="' + IC.goldD + '" stroke-width="0.7" stroke-linejoin="round"/>' +
            '<path d="' + st2 + '" fill="' + IC.gold + '" stroke="' + IC.goldD + '" stroke-width="0.7" stroke-linejoin="round"/>' +
            '<path d="' + st3 + '" fill="' + IC.gold + '" stroke="' + IC.goldD + '" stroke-width="0.7" stroke-linejoin="round"/>' +
            '<circle cx="20" cy="32" r="1.2" fill="' + IC.white + '" opacity="0.85"/>' +
            '<circle cx="32" cy="32" r="1.2" fill="' + IC.white + '" opacity="0.85"/>' +
            '<circle cx="44" cy="32" r="1.2" fill="' + IC.white + '" opacity="0.85"/>';

    /* 🏅 10. Critique confirmé — Médaille "A+" or avec rubans rouges */
    } else if (trophyId === 'critic') {
        body =
            '<path d="M17 6 L26 40 L32 32 L38 40 L47 6 Z" fill="' + IC.red + '" stroke="' + IC.redD + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' +
            '<path d="M22 6 L28 30" stroke="' + IC.redD + '" stroke-width="0.8" opacity="0.5" fill="none"/>' +
            '<path d="M42 6 L36 30" stroke="' + IC.redD + '" stroke-width="0.8" opacity="0.5" fill="none"/>' +
            '<circle cx="32" cy="47" r="23" fill="' + A + '" stroke="' + S + '" stroke-width="' + sw + '"/>' +
            '<circle cx="32" cy="47" r="23" fill="' + C + '"/>' +
            '<circle cx="32" cy="47" r="19" fill="' + IC.cream + '" stroke="' + S + '" stroke-width="1"/>' +
            '<text x="32" y="48" text-anchor="middle" font-family="Arial Black, Arial" font-size="15" font-weight="900" fill="' + IC.gold + '" stroke="' + IC.goldD + '" stroke-width="0.6">A+</text>' +
            '<text x="32" y="60" text-anchor="middle" font-family="Arial" font-size="6.5" font-weight="bold" letter-spacing="0.4" fill="' + S + '">CRITIC</text>';

    /* 🤝 11. Parrain — Bouclier + 2 personnes colorées */
    } else if (trophyId === 'sponsor') {
        body =
            '<path d="M32 5 L54 12 L54 40 C54 54 44 66 32 72 C20 66 10 54 10 40 L10 12 Z" fill="' + A + '" stroke="' + S + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' +
            '<path d="M32 5 L54 12 L54 40 C54 54 44 66 32 72 C20 66 10 54 10 40 L10 12 Z" fill="' + C + '"/>' +
            '<path d="M32 10 L50 15.5 L50 40 C50 51 42.5 61.5 32 67 C21.5 61.5 14 51 14 40 L14 15.5 Z" fill="' + IC.cream + '" stroke="' + S + '" stroke-width="0.8" opacity="0.9"/>' +
            '<circle cx="24" cy="28" r="4.8" fill="' + IC.skin + '" stroke="' + IC.skinD + '" stroke-width="0.9"/>' +
            '<path d="M14 50 C14 41 19 36 24 36 C29 36 34 41 34 50 Z" fill="' + IC.blue + '" stroke="' + IC.blueD + '" stroke-width="0.9"/>' +
            '<circle cx="40" cy="28" r="4.8" fill="' + IC.skin + '" stroke="' + IC.skinD + '" stroke-width="0.9"/>' +
            '<path d="M30 50 C30 41 35 36 40 36 C45 36 50 41 50 50 Z" fill="' + IC.green + '" stroke="' + IC.greenD + '" stroke-width="0.9"/>';

    /* 👥 12. Super parrain — Hexagone + 3 personnes multicolores */
    } else if (trophyId === 'super_sponsor') {
        body =
            '<path d="M32 4 L56 18 L56 46 L32 62 L8 46 L8 18 Z" fill="' + A + '" stroke="' + S + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' +
            '<path d="M32 4 L56 18 L56 46 L32 62 L8 46 L8 18 Z" fill="' + C + '"/>' +
            '<path d="M32 8 L52 20 L52 44 L32 57 L12 44 L12 20 Z" fill="' + IC.cream + '" opacity="0.55"/>' +
            '<circle cx="20" cy="24" r="4.3" fill="' + IC.skin + '" stroke="' + IC.skinD + '" stroke-width="0.8"/>' +
            '<circle cx="32" cy="20" r="4.3" fill="' + IC.skin + '" stroke="' + IC.skinD + '" stroke-width="0.8"/>' +
            '<circle cx="44" cy="24" r="4.3" fill="' + IC.skin + '" stroke="' + IC.skinD + '" stroke-width="0.8"/>' +
            '<path d="M12 44 C12 36 16 32 20 32 C24 32 28 36 28 44 Z" fill="' + IC.red + '" stroke="' + IC.redD + '" stroke-width="0.8"/>' +
            '<path d="M24 44 C24 34 28 30 32 30 C36 30 40 34 40 44 Z" fill="' + IC.blue + '" stroke="' + IC.blueD + '" stroke-width="0.8"/>' +
            '<path d="M36 44 C36 36 40 32 44 32 C48 32 52 36 52 44 Z" fill="' + IC.green + '" stroke="' + IC.greenD + '" stroke-width="0.8"/>';

    /* 👑 13. Ambassadeur — Couronne ornée + joyaux précieux */
    } else if (trophyId === 'ambassador') {
        var topStar = _starPath(32, 10, 5, 2.2, 5, -Math.PI/2);
        body =
            '<path d="M7 58 L11 18 L22 34 L32 8 L42 34 L53 18 L57 58 Z" fill="' + A + '" stroke="' + S + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' +
            '<rect x="7" y="58" width="50" height="10" rx="1.5" fill="' + A + '" stroke="' + S + '" stroke-width="' + sw + '"/>' +
            '<path d="' + topStar + '" fill="' + IC.gold + '" stroke="' + IC.goldD + '" stroke-width="0.9" stroke-linejoin="round"/>' +
            '<circle cx="11" cy="18" r="3.3" fill="' + IC.red + '" stroke="' + IC.redD + '" stroke-width="0.9"/>' +
            '<circle cx="53" cy="18" r="3.3" fill="' + IC.cyan + '" stroke="' + IC.cyanD + '" stroke-width="0.9"/>' +
            '<circle cx="10" cy="17" r="1" fill="' + IC.white + '" opacity="0.9"/>' +
            '<circle cx="52" cy="17" r="1" fill="' + IC.white + '" opacity="0.9"/>' +
            '<circle cx="18" cy="63" r="2.3" fill="' + IC.red + '" stroke="' + IC.redD + '" stroke-width="0.5"/>' +
            '<circle cx="32" cy="63" r="2.6" fill="' + IC.cyan + '" stroke="' + IC.cyanD + '" stroke-width="0.5"/>' +
            '<circle cx="46" cy="63" r="2.3" fill="' + IC.green + '" stroke="' + IC.greenD + '" stroke-width="0.5"/>' +
            '<path d="M10 36 Q15 42 10 48" fill="none" stroke="' + S + '" stroke-width="0.9" opacity="0.5"/>' +
            '<path d="M54 36 Q49 42 54 48" fill="none" stroke="' + S + '" stroke-width="0.9" opacity="0.5"/>';

    /* ⚡ 14. Membre actif — Éclair jaune éclatant */
    } else if (trophyId === 'active') {
        body =
            '<path d="M32 4 C50 4 60 18 60 34 C60 50 46 63 32 72 C18 63 4 50 4 34 C4 18 14 4 32 4 Z" fill="' + A + '" stroke="' + S + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' +
            '<path d="M32 4 C50 4 60 18 60 34 C60 50 46 63 32 72 C18 63 4 50 4 34 C4 18 14 4 32 4 Z" fill="' + C + '"/>' +
            '<path d="M37 11 L18 40 L30 40 L26 64 L47 32 L34 32 Z" fill="' + IC.gold + '" stroke="' + IC.goldD + '" stroke-width="1.5" stroke-linejoin="round"/>' +
            '<path d="M35 15 L22 36 L30 36 L27 56 L42 34 L33 34 Z" fill="' + IC.goldL + '" opacity="0.55"/>';

    /* Fallback générique */
    } else {
        var fb = _starPath(32, 38, 20, 8, 5);
        body =
            '<circle cx="32" cy="38" r="24" fill="' + A + '" stroke="' + S + '" stroke-width="' + sw + '"/>' +
            '<circle cx="32" cy="38" r="19" fill="' + IC.cream + '"/>' +
            '<path d="' + fb + '" fill="' + IC.gold + '" stroke="' + IC.goldD + '" stroke-width="1.2"/>';
    }

    return '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        defs + body + '</svg>';
}

function updateBuyerTrophyActivity(){
    var d=new Date(), key=d.getFullYear()+'-W'+Math.ceil((((d-new Date(d.getFullYear(),0,1))/86400000)+new Date(d.getFullYear(),0,1).getDay()+1)/7);
    buyerTrophyWeeks[key]=true;
}
function renderBuyerTrophies(){
    getBuyerTrophyStats();
    var grid=document.getElementById('buyer-trophies-grid'); if(!grid)return;
    var unlocked=0, html='';
    BUYER_TROPHIES.forEach(function(t){
        var value=Math.min(t.target,buyerTrophyStats[t.stat]||0), done=value>=t.target;
        if(done){unlocked++;buyerTrophyUnlocked[t.id]=true;}
        var pct=Math.round((value/t.target)*100), tierLabel=t.tier==='diamond'?'Diamant':t.tier==='platinum'?'Platine':t.tier==='gold'?'Or':t.tier==='silver'?'Argent':'Bronze';
        html+='<div class="trophy-card '+(done?'unlocked':'locked')+'"><div class="trophy-medal">'+trophySvg(t.id,t.tier,!done)+'</div><div class="flex-1 min-w-0"><div class="flex items-start justify-between gap-2"><div><h3 class="font-extrabold text-gray-800 text-sm">'+t.name+'</h3><p class="text-[11px] text-gray-500 mt-0.5 leading-snug">'+t.desc+'</p></div><span class="trophy-badge '+(done?'done':'lock')+'">'+(done?'Débloqué':tierLabel)+'</span></div><div class="mt-3"><div class="flex justify-between text-[10px] text-gray-500 mb-1"><span>Progression</span><strong>'+value+' / '+t.target+'</strong></div><div class="trophy-progress"><div style="width:'+pct+'%"></div></div></div></div></div>';
    });
    grid.innerHTML=html;
    var uc=document.getElementById('trophy-unlocked-count');if(uc)uc.textContent=unlocked;
    var sum=document.getElementById('buyer-trophy-summary');if(sum)sum.textContent=unlocked+' / '+BUYER_TROPHIES.length+' trophées débloqués';
    var hero=document.getElementById('trophy-hero-medal');
    if(hero)hero.innerHTML=trophySvg(unlocked===BUYER_TROPHIES.length?'ambassador':'loyal',unlocked>=10?'gold':unlocked>=5?'silver':'bronze',false);
}
function openBuyerTrophies(){ updateBuyerTrophyActivity(); saveState(); showScreen('buyer-trophies-screen'); renderBuyerTrophies(); }
function refreshBuyerTrophies(){ updateBuyerTrophyActivity(); renderBuyerTrophies(); saveState(); }
function loadBuyerTrophyState(s){ if(s && s.buyerTrophyWeeks) buyerTrophyWeeks=s.buyerTrophyWeeks; if(s && s.buyerTrophyUnlocked) buyerTrophyUnlocked=s.buyerTrophyUnlocked; if(s && s.buyerTrophyViewedProducts) buyerTrophyViewedProducts=s.buyerTrophyViewedProducts; }

/* =========================================================
   PERSISTANCE
   ========================================================= */
function buildStateObject() {
    return {
        cart: cart, selectedDelivery: selectedDelivery, selectedPayment: selectedPayment,
        userPhone: userPhone, userName: userName, userPass: userPass, userEmail: userEmail,
        hasBuyerAccount: hasBuyerAccount, buyerAvatar: buyerAvatar,
        myShop: myShop, isSeller: isSeller,
        followedShops: followedShops, buyerOrders: buyerOrders, sellerOrders: sellerOrders,
        conversations: conversations, favoriteProducts: favoriteProducts,
        buyerReferrals: buyerReferrals,
        whatsappConnected: whatsappConnected, whatsappNumber: whatsappNumber,
        darkMode: darkMode, notificationsOn: notificationsOn,
        shopsCatalog: shopsCatalog, reports: reports,
        hasAcceptedTerms: hasAcceptedTerms,
        notifications: notifications, searchHistory: searchHistory,
        recentlyViewed: recentlyViewed,
        buyerWallet: buyerWallet,
        buyerTrophyWeeks: buyerTrophyWeeks, buyerTrophyUnlocked: buyerTrophyUnlocked, buyerTrophyViewedProducts: buyerTrophyViewedProducts
    };
}
function saveState() {
    if (!isLocalStorageAvailable()) return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(buildStateObject()));
    } catch (e) {
        try {
            var light = buildStateObject();
            if (light.myShop) light.myShop.products.forEach(function(p){ p.image = ''; p.images = []; });
            if (light.shopsCatalog) light.shopsCatalog.forEach(function(s){ (s.products||[]).forEach(function(p){ p.image = ''; p.images = []; }); });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(light));
        } catch (e2) { console.warn('saveState:', e2); }
    }
}
function _migrateConversations() {
    for (var i = 0; i < conversations.length; i++) {
        var cv = conversations[i];
        if (typeof cv.unreadSeller === 'undefined') cv.unreadSeller = 0;
        if (typeof cv.unreadBuyer === 'undefined') cv.unreadBuyer = 0;
        if (!cv.messages) cv.messages = [];
    }
}
function _migrateProduct(p, shopCategory) {
    if (!p.images || p.images.length === 0) p.images = p.image ? [p.image] : [];
    if (typeof p.hasDelivery === 'undefined') p.hasDelivery = true;
    if (typeof p.hasWarranty === 'undefined') p.hasWarranty = false;
    if (typeof p.warrantyText === 'undefined') p.warrantyText = '';
    if (typeof p.stock === 'undefined') p.stock = 0;
    if (typeof p.category === 'undefined') p.category = shopCategory;
    if (typeof p.addedAt === 'undefined') p.addedAt = Date.now();
    if (typeof p.boostedUntil === 'undefined') p.boostedUntil = 0;
}
function loadState() {
    if (!isLocalStorageAvailable()) return false;
    try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        var s = JSON.parse(raw);
        if (s.cart) cart = s.cart;
        if (s.selectedDelivery) selectedDelivery = s.selectedDelivery;
        if (s.selectedPayment) selectedPayment = s.selectedPayment;
        if (s.userPhone) userPhone = s.userPhone;
        if (s.userName) userName = s.userName;
        if (s.userPass) userPass = s.userPass;
        if (s.userEmail) userEmail = s.userEmail;
        if (typeof s.hasBuyerAccount === 'boolean') hasBuyerAccount = s.hasBuyerAccount;
        if (s.buyerAvatar !== undefined) buyerAvatar = s.buyerAvatar;
        if (s.myShop !== undefined) myShop = s.myShop;
        if (myShop && typeof myShop.isGoldenCertified === 'undefined') myShop.isGoldenCertified = false;
        if (myShop && !myShop.subscribers) myShop.subscribers = [];
        if (typeof s.isSeller === 'boolean') isSeller = s.isSeller;
        if (s.followedShops) followedShops = s.followedShops;
        if (s.buyerOrders) buyerOrders = s.buyerOrders;
        if (s.sellerOrders) sellerOrders = s.sellerOrders;
        if (s.conversations) { conversations = s.conversations; _migrateConversations(); }
        if (s.favoriteProducts) favoriteProducts = s.favoriteProducts;
        if (s.buyerReferrals) buyerReferrals = s.buyerReferrals;
        if (typeof s.whatsappConnected === 'boolean') whatsappConnected = s.whatsappConnected;
        if (s.whatsappNumber) whatsappNumber = s.whatsappNumber;
        if (typeof s.darkMode === 'boolean') darkMode = s.darkMode;
        if (typeof s.notificationsOn === 'boolean') notificationsOn = s.notificationsOn;
        if (s.shopsCatalog) shopsCatalog = s.shopsCatalog;
        if (s.reports) reports = s.reports;
        if (typeof s.hasAcceptedTerms === 'boolean') hasAcceptedTerms = s.hasAcceptedTerms;
        if (s.notifications) notifications = s.notifications;
        if (s.searchHistory) searchHistory = s.searchHistory;
        if (s.recentlyViewed) recentlyViewed = s.recentlyViewed;
        loadBuyerTrophyState(s);
        if (s.buyerWallet) {
            buyerWallet = s.buyerWallet;
            if (typeof buyerWallet.balance === 'undefined') buyerWallet.balance = 0;
            if (typeof buyerWallet.escrow === 'undefined') buyerWallet.escrow = 0;
            if (typeof buyerWallet.totalSpent === 'undefined') buyerWallet.totalSpent = 0;
            if (typeof buyerWallet.totalRefunded === 'undefined') buyerWallet.totalRefunded = 0;
            if (!buyerWallet.transactions) buyerWallet.transactions = [];
        }
        shopsCatalog.forEach(function(shop) {
            if (typeof shop.sixStarPoints === 'undefined') shop.sixStarPoints = shop.isCertified ? 1000 : 0;
            if (typeof shop.isGoldenCertified === 'undefined') shop.isGoldenCertified = false;
            if (!shop.subscribers) shop.subscribers = [];
            (shop.products || []).forEach(function(p) { _migrateProduct(p, shop.category); });
        });
        if (myShop) {
            if (!myShop.wallet) myShop.wallet = { balance: 0, pending: 0, transactions: [] };
            if (typeof myShop.wallet.pending === 'undefined') myShop.wallet.pending = 0;
            if (typeof myShop.sixStarPoints === 'undefined') myShop.sixStarPoints = 0;
            (myShop.products || []).forEach(function(p) { _migrateProduct(p, myShop.category); });
        }
        buyerOrders.forEach(function(o) { _migrateOrder(o); });
        sellerOrders.forEach(function(o) { _migrateOrder(o); });
        _normalizeCartItems();
        return true;
    } catch (e) { console.warn('loadState:', e); return false; }
}
function _migrateOrder(o) {
    if (o.status === 'En cours') o.status = ORDER_STATUS.PAID;
    if (o.status === 'Livree') o.status = ORDER_STATUS.COMPLETED;
    if (o.status === 'Annulee') o.status = ORDER_STATUS.CANCELLED;
    if (!o.status) o.status = ORDER_STATUS.PAID;
    if (typeof o.trackingNumber === 'undefined') o.trackingNumber = '';
    if (typeof o.createdAt === 'undefined') o.createdAt = Date.now();
    if (typeof o.escrowStatus === 'undefined') o.escrowStatus = 'held';
    if (typeof o.buyerConfirmed === 'undefined') o.buyerConfirmed = false;
    if (typeof o.sellerConfirmed === 'undefined') o.sellerConfirmed = false;
    if (typeof o.paymentMethod === 'undefined') o.paymentMethod = 'mobile';
    if (typeof o.disputed === 'undefined') o.disputed = false;
    if (typeof o.disputeReason === 'undefined') o.disputeReason = '';
    if (typeof o.autoConfirmAt === 'undefined') o.autoConfirmAt = Date.now() + (7 * 24 * 60 * 60 * 1000);
    if (typeof o.sellerAcceptedOrder === 'undefined') {
        o.sellerAcceptedOrder = (o.status && o.status !== ORDER_STATUS.PAID && o.status !== ORDER_STATUS.PENDING_PAYMENT);
    }
    if (!o.timeline) o.timeline = [{ step: 'created', label: 'Commande créée', at: o.date || '' }];
}
function resetAllData() {
    gmConfirm('Réinitialiser toute l\'application ?', 'Attention', { danger: true, confirmText: 'Continuer' })
    .then(function(ok) {
        if (!ok) return;
        return gmConfirm('Cette action est irréversible. Confirmer ?', 'Confirmation finale', { danger: true, confirmText: 'Tout effacer' });
    })
    .then(function(ok2) {
        if (!ok2) return;
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
        location.reload();
    });
}

/* =========================================================
   INITIALISATION
   ========================================================= */
window.addEventListener('DOMContentLoaded', function() {
    var termsBody = document.getElementById('terms-body-content');
    var termsStatic = document.getElementById('terms-static-body');
    if (termsBody && termsStatic && !termsStatic.innerHTML.trim()) termsStatic.innerHTML = termsBody.innerHTML;

    renderCategoryButtons('category-buttons', 'selectCategory');
    renderProductCategorySelect();

    var loaded = loadState();
    if (myShop) {
        if (typeof myShop.isGoldenCertified === 'undefined') myShop.isGoldenCertified = false;
        if (!myShop.subscribers) myShop.subscribers = [];
        syncMyShopToCatalog();
    }

    if (darkMode) {
        var ac = document.getElementById('app-container');
        if (ac) ac.classList.add('dark');
        document.body.classList.add('dark-body');
        var tog = document.getElementById('dark-toggle'), knob = document.getElementById('dark-knob');
        if (tog) tog.className = 'w-12 h-6 rounded-full bg-blue-500 relative';
        if (knob) knob.style.transform = 'translateX(24px)';
    }
    if (!notificationsOn) {
        var nt = document.getElementById('notif-toggle'), nk = document.getElementById('notif-knob');
        if (nt) nt.className = 'w-12 h-6 rounded-full bg-gray-300 relative';
        if (nk) nk.style.transform = 'translateX(-24px)';
    }
    updateCartUI(); detectLocation();
    renderHomeLogos(); renderCategoriesStrip(); renderRecentlyViewed(); renderProductsFeed();
    updateNotificationsBadge(); updateMessageBadges();
    cleanExpiredReceipts(); checkAutoConfirmOrders();
    GM.init();
    setInterval(function () { if (!document.hidden) GM.loadCatalog().catch(function () {}); }, 60000);

    setInterval(checkAutoConfirmOrders, 60000);
    setInterval(updateMessageBadges, 5000);

    window.addEventListener('popstate', function(e) {
        if (e.state && e.state.screen) {
            var cur = document.querySelector('.screen:not(.hidden)');
            if (cur && cur.id !== e.state.screen) {
                _noHistoryPush = true;
                showScreen(e.state.screen);
                _noHistoryPush = false;
            }
        }
    });
    try { history.replaceState({ screen: 'splash-screen' }, '', '#splash-screen'); } catch(e) {}

    var deepLinkHandled = false;
    if (loaded) deepLinkHandled = handleShopDeepLink();

    if (!deepLinkHandled) {
        if (loaded && (hasBuyerAccount || myShop)) {
            if (isSeller && myShop) { applyShopToDashboard(); showScreen('seller-dashboard-screen'); }
            else if (hasBuyerAccount) showScreen('home-screen');
            else showScreen('role-screen');
        } else {
            showScreen('splash-screen');
        }
    }
});