// ═══════════════════════════════════════════════════
// CSE'28 SGPA Calculator — 5th Semester Logic
// ═══════════════════════════════════════════════════

// ── CONSTANTS ──────────────────────────────────────
const TOTAL_SEMESTERS = 8; // B.Tech 4-year

// 5th Semester default subjects
const DEFAULT_SUBJECTS_5TH = [
  { name: 'DAA',    credits: 5, optional: false, removable: false },
  { name: 'NFT',    credits: 4, optional: false, removable: false },
  { name: 'CN',     credits: 4, optional: false, removable: false },
  { name: 'TOC',    credits: 4, optional: false, removable: false },
  { name: 'OS',     credits: 4, optional: false, removable: false },
  { name: 'IPU',    credits: 4, optional: true,  removable: true  },
  { name: 'Stegno', credits: 4, optional: true,  removable: true  },
];

// ── STATE ──────────────────────────────────────────
let sgpaSubjects       = [];
let sgpaStudentProfile = null;
let _sgpaCalcTimer     = null;

// ── DOM SHORTCUT ────────────────────────────────────
const $sg = id => document.getElementById(id);

// ── INIT SUBJECTS ───────────────────────────────────
function initSubjects() {
  sgpaSubjects = DEFAULT_SUBJECTS_5TH.map(s => ({
    ...s,
    grade:   '',
    enabled: !s.optional
  }));
}

// ── GRADE BAR ───────────────────────────────────────
function renderGradeBar(grade) {
  const pct   = Math.min(100, Math.max(0, (grade / 10) * 100));
  const color = grade >= 9 ? 'var(--green)' :
                grade >= 7 ? 'var(--accent)' :
                grade >= 5 ? 'var(--yellow)' : 'var(--red)';
  return `<div class="grade-bar-bg"><div class="grade-bar-fill" style="width:${pct}%;background:${color}"></div></div>`;
}

// ── RENDER SUBJECT ROWS ─────────────────────────────
function renderSubjectRows() {
  const container = $sg('sgpa-subject-rows');
  if (!container) return;

  container.innerHTML = sgpaSubjects.map((sub, idx) => {
    const g        = parseFloat(sub.grade);
    const c        = parseInt(sub.credits) || 0;
    const weighted = (sub.enabled && sub.grade !== '' && !isNaN(g))
      ? (g * c).toFixed(2) : '-';

    const optBadge = sub.optional
      ? `<span class="sgpa-opt-badge">optional</span>` : '';

    const toggleBtn = sub.optional
      ? `<label class="sgpa-toggle" title="${sub.enabled ? 'Exclude from SGPA' : 'Include in SGPA'}"><input type="checkbox" class="sgpa-toggle-chk" data-idx="${idx}" ${sub.enabled ? 'checked' : ''}/><span class="sgpa-toggle-slider"></span></label>` : '';

    const removeBtn = sub.removable
      ? `<button class="sgpa-remove-btn" data-idx="${idx}" title="Remove">x</button>`
      : `<div style="width:28px"></div>`;

    const rowClass = `sgpa-row${sub.enabled ? '' : ' disabled'}`;
    const gradeBar = (sub.enabled && sub.grade !== '' && !isNaN(g)) ? renderGradeBar(g) : '';

    return `<div class="${rowClass}" id="sgpa-row-${idx}"><div class="sgpa-row-name"><span class="sgpa-subject-name">${sub.name}</span>${optBadge}${toggleBtn}</div><div class="sgpa-row-credits"><input type="number" class="sgpa-credit-input" data-idx="${idx}" value="${sub.credits}" min="1" max="10" step="1" ${sub.enabled ? '' : 'disabled'} /></div><div class="sgpa-row-grade"><input type="number" class="sgpa-grade-input" data-idx="${idx}" value="${sub.grade}" placeholder="0-10" min="0" max="10" step="0.1" ${sub.enabled ? '' : 'disabled'} />${gradeBar}</div><div class="sgpa-row-weighted${weighted !== '-' ? ' has-val' : ''}">${weighted}</div><div class="sgpa-row-remove">${removeBtn}</div></div>`;
  }).join('');

  container.querySelectorAll('.sgpa-grade-input').forEach(inp => {
    inp.addEventListener('input', e => { sgpaSubjects[+e.target.dataset.idx].grade = e.target.value; debounceCalc(); });
    inp.addEventListener('change', () => { renderSubjectRows(); calcSGPA(); });
  });
  container.querySelectorAll('.sgpa-credit-input').forEach(inp => {
    inp.addEventListener('input', e => { sgpaSubjects[+e.target.dataset.idx].credits = parseInt(e.target.value) || 0; debounceCalc(); });
  });
  container.querySelectorAll('.sgpa-toggle-chk').forEach(chk => {
    chk.addEventListener('change', e => { sgpaSubjects[+e.target.dataset.idx].enabled = e.target.checked; renderSubjectRows(); calcSGPA(); });
  });
  container.querySelectorAll('.sgpa-remove-btn').forEach(btn => {
    btn.addEventListener('click', e => { sgpaSubjects.splice(+e.target.dataset.idx, 1); renderSubjectRows(); calcSGPA(); });
  });
}

