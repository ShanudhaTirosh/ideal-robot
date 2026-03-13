/* ============================================================
   UTILS.JS — Restaurant Pro shared utilities
   ============================================================ */

// ─── Theme ────────────────────────────────────────────────
const ThemeManager = {
  get()       { return document.documentElement.getAttribute('data-theme') || 'dark'; },
  toggle()    { this.set(this.get() === 'dark' ? 'light' : 'dark'); },
  set(theme)  {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rms_theme', theme);
    const user = firebase.auth().currentUser;
    if (user) db.collection(C.USERS).doc(user.uid).update({'preferences.theme': theme}).catch(()=>{});
    const ic = document.getElementById('themeIcon');
    if (ic) ic.textContent = theme === 'dark' ? '☀️' : '🌙';
  },
  load(saved) {
    const t = saved || localStorage.getItem('rms_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
    const ic = document.getElementById('themeIcon');
    if (ic) ic.textContent = t === 'dark' ? '☀️' : '🌙';
  }
};

// ─── Toast ─────────────────────────────────────────────────
const Toast = {
  _wrap: null,
  _init() {
    if (!this._wrap) {
      this._wrap = document.createElement('div');
      this._wrap.className = 'toast-wrap';
      document.body.appendChild(this._wrap);
    }
  },
  show(msg, type = 'info', dur = 3400) {
    this._init();
    const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
    const el = document.createElement('div');
    el.className = `toast-item ${type}`;
    el.innerHTML =
      `<span style="font-size:17px;flex-shrink:0">${icons[type]||'•'}</span>` +
      `<span style="flex:1;font-size:13px">${msg}</span>` +
      `<span onclick="this.parentElement.remove()" style="cursor:pointer;color:var(--text-3);font-size:16px;flex-shrink:0">✕</span>`;
    this._wrap.appendChild(el);
    setTimeout(() => {
      el.style.cssText = 'opacity:0;transform:translateX(110%);transition:all .22s ease';
      setTimeout(() => el.remove(), 230);
    }, dur);
  },
  success: (m, d) => Toast.show(m, 'success', d),
  error:   (m, d) => Toast.show(m, 'error',   d),
  info:    (m, d) => Toast.show(m, 'info',    d),
  warning: (m, d) => Toast.show(m, 'warning', d),
};

// ─── Loader ────────────────────────────────────────────────
const Loader = {
  show() {
    const el = document.getElementById('pageLoader');
    if (el) el.style.display = 'flex';
  },
  hide() {
    const el = document.getElementById('pageLoader');
    if (el) el.style.display = 'none';
  }
};

// ─── Confirm Dialog ─────────────────────────────────────────
function confirmDialog(msg, onOk, onCancel) {
  const modal = document.getElementById('confirmModal');
  if (!modal) { if (window.confirm(msg)) onOk(); return; }
  document.getElementById('confirmMsg').textContent = msg;
  const bsM = new bootstrap.Modal(modal);
  bsM.show();
  document.getElementById('confirmOkBtn').onclick = () => { bsM.hide(); onOk(); };
  const cancelBtn = document.getElementById('confirmCancelBtn');
  if (cancelBtn) cancelBtn.onclick = () => { bsM.hide(); if (onCancel) onCancel(); };
}

// ─── Formatters ────────────────────────────────────────────
const fmt = {
  currency(v, sym) {
    const s = sym || localStorage.getItem('rms_currency') || '₨';
    return `${s}${Number(v || 0).toFixed(2)}`;
  },
  date(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  },
  time(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
  },
  datetime(ts) { return `${this.date(ts)} ${this.time(ts)}`; },
  orderNum(n)  { return `#${String(n || 0).padStart(4,'0')}`; }
};

// ─── Status Chip ───────────────────────────────────────────
function statusChip(status) {
  const map = {
    // Table statuses
    'Available':    'ch-green',
    'Occupied':     'ch-red',
    'Reserved':     'ch-yellow',
    'Cleaning':     'ch-blue',
    // Order statuses
    'Pending':      'ch-yellow',
    'Cooking':      'ch-blue',
    'Ready':        'ch-purple',
    'Served':       'ch-green',
    'Paid':         'ch-green',
    'Unpaid':       'ch-red',
    'Cancelled':    'ch-muted',
    // Order types
    'Table Order':  'ch-teal',
    'Takeaway':     'ch-blue',
    'Pre-order':    'ch-purple',
    // Areas
    'Dining':       'ch-blue',
    'Pool Area':    'ch-teal',
    'Bar':          'ch-orange',
    'VIP Room':     'ch-purple',
    // User roles  ← Bug 6 fix
    'Admin':        'ch-red',
    'Manager':      'ch-purple',
    'Staff':        'ch-blue',
    'Kitchen':      'ch-orange',
  };
  return `<span class="chip ${map[status] || 'ch-muted'}">${escHtml(status)}</span>`;
}

function areaChip(area) {
  const map = {
    'Dining':   'ch-blue',
    'Pool Area':'ch-teal',
    'Bar':      'ch-orange',
    'VIP Room': 'ch-purple',
    'Takeaway': 'ch-green',
  };
  return `<span class="chip ${map[area] || 'ch-muted'}">${area}</span>`;
}

// ─── Auth Guard ─────────────────────────────────────────────
function requireAuth(cb) {
  firebase.auth().onAuthStateChanged(user => {
    if (!user) { window.location.href = 'index.html'; return; }
    cb(user);
  });
}

// ─── Toggle sidebar ─────────────────────────────────────────
function toggleSidebar() {
  const sb = document.getElementById('appSidebar');
  if (!sb) return;
  if (window.innerWidth <= 768) {
    sb.classList.toggle('open');
  } else {
    sb.classList.toggle('collapsed');
  }
}

// ─── Set active nav link ────────────────────────────────────
function setActiveNav() {
  const page = location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-item').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === page);
  });
}

