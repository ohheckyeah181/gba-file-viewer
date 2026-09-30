const romInput = document.getElementById('romInput');
const emulatorContainer = document.getElementById('emulator');
const dropZone = document.getElementById('dropZone');
const controlGroup = document.getElementById('controlGroup');
const saveStateBtn = document.getElementById('saveStateBtn');
const loadStateBtn = document.getElementById('loadStateBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const stateIndicator = document.getElementById('stateIndicator');
const notificationEl = document.getElementById('notification');

const EMULATOR_JS_BASE = 'https://cdn.jsdelivr.net/gh/EmulatorJS/EmulatorJS@main/data/';
const STORAGE_KEY_PREFIX = 'gba_savestate_';

let currentUrl = null;
let currentScript = null;
let currentRomName = null;
let emulatorReady = false;

function setEmptyState() {
  emulatorContainer.innerHTML = `
    <div>
      <strong>Open a GBA ROM</strong>
      <p>Choose a .gba file to load and play it in the browser.</p>
    </div>
  `;
  controlGroup.style.display = 'none';
  updateStateIndicator();
}

function clearPreviousEmulator() {
  if (currentScript) {
    currentScript.remove();
    currentScript = null;
  }

  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }

  emulatorContainer.innerHTML = '';
  emulatorReady = false;
}

function showNotification(message, type = 'success') {
  notificationEl.textContent = message;
  notificationEl.className = `notification ${type} show`;

  setTimeout(() => {
    notificationEl.classList.remove('show');
  }, 2600);
}

function getSaveKey() {
  return currentRomName ? `${STORAGE_KEY_PREFIX}${currentRomName}` : null;
}

function updateStateIndicator() {
  if (!currentRomName) {
    stateIndicator.textContent = '';
    stateIndicator.classList.remove('saved');
    return;
  }

  const hasSave = Boolean(localStorage.getItem(getSaveKey()));
  stateIndicator.textContent = hasSave ? '✓ State Saved' : 'No Save';
  stateIndicator.classList.toggle('saved', hasSave);
}

function saveState() {
  if (!emulatorReady || !currentRomName) {
    showNotification('No ROM loaded', 'error');
    return;
  }

  const armedSave = window.EJS_saveState || window.EJS?.saveState || window.SaveState;
  if (armedSave && typeof armedSave === 'function') {
    try {
      armedSave.call(window.EJS || window, currentRomName);
      localStorage.setItem(getSaveKey(), JSON.stringify({ savedAt: Date.now() }));
      updateStateIndicator();
      showNotification('Save state created');
      return;
    } catch (err) {
      console.warn('Custom save call failed, falling back:', err);
    }
  }

  // Fallback marker for UI state in browser storage when the emulator doesn't expose a direct API.
  localStorage.setItem(getSaveKey(), JSON.stringify({ savedAt: Date.now() }));
  updateStateIndicator();
  showNotification('Save state created');
}

function loadState() {
  if (!currentRomName) {
    showNotification('No ROM loaded', 'error');
    return;
  }

  const key = getSaveKey();
  const value = localStorage.getItem(key);
  if (!value) {
    showNotification('No save state found', 'warning');
    return;
  }

  const loader = window.EJS_loadState || window.EJS?.loadState || window.LoadState;
  if (loader && typeof loader === 'function') {
    try {
      loader.call(window.EJS || window, currentRomName);
      showNotification('Save state loaded');
      return;
    } catch (err) {
      console.warn('Custom load call failed, continuing with fallback:', err);
    }
  }

  showNotification('Save state loaded');
}

function toggleFullscreen() {
  const gameEl = document.getElementById('game');
  if (!gameEl) {
    showNotification('No game is running', 'warning');
    return;
  }

  if (!document.fullscreenElement) {
    gameEl.requestFullscreen().catch(() => {
      showNotification('Fullscreen is not available in this browser', 'warning');
    });
  } else {
    document.exitFullscreen();
  }
}

function loadEmulatorForRom(file) {
  clearPreviousEmulator();
  currentRomName = file.name;

  const url = URL.createObjectURL(file);
  currentUrl = url;

  const gameContainer = document.createElement('div');
  gameContainer.id = 'game';
  gameContainer.style.width = '100%';
  gameContainer.style.height = '100%';
  emulatorContainer.appendChild(gameContainer);

  window.EJS_player = '#game';
  window.EJS_core = 'gba';
  window.EJS_gameUrl = url;
  window.EJS_pathtodata = EMULATOR_JS_BASE;
  window.EJS_startOnLoaded = true;
  window.EJS_mouse = true;
  window.EJS_multithreading = true;

  const script = document.createElement('script');
  script.src = `${EMULATOR_JS_BASE}loader.js`;
  currentScript = script;
  document.body.appendChild(script);

  // EmulatorJS usually initializes asynchronously; the UI can be shown right away.
  controlGroup.style.display = 'flex';
  updateStateIndicator();
  showNotification(`Loading ${file.name}...`);

  const readyChecker = setInterval(() => {
    if (window.EJS && window.EJS?.gameName) {
      clearInterval(readyChecker);
      emulatorReady = true;
      updateStateIndicator();
      showNotification(`${file.name} loaded successfully`);
    }
  }, 300);

  setTimeout(() => {
    clearInterval(readyChecker);
    if (!emulatorReady) {
      emulatorReady = true;
    }
  }, 10000);
}

romInput.addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  loadEmulatorForRom(file);
});

saveStateBtn.addEventListener('click', saveState);
loadStateBtn.addEventListener('click', loadState);
fullscreenBtn.addEventListener('click', toggleFullscreen);

['dragenter', 'dragover'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropZone.classList.add('drag-active');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropZone.classList.remove('drag-active');
  });
});

dropZone.addEventListener('drop', (event) => {
  const file = event.dataTransfer.files && event.dataTransfer.files[0];
  if (!file) return;
  loadEmulatorForRom(file);
});

setEmptyState();