// ── CALCULATE SGPA ──────────────────────────────────
function calcSGPA() {
  const active       = sgpaSubjects.filter(s => s.enabled);
  const totalCredits = active.reduce((a, s) => a + (parseInt(s.credits) || 0), 0);
  const weightedSum  = active.reduce((a, s) => { const g = parseFloat(s.grade); return a + (isNaN(g) ? 0 : g * (parseInt(s.credits) || 0)); }, 0);
  const sgpa = totalCredits > 0 ? (weightedSum / totalCredits) : null;

  $sg('sgpa-total-credits').textContent = totalCredits || '-';
  $sg('sgpa-weighted-sum').textContent  = totalCredits > 0 ? weightedSum.toFixed(2) : '-';

  const valEl = $sg('sgpa-value');
  valEl.textContent = sgpa !== null ? sgpa.toFixed(4) : '-';
  valEl.className   = 'sgpa-result-val accent-val';
  if (sgpa !== null) {
    if      (sgpa >= 9) valEl.classList.add('grade-s');
    else if (sgpa >= 8) valEl.classList.add('grade-a');
    else if (sgpa >= 7) valEl.classList.add('grade-b');
    else if (sgpa >= 6) valEl.classList.add('grade-c');
    else                valEl.classList.add('grade-d');
  }
  updateProjector(sgpa, weightedSum, totalCredits);
}

// ── CGPA PROJECTOR ──────────────────────────────────
function updateProjector(currentSGPA, weightedSum, semCredits) {
  const projCurrent = $sg('sgpa-proj-current');
  const projTargets = $sg('sgpa-proj-targets');
  if (!projCurrent || !projTargets) return;

  const prevCGPA      = parseFloat($sg('sgpa-cgpa-input') ? $sg('sgpa-cgpa-input').value : '');
  const semsCompleted = parseInt($sg('sgpa-sems-done-input') ? $sg('sgpa-sems-done-input').value : '4') || 4;

  if (isNaN(prevCGPA) || prevCGPA <= 0) {
    projCurrent.innerHTML = '<span class="sgpa-hint">Enter your current CGPA above to see projections</span>';
    projTargets.innerHTML = '';
    return;
  }

  let newCGPA = null;
  if (currentSGPA !== null) {
    newCGPA = (prevCGPA * semsCompleted + currentSGPA) / (semsCompleted + 1);
  }

  if (newCGPA !== null) {
    const diff      = newCGPA - prevCGPA;
    const diffSign  = diff >= 0 ? '+' : '';
    const diffColor = diff >= 0 ? 'var(--green)' : 'var(--red)';
    projCurrent.innerHTML = `<div class="sgpa-proj-row"><span>Current CGPA (after ${semsCompleted} sems)</span><strong>${prevCGPA.toFixed(4)}</strong></div><div class="sgpa-proj-row"><span>Projected CGPA (after Sem ${semsCompleted + 1})</span><strong class="proj-new">${newCGPA.toFixed(4)} <span style="color:${diffColor};font-size:0.8rem;margin-left:4px">${diffSign}${diff.toFixed(4)}</span></strong></div>`;
  } else {
    projCurrent.innerHTML = `<div class="sgpa-proj-row"><span>Current CGPA (after ${semsCompleted} sems)</span><strong>${prevCGPA.toFixed(4)}</strong></div><div class="sgpa-hint">Enter grades above to see projected CGPA</div>`;
  }

  const targets = [7.0, 7.5, 8.0, 8.5, 9.0, 9.5];
  let html = '<div class="sgpa-targets-grid">';
  targets.forEach(tgt => {
    const neededSGPA = tgt * (semsCompleted + 1) - prevCGPA * semsCompleted;
    const feasible   = neededSGPA >= 0 && neededSGPA <= 10;
    const already    = prevCGPA >= tgt;
    const achieved   = newCGPA !== null && newCGPA >= tgt;

    let cls, icon, badge;
    if (already || achieved) { cls = 'tgt-achieved'; icon = 'v'; badge = already ? 'Already there!' : 'Achieved!'; }
    else if (feasible) { cls = 'tgt-possible'; icon = ''; badge = `Need SGPA >= ${neededSGPA.toFixed(2)}`; }
    else { cls = 'tgt-impossible'; icon = 'x'; badge = 'Need prior sems too'; }

    html += `<div class="sgpa-target-chip ${cls}"><div class="tgt-cgpa">CGPA ${tgt.toFixed(1)} <span>${icon}</span></div><div class="tgt-need">${badge}</div></div>`;
  });
  html += '</div>';
  projTargets.innerHTML = html;
}

