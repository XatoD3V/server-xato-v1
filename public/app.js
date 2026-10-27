const $ = (s) => document.querySelector(s);

// Iconos vectoriales (estilo Lucide, trazo uniforme)
const ICONS = {
  bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
  server: '<rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>',
  qr: '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  loader: '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>',
};
const icon = (name, size = 18, cls = '') =>
  `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
const paintIcons = (root = document) =>
  root.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon, Number(el.dataset.size) || 18); });
paintIcons();

let adminToken = sessionStorage.getItem('xato_admin') || null;
let pollTimer = null;

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (adminToken && path.startsWith('/api/admin')) headers.Authorization = `Bearer ${adminToken}`;
  const res = await fetch(path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && path.startsWith('/api/admin') && !path.endsWith('/login')) setAdmin(null);
    throw new Error(data.error || 'Error de conexion');
  }
  return data;
}

function showMsg(el, text, ok = false) {
  el.textContent = text;
  el.classList.toggle('ok', ok);
  el.classList.remove('hidden');
}

/* ---------- Servidores ---------- */
async function loadServers() {
  try {
    const list = await api('/api/capacity');
    $('#servers').innerHTML = list.map((s) => {
      const slots = Array.from({ length: s.max }, (_, i) => `<span class="slot ${i < s.used ? 'on' : ''}"></span>`).join('');
      return `
        <article class="card server">
          <div class="server-top">
            <span class="icon-box">${icon('server', 18)}</span>
            <div><div class="server-name">Servidor ${String(s.id).padStart(2, '0')}</div>
            <div class="muted">${s.online ? 'En linea' : 'Fuera de linea'}</div></div>
            <span class="dot ${s.online ? '' : 'off'}"></span>
          </div>
          <div class="slots">${slots}</div>
          <div class="server-foot"><span>Registros</span><span><b>${s.used}</b> / ${s.max}</span></div>
        </article>`;
    }).join('');
  } catch { /* se reintenta */ }
}

/* ---------- Registro y QR ---------- */
const modal = $('#qrModal');
const closeQr = () => { clearInterval(pollTimer); modal.classList.add('hidden'); loadServers(); if (adminToken) loadAdmin(); };
$('#qrClose').onclick = closeQr;
modal.addEventListener('click', (e) => { if (e.target === modal) closeQr(); });

function renderQr(state) {
  const body = $('#qrBody');
  if (state.kind === 'qr') {
    body.innerHTML = `
      <div class="qr-title">Escanea para vincular a Xato Ds</div>
      <div class="qr-box">${state.qr ? `<img src="${state.qr}" alt="Codigo QR">` : icon('loader', 32, 'spin')}</div>
      <p class="steps">Abre WhatsApp en tu telefono<br><b>Ajustes &gt; Dispositivos vinculados &gt; Vincular un dispositivo</b></p>
      <div class="pill"><span class="badge esperando_qr">Esperando escaneo &middot; Servidor ${String(state.server).padStart(2, '0')}</span></div>`;
  } else if (state.kind === 'ok') {
    body.innerHTML = `
      <div class="success"><div class="big">${icon('check', 30)}</div>
      <h2>Xato Ds vinculado</h2>
      <p class="muted" style="margin-top:.4rem">El numero ${state.number} ya esta activo. Escribe <b>!menu</b> en WhatsApp.</p></div>
      <button class="btn primary full" id="qrDone">Listo</button>`;
    $('#qrDone').onclick = closeQr;
  } else {
    body.innerHTML = `
      <div class="success"><h2>${state.title}</h2><p class="muted" style="margin-top:.4rem">${state.text}</p></div>
      <button class="btn full" id="qrDone">Cerrar</button>`;
    $('#qrDone').onclick = closeQr;
  }
}

$('#registerBtn').onclick = async () => {
  const msg = $('#formMsg');
  msg.classList.add('hidden');
  const number = $('#number').value.replace(/\D/g, '');
  if (!/^\d{8,15}$/.test(number)) return showMsg(msg, 'Ingresa un numero valido con codigo de pais, sin +.');

  const btn = $('#registerBtn');
  btn.disabled = true;
  try {
    const r = await api('/api/register', { method: 'POST', body: JSON.stringify({ number }) });
    modal.classList.remove('hidden');
    renderQr({ kind: 'qr', qr: r.qr, server: r.server });
    $('#number').value = '';

    clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
      try {
        const s = await api(`/api/session/${r.number}?ticket=${r.ticket}`);
        if (s.status === 'conectado') { clearInterval(pollTimer); renderQr({ kind: 'ok', number: r.number }); loadServers(); }
        else renderQr({ kind: 'qr', qr: s.qr, server: r.server });
      } catch (e) {
        clearInterval(pollTimer);
        renderQr({ kind: 'err', title: 'Registro expirado', text: 'El QR no se escaneo a tiempo y el cupo fue liberado. Genera uno nuevo.' });
        loadServers();
      }
    }, 2500);
  } catch (e) {
    showMsg(msg, e.message);
  } finally {
    btn.disabled = false;
    loadServers();
  }
};
$('#number').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#registerBtn').click(); });

/* ---------- Administrador ---------- */
function setAdmin(token) {
  adminToken = token;
  token ? sessionStorage.setItem('xato_admin', token) : sessionStorage.removeItem('xato_admin');
  $('#adminPanel').classList.toggle('hidden', !token);
  $('#adminBadge').classList.toggle('hidden', !token);
  $('#adminBtnText').textContent = token ? 'Salir' : 'Admin';
  $('#adminBtn').querySelector('[data-icon]').innerHTML = icon(token ? 'logout' : 'shield', 16);
  if (token) loadAdmin();
}

async function loadAdmin() {
  try {
    const rows = await api('/api/admin/sessions');
    $('#adminEmpty').classList.toggle('hidden', rows.length > 0);
    $('#adminRows').innerHTML = rows.map((r) => `
      <tr>
        <td>Servidor ${String(r.server).padStart(2, '0')}</td>
        <td>+${r.number}</td>
        <td><span class="badge ${r.status}">${r.status.replace('_', ' ')}</span></td>
        <td><button class="btn danger small" data-del="${r.number}">${icon('trash', 15)}<span>Eliminar</span></button></td>
      </tr>`).join('');
  } catch { /* 401 ya limpia el estado */ }
}

$('#adminRows').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-del]');
  if (!btn) return;
  if (!btn.classList.contains('confirm')) {
    btn.classList.add('confirm');
    btn.querySelector('span').textContent = 'Confirmar';
    setTimeout(() => { if (btn.isConnected) { btn.classList.remove('confirm'); btn.querySelector('span').textContent = 'Eliminar'; } }, 3000);
    return;
  }
  btn.disabled = true;
  try { await api(`/api/admin/sessions/${btn.dataset.del}`, { method: 'DELETE' }); } catch (err) { alert(err.message); }
  loadAdmin(); loadServers();
});
$('#reloadBtn').onclick = () => { loadAdmin(); loadServers(); };

const loginModal = $('#loginModal');
const closeLogin = () => loginModal.classList.add('hidden');
$('#loginClose').onclick = closeLogin;
loginModal.addEventListener('click', (e) => { if (e.target === loginModal) closeLogin(); });

$('#adminBtn').onclick = async () => {
  if (adminToken) {
    try { await api('/api/admin/logout', { method: 'POST' }); } catch { /* ignorar */ }
    return setAdmin(null);
  }
  $('#adminPass').value = '';
  $('#loginMsg').classList.add('hidden');
  loginModal.classList.remove('hidden');
  $('#adminPass').focus();
};

async function doLogin() {
  try {
    const r = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: $('#adminPass').value }) });
    closeLogin();
    setAdmin(r.token);
  } catch (e) { showMsg($('#loginMsg'), e.message); }
}
$('#loginBtn').onclick = doLogin;
$('#adminPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

/* ---------- Inicio ---------- */
setAdmin(adminToken);
loadServers();
setInterval(loadServers, 6000);
