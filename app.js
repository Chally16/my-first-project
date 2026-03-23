/* ===================================================
   IRON LOG — Application Logic
   =================================================== */

// ===== DATA LAYER =====
const DB = {
  get:    (key) => JSON.parse(localStorage.getItem(key) || '[]'),
  set:    (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  getObj: (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  setObj: (key, val) => val == null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(val))
};

const K = {
  PLANS:   'il_plans',
  LOGS:    'il_logs',
  ONERM:   'il_onerm',
  METCONS: 'il_metcons',
  MLOG:    'il_metcon_logs',
  ACTIVE:  'il_active_workout'
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ===== STATE =====
let timerInterval   = null;
let editingPlanId   = null;
let editingMetconId = null;
let logMetconId     = null;
let viewingLogId    = null;

// ===================================================
// INIT
// ===================================================
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initModals();
  initPlanHandlers();
  initLogHandlers();
  initOneRMHandlers();
  initMetconHandlers();
  checkActiveWorkout();
  renderAll();
});

function renderAll() {
  renderPlans();
  renderLog();
  renderOneRMTracker();
  renderMetcons();
}

// ===================================================
// TABS
// ===================================================
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}

// ===================================================
// MODALS
// ===================================================
function initModals() {
  // Close buttons with data-modal
  document.querySelectorAll('[data-modal]').forEach(el => {
    el.addEventListener('click', () => closeModal(el.dataset.modal));
  });
  // Overlay click to close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
}

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.body.classList.remove('modal-open');
}

// ===================================================
// PLAN TAB
// ===================================================
function initPlanHandlers() {
  document.getElementById('btn-new-plan').addEventListener('click', () => openPlanModal());
  document.getElementById('btn-add-exercise').addEventListener('click', () => addExerciseRow());
  document.getElementById('btn-save-plan').addEventListener('click', savePlan);
}

function openPlanModal(planId = null) {
  editingPlanId = planId;
  document.getElementById('plan-modal-title').textContent = planId ? 'Edit Plan' : 'New Workout Plan';
  document.getElementById('plan-name').value = '';
  document.getElementById('plan-description').value = '';
  document.getElementById('plan-exercises-list').innerHTML = '';

  if (planId) {
    const plan = DB.get(K.PLANS).find(p => p.id === planId);
    if (plan) {
      document.getElementById('plan-name').value = plan.name;
      document.getElementById('plan-description').value = plan.description || '';
      plan.exercises.forEach(ex => addExerciseRow(ex));
    }
  } else {
    addExerciseRow(); // one blank row to start
  }

  openModal('modal-plan');
}

function addExerciseRow(ex = {}) {
  const row = document.createElement('div');
  row.className = 'exercise-row';
  row.innerHTML = `
    <div class="ex-row-inputs">
      <div class="form-group ex-name">
        <label>Exercise</label>
        <input type="text" class="ex-name-input" placeholder="e.g. Bench Press" value="${esc(ex.name || '')}" list="exercise-suggestions">
      </div>
      <div class="form-group">
        <label>Sets</label>
        <input type="number" class="ex-sets-input" placeholder="3" min="1" max="20" value="${esc(ex.sets || '')}">
      </div>
      <div class="form-group">
        <label>Reps</label>
        <input type="text" class="ex-reps-input" placeholder="5 or 3-5" value="${esc(ex.reps || '')}">
      </div>
      <div class="form-group">
        <label>Weight</label>
        <input type="text" class="ex-weight-input" placeholder="135 lbs" value="${esc(ex.weight || '')}">
      </div>
    </div>
    <div class="ex-row-footer">
      <input type="text" class="ex-notes-input" placeholder="Notes (optional)" value="${esc(ex.notes || '')}">
      <button class="btn-remove-exercise" title="Remove">✕</button>
    </div>`;
  row.querySelector('.btn-remove-exercise').addEventListener('click', () => row.remove());
  document.getElementById('plan-exercises-list').appendChild(row);
}

