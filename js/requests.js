/**
 * requests.js
 * Powers requests.html: Received / Sent tabs, with Accept/Decline
 * actions on pending items in the Received tab.
 */
(function () {
  let activeBox = 'received';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const escapeHtml = s => (s || "").replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  $$('.subtabs [data-box]').forEach(btn => btn.addEventListener('click', () => {
    activeBox = btn.dataset.box;
    $$('.subtabs [data-box]').forEach(b => b.classList.toggle('active', b === btn));
    renderRequests();
  }));

  function fmtDate(iso) {
    try { return new Date(iso.replace(' ', 'T')).toLocaleString(); }
    catch (e) { return iso; }
  }

  async function renderRequests() {
    const el = $('#reqList');
    el.innerHTML = `<div class="empty"><b>Loading…</b>Fetching your ${activeBox === 'received' ? 'received' : 'sent'} proposals.</div>`;
    try {
      const items = await window.SE.apiGet('get_requests.php?box=' + activeBox);
      $('#pageSub').textContent = items.length + (items.length === 1 ? ' proposal' : ' proposals') + ' — ' + (activeBox === 'received' ? 'received' : 'sent');

      if (!items.length) {
        el.innerHTML = `<div class="empty"><b>Nothing here yet</b>${activeBox === 'received' ? 'When someone proposes a trade with you, it\'ll show up here.' : 'Propose a trade from the Skills page and it\'ll show up here.'}</div>`;
        return;
      }

      el.innerHTML = items.map(r => {
        const otherName = activeBox === 'received' ? r.from_name : r.to_name;
        const otherContact = activeBox === 'received' ? r.from_contact : r.to_contact;
        const verb = r.skill_type === 'teach'
          ? (activeBox === 'received' ? 'wants to learn' : 'you asked to learn')
          : (activeBox === 'received' ? 'offered to teach you' : 'you offered to teach');
        return `
        <div class="req-card">
          <div class="req-top">
            <div class="req-title">${escapeHtml(otherName)} ${verb} <b>${escapeHtml(r.skill_name)}</b></div>
            <span class="status-badge ${r.status}">${escapeHtml(r.status)}</span>
          </div>
          <div class="req-msg">${escapeHtml(r.message)}</div>
          <div class="req-meta">${fmtDate(r.created_at)}${otherContact ? ' · contact: ' + escapeHtml(otherContact) : ''}</div>
          ${(activeBox === 'received' && r.status === 'pending') ? `
            <div class="req-actions">
              <button class="accept-btn" data-id="${r.id}" data-status="accepted">Accept</button>
              <button class="decline-btn" data-id="${r.id}" data-status="declined">Decline</button>
            </div>
          ` : ''}
        </div>`;
      }).join('');

      $$('.accept-btn, .decline-btn', el).forEach(btn => btn.addEventListener('click', async () => {
        const card = btn.closest('.req-card');
        $$('button', card).forEach(b => b.disabled = true);
        try {
          await window.SE.apiPut('update_request.php', { id: btn.dataset.id, status: btn.dataset.status });
          await renderRequests();
        } catch (e) {
          alert((e && e.error) ? e.error : 'Could not update that request.');
          $$('button', card).forEach(b => b.disabled = false);
        }
      }));
    } catch (e) {
      el.innerHTML = `<div class="empty"><b>Could not load requests</b>Check that the PHP server and MySQL database are running.</div>`;
    }
  }

  document.addEventListener('se:authed', renderRequests);
})();