// ─── Build Sidebar HTML ────────────────────────────────────
function buildSidebar(uid) {
  const sb = document.getElementById('appSidebar');
  if (!sb) return;

  const logo  = localStorage.getItem('rms_logo')  || '';
  const rname = localStorage.getItem('rms_rname') || 'Restaurant Pro';

  sb.innerHTML = `
    <div class="sidebar-brand">
      <div class="brand-logo">${logo ? `<img src="${logo}" alt="logo">` : '🍽️'}</div>
      <div class="brand-text">
        <div class="brand-name">${escHtml(rname)}</div>
        <div class="brand-sub">Management System</div>
      </div>
    </div>

    <div class="nav-section">
      <div class="nav-label">Main</div>
      <a class="nav-item" href="dashboard.html"><span class="nav-icon">📊</span><span>Dashboard</span></a>
      <a class="nav-item" href="tables.html">  <span class="nav-icon">🪑</span><span>Tables</span></a>
      <a class="nav-item" href="orders.html">  <span class="nav-icon">🛒</span><span>Orders</span>
        <span class="nav-badge" id="pendingBadge" style="display:none">0</span>
      </a>
      <a class="nav-item" href="kitchen.html"> <span class="nav-icon">👨‍🍳</span><span>Kitchen</span></a>
    </div>

    <div class="nav-section">
      <div class="nav-label">Management</div>
      <a class="nav-item" href="menu.html">    <span class="nav-icon">🍕</span><span>Menu</span></a>
      <a class="nav-item" href="billing.html"> <span class="nav-icon">💳</span><span>Billing</span></a>
      <a class="nav-item" href="history.html"> <span class="nav-icon">📜</span><span>History</span></a>
    </div>

    <div class="nav-section">
      <div class="nav-label">Account</div>
      <a class="nav-item" href="profile.html"> <span class="nav-icon">👤</span><span>Profile</span></a>
    </div>

    <div class="sidebar-footer">
      <div class="user-pill" onclick="window.location='profile.html'">
        <div class="user-av" id="sidebarAv">?</div>
        <div>
          <div class="user-name" id="sidebarName">Loading…</div>
          <div class="user-role" id="sidebarRole">—</div>
        </div>
      </div>
    </div>`;

  setActiveNav();

  // Live order badge
  db.collection(C.ORDERS)
    .where('status', 'in', ['Pending','Cooking'])
    .onSnapshot(snap => {
      const badge = document.getElementById('pendingBadge');
      if (badge) { badge.textContent = snap.size; badge.style.display = snap.size > 0 ? '' : 'none'; }
    }, () => {});
}

