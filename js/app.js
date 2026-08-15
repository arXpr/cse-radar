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

// ── INDEPENDENCE DAY THEME (TEMPORARY Aug 12-20) ───
function initIndependenceTheme() {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  if (m !== 8 || d < 12 || d > 20) return;

  // Apply theme class
  document.body.classList.add('independence-theme');

  // Show banner with animation
  const banner = document.getElementById('independence-banner');
  if (banner) {
    banner.classList.remove('hidden');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => banner.classList.add('visible'));
    });
  }

  // Start particle canvas
  startIndiaParticles();
}

function startIndiaParticles() {
  const canvas = document.getElementById('india-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const COLORS = ['#FF9933', '#ffffff', '#138808', '#000080'];
  const particles = [];
  let W, H;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Seed particles
  for (let i = 0; i < 55; i++) {
    particles.push(mkParticle(true));
  }

  function mkParticle(random) {
    const types = ['circle', 'star', 'chakra'];
    return {
      x:     random ? Math.random() * (W || window.innerWidth) : (W || window.innerWidth) * Math.random(),
      y:     random ? Math.random() * (H || window.innerHeight) : -20,
      size:  3 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: 0.35 + Math.random() * 0.55,
      alpha:  0.1 + Math.random() * 0.35,
      rot:    Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      type:  types[Math.floor(Math.random() * types.length)],
    };
  }

  function drawStar(ctx, x, y, r, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      i === 0 ? ctx.moveTo(x + r * Math.cos(angle), y + r * Math.sin(angle))
              : ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawChakra(ctx, x, y, r, color, alpha, rot) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI * 2) / 24;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r * Math.cos(a), r * Math.sin(a));
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.speedX;
      p.y += p.speedY;
      p.rot += p.rotSpeed;

      if (p.type === 'circle') {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'star') {
        drawStar(ctx, p.x, p.y, p.size, p.color, p.alpha);
      } else {
        drawChakra(ctx, p.x, p.y, p.size * 1.8, p.color, p.alpha, p.rot);
      }

      // reset particle when it falls off bottom
      if (p.y > H + 20) {
        particles[i] = mkParticle(false);
      }
    }
    requestAnimationFrame(draw);
  }

  // Fade in canvas after short delay
  setTimeout(() => canvas.classList.add('visible'), 600);
  draw();
}
initIndependenceTheme();

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
  if (page === 'mystatus') renderMyStatusFromInput();
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
    if ($('page-mystatus')?.classList.contains('active')) renderMyStatusFromInput();
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

  renderDemographics();

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

