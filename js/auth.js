/**
 * auth.js
 * Loaded on every page. Provides:
 *  - window.SE.apiGet/apiPost/apiPut/apiDelete — shared fetch helpers (used by skills.js, requests.js, and inline dashboard script)
 *  - session guard for pages marked data-require-auth="true" (redirects to login.html if not logged in)
 *  - login.html / register.html form handling
 *  - logout button wiring (any page with #logoutBtn)
 *  - redirects away from login/register if already signed in
 *
 * Fires a "se:authed" event on document once a protected page confirms
 * the session — other scripts should wait for this before calling the API.
 */
(function () {
  const API = 'backend/';

  async function apiGet(path) {
    const res = await fetch(API + path, { credentials: 'same-origin' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw data;
    return data;
  }
  async function apiSend(path, method, body) {
    const res = await fetch(API + path, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw data;
    return data;
  }
  window.SE = {
    apiGet,
    apiPost: (path, body) => apiSend(path, 'POST', body),
    apiPut: (path, body) => apiSend(path, 'PUT', body),
    apiDelete: (path) => apiSend(path, 'DELETE'),
  };

  async function whoAmI() {
    return apiGet('login.php'); // GET login.php = "who am I" (see backend/login.php)
  }

  function wireLogout() {
    const btn = document.getElementById('logoutBtn');
    if (!btn) return;
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try { await apiSend('login.php', 'DELETE', {}); } catch (err) { /* ignore */ }
      window.location.href = 'login.html';
    });
  }

  function wireLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('authError');
      errEl.classList.remove('show');
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Logging in…';
      try {
        await window.SE.apiPost('login.php', { email, password });
        window.location.href = 'dashboard.html';
      } catch (err) {
        errEl.textContent = (err && err.error) ? err.error : 'Login failed. Please try again.';
        errEl.classList.add('show');
        btn.disabled = false; btn.textContent = 'Log in';
      }
    });
  }

  function wireRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('authError');
      errEl.classList.remove('show');
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const contact = document.getElementById('contact').value.trim();
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Creating account…';
      try {
        await window.SE.apiPost('register.php', { name, email, password, contact });
        window.location.href = 'dashboard.html';
      } catch (err) {
        errEl.textContent = (err && err.error) ? err.error : 'Registration failed. Please try again.';
        errEl.classList.add('show');
        btn.disabled = false; btn.textContent = 'Create account';
      }
    });
  }

  async function updateReqBadge() {
    const badge = document.getElementById('reqBadge');
    if (!badge) return;
    try {
      const received = await apiGet('get_requests.php?box=received');
      const pending = received.filter(r => r.status === 'pending').length;
      if (pending > 0) { badge.style.display = 'inline-block'; badge.textContent = pending; }
    } catch (e) { /* ignore — page-level auth guard already handles auth failures */ }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    wireLogout();
    wireLoginForm();
    wireRegisterForm();

    const body = document.body;
    const page = body.dataset.page;

    if (body.dataset.requireAuth === 'true') {
      try {
        const user = await whoAmI();
        window.CURRENT_USER = user;
        const label = document.getElementById('whoLabel');
        if (label) label.textContent = user.name;
        updateReqBadge();
        document.dispatchEvent(new CustomEvent('se:authed', { detail: user }));
      } catch (e) {
        window.location.href = 'login.html';
      }
      return;
    }

    // On login/register/index pages: if already signed in, skip straight to the dashboard.
    if (page === 'login' || page === 'register' || page === 'index') {
      try {
        const user = await whoAmI();
        if (page === 'login' || page === 'register') {
          window.location.href = 'dashboard.html';
        } else if (page === 'index') {
          const cta = document.getElementById('heroCtaPrimary');
          if (cta) { cta.textContent = 'Go to dashboard'; cta.href = 'dashboard.html'; }
        }
      } catch (e) { /* not signed in — stay put, this is expected */ }
    }
  });
})();
