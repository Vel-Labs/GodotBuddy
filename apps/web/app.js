let currentRun = new URLSearchParams(location.search).get('run') || null;
let hub = null;
let state = null;
let moodboard = null;
let topZ = 20;
const windowLabels = {
  goalWindow: 'Goal',
  moodboardWindow: 'Moodboard',
  progressWindow: 'Progress',
  assetWindow: 'Assets',
  qaWindow: 'QA Lab',
  receiptWindow: 'Receipts'
};
const windowDefaults = {
  goalWindow: { x: 140, y: 24, w: 820, h: 190, open: true },
  moodboardWindow: { x: 160, y: 240, w: 920, h: 560, open: true },
  progressWindow: { x: 1080, y: 64, w: 760, h: 420, open: false },
  assetWindow: { x: 1120, y: 510, w: 620, h: 330, open: false },
  qaWindow: { x: 640, y: 160, w: 420, h: 190, open: false },
  receiptWindow: { x: 980, y: 220, w: 520, h: 360, open: false }
};

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const el = (tag, attrs = {}, children = []) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v);
  }
  for (const c of children) n.append(c);
  return n;
};

async function json(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, data: reader.result });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function load() {
  hub = await json('/api/hub');
  moodboard = await json('/api/moodboard');
  if (!currentRun) currentRun = hub.active_run || (hub.runs[0] && hub.runs[0].slug) || null;
  state = currentRun ? await json(`/api/state?run=${encodeURIComponent(currentRun)}`) : null;
  render();
}

function initializeWindows() {
  $$('.window').forEach(win => {
    const defaults = windowDefaults[win.id] || { x: 180, y: 120, w: 520, h: 360, open: false };
    win.style.left = `${defaults.x}px`;
    win.style.top = `${defaults.y}px`;
    win.style.width = `${defaults.w}px`;
    win.style.height = `${defaults.h}px`;
    if (!defaults.open) win.classList.add('hidden');
    else win.classList.remove('hidden');
    win.dataset.open = defaults.open ? 'true' : 'false';
    win.dataset.minimized = 'false';
  });
  renderTaskButtons();
  syncDesktopIcons();
  setupWindowDragging();
  setupWindowControls();
  updateClock();
  setInterval(updateClock, 30_000);
}

function updateClock() {
  const clock = $('#clockPill');
  if (!clock) return;
  clock.textContent = new Intl.DateTimeFormat([], {
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date());
}

function renderTaskButtons() {
  const taskbar = $('#taskButtons');
  taskbar.innerHTML = '';
  $$('.window').forEach(win => {
    const button = el('button', {
      class: `taskButton ${win.classList.contains('hidden') ? '' : 'active'}`,
      'data-window': win.id,
      text: windowLabels[win.id] || win.id
    });
    button.addEventListener('click', () => openWindow(win.id));
    taskbar.append(button);
  });
}

function syncDesktopIcons() {
  $$('.desktopIcon').forEach(button => {
    const win = document.getElementById(button.dataset.window);
    button.classList.toggle('active', Boolean(win && !win.classList.contains('hidden')));
  });
}

function openWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;
  win.classList.remove('hidden', 'minimized');
  win.dataset.open = 'true';
  win.dataset.minimized = 'false';
  focusWindow(win);
  renderTaskButtons();
  syncDesktopIcons();
}

function closeWindow(win) {
  win.classList.add('hidden');
  win.dataset.open = 'false';
  win.dataset.minimized = 'false';
  renderTaskButtons();
  syncDesktopIcons();
}

function minimizeWindow(win) {
  win.classList.add('hidden', 'minimized');
  win.dataset.minimized = 'true';
  renderTaskButtons();
  syncDesktopIcons();
}

function focusWindow(win) {
  topZ += 1;
  win.style.zIndex = String(topZ);
  $$('.window').forEach(other => other.classList.toggle('focused', other === win));
}

function clampWindow(win) {
  const desktop = $('.desktop');
  const maxLeft = Math.max(0, desktop.clientWidth - win.offsetWidth - 12);
  const maxTop = Math.max(0, desktop.clientHeight - win.offsetHeight - 54);
  const left = Math.min(Math.max(0, parseFloat(win.style.left) || 0), maxLeft);
  const top = Math.min(Math.max(0, parseFloat(win.style.top) || 0), maxTop);
  win.style.left = `${left}px`;
  win.style.top = `${top}px`;
}

function setupWindowDragging() {
  $$('.window').forEach(win => {
    const title = win.querySelector('.titlebar');
    title.addEventListener('pointerdown', event => {
      if (event.target.closest('button')) return;
      if (matchMedia('(max-width: 760px)').matches) return;
      focusWindow(win);
      title.setPointerCapture(event.pointerId);
      const startX = event.clientX;
      const startY = event.clientY;
      const startLeft = parseFloat(win.style.left) || 0;
      const startTop = parseFloat(win.style.top) || 0;
      const move = moveEvent => {
        win.style.left = `${startLeft + moveEvent.clientX - startX}px`;
        win.style.top = `${startTop + moveEvent.clientY - startY}px`;
        clampWindow(win);
      };
      const up = () => {
        title.removeEventListener('pointermove', move);
        title.removeEventListener('pointerup', up);
        title.removeEventListener('pointercancel', up);
      };
      title.addEventListener('pointermove', move);
      title.addEventListener('pointerup', up);
      title.addEventListener('pointercancel', up);
    });
    win.addEventListener('pointerdown', () => focusWindow(win));
  });
}