// ── DEMOGRAPHIC INSIGHTS (GIRLS VS BOYS) ───────────
function renderDemographics() {
  const demoWidget = $('demographic-widget');
  if (!demoWidget) return;

  const femaleStudents = CSE_STUDENTS.filter(s => s.gender === 'F');
  const maleStudents   = CSE_STUDENTS.filter(s => s.gender === 'M');

  function getGroupStats(students) {
    const total = students.length;
    const studentEnrolls = new Set(students.map(s => s.enroll));
    
    // Placed: present in the final round of any company
    const placedSet = new Set();
    companies.forEach(co => {
      const lastRound = co.rounds?.[co.rounds.length - 1];
      lastRound?.students?.forEach(e => {
        if (studentEnrolls.has(e)) placedSet.add(e);
      });
    });
    const placed = placedSet.size;

    // OA Cleared: present in first round of any company
    const oaSet = new Set();
    companies.forEach(co => {
      const firstRound = co.rounds?.[0];
      firstRound?.students?.forEach(e => {
        if (studentEnrolls.has(e)) oaSet.add(e);
      });
    });
    const oaCleared = oaSet.size;

    const validCgpas = students.filter(s => typeof s.cgpa === 'number' && !isNaN(s.cgpa));
    const avgCgpa = validCgpas.length ? (validCgpas.reduce((a, b) => a + b.cgpa, 0) / validCgpas.length).toFixed(2) : '—';
    const ratePct = total > 0 ? Math.round((placed / total) * 100) : 0;

    return { total, placed, oaCleared, avgCgpa, ratePct };
  }

  const femaleStats = getGroupStats(femaleStudents);
  const maleStats   = getGroupStats(maleStudents);

  demoWidget.innerHTML = `
    <!-- Girls Stats Card -->
    <div class="gender-card girls-card">
      <div class="gender-card-header">
        <div class="gender-avatar">👩</div>
        <div class="gender-title-wrap">
          <h3>Girls Insights</h3>
          <p>${femaleStats.total} Total Female Candidates</p>
        </div>
      </div>
      <div class="gender-stat-row">
        <div class="gender-stat-item">
          <div class="gender-stat-num">${femaleStats.placed}</div>
          <div class="gender-stat-label">Final Offers</div>
        </div>
        <div class="gender-stat-item">
          <div class="gender-stat-num">${femaleStats.oaCleared}</div>
          <div class="gender-stat-label">OAs Cleared</div>
        </div>
        <div class="gender-stat-item">
          <div class="gender-stat-num">${femaleStats.avgCgpa}</div>
          <div class="gender-stat-label">Avg CGPA</div>
        </div>
      </div>
      <div class="gender-progress-bar-bg">
        <div class="gender-progress-bar-fill" style="width: ${Math.max(femaleStats.ratePct, 5)}%"></div>
      </div>
    </div>

    <!-- Boys Stats Card -->
    <div class="gender-card boys-card">
      <div class="gender-card-header">
        <div class="gender-avatar">👨</div>
        <div class="gender-title-wrap">
          <h3>Boys Insights</h3>
          <p>${maleStats.total} Total Male Candidates</p>
        </div>
      </div>
      <div class="gender-stat-row">
        <div class="gender-stat-item">
          <div class="gender-stat-num">${maleStats.placed}</div>
          <div class="gender-stat-label">Final Offers</div>
        </div>
        <div class="gender-stat-item">
          <div class="gender-stat-num">${maleStats.oaCleared}</div>
          <div class="gender-stat-label">OAs Cleared</div>
        </div>
        <div class="gender-stat-item">
          <div class="gender-stat-num">${maleStats.avgCgpa}</div>
          <div class="gender-stat-label">Avg CGPA</div>
        </div>
      </div>
      <div class="gender-progress-bar-bg">
        <div class="gender-progress-bar-fill" style="width: ${Math.max(maleStats.ratePct, 5)}%"></div>
      </div>
    </div>
  `;
}

// ── MY STATUS (PERSONALIZED TIMELINE) LOGIC ────────
function initMyStatus() {
  const searchInput = $('mystatus-search-input');
  const searchBtn   = $('mystatus-search-btn');
  const autoList    = $('mystatus-autocomplete');

  if (!searchInput) return;

  function executeSearch(enrollVal) {
    const val = (enrollVal || searchInput.value).trim().toUpperCase();
    if (!val) return;
    searchInput.value = val;
    autoList.classList.add('hidden');
    localStorage.setItem('radar_last_enroll', val);
    renderMyStatus(val);
  }

  searchBtn.addEventListener('click', () => executeSearch());

  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') executeSearch();
  });

  // Autocomplete
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q || q.length < 2) {
      autoList.classList.add('hidden');
      return;
    }
    const matches = CSE_STUDENTS.filter(s => 
      s.enroll.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    ).slice(0, 6);

    if (matches.length === 0) {
      autoList.classList.add('hidden');
      return;
    }

    autoList.innerHTML = matches.map(m => `
      <div class="autocomplete-item" data-enroll="${m.enroll}">
        <span class="ac-name">${titleCase(m.name)}</span>
        <span class="ac-enroll">${m.enroll}</span>
      </div>
    `).join('');
    autoList.classList.remove('hidden');
  });

  autoList.addEventListener('click', e => {
    const item = e.target.closest('.autocomplete-item');
    if (item) {
      executeSearch(item.dataset.enroll);
    }
  });

  document.addEventListener('click', e => {
    if (!searchInput.contains(e.target) && !autoList.contains(e.target)) {
      autoList.classList.add('hidden');
    }
  });

  // Sample Chips
  document.querySelectorAll('.sample-chip').forEach(chip => {
    chip.addEventListener('click', () => executeSearch(chip.dataset.enroll));
  });

  // Saved ID Auto-Load
  const savedEnroll = localStorage.getItem('radar_last_enroll');
  if (savedEnroll) {
    searchInput.value = savedEnroll;
  }
}

