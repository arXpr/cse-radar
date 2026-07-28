// ═══════════════════════════════════════════════════
// CSE'28 Placement Radar — Main App Logic
// ═══════════════════════════════════════════════════

// ── STATE ──────────────────────────────────────────
let currentUser     = null;
let currentAdmin    = false;
let companies       = [];           // loaded from Firestore
let currentCompany  = null;         // company being viewed in detail
let editingCompanyId = null;        // null = adding new, string = editing existing
let currentRoundIdx = null;         // which round modal is open for
let roundModalSelected = new Set(); // student enrolls selected in round modal

// ── DOM REFS ───────────────────────────────────────
const $ = id => document.getElementById(id);

// ── ROUTER ─────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const pageEl = $(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');
  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  if (page === 'leaderboard') renderLeaderboard();
  if (page === 'companies') {
    $('company-detail').classList.add('hidden');
    $('company-list').classList.remove('hidden');
    renderCompanyList();
  }
  if (page === 'dashboard') renderDashboard();
}

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    navigate(link.dataset.page);
  });
});

// ── AUTH ────────────────────────────────────────────
auth.onAuthStateChanged(user => {
  currentUser  = user;
  currentAdmin = isAdmin(user);

  $('auth-guest').classList.toggle('hidden', !!user);
  $('auth-admin').classList.toggle('hidden', !user);
  $('admin-controls').classList.toggle('hidden', !currentAdmin);
  $('admin-edit-controls').classList.toggle('hidden', !currentAdmin);

  loadCompanies();
});

$('adminLoginBtn').addEventListener('click', () => openModal('modal-login'));
$('cancelLoginBtn').addEventListener('click', () => closeModal('modal-login'));
$('logoutBtn').addEventListener('click', () => auth.signOut());

$('confirmLoginBtn').addEventListener('click', async () => {
  const email = $('admin-email').value.trim();
  const pass  = $('admin-password').value;
  const errEl = $('login-error');
  errEl.classList.add('hidden');
  try {
    await auth.signInWithEmailAndPassword(email, pass);
    closeModal('modal-login');
    $('admin-email').value = '';
    $('admin-password').value = '';
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
  }
});

// ── FIRESTORE: LOAD COMPANIES ───────────────────────
function loadCompanies() {
  db.collection('companies').orderBy('createdAt', 'asc').onSnapshot(snap => {
    companies = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderDashboard();
    renderCompanyList();
    // if detail page open, refresh it
    if (currentCompany) {
      const updated = companies.find(c => c.id === currentCompany.id);
      if (updated) showCompanyDetail(updated);
    }
  }, err => console.error('Firestore error:', err));
}