function setupWindowControls() {
  $$('.windowButton').forEach(button => {
    button.addEventListener('click', event => {
      const win = event.target.closest('.window');
      if (button.dataset.action === 'close') closeWindow(win);
      if (button.dataset.action === 'minimize') minimizeWindow(win);
    });
  });
}

function render() {
  renderRunSelect();
  renderMoodboard();
  if (!state || state.error) {
    $('#statusPill').textContent = 'no run';
    $('#goalTitle').textContent = 'No GodotBuddy run found';
    $('#goalText').textContent = 'Run quickstart to create a guided board.';
    $('#oracleText').textContent = '';
    $('#board').innerHTML = '';
    $('#assetGrid').innerHTML = '';
    $('#receipts').innerHTML = '';
    return;
  }
  $('#statusPill').textContent = state.status || 'active';
  $('#goalTitle').textContent = state.title || state.slug;
  $('#goalText').textContent = state.goal || '';
  $('#oracleText').textContent = state.oracle && state.oracle.question || 'No oracle recorded yet.';
  $('#taskCount').textContent = `${state.tasks.length} tasks`;
  $('#assetCount').textContent = `${state.assets.length} assets`;
  $('#receiptCount').textContent = `${state.receipts.length} receipts`;
  renderBoard();
  renderAssets();
  renderReceipts();
}

function renderRunSelect() {
  const select = $('#runSelect');
  select.innerHTML = '';
  if (!hub || !hub.runs.length) {
    select.append(el('option', { text: 'No runs' }));
    return;
  }
  for (const run of hub.runs) {
    const option = el('option', { value: run.slug, text: run.title || run.slug });
    if (run.slug === currentRun) option.selected = true;
    select.append(option);
  }
}

function renderMoodboard() {
  const refs = moodboard && moodboard.references || [];
  $('#moodboardCount').textContent = `${refs.length} refs`;
  const grid = $('#moodboardGrid');
  grid.innerHTML = '';
  if (!refs.length) {
    grid.append(el('div', { class: 'emptyPanel', text: 'Drop in source art, notes, and style anchors here.' }));
  }
  for (const ref of refs) {
    const card = el('article', { class: 'moodCard' });
    card.append(el('button', { class: 'moodImageButton', 'data-id': ref.id }, [
      el('img', { src: `/workspace-file?path=${encodeURIComponent(ref.path)}`, alt: ref.title })
    ]));
    card.append(el('h3', { text: ref.title }));
    card.append(el('p', { class: 'muted', text: ref.use_for || 'No use note yet.' }));
    const tags = el('div', { class: 'tags' });
    for (const tag of (ref.tags || []).slice(0, 6)) tags.append(el('span', { class: 'tag', text: tag }));
    card.append(tags);
    grid.append(card);
  }
  $('#moodPrompt').textContent = composePrompt(refs);
  $$('.moodImageButton').forEach(button => {
    button.addEventListener('click', () => loadMoodIntoForm(button.dataset.id));
  });
}

function composePrompt(refs) {
  if (!refs.length) return 'No moodboard notes yet.';
  return refs
    .slice()
    .sort((a, b) => (b.weight || 0) - (a.weight || 0))
    .map(ref => {
      const parts = [
        `${ref.title} (weight ${ref.weight || 3})`,
        ref.tags && ref.tags.length ? `tags: ${ref.tags.join(', ')}` : '',
        ref.use_for ? `use for: ${ref.use_for}` : '',
        ref.notes ? `notes: ${ref.notes}` : '',
        ref.avoid ? `avoid: ${ref.avoid}` : ''
      ].filter(Boolean);
      return `- ${parts.join('; ')}`;
    })
    .join('\n');
}

function loadMoodIntoForm(id) {
  const ref = (moodboard.references || []).find(r => r.id === id);
  if (!ref) return;
  $('#moodTitle').value = ref.title || '';
  $('#moodUseFor').value = ref.use_for || '';
  $('#moodNotes').value = ref.notes || '';
  $('#moodAvoid').value = ref.avoid || '';
  $('#moodTags').value = (ref.tags || []).join(', ');
  $('#moodWeight').value = String(ref.weight || 3);
  $('#moodStatus').textContent = `Loaded ${ref.title}. Edits will update notes for this reference.`;
  $('#moodboardForm').dataset.editing = ref.id;
}

