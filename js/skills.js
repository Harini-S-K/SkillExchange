/**
 * skills.js
 * Powers skills.html: the "Browse the board" tab and the "My skills" tab.
 * Waits for the "se:authed" event fired by auth.js before touching the API.
 */
(function () {
  const CATS = ["All", "Creative", "Tech", "Music", "Language", "Fitness & Wellness", "Craft & Trade", "Business", "Life Skills", "Other"];

  let activeCat = "All";
  let activeSub = "teach";      // browse subtab: teach | learn
  let searchTerm = "";
  let myTeach = [];
  let myLearn = [];

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const escapeHtml = s => (s || "").replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------------- page-level tabs (Browse / My skills) ----------------
  $$('[data-page-tab]').forEach(btn => btn.addEventListener('click', () => {
    $$('[data-page-tab]').forEach(b => b.classList.toggle('active', b === btn));
    const target = btn.dataset.pageTab;
    $('#tab-browse').style.display = target === 'browse' ? '' : 'none';
    $('#tab-mine').style.display = target === 'mine' ? '' : 'none';
    $('#pageSub').textContent = target === 'browse' ? 'everyone else\'s listings' : 'what you teach and want to learn';
  }));

  // ---------------- browse subtabs (teach / learn) ----------------
  $$('.subtabs [data-sub]').forEach(btn => btn.addEventListener('click', () => {
    activeSub = btn.dataset.sub;
    $$('.subtabs [data-sub]').forEach(b => b.classList.toggle('active', b === btn));
    renderGrid();
  }));

  function renderFilters() {
    const el = $('#filters');
    el.innerHTML = CATS.map(c => `<button class="chip ${c === activeCat ? 'active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')
      + `<input type="text" class="search" id="searchBox" placeholder="Search skills…" value="${escapeHtml(searchTerm)}">`;
    $$('.chip', el).forEach(chip => chip.addEventListener('click', () => { activeCat = chip.dataset.cat; renderFilters(); renderGrid(); }));
    $('#searchBox').addEventListener('input', e => { searchTerm = e.target.value; renderGrid(); });
  }

  // ---------------- browse grid ----------------
  let boardCache = { teach: [], learn: [] };

  async function loadBoard() {
    try {
      const [teach, learn] = await Promise.all([
        window.SE.apiGet('get_skills.php?type=teach'),
        window.SE.apiGet('get_skills.php?type=learn'),
      ]);
      boardCache = { teach, learn };
    } catch (e) {
      boardCache = { teach: [], learn: [] };
    }
  }

  function renderGrid() {
    const grid = $('#grid');
    let items = boardCache[activeSub] || [];
    if (activeCat !== 'All') items = items.filter(i => i.category === activeCat);
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      items = items.filter(i => (i.skill_name || '').toLowerCase().includes(t) || (i.description || '').toLowerCase().includes(t) || (i.owner_name || '').toLowerCase().includes(t));
    }
    const noun = activeSub === 'teach' ? 'teaching' : 'learning';
    const countLabel = items.length + (items.length === 1 ? ' listing' : ' listings') + ' — ' + noun + (activeCat !== 'All' ? ' · ' + activeCat : '');
    if ($('#tab-browse').style.display !== 'none') $('#pageSub').textContent = countLabel;

    if (items.length === 0) {
      grid.innerHTML = `<div class="empty"><b>Nothing here yet</b>${activeSub === 'teach' ? 'Be the first to list a skill you can teach.' : 'Be the first to list a skill you want to learn.'}</div>`;
      return;
    }
    grid.innerHTML = items.map(i => `
      <div class="ticket">
        <div class="ticket-head">
          <div class="ticket-cat ${activeSub === 'learn' ? '' : ''}" style="${activeSub === 'learn' ? 'color:var(--sage);' : ''}">${escapeHtml(i.category)}</div>
          <div class="ticket-name">${escapeHtml(i.skill_name)}</div>
          <div class="ticket-by">${activeSub === 'teach' ? 'taught by' : 'wanted by'} ${escapeHtml(i.owner_name)}</div>
        </div>
        ${i.description ? `<div class="ticket-desc">${escapeHtml(i.description)}</div>` : ''}
        <div class="ticket-perf"></div>
        <div class="ticket-foot">
          <button class="propose-btn" data-owner="${i.user_id}" data-skillid="${i.id}" data-skill="${escapeHtml(i.skill_name)}" data-name="${escapeHtml(i.owner_name)}" data-kind="${activeSub}">
            ${activeSub === 'teach' ? 'Ask to learn this' : 'Offer to teach this'}
          </button>
        </div>
      </div>
    `).join('');
    $$('.propose-btn', grid).forEach(btn => btn.addEventListener('click', () => openProposeModal(btn.dataset)));
  }

  // ---------------- propose modal ----------------
  function openProposeModal(data) {
    const { owner, skillid, skill, name, kind } = data;
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    const verb = kind === 'teach' ? `learn "${escapeHtml(skill)}" from ${escapeHtml(name)}` : `teach ${escapeHtml(name)} "${escapeHtml(skill)}"`;
    const suggestion = myTeach.length ? 'In return, I can teach ' + escapeHtml(myTeach[0].skill_name) + '. ' : '';
    overlay.innerHTML = `
      <div class="modal">
        <h3>Propose a trade</h3>
        <div class="modal-sub">You'd like to ${verb}.</div>
        <label>Message</label>
        <textarea id="mMsg" placeholder="Say what you can offer in return and when you're free.">${suggestion}</textarea>
        <div class="modal-error" id="mError" style="display:none;"></div>
        <div class="modal-actions">
          <button class="modal-cancel">Cancel</button>
          <button class="modal-send">Send proposal</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    $('.modal-cancel', overlay).addEventListener('click', () => overlay.remove());
    $('.modal-send', overlay).addEventListener('click', async () => {
      const msg = $('#mMsg', overlay).value.trim();
      const errEl = $('#mError', overlay);
      errEl.style.display = 'none';
      if (!msg) { errEl.textContent = 'Add a short message about your proposal.'; errEl.style.display = 'block'; return; }
      const btn = $('.modal-send', overlay);
      btn.disabled = true; btn.textContent = 'Sending…';
      try {
        await window.SE.apiPost('send_request.php', {
          to_user_id: owner, skill_id: skillid, skill_type: kind, skill_name: skill, message: msg,
        });
        overlay.innerHTML = `<div class="modal"><h3>Proposal sent</h3><div class="modal-sub">${escapeHtml(name)} will see it under their "Requests" page.</div><div class="modal-actions"><button class="modal-send" id="mClose">Done</button></div></div>`;
        $('#mClose', overlay).addEventListener('click', () => overlay.remove());
      } catch (err) {
        btn.disabled = false; btn.textContent = 'Send proposal';
        errEl.textContent = (err && err.error) ? err.error : 'Something went wrong sending that — please try again.';
        errEl.style.display = 'block';
      }
    });
  }

  // ---------------- my skills ----------------
  async function loadMine() {
    try {
      const [teach, learn] = await Promise.all([
        window.SE.apiGet('get_skills.php?type=teach&mine=1'),
        window.SE.apiGet('get_skills.php?type=learn&mine=1'),
      ]);
      myTeach = teach;
      myLearn = learn;
    } catch (e) {
      myTeach = []; myLearn = [];
    }
  }

  function renderTeachList() {
    const el = $('#teachList');
    if (!myTeach.length) { el.innerHTML = `<div class="empty-mini">Nothing added yet.</div>`; return; }
    el.innerHTML = myTeach.map(s => `
      <div class="skill-row">
        <div><div class="sname">${escapeHtml(s.skill_name)}</div><div class="scat">${escapeHtml(s.category)}</div>${s.description ? `<div class="sdesc">${escapeHtml(s.description)}</div>` : ''}</div>
        <button class="rm-btn" data-rm="${s.id}">Remove</button>
      </div>
    `).join('');
    $$('[data-rm]', el).forEach(btn => btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await window.SE.apiDelete('delete_skill.php?id=' + btn.dataset.rm);
        myTeach = myTeach.filter(s => String(s.id) !== btn.dataset.rm);
        renderTeachList();
        await loadBoard();
      } catch (e) { alert('Could not remove that skill.'); btn.disabled = false; }
    }));
  }
  function renderLearnList() {
    const el = $('#learnList');
    if (!myLearn.length) { el.innerHTML = `<div class="empty-mini">Nothing added yet.</div>`; return; }
    el.innerHTML = myLearn.map(s => `
      <div class="skill-row">
        <div><div class="sname">${escapeHtml(s.skill_name)}</div><div class="scat">${escapeHtml(s.category)}</div></div>
        <button class="rm-btn" data-rm="${s.id}">Remove</button>
      </div>
    `).join('');
    $$('[data-rm]', el).forEach(btn => btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await window.SE.apiDelete('delete_skill.php?id=' + btn.dataset.rm);
        myLearn = myLearn.filter(s => String(s.id) !== btn.dataset.rm);
        renderLearnList();
        await loadBoard();
      } catch (e) { alert('Could not remove that skill.'); btn.disabled = false; }
    }));
  }

  function catOptionsHtml() {
    return CATS.filter(c => c !== 'All').map(c => `<option>${escapeHtml(c)}</option>`).join('');
  }

  $('#addTeachBtn').addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>Add a skill you teach</h3>
        <div class="modal-sub">This will show up on the "People teaching" board.</div>
        <label>Skill</label><input type="text" id="nSkill" placeholder="e.g. Beginner watercolor painting">
        <label>Category</label><select id="nCat">${catOptionsHtml()}</select>
        <label>Details (optional)</label><textarea id="nDesc" placeholder="What would a session or two actually cover?"></textarea>
        <div class="modal-error" id="mError" style="display:none;"></div>
        <div class="modal-actions"><button class="modal-cancel">Cancel</button><button class="modal-send">Add skill</button></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    $('.modal-cancel', overlay).addEventListener('click', () => overlay.remove());
    $('.modal-send', overlay).addEventListener('click', async () => {
      const skill = $('#nSkill', overlay).value.trim();
      const errEl = $('#mError', overlay);
      if (!skill) { errEl.textContent = 'Add a skill name.'; errEl.style.display = 'block'; return; }
      const btn = $('.modal-send', overlay);
      btn.disabled = true; btn.textContent = 'Adding…';
      try {
        const created = await window.SE.apiPost('add_skill.php', {
          type: 'teach', skill_name: skill, category: $('#nCat', overlay).value, description: $('#nDesc', overlay).value.trim(),
        });
        myTeach.unshift(created);
        overlay.remove();
        renderTeachList();
        await loadBoard();
      } catch (e) {
        errEl.textContent = (e && e.error) ? e.error : 'Could not add that skill.';
        errEl.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Add skill';
      }
    });
  });

  $('#addLearnBtn').addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>Add a skill you want to learn</h3>
        <div class="modal-sub">This will show up on the "People wanting to learn" board.</div>
        <label>Skill</label><input type="text" id="nSkill" placeholder="e.g. Logo design basics">
        <label>Category</label><select id="nCat">${catOptionsHtml()}</select>
        <div class="modal-error" id="mError" style="display:none;"></div>
        <div class="modal-actions"><button class="modal-cancel">Cancel</button><button class="modal-send">Add skill</button></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    $('.modal-cancel', overlay).addEventListener('click', () => overlay.remove());
    $('.modal-send', overlay).addEventListener('click', async () => {
      const skill = $('#nSkill', overlay).value.trim();
      const errEl = $('#mError', overlay);
      if (!skill) { errEl.textContent = 'Add a skill name.'; errEl.style.display = 'block'; return; }
      const btn = $('.modal-send', overlay);
      btn.disabled = true; btn.textContent = 'Adding…';
      try {
        const created = await window.SE.apiPost('add_skill.php', {
          type: 'learn', skill_name: skill, category: $('#nCat', overlay).value,
        });
        myLearn.unshift(created);
        overlay.remove();
        renderLearnList();
        await loadBoard();
      } catch (e) {
        errEl.textContent = (e && e.error) ? e.error : 'Could not add that skill.';
        errEl.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Add skill';
      }
    });
  });

  // ---------------- init ----------------
  async function init() {
    renderFilters();
    await Promise.all([loadBoard(), loadMine()]);
    renderGrid();
    renderTeachList();
    renderLearnList();
    $('#pageSub').textContent = "everyone else's listings";
  }

  document.addEventListener('se:authed', init);
})();