function savePlan() {
  const name = document.getElementById('plan-name').value.trim();
  if (!name) { showError('plan-name', 'Enter a plan name'); return; }

  const exercises = [];
  document.querySelectorAll('#plan-exercises-list .exercise-row').forEach(row => {
    const exName = row.querySelector('.ex-name-input').value.trim();
    if (exName) {
      exercises.push({
        id: uid(),
        name: exName,
        sets:   parseInt(row.querySelector('.ex-sets-input').value)  || 3,
        reps:   row.querySelector('.ex-reps-input').value.trim()  || '10',
        weight: row.querySelector('.ex-weight-input').value.trim() || '',
        notes:  row.querySelector('.ex-notes-input').value.trim()  || ''
      });
    }
  });

  const plans = DB.get(K.PLANS);
  const desc  = document.getElementById('plan-description').value.trim();

  if (editingPlanId) {
    const idx = plans.findIndex(p => p.id === editingPlanId);
    if (idx !== -1) plans[idx] = { ...plans[idx], name, description: desc, exercises };
  } else {
    plans.push({ id: uid(), name, description: desc, exercises, createdAt: new Date().toISOString() });
  }

  DB.set(K.PLANS, plans);
  closeModal('modal-plan');
  renderPlans();
}

function renderPlans() {
  const plans = DB.get(K.PLANS);
  const container = document.getElementById('plans-list');

  if (!plans.length) {
    container.innerHTML = emptyState('📋', 'No workout plans yet', 'Create your first plan to get started');
    return;
  }

  container.innerHTML = plans.map(plan => `
    <div class="card plan-card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${esc(plan.name)}</h3>
          ${plan.description ? `<p class="card-sub">${esc(plan.description)}</p>` : ''}
        </div>
        <div class="card-actions">
          <button class="btn btn-sm btn-primary" onclick="startFromPlan('${plan.id}')">Start</button>
          <button class="btn btn-sm btn-ghost" onclick="openPlanModal('${plan.id}')">Edit</button>
          <button class="btn-remove-exercise" onclick="deletePlan('${plan.id}')" title="Delete">✕</button>
        </div>
      </div>
      <div class="exercise-summary">
        ${plan.exercises.length
          ? plan.exercises.map(ex => `<span class="ex-chip">${esc(ex.name)}</span>`).join('')
          : '<span class="card-sub">No exercises added</span>'}
      </div>
      <div class="card-footer">
        <span class="card-meta">${plan.exercises.length} exercise${plan.exercises.length !== 1 ? 's' : ''}</span>
        <span class="card-meta">${fmtDate(plan.createdAt)}</span>
      </div>
    </div>`).join('');
}

function deletePlan(id) {
  if (!confirm('Delete this plan?')) return;
  DB.set(K.PLANS, DB.get(K.PLANS).filter(p => p.id !== id));
  renderPlans();
}

// ===================================================
// LOG TAB
// ===================================================
function initLogHandlers() {
  document.getElementById('btn-start-workout').addEventListener('click', openStartWorkoutModal);
  document.getElementById('btn-resume-workout').addEventListener('click', () => {
    renderActiveWorkout();
    openModal('modal-active-workout');
  });
  document.getElementById('btn-confirm-start-workout').addEventListener('click', confirmStartWorkout);
  document.getElementById('btn-finish-workout').addEventListener('click', finishWorkout);
}

function openStartWorkoutModal() {
  const plans = DB.get(K.PLANS);
  const sel   = document.getElementById('select-plan-for-workout');
  sel.innerHTML = '<option value="">— Freestyle Workout —</option>' +
    plans.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
  document.getElementById('workout-session-name').value = '';
  openModal('modal-start-workout');
}

function confirmStartWorkout() {
  const planId = document.getElementById('select-plan-for-workout').value;
  const name   = document.getElementById('workout-session-name').value.trim();

  if (planId) {
    startFromPlan(planId, name);
  } else {
    const active = {
      id: uid(), planId: null,
      name: name || 'Freestyle Workout',
      startTime: Date.now(),
      exercises: []
    };
    DB.setObj(K.ACTIVE, active);
    closeModal('modal-start-workout');
    renderActiveWorkout();
    openModal('modal-active-workout');
    startTimer();
    checkActiveWorkout();
  }
}