// ── TARGET CGPA CALCULATOR ──────────────────────────
function calcTargetSGPA() {
  const targetCGPA    = parseFloat($sg('sgpa-target-cgpa') ? $sg('sgpa-target-cgpa').value : '');
  const prevCGPA      = parseFloat($sg('sgpa-cgpa-input') ? $sg('sgpa-cgpa-input').value : '');
  const semsCompleted = parseInt($sg('sgpa-sems-done-input') ? $sg('sgpa-sems-done-input').value : '4') || 4;
  const resultEl      = $sg('sgpa-target-result');
  if (!resultEl) return;

  if (isNaN(targetCGPA) || isNaN(prevCGPA)) { resultEl.innerHTML = '<div class="sgpa-target-msg warn">Please enter your current CGPA and a target CGPA first.</div>'; return; }
  if (targetCGPA < 0 || targetCGPA > 10) { resultEl.innerHTML = '<div class="sgpa-target-msg warn">CGPA must be between 0 and 10.</div>'; return; }

  const neededThisSem = targetCGPA * (semsCompleted + 1) - prevCGPA * semsCompleted;

  if (prevCGPA >= targetCGPA) { resultEl.innerHTML = `<div class="sgpa-target-msg success">You have already exceeded CGPA ${targetCGPA.toFixed(2)}! Keep it up!</div>`; return; }
  if (neededThisSem > 10) { resultEl.innerHTML = `<div class="sgpa-target-msg fail">To reach CGPA ${targetCGPA.toFixed(2)} after Sem ${semsCompleted + 1}, you need SGPA ${neededThisSem.toFixed(2)} which exceeds the max of 10. Consider targeting this over multiple remaining semesters.</div>`; return; }

  const active       = sgpaSubjects.filter(s => s.enabled);
  const totalCredits = active.reduce((a, s) => a + (parseInt(s.credits) || 0), 0);
  const weightedSum  = active.reduce((a, s) => { const g = parseFloat(s.grade); return a + (isNaN(g) ? 0 : g * (parseInt(s.credits) || 0)); }, 0);
  const currentSGPA = totalCredits > 0 ? weightedSum / totalCredits : null;

  let trackLine = '';
  if (currentSGPA !== null) {
    if (currentSGPA >= neededThisSem) trackLine = `<br>You are on track! Your current SGPA (${currentSGPA.toFixed(2)}) meets the requirement.`;
    else trackLine = `<br>You need to improve your semester average by ${(neededThisSem - currentSGPA).toFixed(2)} grade points.`;
  }

  resultEl.innerHTML = `<div class="sgpa-target-msg info">To reach CGPA ${targetCGPA.toFixed(2)} after Semester ${semsCompleted + 1}, score at least <span class="tgt-highlight">SGPA ${neededThisSem.toFixed(2)}</span> this semester.${trackLine}</div>`;
}

// ── LOAD PROFILE ────────────────────────────────────
function loadSGPAProfile(enroll) {
  if (!enroll) return;
  const e = enroll.trim().toUpperCase();
  localStorage.setItem('sgpa_enroll', e);

  const students = typeof CSE_STUDENTS !== 'undefined' ? CSE_STUDENTS : [];
  const student  = students.find(s => s.enroll.toUpperCase() === e);
  const profileEl = $sg('sgpa-profile-found');
  const cgpaInp   = $sg('sgpa-cgpa-input');

  if (student) {
    sgpaStudentProfile = student;
    if (student.cgpa && !isNaN(student.cgpa)) { cgpaInp.value = student.cgpa.toFixed(4); }
    profileEl.innerHTML = `<div class="sgpa-found-card"><div class="sgpa-found-avatar">${student.name.charAt(0)}</div><div class="sgpa-found-info"><div class="sgpa-found-name">${sgpaTitleCase(student.name)}</div><div class="sgpa-found-meta"><span>${student.enroll}</span><span>Rank #${student.rank}</span><span>CGPA ${student.cgpa ? student.cgpa.toFixed(4) : 'N/A'}</span></div></div><span class="sgpa-found-check">V</span></div>`;
    profileEl.classList.remove('hidden');
    calcSGPA();
  } else {
    sgpaStudentProfile = null;
    profileEl.innerHTML = `<div class="sgpa-not-found">Enrollment ${e} not found in CSE roster. Enter CGPA manually.</div>`;
    profileEl.classList.remove('hidden');
  }
}