// ─── Build Topbar HTML ────────────────────────────────────
function buildTopbar(title, sub) {
  const tb = document.getElementById('appTopbar');
  if (!tb) return;
  tb.innerHTML = `
    <button class="icon-btn" onclick="toggleSidebar()" style="flex-shrink:0">☰</button>
    <div style="flex-shrink:0">
      <div class="topbar-title">${escHtml(title)}</div>
      ${sub ? `<div class="topbar-sub">${escHtml(sub)}</div>` : ''}
    </div>
    <div class="topbar-space"></div>
    <div class="topbar-search">
      <span class="si">🔍</span>
      <input type="text" placeholder="Search…" id="gSearch" autocomplete="off">
    </div>
    <button class="icon-btn" onclick="ThemeManager.toggle()" title="Toggle theme">
      <span id="themeIcon">${ThemeManager.get() === 'dark' ? '☀️' : '🌙'}</span>
    </button>
    <button class="icon-btn" onclick="auth.signOut().then(()=>location.href='index.html')" title="Sign out">🚪</button>`;
}

// ─── Load sidebar user info ───────────────────────────────
async function loadSidebarUser(user) {
  try {
    const doc  = await db.collection(C.USERS).doc(user.uid).get();
    const data = doc.data() || {};
    const name = data.displayName || user.displayName || user.email.split('@')[0];
    const role = data.role || 'Staff';
    const av   = document.getElementById('sidebarAv');
    const nm   = document.getElementById('sidebarName');
    const rl   = document.getElementById('sidebarRole');
    if (av) {
      if (data.photoURL) av.innerHTML = `<img src="${data.photoURL}" alt="">`;
      else av.textContent = name.charAt(0).toUpperCase();
    }
    if (nm) nm.textContent = name;
    if (rl) rl.textContent = role;

    // Load theme & prefs
    const prefs = data.preferences || {};
    ThemeManager.load(prefs.theme);
    if (prefs.currency)  localStorage.setItem('rms_currency', prefs.currency);
    if (prefs.taxRate != null) localStorage.setItem('rms_taxrate', String(prefs.taxRate));

    // Bug 2 fix: restaurantName is saved at ROOT level by saveBranding;
    // also fall back to preferences.restaurantName for older documents.
    const rname = data.restaurantName || prefs.restaurantName;
    if (rname) localStorage.setItem('rms_rname', rname);

    if (data.logoURL) localStorage.setItem('rms_logo', data.logoURL);
  } catch {}
}

// ─── Log Activity ─────────────────────────────────────────
async function logActivity(action, details = {}) {
  const user = firebase.auth().currentUser;
  if (!user) return;
  try {
    await db.collection(C.ACTIVITY).add({
      uid: user.uid, action, details,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch {}
}

// ─── Tax Rate ─────────────────────────────────────────────
function getTaxRate() {
  return parseFloat(localStorage.getItem('rms_taxrate') || '8') / 100;
}
function calcTotals(subtotal) {
  const tax   = subtotal * getTaxRate();
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

// ─── Safe HTML escape ─────────────────────────────────────
function escHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Greeting ─────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

// ─── CSV Download ─────────────────────────────────────────
function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = filename;
  a.click();
  Toast.success('Exported!');
}

// ─── Confirm Modal HTML ───────────────────────────────────
function confirmModalHTML() {
  return `
  <div class="modal modal-c fade" id="confirmModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content">
        <div class="modal-body" style="padding:26px;text-align:center">
          <div style="font-size:34px;margin-bottom:12px">⚠️</div>
          <div id="confirmMsg" style="font-size:13.5px;color:var(--text-2);margin-bottom:20px">Are you sure?</div>
          <div style="display:flex;gap:8px">
            <button class="btn-g" id="confirmCancelBtn" data-bs-dismiss="modal" style="flex:1">Cancel</button>
            <button class="btn-d" id="confirmOkBtn" style="flex:1">Confirm</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ─── Load image into element from Firestore image ID ──────
// imageId = Firestore doc ID stored on the menu item or user
function loadMongoImage(el, imageId, fallbackEmoji) {
  ImageService.loadInto(imageId, el, fallbackEmoji || '🍽️');
}