function startFromPlan(planId, overrideName = '') {
  const plan = DB.get(K.PLANS).find(p => p.id === planId);
  if (!plan) return;

  const active = {
    id: uid(),
    planId: plan.id,
    name: overrideName || plan.name,
    startTime: Date.now(),
    exercises: plan.exercises.map(ex => ({
      name: ex.name,
      notes: ex.notes || '',
      sets: Array.from({ length: ex.sets }, () => ({
        reps: ex.reps, weight: ex.weight, completed: false
      }))
    }))
  };

  DB.setObj(K.ACTIVE, active);
  closeModal('modal-start-workout');
  renderActiveWorkout();
  openModal('modal-active-workout');
  startTimer();
  checkActiveWorkout();
}

function renderActiveWorkout() {
  const active = DB.getObj(K.ACTIVE);
  if (!active) return;

  document.getElementById('active-workout-title').textContent = active.name;

  const container = document.getElementById('active-workout-exercises');
  container.innerHTML = '';

  active.exercises.forEach((ex, ei) => {
    const block = document.createElement('div');
    block.className = 'active-ex-block';

    const completedCount = ex.sets.filter(s => s.completed).length;

    block.innerHTML = `
      <div class="active-ex-header">
        <h4>${esc(ex.name)} <span style="font-weight:400;color:var(--text-dim);font-size:0.82rem;">${completedCount}/${ex.sets.length} sets</span></h4>
      </div>
      <div class="active-sets-table">
        <div class="set-row set-header">
          <span>Set</span><span>Weight</span><span>Reps</span><span>✓</span>
        </div>
        ${ex.sets.map((set, si) => `
          <div class="set-row ${set.completed ? 'set-done' : ''}" id="set-${ei}-${si}">
            <span class="set-num">${si + 1}</span>
            <input type="text" class="set-weight-input" value="${esc(set.weight)}"
              placeholder="wt" data-ei="${ei}" data-si="${si}" onchange="updateSet(this)">
            <input type="text" class="set-reps-input" value="${esc(set.reps)}"
              placeholder="reps" data-ei="${ei}" data-si="${si}" onchange="updateSet(this)">
            <button class="set-check-btn ${set.completed ? 'checked' : ''}"
              data-ei="${ei}" data-si="${si}" onclick="toggleSet(${ei},${si})">
              ${set.completed ? '✓' : '○'}
            </button>
          </div>`).join('')}
      </div>
      <button class="btn btn-sm btn-ghost btn-add-set" onclick="addSet(${ei})">+ Add Set</button>`;

    container.appendChild(block);
  });

  // "Add Exercise" button at bottom
  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-outline btn-full';
  addBtn.style.marginTop = '0.5rem';
  addBtn.textContent = '+ Add Exercise';
  addBtn.addEventListener('click', addExerciseToActive);
  container.appendChild(addBtn);
}

function toggleSet(ei, si) {
  const active = DB.getObj(K.ACTIVE);
  active.exercises[ei].sets[si].completed = !active.exercises[ei].sets[si].completed;
  DB.setObj(K.ACTIVE, active);
  renderActiveWorkout();
}

function updateSet(input) {
  const active = DB.getObj(K.ACTIVE);
  const { ei, si } = input.dataset;
  const field = input.classList.contains('set-weight-input') ? 'weight' : 'reps';
  active.exercises[ei].sets[si][field] = input.value;
  DB.setObj(K.ACTIVE, active);
}

function addSet(ei) {
  const active = DB.getObj(K.ACTIVE);
  const ex = active.exercises[ei];
  const last = ex.sets[ex.sets.length - 1] || {};
  ex.sets.push({ reps: last.reps || '', weight: last.weight || '', completed: false });
  DB.setObj(K.ACTIVE, active);
  renderActiveWorkout();
}

function addExerciseToActive() {
  const name = prompt('Exercise name:');
  if (!name || !name.trim()) return;
  const active = DB.getObj(K.ACTIVE);
  active.exercises.push({
    name: name.trim(), notes: '',
    sets: [{ reps: '', weight: '', completed: false }]
  });
  DB.setObj(K.ACTIVE, active);
  renderActiveWorkout();
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(tickTimer, 1000);
  tickTimer();
}

function tickTimer() {
  const active = DB.getObj(K.ACTIVE);
  if (!active) { clearInterval(timerInterval); timerInterval = null; return; }
  const elapsed  = Math.floor((Date.now() - active.startTime) / 1000);
  const display  = fmtDuration(elapsed);
  const timerEl  = document.getElementById('active-workout-timer-display');
  const bannerEl = document.getElementById('active-timer');
  if (timerEl)  timerEl.textContent  = display;
  if (bannerEl) bannerEl.textContent = display;
}