// ── AUTOCOMPLETE ────────────────────────────────────
function initSGPAAutocomplete() {
  const input    = $sg('sgpa-enroll-input');
  const autoList = $sg('sgpa-autocomplete');
  if (!input || !autoList) return;

  const doLoad = () => { const val = input.value.trim(); if (val) loadSGPAProfile(val); autoList.classList.add('hidden'); };
  $sg('sgpa-enroll-btn') && $sg('sgpa-enroll-btn').addEventListener('click', doLoad);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doLoad(); });

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q || q.length < 2) { autoList.classList.add('hidden'); return; }
    const students = typeof CSE_STUDENTS !== 'undefined' ? CSE_STUDENTS : [];
    const matches  = students.filter(s => s.enroll.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)).slice(0, 6);
    if (!matches.length) { autoList.classList.add('hidden'); return; }
    autoList.innerHTML = matches.map(m => `<div class="autocomplete-item" data-enroll="${m.enroll}"><span class="ac-name">${sgpaTitleCase(m.name)}</span><span class="ac-enroll">${m.enroll}</span></div>`).join('');
    autoList.classList.remove('hidden');
  });

  autoList.addEventListener('click', e => {
    const item = e.target.closest('.autocomplete-item');
    if (item) { input.value = item.dataset.enroll; loadSGPAProfile(item.dataset.enroll); autoList.classList.add('hidden'); }
  });

  document.addEventListener('click', e => { if (!input.contains(e.target) && !autoList.contains(e.target)) autoList.classList.add('hidden'); });
}

// ── ADD SUBJECT ─────────────────────────────────────
function openAddSubjectDialog() {
  const name = (prompt('Course Name (e.g. OC, HM, Elective):') || '').trim();
  if (!name) return;
  const credits = parseInt(prompt('Credits for "' + name + '":', '3')) || 3;
  sgpaSubjects.push({ name, credits, grade: '', optional: true, removable: true, enabled: true });
  renderSubjectRows();
  calcSGPA();
  setTimeout(() => { const rows = document.querySelectorAll('.sgpa-row'); if (rows.length) rows[rows.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 80);
}

// ── DEBOUNCE ────────────────────────────────────────
function debounceCalc() { clearTimeout(_sgpaCalcTimer); _sgpaCalcTimer = setTimeout(() => { renderSubjectRows(); calcSGPA(); }, 200); }

// ── UTILS ───────────────────────────────────────────
function sgpaTitleCase(str) { return (str || '').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); }

// ── NAVIGATE PATCH ──────────────────────────────────
(function patchNavigate() {
  const orig = window.navigate;
  if (typeof orig !== 'function') return;
  window.navigate = function(page) { orig(page); if (page === 'sgpa') { renderSubjectRows(); calcSGPA(); } };
})();

// ── INIT ────────────────────────────────────────────
function initSGPA() {
  initSubjects();
  const saved = localStorage.getItem('sgpa_enroll') || localStorage.getItem('radar_last_enroll');
  if (saved) { const inp = $sg('sgpa-enroll-input'); if (inp) inp.value = saved; loadSGPAProfile(saved); }
  renderSubjectRows();
  calcSGPA();
  initSGPAAutocomplete();
  $sg('sgpa-add-subject-btn') && $sg('sgpa-add-subject-btn').addEventListener('click', openAddSubjectDialog);
  $sg('sgpa-cgpa-input') && $sg('sgpa-cgpa-input').addEventListener('input', () => calcSGPA());
  $sg('sgpa-sems-done-input') && $sg('sgpa-sems-done-input').addEventListener('input', () => calcSGPA());
  $sg('sgpa-calc-target-btn') && $sg('sgpa-calc-target-btn').addEventListener('click', calcTargetSGPA);
  $sg('sgpa-target-cgpa') && $sg('sgpa-target-cgpa').addEventListener('keydown', e => { if (e.key === 'Enter') calcTargetSGPA(); });
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initSGPA); } else { initSGPA(); }