function renderMyStatusFromInput() {
  const searchInput = $('mystatus-search-input');
  const savedEnroll = searchInput?.value.trim().toUpperCase() || localStorage.getItem('radar_last_enroll');
  if (savedEnroll) {
    renderMyStatus(savedEnroll);
  }
}

function renderMyStatus(enroll) {
  const profileSec  = $('mystatus-profile-section');
  const profileCard = $('mystatus-profile-card');
  const timelineSec = $('mystatus-timeline-section');
  const timelineEl  = $('mystatus-timeline');
  const emptyState  = $('mystatus-empty-state');
  const countPill   = $('timeline-count-pill');

  const student = CSE_STUDENTS.find(s => s.enroll.toUpperCase() === enroll.toUpperCase());

  if (!student) {
    profileSec.classList.add('hidden');
    timelineSec.classList.add('hidden');
    emptyState.classList.remove('hidden');
    emptyState.innerHTML = `
      <div class="empty-icon">❌</div>
      <h3>No Record Found</h3>
      <p class="empty-sub">No student record found for <strong>${escapeAttr(enroll)}</strong>. Please verify your Enrollment ID.</p>
    `;
    return;
  }

  // Hide empty state
  emptyState.classList.add('hidden');
  profileSec.classList.remove('hidden');
  timelineSec.classList.remove('hidden');

  // Filter companies where student has at least 1 shortlist / round record
  const matchedCompanies = companies.filter(co => 
    co.rounds?.some(r => r.students?.includes(student.enroll))
  );

  // Compute student summary metrics
  const oaClearedCount = matchedCompanies.filter(co => co.rounds?.[0]?.students?.includes(student.enroll)).length;
  const offersCount    = matchedCompanies.filter(co => {
    const lastRound = co.rounds?.[co.rounds.length - 1];
    return lastRound?.students?.includes(student.enroll);
  }).length;
  const interviewCount = matchedCompanies.filter(co => 
    co.rounds?.slice(1).some(r => r.students?.includes(student.enroll))
  ).length;

  // Render Profile Header Banner
  const genderIcon = student.gender === 'F' ? '👩' : '👨';
  profileCard.innerHTML = `
    <div class="profile-main">
      <div class="profile-avatar">${student.name.charAt(0)}</div>
      <div class="profile-info">
        <div class="profile-name">${titleCase(student.name)} ${genderIcon}</div>
        <div class="profile-meta-row">
          <span class="profile-tag">${student.enroll}</span>
          <span>Rank: <strong>#${student.rank}</strong></span>
          <span>CGPA: <strong>${student.cgpa ? student.cgpa.toFixed(4) : 'N/A'}</strong></span>
          <span>Branch: <strong>${student.branch}</strong></span>
        </div>
      </div>
    </div>

    <div class="profile-metrics">
      <div class="pm-card">
        <div class="pm-num blue">${matchedCompanies.length}</div>
        <div class="pm-label">Drives Tracked</div>
      </div>
      <div class="pm-card">
        <div class="pm-num purple">${oaClearedCount}</div>
        <div class="pm-label">OAs Cleared</div>
      </div>
      <div class="pm-card">
        <div class="pm-num yellow">${interviewCount}</div>
        <div class="pm-label">Interviews</div>
      </div>
      <div class="pm-card">
        <div class="pm-num green">${offersCount}</div>
        <div class="pm-label">Final Offers</div>
      </div>
    </div>
  `;

  countPill.textContent = `${matchedCompanies.length} active drive${matchedCompanies.length === 1 ? '' : 's'}`;

  if (matchedCompanies.length === 0) {
    timelineEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⏳</div>
        <h3>No Shortlists Logged Yet</h3>
        <p class="empty-sub">You currently have no round or shortlist entries recorded in active campus drives.</p>
      </div>
    `;
    return;
  }

  // Render Vertical Timeline Items
  timelineEl.innerHTML = matchedCompanies.map(co => {
    const rounds = co.rounds || [];
    const lastRoundIdx = rounds.length - 1;
    const isFinalOffer = rounds[lastRoundIdx]?.students?.includes(student.enroll);

    // Find rounds student passed
    const passedRounds = rounds.filter(r => r.students?.includes(student.enroll));

    // Determine status class and badge
    let statusClass = 'status-cleared';
    let badgeText   = `Purple · Cleared ${passedRounds.length} Round${passedRounds.length > 1 ? 's' : ''}`;

    if (isFinalOffer) {
      statusClass = 'status-offered';
      badgeText   = '🎉 Final Offer Received!';
    } else {
      // Find latest round with recorded students
      let latestPopulatedRoundIdx = -1;
      for (let i = rounds.length - 1; i >= 0; i--) {
        if (rounds[i].students && rounds[i].students.length > 0) {
          latestPopulatedRoundIdx = i;
          break;
        }
      }

      if (latestPopulatedRoundIdx >= 0) {
        const inLatest = rounds[latestPopulatedRoundIdx].students.includes(student.enroll);
        if (inLatest) {
          statusClass = 'status-in-progress';
          badgeText   = `🔵 Shortlisted: ${rounds[latestPopulatedRoundIdx].name}`;
        } else {
          // Check if student was in a previous round but omitted in latest populated
          const wasInPrevious = rounds.slice(0, latestPopulatedRoundIdx).some(r => r.students?.includes(student.enroll));
          if (wasInPrevious) {
            statusClass = 'status-ended';
            badgeText   = `🔴 Process Ended at ${rounds[latestPopulatedRoundIdx].name}`;
          } else {
            statusClass = 'status-awaiting';
            badgeText   = `⏳ Results Pending`;
          }
        }
      }
    }

    // Build Round Flow Steps HTML
    const stepsHTML = rounds.map((r, idx) => {
      const isPassed = r.students?.includes(student.enroll);
      let stepClass = isPassed ? 'passed' : '';
      let icon = isPassed ? '✓' : '•';

      return `
        <div class="round-step ${stepClass}">
          <span>${icon} ${escapeAttr(r.name)}</span>
        </div>
        ${idx < rounds.length - 1 ? '<span class="round-arrow">➔</span>' : ''}
      `;
    }).join('');

    const logoHTML = co.logoUrl
      ? `<img src="${escapeAttr(co.logoUrl)}" alt="${escapeAttr(co.name)}" />`
      : `🏢`;

    return `
      <div class="timeline-item ${statusClass}">
        <div class="timeline-dot"></div>
        <div class="timeline-header">
          <div class="tc-company-wrap">
            <div class="tc-logo">${logoHTML}</div>
            <div>
              <div class="tc-name">${escapeAttr(co.name)}</div>
              <div class="tc-sector">${escapeAttr(co.sector || 'Placement Drive')} · Cutoff: CGPA ${co.cgpa || 'N/A'}</div>
            </div>
          </div>
          <span class="tc-badge">${badgeText}</span>
        </div>
        <div class="tc-rounds-flow">
          ${stepsHTML}
        </div>
      </div>
    `;
  }).join('');
}

// ── INIT ────────────────────────────────────────────
initMyStatus();
navigate('dashboard');