function finishWorkout() {
  if (!confirm('Finish and save this workout?')) return;
  const active = DB.getObj(K.ACTIVE);
  if (!active) return;

  const endTime  = Date.now();
  const duration = Math.floor((endTime - active.startTime) / 1000);
  const notes    = document.getElementById('active-workout-notes').value.trim();

  const log = {
    id: uid(),
    planId: active.planId,
    name: active.name,
    date: new Date().toISOString(),
    startTime: active.startTime,
    endTime,
    duration,
    exercises: active.exercises.map(ex => ({
      name: ex.name,
      sets: ex.sets.filter(s => s.completed),
      notes: ex.notes
    })),
    notes
  };

  const logs = DB.get(K.LOGS);
  logs.unshift(log);
  DB.set(K.LOGS, logs);

  DB.setObj(K.ACTIVE, null);
  clearInterval(timerInterval);
  timerInterval = null;

  closeModal('modal-active-workout');
  document.getElementById('active-workout-notes').value = '';
  checkActiveWorkout();
  renderLog();

  alert(`Workout saved!\nDuration: ${fmtDuration(duration)}`);
}

function checkActiveWorkout() {
  const active  = DB.getObj(K.ACTIVE);
  const banner  = document.getElementById('active-workout-banner');
  if (active) {
    banner.classList.remove('hidden');
    document.getElementById('active-workout-name').textContent = active.name;
    if (!timerInterval) startTimer();
  } else {
    banner.classList.add('hidden');
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }
}

function renderLog() {
  const logs      = DB.get(K.LOGS);
  const container = document.getElementById('log-list');

  if (!logs.length) {
    container.innerHTML = emptyState('📓', 'No workouts logged yet', 'Start a workout to begin tracking your progress');
    return;
  }

  container.innerHTML = logs.map(log => {
    const totalSets = log.exercises.reduce((n, ex) => n + (ex.sets ? ex.sets.length : 0), 0);
    return `
    <div class="card log-card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${esc(log.name)}</h3>
          <p class="card-sub">${fmtDate(log.date)}</p>
        </div>
        <div class="card-actions">
          <button class="btn btn-sm btn-ghost" onclick="openLogDetail('${log.id}')">View</button>
          <button class="btn-remove-exercise" onclick="deleteLog('${log.id}')" title="Delete">✕</button>
        </div>
      </div>
      <div class="log-stats">
        <div class="stat-chip">
          <span class="stat-val">${log.exercises.length}</span>
          <span class="stat-label">Exercises</span>
        </div>
        <div class="stat-chip">
          <span class="stat-val">${totalSets}</span>
          <span class="stat-label">Sets</span>
        </div>
        <div class="stat-chip">
          <span class="stat-val">${fmtDuration(log.duration)}</span>
          <span class="stat-label">Duration</span>
        </div>
      </div>
    </div>`}).join('');
}