// ── DASHBOARD ──────────────────────────────────────
function renderDashboard() {
  const totalOffers = companies.reduce((acc, co) => {
    const lastRound = co.rounds?.[co.rounds.length - 1];
    return acc + (lastRound?.students?.length || 0);
  }, 0);

  const totalOaCleared = companies.reduce((acc, co) => {
    const firstRound = co.rounds?.[0];
    return acc + (firstRound?.students?.length || 0);
  }, 0);

  $('stat-companies').textContent = companies.length;
  $('stat-offers').textContent    = totalOffers;
  $('stat-oa').textContent        = totalOaCleared;
  $('company-count-pill').textContent = `${companies.length} tracked`;

  const grid = $('company-grid');
  if (companies.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏢</div>
        <p>No companies added yet.</p>
        <p class="empty-sub">Admin can add companies from the Companies tab.</p>
      </div>`;
    return;
  }
  grid.innerHTML = companies.map(co => companyCardHTML(co)).join('');
  grid.querySelectorAll('.company-card').forEach(card => {
    card.addEventListener('click', () => {
      const co = companies.find(c => c.id === card.dataset.id);
      if (co) { navigate('companies'); showCompanyDetail(co); }
    });
  });
}

function companyCardHTML(co) {
  const rounds = co.rounds || [];
  const eligible = co.eligibleCount || 0;

  let funnelHTML = '';
  const stages = [{ label: 'Eligible', count: eligible, idx: -1 }, ...rounds.map((r, i) => ({ label: r.name, count: (r.students||[]).length, idx: i }))];

  stages.forEach((s, i) => {
    const cls = i === stages.length - 1 ? 'final' : (i > 0 ? 'cleared' : '');
    funnelHTML += `<div class="funnel-step">
      <div class="funnel-step-label" title="${s.label}">${s.label}</div>
      <div class="funnel-step-count ${cls}">${s.count}</div>
    </div>`;
    if (i < stages.length - 1) funnelHTML += `<div class="funnel-arrow">→</div>`;
  });

  const lastCount = rounds.length > 0 ? (rounds[rounds.length-1].students||[]).length : 0;

  return `<div class="company-card" data-id="${co.id}">
    <div class="cc-header">
      <div class="cc-logo">${co.logo ? `<img src="${co.logo}" alt="${co.name}" />` : companyEmoji(co.name)}</div>
      <div>
        <div class="cc-name">${co.name}</div>
        <div class="cc-sector">${co.sector || 'Tech'}</div>
      </div>
    </div>
    <div class="cc-funnel">${funnelHTML}</div>
    <div class="cc-meta">
      ${co.cgpaCutoff ? `<span class="cc-tag cgpa">CGPA ≥ ${co.cgpaCutoff}</span>` : ''}
      <span class="cc-tag">${(co.branches || ['CSE']).join(' · ')}</span>
      <span class="cc-tag">${lastCount} offer${lastCount !== 1 ? 's' : ''}</span>
    </div>
  </div>`;
}

function companyEmoji(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('goldman') || n.includes('bank') || n.includes('finance')) return '💰';
  if (n.includes('google'))  return '🔍';
  if (n.includes('amazon'))  return '📦';
  if (n.includes('microsoft')) return '🪟';
  if (n.includes('uber'))    return '🚗';
  if (n.includes('ubs'))     return '🏦';
  if (n.includes('cisco'))   return '🌐';
  return '🏢';
}

// ── COMPANY LIST PAGE ──────────────────────────────
function renderCompanyList() {
  const list = $('company-list');
  if (companies.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🏢</div><p>No companies yet.</p></div>`;
    return;
  }
  list.innerHTML = companies.map(co => {
    const rounds = co.rounds || [];
    const lastCount = rounds.length > 0 ? (rounds[rounds.length-1].students||[]).length : 0;
    const firstCount = rounds.length > 0 ? (rounds[0].students||[]).length : 0;
    return `<div class="company-row" data-id="${co.id}">
      <div class="cr-logo">${co.logo ? `<img src="${co.logo}" alt="${co.name}" />` : companyEmoji(co.name)}</div>
      <div class="cr-info">
        <div class="cr-name">${co.name}</div>
        <div class="cr-meta">${co.sector || 'Tech'} · ${(co.branches||['CSE']).join(', ')} · ${rounds.length} round${rounds.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="cr-stats">
        <div class="cr-stat"><div class="cr-stat-num" style="color:var(--accent)">${co.eligibleCount||0}</div><div class="cr-stat-label">Eligible</div></div>
        <div class="cr-stat"><div class="cr-stat-num" style="color:var(--green)">${firstCount}</div><div class="cr-stat-label">OA Cleared</div></div>
        <div class="cr-stat"><div class="cr-stat-num" style="color:var(--yellow)">${lastCount}</div><div class="cr-stat-label">Final</div></div>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.company-row').forEach(row => {
    row.addEventListener('click', () => {
      const co = companies.find(c => c.id === row.dataset.id);
      if (co) showCompanyDetail(co);
    });
  });
}

// ── COMPANY DETAIL ─────────────────────────────────
function showCompanyDetail(co) {
  currentCompany = co;
  $('company-detail').classList.remove('hidden');
  $('company-list').classList.add('hidden');

  $('detail-company-name').textContent = co.name;
  $('admin-edit-controls').classList.toggle('hidden', !currentAdmin);

  renderFunnel(co);
  renderRoundTables(co);
}

$('backToListBtn').addEventListener('click', () => {
  currentCompany = null;
  $('company-detail').classList.add('hidden');
  $('company-list').classList.remove('hidden');
});

$('editCompanyBtn').addEventListener('click', () => {
  if (currentCompany) openCompanyModal(currentCompany);
});

$('deleteCompanyBtn').addEventListener('click', async () => {
  if (!currentCompany) return;
  if (!confirm(`Delete "${currentCompany.name}"? This cannot be undone.`)) return;
  await db.collection('companies').doc(currentCompany.id).delete();
  currentCompany = null;
  $('company-detail').classList.add('hidden');
  $('company-list').classList.remove('hidden');
});

// ── FUNNEL DIAGRAM ─────────────────────────────────
function renderFunnel(co) {
  const container = $('funnel-container');
  const rounds    = co.rounds || [];
  const eligible  = co.eligibleCount || 0;

  const stages = [
    { label: 'Eligible', count: eligible, color: 'var(--accent)' },
    ...rounds.map((r, i) => ({
      label: r.name,
      count: (r.students||[]).length,
      color: i === rounds.length - 1 ? 'var(--yellow)' : 'var(--green)'
    }))
  ];

  const maxCount = Math.max(...stages.map(s => s.count), 1);
  const maxBarH  = 160;

  let flowHTML = `<div class="funnel-flow">`;

  stages.forEach((stage, i) => {
    const h = Math.max(8, Math.round((stage.count / maxCount) * maxBarH));
    const prev = i > 0 ? stages[i-1].count : stage.count;
    const dropped = prev - stage.count;
    const dropPct = prev > 0 ? Math.round((dropped / prev) * 100) : 0;

    const isFinal = i === stages.length - 1;
    const barClass = isFinal ? 'final' : (i > 0 ? '' : '');
    const dropBadge = (i > 0 && dropped > 0) ? `<div class="drop-badge">-${dropped}</div>` : '';

    flowHTML += `<div class="funnel-block">
      <div class="funnel-bar-wrap">
        <div class="funnel-count-top" style="color:${stage.color}">${stage.count}</div>
        <div class="funnel-bar ${barClass}" style="height:${h}px;background:linear-gradient(180deg,${stage.color} 0%,${stage.color}55 100%)">
          ${dropBadge}
        </div>
        <div class="funnel-label-bottom">${stage.label}</div>
      </div>
    </div>`;

    if (i < stages.length - 1) {
      flowHTML += `<div class="funnel-arrow-block">
        <span title="${dropPct}% eliminated at this stage">→</span>
      </div>`;
    }
  });

  flowHTML += `</div>`;
  container.innerHTML = flowHTML;
}

// ── ROUND TABLES ────────────────────────────────────
function renderRoundTables(co) {
  const container = $('round-tables');
  const rounds    = co.rounds || [];

  if (rounds.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>No rounds configured yet.</p></div>`;
    return;
  }

  container.innerHTML = rounds.map((round, idx) => {
    const students = (round.students || []).map(enroll => {
      const s = CSE_STUDENTS.find(st => st.enroll === enroll)
             || { name: enroll, enroll, rank: null, cgpa: null, branch: '?' };
      return s;
    }).sort((a,b) => (a.rank||999) - (b.rank||999));

    const prev = idx > 0 ? (co.rounds[idx-1].students||[]).length : (co.eligibleCount||0);
    const cleared = students.length;
    const eliminated = prev - cleared;
    const pct = prev > 0 ? Math.round((cleared/prev)*100) : 0;

    let chipsHTML = '';
    students.forEach(s => {
      chipsHTML += `<div class="student-chip">
        <span class="chip-rank">#${s.rank||'?'}</span>
        <span class="chip-name" title="${s.name}">${s.name}</span>
        ${s.cgpa ? `<span class="chip-cgpa">${s.cgpa.toFixed(2)}</span>` : ''}
      </div>`;
    });

    const adminBtn = currentAdmin
      ? `<button class="btn-ghost small" data-roundidx="${idx}" onclick="openRoundModal(${idx})">Edit Students</button>`
      : '';

    return `<div class="round-section" id="round-section-${idx}">
      <div class="round-header">
        <div class="round-name">
          Round ${idx+1}: ${round.name}
          <span class="round-badge ${idx === rounds.length-1 ? 'acc' : 'green'}">${cleared} cleared</span>
          ${eliminated > 0 ? `<span class="round-badge red">−${eliminated} out</span>` : ''}
          <span class="round-badge" style="color:var(--text-dim)">${pct}% pass rate</span>
        </div>
        ${adminBtn}
      </div>
      ${students.length > 0
        ? `<div class="round-student-grid">${chipsHTML}</div>`
        : `<div class="round-empty">No students added yet. Admin can click "Edit Students".</div>`
      }
    </div>`;
  }).join('');
}

// ── ADD/EDIT COMPANY MODAL ─────────────────────────
$('addCompanyBtn').addEventListener('click', () => openCompanyModal(null));

function openCompanyModal(co) {
  editingCompanyId = co ? co.id : null;
  $('modal-company-title').textContent = co ? `Edit: ${co.name}` : 'Add Company';

  $('co-name').value     = co?.name     || '';
  $('co-logo').value     = co?.logo     || '';
  $('co-sector').value   = co?.sector   || '';
  $('co-cgpa').value     = co?.cgpaCutoff || '';
  $('co-branches').value = (co?.branches || ['CSE']).join(',');

  // Build rounds
  const rb = $('rounds-builder');
  rb.innerHTML = '';
  const rounds = co?.rounds || [];
  rounds.forEach(r => addRoundField(r.name));
  if (rounds.length === 0) {
    addRoundField('OA');
    addRoundField('Round 1');
    addRoundField('Final / HR');
  }

  openModal('modal-company');
}

function addRoundField(value = '') {
  const rb = $('rounds-builder');
  const div = document.createElement('div');
  div.className = 'round-builder-item';
  div.innerHTML = `<input type="text" placeholder="Round name e.g. OA / R1 / HR" value="${escapeAttr(value)}" />
    <button class="round-remove" onclick="this.parentElement.remove()">✕</button>`;
  rb.appendChild(div);
}
$('addRoundBtn').addEventListener('click', () => addRoundField());

$('cancelCompanyBtn').addEventListener('click', () => closeModal('modal-company'));

$('saveCompanyBtn').addEventListener('click', async () => {
  const name     = $('co-name').value.trim();
  const logo     = $('co-logo').value.trim();
  const sector   = $('co-sector').value.trim();
  const cgpa     = parseFloat($('co-cgpa').value) || null;
  const branches = $('co-branches').value.split(',').map(b => b.trim()).filter(Boolean);

  if (!name) { alert('Company name is required.'); return; }

  const roundInputs = document.querySelectorAll('#rounds-builder .round-builder-item input');
  const roundNames  = [...roundInputs].map(i => i.value.trim()).filter(Boolean);

  if (roundNames.length === 0) { alert('Add at least one round.'); return; }

  // If editing, preserve existing student arrays for rounds that still exist
  let newRounds;
  if (editingCompanyId) {
    const existing = companies.find(c => c.id === editingCompanyId);
    const existingRounds = existing?.rounds || [];
    newRounds = roundNames.map((rName, idx) => {
      const old = existingRounds.find(r => r.name === rName) || existingRounds[idx];
      return { name: rName, students: old?.students || [] };
    });
  } else {
    newRounds = roundNames.map(rName => ({ name: rName, students: [] }));
  }

  const data = {
    name, logo, sector,
    cgpaCutoff: cgpa,
    branches: branches.length > 0 ? branches : ['CSE'],
    rounds: newRounds,
    eligibleCount: 0,  // admin sets this in Firestore or we compute from enrolled
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (editingCompanyId) {
    await db.collection('companies').doc(editingCompanyId).update(data);
  } else {
    data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection('companies').add(data);
  }

  closeModal('modal-company');
});

// ── ROUND STUDENT MODAL ────────────────────────────
function openRoundModal(roundIdx) {
  if (!currentCompany) return;
  currentRoundIdx = roundIdx;
  const round = currentCompany.rounds[roundIdx];
  $('modal-round-title').textContent = `Manage: ${round.name}`;

  roundModalSelected = new Set(round.students || []);
  renderRoundStudentList('');

  $('round-student-search').value = '';
  $('round-student-search').addEventListener('input', e => renderRoundStudentList(e.target.value));

  openModal('modal-round');
}

function renderRoundStudentList(query) {
  const q = query.toLowerCase();
  const list = $('round-student-list');
  let students = CSE_STUDENTS;

  // For round > 0, pool is students from previous round; for round 0 all CSE
  if (currentRoundIdx > 0 && currentCompany) {
    const prevStudents = currentCompany.rounds[currentRoundIdx - 1]?.students || [];
    students = CSE_STUDENTS.filter(s => prevStudents.includes(s.enroll));
  }

  // Also allow non-CSE if other branches added (from registration)
  if (q) {
    students = students.filter(s =>
      s.name.toLowerCase().includes(q) || s.enroll.toLowerCase().includes(q)
    );
  }

  list.innerHTML = students.map(s => {
    const sel = roundModalSelected.has(s.enroll);
    return `<div class="rs-item ${sel ? 'selected' : ''}" data-enroll="${s.enroll}">
      <div class="rs-check">${sel ? '✓' : ''}</div>
      <span class="rs-name">${s.name}</span>
      <span class="rs-enroll">${s.enroll}</span>
      ${s.cgpa ? `<span class="rs-cgpa">${s.cgpa.toFixed(2)}</span>` : ''}
    </div>`;
  }).join('');

  list.querySelectorAll('.rs-item').forEach(item => {
    item.addEventListener('click', () => {
      const enroll = item.dataset.enroll;
      if (roundModalSelected.has(enroll)) {
        roundModalSelected.delete(enroll);
        item.classList.remove('selected');
        item.querySelector('.rs-check').textContent = '';
      } else {
        roundModalSelected.add(enroll);
        item.classList.add('selected');
        item.querySelector('.rs-check').textContent = '✓';
      }
    });
  });
}

$('cancelRoundBtn').addEventListener('click', () => closeModal('modal-round'));

$('saveRoundBtn').addEventListener('click', async () => {
  if (!currentCompany || currentRoundIdx === null) return;

  const rounds = [...currentCompany.rounds];
  rounds[currentRoundIdx] = {
    ...rounds[currentRoundIdx],
    students: [...roundModalSelected]
  };

  await db.collection('companies').doc(currentCompany.id).update({ rounds });
  closeModal('modal-round');
});

// ── LEADERBOARD ────────────────────────────────────
function renderLeaderboard() {
  const query   = ($('searchStudent')?.value || '').toLowerCase();
  const sortBy  = $('filterBy')?.value || 'rank';

  // Build offer map: enroll → [company names where they're in last round]
  const offerMap = {};
  const roundMap = {}; // enroll → list of {company, round}

  companies.forEach(co => {
    const rounds = co.rounds || [];
    rounds.forEach((r, idx) => {
      (r.students || []).forEach(enroll => {
        if (!roundMap[enroll]) roundMap[enroll] = [];
        roundMap[enroll].push({ company: co.name, roundName: r.name, isFinal: idx === rounds.length - 1 });
      });
    });
    // Last round = offer
    const lastRound = rounds[rounds.length - 1];
    if (lastRound) {
      (lastRound.students || []).forEach(enroll => {
        if (!offerMap[enroll]) offerMap[enroll] = [];
        offerMap[enroll].push(co.name);
      });
    }
  });

  let students = CSE_STUDENTS.filter(s => {
    if (!query) return true;
    return s.name.toLowerCase().includes(query) || s.enroll.toLowerCase().includes(query);
  });

  if (sortBy === 'cgpa') {
    students = students.sort((a,b) => (b.cgpa||0) - (a.cgpa||0));
  } else if (sortBy === 'offers') {
    students = students.sort((a,b) => ((offerMap[b.enroll]||[]).length) - ((offerMap[a.enroll]||[]).length));
  } else {
    students = students.sort((a,b) => a.rank - b.rank);
  }

  const container = $('leaderboard-table');

  if (students.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No students found.</p></div>`;
    return;
  }

  container.innerHTML = students.map(s => {
    const offers  = offerMap[s.enroll] || [];
    const rounds  = roundMap[s.enroll] || [];

    const chipsHTML = [...new Set(rounds.map(r => r.company))].map(cName => {
      const isFinal = rounds.some(r => r.company === cName && r.isFinal);
      return `<span class="lb-chip ${isFinal ? 'offer' : 'cleared'}" title="${cName}">${cName.split(' ')[0]}</span>`;
    }).join('');

    const offerDots = offers.map(() => `<div class="offer-dot"></div>`).join('');

    return `<div class="lb-row ${s.rank <= 3 ? 'top3' : ''}">
      <div class="lb-rank">${s.rank}</div>
      <div class="lb-name-wrap">
        <div class="lb-name">${titleCase(s.name)}</div>
        <div class="lb-enroll">${s.enroll}</div>
      </div>
      <div class="lb-cgpa">${s.cgpa ? s.cgpa.toFixed(4) : '—'}</div>
      <div class="lb-offers">${offerDots}</div>
      <div class="lb-chips">${chipsHTML}</div>
    </div>`;
  }).join('');
}

$('searchStudent')?.addEventListener('input', renderLeaderboard);
$('filterBy')?.addEventListener('change', renderLeaderboard);

// ── MODAL HELPERS ──────────────────────────────────
function openModal(id) {
  $(id).classList.remove('hidden');
  $('overlay').classList.remove('hidden');
}
function closeModal(id) {
  $(id).classList.add('hidden');
  // close overlay only if no other modals open
  const anyOpen = ['modal-login','modal-company','modal-round'].some(m => !$(m).classList.contains('hidden'));
  if (!anyOpen) $('overlay').classList.add('hidden');
}
$('overlay').addEventListener('click', () => {
  ['modal-login','modal-company','modal-round'].forEach(id => $(id).classList.add('hidden'));
  $('overlay').classList.add('hidden');
});

// ── UTILS ──────────────────────────────────────────
function titleCase(str) {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}
function escapeAttr(str) {
  return (str||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── INIT ────────────────────────────────────────────
navigate('dashboard');