function renderBoard() {
  const board = $('#board');
  board.innerHTML = '';
  for (const lane of state.lanes) {
    const tasks = state.tasks.filter(t => t.lane === lane.id);
    const laneEl = el('div', { class: 'lane' });
    laneEl.append(el('div', { class: 'laneHeader' }, [
      el('h3', { text: lane.name }),
      el('span', { text: String(tasks.length) })
    ]));
    for (const task of tasks) {
      const taskEl = el('div', { class: `task ${task.status || ''}` });
      taskEl.append(el('h3', { text: task.title }));
      if (task.scope) taskEl.append(el('p', { text: task.scope }));
      taskEl.append(el('div', { class: 'taskMeta' }, [
        el('span', { text: task.agent || 'worker' }),
        el('span', { text: task.status || 'todo' })
      ]));
      laneEl.append(taskEl);
    }
    board.append(laneEl);
  }
}

function renderAssets() {
  const grid = $('#assetGrid');
  grid.innerHTML = '';
  if (!state.assets.length) {
    grid.append(el('div', { class: 'emptyPanel', text: 'Generated and final sprites will appear here with checkerboard previews.' }));
    return;
  }
  for (const asset of state.assets) {
    const card = el('div', { class: 'asset' });
    const preview = el('div', { class: 'assetPreview' });
    if (asset.thumbnail) {
      preview.append(el('img', { src: `/file?run=${encodeURIComponent(state.slug)}&path=${encodeURIComponent(asset.thumbnail)}`, alt: asset.name }));
    } else {
      preview.append(el('div', { class: 'empty', text: 'waiting for visual output' }));
    }
    card.append(preview);
    card.append(el('h3', { text: asset.name }));
    card.append(el('p', { class: 'muted', text: `${asset.type || 'asset'} · ${asset.status || 'requested'}` }));
    const tags = el('div', { class: 'tags' });
    for (const tag of [asset.style, ...(asset.states || []), ...(asset.animations || [])].filter(Boolean).slice(0, 8)) {
      tags.append(el('span', { class: 'tag', text: tag }));
    }
    card.append(tags);
    grid.append(card);
  }
}

function renderReceipts() {
  const list = $('#receipts');
  list.innerHTML = '';
  if (!state.receipts.length) {
    list.append(el('div', { class: 'emptyPanel', text: 'No receipts yet.' }));
    return;
  }
  for (const receipt of state.receipts.slice().reverse()) {
    const card = el('div', { class: 'receipt' });
    card.append(el('h3', { text: receipt.title }));
    if (receipt.body) card.append(el('p', { text: receipt.body }));
    card.append(el('p', { text: receipt.created_at || '' }));
    list.append(card);
  }
}

$('#refreshBtn').addEventListener('click', () => load().catch(err => alert(err.message)));
$('#runSelect').addEventListener('change', e => {
  currentRun = e.target.value;
  const url = new URL(location.href);
  url.searchParams.set('run', currentRun);
  history.replaceState(null, '', url);
  load().catch(err => alert(err.message));
});

$$('.desktopIcon').forEach(button => {
  button.addEventListener('click', () => {
    openWindow(button.dataset.window);
  });
});

$('#moodboardForm').addEventListener('submit', async e => {
  e.preventDefault();
  const status = $('#moodStatus');
  const editing = $('#moodboardForm').dataset.editing;
  const payload = {
    title: $('#moodTitle').value.trim(),
    useFor: $('#moodUseFor').value.trim(),
    notes: $('#moodNotes').value.trim(),
    avoid: $('#moodAvoid').value.trim(),
    tags: $('#moodTags').value.split(',').map(s => s.trim()).filter(Boolean),
    weight: Number($('#moodWeight').value || 3)
  };
  try {
    if (editing) {
      await json('/api/moodboard-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing, ...payload })
      });
      status.textContent = 'Updated moodboard notes.';
    } else {
      const files = Array.from($('#moodboardFiles').files || []);
      if (!files.length) {
        status.textContent = 'Choose at least one reference image.';
        return;
      }
      for (const file of files) {
        const ref = await readFileAsDataUrl(file);
        await json('/api/moodboard-reference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, name: ref.name, data: ref.data })
        });
      }
      status.textContent = `Added ${files.length} reference image${files.length === 1 ? '' : 's'}.`;
    }
    $('#moodboardForm').dataset.editing = '';
    await load();
  } catch (err) {
    status.textContent = err.message;
  }
});

$('#qaBtn').addEventListener('click', async () => {
  const status = $('#qaStatus');
  status.textContent = 'Running sprite QA...';
  try {
    const result = await json('/api/qa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ run: currentRun })
    });
    status.textContent = `Sprite QA: ${result.report.status} (${result.report.findings.length} findings)`;
    await load();
  } catch (err) {
    status.textContent = err.message;
  }
});

load().catch(err => {
  console.error(err);
  $('#statusPill').textContent = 'error';
  $('#goalTitle').textContent = 'Error loading board';
  $('#goalText').textContent = err.message;
});
setInterval(() => load().catch(console.error), 5000);
initializeWindows();