function openLogDetail(id) {
  viewingLogId = id;
  const log = DB.get(K.LOGS).find(l => l.id === id);
  if (!log) return;

  document.getElementById('log-detail-title').textContent = log.name;

  const body = document.getElementById('log-detail-body');
  body.innerHTML = `
    <div class="log-detail-meta">
      <span class="badge">${fmtDate(log.date)}</span>
      <span class="badge">${fmtDuration(log.duration)}</span>
      ${log.exercises.length ? `<span class="badge">${log.exercises.length} exercises</span>` : ''}
    </div>
    ${log.exercises.map(ex => `
      <div class="log-ex-block">
        <p class="log-ex-name">${esc(ex.name)}</p>
        ${ex.sets && ex.sets.length ? `
          <table class="log-sets-table">
            <thead><tr><th>Set</th><th>Weight</th><th>Reps</th></tr></thead>
            <tbody>
              ${ex.sets.map((s, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${esc(s.weight) || '—'}</td>
                  <td>${esc(s.reps) || '—'}</td>
                </tr>`).join('')}
            </tbody>
          </table>` : '<p class="card-sub" style="margin-top:0.3rem">No sets recorded</p>'}
        ${ex.notes ? `<p class="log-ex-notes">${esc(ex.notes)}</p>` : ''}
      </div>`).join('')}
    ${log.notes ? `<div class="log-notes-block"><strong>Notes:</strong> ${esc(log.notes)}</div>` : ''}`;

  document.getElementById('btn-delete-log-from-modal').onclick = () => {
    deleteLog(id);
    closeModal('modal-log-detail');
  };

  openModal('modal-log-detail');
}

function deleteLog(id) {
  if (!confirm('Delete this workout log?')) return;
  DB.set(K.LOGS, DB.get(K.LOGS).filter(l => l.id !== id));
  renderLog();
}

// ===================================================
// 1RM TAB
// ===================================================
function initOneRMHandlers() {
  document.getElementById('btn-calculate').addEventListener('click', calculate1RM);
  document.getElementById('btn-save-onerm').addEventListener('click', save1RM);
  refreshExerciseSuggestions();
}

function calculate1RM() {
  const exercise = document.getElementById('calc-exercise').value.trim();
  const weight   = parseFloat(document.getElementById('calc-weight').value);
  const reps     = parseInt(document.getElementById('calc-reps').value);

  if (!weight || !reps || reps < 1) {
    showError('calc-weight', 'Enter weight and reps');
    return;
  }

  // Formulas
  const epley    = weight * (1 + reps / 30);
  const brzycki  = reps >= 37 ? epley : weight * (36 / (37 - reps));
  const lombardi = weight * Math.pow(reps, 0.1);
  const oconner  = weight * (1 + 0.025 * reps);
  const mayhew   = (100 * weight) / (52.2 + 41.9 * Math.exp(-0.055 * reps));

  const primary = Math.round(epley);

  document.getElementById('onerm-value').textContent = `${primary} lbs`;
  document.getElementById('onerm-exercise-name').textContent = exercise || 'Estimated 1RM';

  document.getElementById('formula-rows').innerHTML = [
    ['Epley',    epley],
    ['Brzycki',  brzycki],
    ['Lombardi', lombardi],
    ["O'Conner", oconner],
    ['Mayhew',   mayhew]
  ].map(([name, val]) => `
    <tr><td>${name}</td><td>${Math.round(val)} lbs</td></tr>`).join('');

  const pcts = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];
  document.getElementById('pct-grid').innerHTML = pcts.map(pct => `
    <div class="pct-cell">
      <span class="pct-label">${pct}%</span>
      <span class="pct-val">${Math.round(primary * pct / 100)}</span>
    </div>`).join('');

  const resultEl = document.getElementById('calc-result');
  resultEl.dataset.weight   = weight;
  resultEl.dataset.reps     = reps;
  resultEl.dataset.onerm    = primary;
  resultEl.dataset.exercise = exercise;
  resultEl.classList.remove('hidden');
}

function save1RM() {
  const el       = document.getElementById('calc-result');
  const exercise = el.dataset.exercise;
  const weight   = parseFloat(el.dataset.weight);
  const reps     = parseInt(el.dataset.reps);
  const est1RM   = parseInt(el.dataset.onerm);

  if (!exercise) { alert('Add an exercise name before saving.'); return; }

  const records = DB.get(K.ONERM);
  let entry = records.find(r => r.exercise.toLowerCase() === exercise.toLowerCase());

  const newRec = { date: new Date().toISOString(), weight, reps, estimated1RM: est1RM };

  if (entry) {
    entry.records.unshift(newRec);
    entry.best = Math.max(...entry.records.map(r => r.estimated1RM));
  } else {
    records.push({ id: uid(), exercise, best: est1RM, records: [newRec] });
  }

  DB.set(K.ONERM, records);
  renderOneRMTracker();
  refreshExerciseSuggestions();
  alert(`Saved! ${exercise} — ${est1RM} lbs`);
}

function renderOneRMTracker() {
  const records   = DB.get(K.ONERM);
  const container = document.getElementById('onerm-tracker-list');

  if (!records.length) {
    container.innerHTML = emptyState('🏋️', 'No PRs tracked yet', 'Calculate your 1RM above and save it to start tracking');
    return;
  }

  container.innerHTML = records.map(r => {
    const best = Math.max(...r.records.map(rec => rec.estimated1RM));
    return `
    <div class="card onerm-card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${esc(r.exercise)}</h3>
          <p class="card-sub">Best: <strong style="color:var(--accent)">${best} lbs</strong> &nbsp;·&nbsp; ${r.records.length} session${r.records.length !== 1 ? 's' : ''}</p>
        </div>
        <div class="card-actions">
          <button class="btn-remove-exercise" onclick="deleteOneRM('${r.id}')" title="Delete">✕</button>
        </div>
      </div>
      <div class="onerm-history">
        ${r.records.slice(0, 6).map((rec, i) => `
          <div class="onerm-history-row ${rec.estimated1RM === best && i === r.records.findIndex(x => x.estimated1RM === best) ? 'is-pr' : ''}">
            <span class="onerm-hist-date">${fmtDate(rec.date)}</span>
            <span class="onerm-hist-detail">${rec.weight} lbs × ${rec.reps} reps</span>
            <span class="onerm-hist-1rm">${rec.estimated1RM} lbs</span>
            ${rec.estimated1RM === best && i === r.records.findIndex(x => x.estimated1RM === best) ? '<span class="pr-badge">PR</span>' : ''}
          </div>`).join('')}
        ${r.records.length > 6 ? `<p class="card-sub" style="text-align:center;margin-top:0.4rem">+ ${r.records.length - 6} more</p>` : ''}
      </div>
    </div>`}).join('');
}

function deleteOneRM(id) {
  if (!confirm('Delete all records for this exercise?')) return;
  DB.set(K.ONERM, DB.get(K.ONERM).filter(r => r.id !== id));
  renderOneRMTracker();
}

function refreshExerciseSuggestions() {
  const dl = document.getElementById('exercise-suggestions');
  if (!dl) return;
  dl.innerHTML = DB.get(K.ONERM).map(r => `<option value="${esc(r.exercise)}">`).join('');
}

// ===================================================
// METCON TAB
// ===================================================
function initMetconHandlers() {
  document.getElementById('btn-new-metcon').addEventListener('click', () => openMetconModal());
  document.getElementById('btn-add-metcon-movement').addEventListener('click', () => addMovementRow());
  document.getElementById('btn-save-metcon').addEventListener('click', saveMetcon);
  document.getElementById('btn-save-metcon-log').addEventListener('click', saveMetconLog);
  document.getElementById('metcon-type').addEventListener('change', syncMetconTypeFields);
}

function openMetconModal(metconId = null) {
  editingMetconId = metconId;
  document.getElementById('metcon-modal-title').textContent = metconId ? 'Edit METCON' : 'New METCON';
  document.getElementById('metcon-name').value = '';
  document.getElementById('metcon-type').value = 'For Time';
  document.getElementById('metcon-duration').value = '';
  document.getElementById('metcon-rounds').value = '';
  document.getElementById('metcon-description').value = '';
  document.getElementById('metcon-movements-list').innerHTML = '';

  if (metconId) {
    const m = DB.get(K.METCONS).find(m => m.id === metconId);
    if (m) {
      document.getElementById('metcon-name').value       = m.name;
      document.getElementById('metcon-type').value       = m.type;
      document.getElementById('metcon-duration').value   = m.duration || '';
      document.getElementById('metcon-rounds').value     = m.rounds || '';
      document.getElementById('metcon-description').value = m.description || '';
      m.movements.forEach(mv => addMovementRow(mv));
    }
  } else {
    addMovementRow();
  }

  syncMetconTypeFields();
  openModal('modal-metcon');
}

function syncMetconTypeFields() {
  const type       = document.getElementById('metcon-type').value;
  const timeGroup  = document.getElementById('metcon-time-group');
  const roundGroup = document.getElementById('metcon-rounds-group');
  const timeLabel  = document.getElementById('metcon-time-label');

  timeGroup.style.display  = '';
  roundGroup.style.display = 'none';

  switch (type) {
    case 'AMRAP':          timeLabel.textContent = 'Time (min)'; break;
    case 'EMOM':           timeLabel.textContent = 'Duration (min)'; break;
    case 'For Time':       timeLabel.textContent = 'Time Cap (min)'; break;
    case 'Rounds For Time':
      timeLabel.textContent    = 'Time Cap (min)';
      roundGroup.style.display = '';
      break;
    case 'Tabata':
      timeGroup.style.display = 'none';
      break;
    default: timeLabel.textContent = 'Time (min)';
  }
}

function addMovementRow(mv = {}) {
  const row = document.createElement('div');
  row.className = 'movement-row';
  row.innerHTML = `
    <div class="mv-row-inputs">
      <div class="form-group">
        <label>Movement</label>
        <input type="text" class="mv-name-input" placeholder="e.g. Thrusters, Pull-ups" value="${esc(mv.name || '')}">
      </div>
      <div class="form-group">
        <label>Reps / Scheme</label>
        <input type="text" class="mv-reps-input" placeholder="21-15-9" value="${esc(mv.reps || '')}">
      </div>
      <div class="form-group">
        <label>Weight / Load</label>
        <input type="text" class="mv-weight-input" placeholder="95/65 lbs" value="${esc(mv.weight || '')}">
      </div>
    </div>
    <div class="mv-row-footer">
      <input type="text" class="mv-notes-input" placeholder="Notes / scaling (optional)" value="${esc(mv.notes || '')}">
      <button class="btn-remove-exercise" title="Remove">✕</button>
    </div>`;
  row.querySelector('.btn-remove-exercise').addEventListener('click', () => row.remove());
  document.getElementById('metcon-movements-list').appendChild(row);
}

function saveMetcon() {
  const name = document.getElementById('metcon-name').value.trim();
  if (!name) { showError('metcon-name', 'Enter a METCON name'); return; }

  const movements = [];
  document.querySelectorAll('#metcon-movements-list .movement-row').forEach(row => {
    const mvName = row.querySelector('.mv-name-input').value.trim();
    if (mvName) {
      movements.push({
        name:   mvName,
        reps:   row.querySelector('.mv-reps-input').value.trim(),
        weight: row.querySelector('.mv-weight-input').value.trim(),
        notes:  row.querySelector('.mv-notes-input').value.trim()
      });
    }
  });

  const metcon = {
    name,
    type:        document.getElementById('metcon-type').value,
    duration:    parseInt(document.getElementById('metcon-duration').value) || null,
    rounds:      parseInt(document.getElementById('metcon-rounds').value)   || null,
    description: document.getElementById('metcon-description').value.trim(),
    movements
  };

  const metcons = DB.get(K.METCONS);
  if (editingMetconId) {
    const idx = metcons.findIndex(m => m.id === editingMetconId);
    if (idx !== -1) metcons[idx] = { ...metcons[idx], ...metcon };
  } else {
    metcons.push({ id: uid(), ...metcon, createdAt: new Date().toISOString() });
  }

  DB.set(K.METCONS, metcons);
  closeModal('modal-metcon');
  renderMetcons();
}

function renderMetcons() {
  const metcons   = DB.get(K.METCONS);
  const mlogs     = DB.get(K.MLOG);
  const container = document.getElementById('metcon-list');

  if (!metcons.length) {
    container.innerHTML = emptyState('⏱️', 'No METCONs yet', 'Build your first conditioning workout');
    return;
  }

  container.innerHTML = metcons.map(m => {
    const logs     = mlogs.filter(l => l.metconId === m.id);
    const typeLabel = metconTypeLabel(m);

    return `
    <div class="card metcon-card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${esc(m.name)}</h3>
          <p class="card-sub">${typeLabel}</p>
        </div>
        <div class="card-actions">
          <button class="btn btn-sm btn-primary" onclick="openLogMetconModal('${m.id}')">Log</button>
          <button class="btn btn-sm btn-ghost" onclick="openMetconModal('${m.id}')">Edit</button>
          <button class="btn-remove-exercise" onclick="deleteMetcon('${m.id}')" title="Delete">✕</button>
        </div>
      </div>

      ${m.description ? `<p class="metcon-description">${esc(m.description)}</p>` : ''}

      <div class="movements-list">
        ${m.movements.map(mv => `
          <div class="movement-display">
            <span class="mv-reps">${esc(mv.reps)}</span>
            <span class="mv-name">${esc(mv.name)}</span>
            ${mv.weight ? `<span class="mv-weight">@ ${esc(mv.weight)}</span>` : ''}
          </div>`).join('')}
      </div>

      ${logs.length ? `
        <div class="metcon-results">
          <h5>Recent Results</h5>
          ${logs.slice(0, 3).map(l => `
            <div class="metcon-result-row">
              <span class="result-date">${fmtDate(l.date)}</span>
              <span class="result-score">${esc(l.result)}</span>
              <span class="result-rx ${l.rx === 'Rx' ? 'badge-success' : 'badge-warning'}">${esc(l.rx)}</span>
              ${l.rating ? '<span style="font-size:0.8rem">' + ratingEmoji(l.rating) + '</span>' : ''}
            </div>`).join('')}
        </div>` : ''}
    </div>`}).join('');
}

function deleteMetcon(id) {
  if (!confirm('Delete this METCON?')) return;
  DB.set(K.METCONS, DB.get(K.METCONS).filter(m => m.id !== id));
  renderMetcons();
}

function openLogMetconModal(metconId) {
  logMetconId = metconId;
  const m = DB.get(K.METCONS).find(m => m.id === metconId);
  if (!m) return;

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('metcon-log-date').value   = today;
  document.getElementById('metcon-log-result').value = '';
  document.getElementById('metcon-log-rx').value     = 'Rx';
  document.getElementById('metcon-log-rating').value = '';
  document.getElementById('metcon-log-notes').value  = '';

  const label = document.getElementById('metcon-result-label');
  if (m.type === 'AMRAP')                       label.textContent = 'Rounds + Reps';
  else if (m.type === 'EMOM')                   label.textContent = 'Completed / Total';
  else if (['For Time','Rounds For Time'].includes(m.type)) label.textContent = 'Time (e.g. 3:45)';
  else                                          label.textContent = 'Result / Score';

  document.getElementById('metcon-log-info').innerHTML = `
    <strong>${esc(m.name)}</strong>
    <span class="badge">${metconTypeLabel(m)}</span>`;

  openModal('modal-log-metcon');
}

function saveMetconLog() {
  const result = document.getElementById('metcon-log-result').value.trim();
  if (!result) { showError('metcon-log-result', 'Enter a result'); return; }

  const m = DB.get(K.METCONS).find(m => m.id === logMetconId);

  const log = {
    id:         uid(),
    metconId:   logMetconId,
    metconName: m ? m.name : '',
    date:       document.getElementById('metcon-log-date').value,
    result,
    rx:         document.getElementById('metcon-log-rx').value,
    rating:     document.getElementById('metcon-log-rating').value,
    notes:      document.getElementById('metcon-log-notes').value.trim()
  };

  const logs = DB.get(K.MLOG);
  logs.unshift(log);
  DB.set(K.MLOG, logs);

  closeModal('modal-log-metcon');
  renderMetcons();
  alert('Result saved!');
}

// ===================================================
// UTILITIES
// ===================================================

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDuration(seconds) {
  if (!seconds || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

function pad(n) { return String(n).padStart(2, '0'); }

function emptyState(icon, title, sub) {
  return `<div class="empty-state">
    <p class="empty-icon">${icon}</p>
    <p class="empty-title">${title}</p>
    <p class="empty-sub">${sub}</p>
  </div>`;
}

function showError(inputId, msg) {
  const el = document.getElementById(inputId);
  if (!el) { alert(msg); return; }
  el.style.borderColor = 'var(--danger)';
  el.focus();
  setTimeout(() => (el.style.borderColor = ''), 2000);
}

function metconTypeLabel(m) {
  switch (m.type) {
    case 'AMRAP':
      return `AMRAP${m.duration ? ' ' + m.duration + ' min' : ''}`;
    case 'EMOM':
      return `EMOM${m.duration ? ' ' + m.duration + ' min' : ''}`;
    case 'For Time':
      return `For Time${m.duration ? ' (' + m.duration + ' min cap)' : ''}`;
    case 'Rounds For Time':
      return `${m.rounds || '?'} Rounds For Time${m.duration ? ' (' + m.duration + ' min cap)' : ''}`;
    case 'Tabata':
      return 'Tabata · 20 on / 10 off × 8';
    case 'Chipper':
      return `Chipper${m.duration ? ' (' + m.duration + ' min cap)' : ''}`;
    default:
      return m.type || '';
  }
}

function ratingEmoji(r) {
  return ['', '😵', '😓', '😐', '😁', '💪'][parseInt(r)] || '';
}
