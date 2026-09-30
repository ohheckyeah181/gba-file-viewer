const romInput = document.getElementById('romInput');
const emulatorContainer = document.getElementById('emulator');
const dropZone = document.getElementById('dropZone');

const EMULATOR_JS_BASE = 'https://cdn.jsdelivr.net/gh/EmulatorJS/EmulatorJS@main/data/';

let currentUrl = null;
let currentScript = null;

function setEmptyState() {
  emulatorContainer.innerHTML = `
    <div>
      <strong>Open a GBA ROM</strong>
      <p>Choose a .gba file to load and play it in the browser.</p>
    </div>
  `;
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
}

function loadEmulatorForRom(file) {
  clearPreviousEmulator();

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
}

romInput.addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  loadEmulatorForRom(file);
});

['dragenter', 'dragover'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add('drag-active');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove('drag-active');
  });
});

dropZone.addEventListener('drop', (event) => {
  const file = event.dataTransfer.files && event.dataTransfer.files[0];
  if (!file) return;
  loadEmulatorForRom(file);
});

setEmptyState();
