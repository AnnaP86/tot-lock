const app = document.getElementById('app');

// canvas elements
const canvas = document.getElementById('drawCanvas');
const clearBtn = document.getElementById('clearCanvas');
const colorPicker = document.getElementById('drawColor');
const widthRange = document.getElementById('drawWidth');
const toggleDrawBtn = document.getElementById('toggleDraw');
let isDrawingEnabled = true;

// drawing state
let ctx = null;
let drawing = false;
let lastPoint = null;

function setupCanvas(){
  if(!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function clearCanvas(){
  if(!ctx) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
}

function startDraw(x,y, pressure = 0.5, tilt = {x:0,y:0}){
  if(!isDrawingEnabled) return;
  drawing = true;
  lastPoint = {x, y};
  // apply initial stroke based on pressure/tilt
  applyStrokeParams(pressure, tilt);
  canvas.classList.add('drawing');
}

function drawTo(x,y, pressure = 0.5, tilt = {x:0,y:0}){
  if(!drawing || !ctx) return;
  applyStrokeParams(pressure, tilt);
  ctx.beginPath();
  ctx.moveTo(lastPoint.x, lastPoint.y);
  ctx.lineTo(x, y);
  ctx.stroke();
  lastPoint = {x, y};
}

function endDraw(){
  drawing = false;
  lastPoint = null;
  canvas.classList.remove('drawing');
}

function applyStrokeParams(pressure, tilt){
  const base = widthRange ? parseInt(widthRange.value,10) : 6;
  // pressure ranges 0..1 (default 0.5), scale width between 30% and 200% of base
  const p = (typeof pressure === 'number') ? pressure : 0.5;
  ctx.lineWidth = Math.max(1, base * (0.3 + p * 1.7));
  // tilt can be used to slightly vary alpha; map tilt magnitude to 0.6-1.0
  const tiltMag = Math.min(1, Math.hypot(tilt.x || 0, tilt.y || 0) / 90);
  const alpha = 0.6 + Math.min(0.4, tiltMag);
  // set stroke style with alpha preserved from colorPicker (hex -> rgba)
  const color = colorPicker ? colorPicker.value : '#ff6b6b';
  ctx.strokeStyle = hexToRgba(color, alpha);
}

function hexToRgba(hex, alpha){
  // accept #rgb or #rrggbb
  if(!hex) return `rgba(255,107,107,${alpha})`;
  let h = hex.replace('#','');
  if(h.length === 3) h = h.split('').map(c=>c+c).join('');
  const r = parseInt(h.substring(0,2),16);
  const g = parseInt(h.substring(2,4),16);
  const b = parseInt(h.substring(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// pointer handling for canvas
if(canvas){
  // ensure size on load and resize
  window.addEventListener('load', setupCanvas);
  window.addEventListener('resize', ()=>{ setupCanvas(); });

  // pointer events
  canvas.addEventListener('pointerdown', (e)=>{
    // stop the app from spawning shapes while drawing
    e.stopPropagation();
    const pressure = (typeof e.pressure === 'number') ? e.pressure : (e.pointerType === 'mouse' ? 0.5 : 0.5);
    const tilt = { x: e.tiltX || 0, y: e.tiltY || 0 };
    startDraw(e.offsetX, e.offsetY, pressure, tilt);
  });
  canvas.addEventListener('pointermove', (e)=>{ if(drawing) drawTo(e.offsetX, e.offsetY, (typeof e.pressure === 'number' ? e.pressure : 0.5), {x: e.tiltX || 0, y: e.tiltY || 0}); });
  window.addEventListener('pointerup', ()=> endDraw());
  window.addEventListener('pointercancel', ()=> endDraw());

  // support touchstart/move with passive false to allow preventDefault if needed
  canvas.addEventListener('touchstart', (ev)=>{
    ev.preventDefault();
    for(const t of ev.changedTouches){
      const rect = canvas.getBoundingClientRect();
      const x = t.clientX - rect.left;
      const y = t.clientY - rect.top;
      // Touch.force is available on some devices (0..1)
      const pressure = (typeof t.force === 'number') ? t.force : 0.5;
      startDraw(x, y, pressure, {x:0,y:0});
    }
  }, {passive:false});
  canvas.addEventListener('touchmove', (ev)=>{
    ev.preventDefault();
    for(const t of ev.changedTouches){
      const rect = canvas.getBoundingClientRect();
      const x = t.clientX - rect.left;
      const y = t.clientY - rect.top;
      const pressure = (typeof t.force === 'number') ? t.force : 0.5;
      drawTo(x, y, pressure, {x:0,y:0});
    }
  }, {passive:false});
  canvas.addEventListener('touchend', (ev)=>{ ev.preventDefault(); endDraw(); }, {passive:false});

  if(clearBtn) clearBtn.addEventListener('click', clearCanvas);
  if(toggleDrawBtn) toggleDrawBtn.addEventListener('click', ()=>{
    isDrawingEnabled = !isDrawingEnabled;
    toggleDrawBtn.setAttribute('aria-pressed', isDrawingEnabled ? 'true' : 'false');
    toggleDrawBtn.textContent = `Drawing: ${isDrawingEnabled ? 'On' : 'Off'}`;
  });
}

const SHAPES = ['circle','square','triangle'];

function rand(min, max){ return Math.random()*(max-min)+min }
function randInt(min,max){ return Math.floor(rand(min,max+1)) }
function randColor(){ return `hsl(${randInt(0,360)} ${randInt(60,90)}% ${randInt(45,65)}%)` }

function createShape(x, y){
  const type = SHAPES[randInt(0, SHAPES.length-1)];
  const el = document.createElement('div');
  el.className = 'shape ' + type;

  const size = randInt(26, 110);

  if(type === 'triangle'){
    // triangle uses borders; adjust sizes
    const border = Math.round(size * 0.6);
    el.style.borderLeft = `${border}px solid transparent`;
    el.style.borderRight = `${border}px solid transparent`;
    el.style.borderBottom = `${Math.round(size*1.2)}px solid ${randColor()}`;
    el.style.width = '0px';
    el.style.height = '0px';
    el.style.left = `${x - border}px`;
    el.style.top = `${y - Math.round(size*1.2)}px`;
  } else {
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.left = `${x - size/2}px`;
    el.style.top = `${y - size/2}px`;
    el.style.background = randColor();
  }

  // random rotation
  const rot = randInt(0, 360);
  el.style.transform = `rotate(${rot}deg)`;

  app.appendChild(el);

  // remove after animation
  setTimeout(()=> el.remove(), 1500);
}

function handlePointer(x, y){
  // if the user is drawing on the canvas, skip spawning shapes
  const el = document.elementFromPoint(x, y);
  if(el && el.closest && el.closest('#drawCanvas')) return;
  createShape(x, y);
  if(!isMuted()) playSound();
}

// support touch and mouse/pointer
let ongoing = false;

app.addEventListener('pointerdown', (e)=>{
  ongoing = true;
  handlePointer(e.clientX, e.clientY);
});

app.addEventListener('pointermove', (e)=>{
  if(!ongoing) return;
  // throttle by movement
  if(Math.random() < 0.4) handlePointer(e.clientX, e.clientY);
});

window.addEventListener('pointerup', ()=> ongoing = false);
window.addEventListener('pointercancel', ()=> ongoing = false);

// make sure app fills viewport and receives pointer events
function resize(){
  app.style.height = window.innerHeight + 'px';
}
window.addEventListener('resize', resize);
resize();

// touch: allow multi-touch
app.addEventListener('touchstart', (ev)=>{
  for(const t of ev.changedTouches) handlePointer(t.clientX, t.clientY);
}, {passive:true});

app.addEventListener('touchmove', (ev)=>{
  for(const t of ev.changedTouches) if(Math.random()<0.25) handlePointer(t.clientX, t.clientY);
}, {passive:true});

// small accessibility: keyboard to spawn at center
window.addEventListener('keydown', (e)=>{
  if(e.key === ' ' || e.key === 'Enter') handlePointer(window.innerWidth/2, window.innerHeight/2);
});

// --- Web Audio: short feedback sound with master gain and volume control ---
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let masterGain = null;

// mute state persisted in localStorage
const MUTE_KEY = 'touch-shapes-muted';
const VOLUME_KEY = 'touch-shapes-volume';
const muteBtn = document.getElementById('muteBtn');
const volSlider = document.getElementById('volumeSlider');

function isMuted(){ return localStorage.getItem(MUTE_KEY) === '1'; }
function setMuted(v){ localStorage.setItem(MUTE_KEY, v ? '1' : '0'); updateMuteUI(); }
function updateMuteUI(){ if(!muteBtn) return; const m = isMuted(); muteBtn.setAttribute('aria-pressed', m ? 'true' : 'false'); muteBtn.textContent = m ? '🔇' : '🔊'; }
if(muteBtn) muteBtn.addEventListener('click', ()=> setMuted(!isMuted()));
updateMuteUI();

function getSavedVolume(){
  const v = parseFloat(localStorage.getItem(VOLUME_KEY));
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.8;
}

function ensureAudio(){
  if(audioCtx) return audioCtx;
  try{ audioCtx = new AudioCtx(); }catch(e){ audioCtx = null }
  if(audioCtx){
    masterGain = audioCtx.createGain();
    masterGain.gain.value = getSavedVolume();
    masterGain.connect(audioCtx.destination);
    // wire slider
    if(volSlider){
      volSlider.value = String(masterGain.gain.value);
      volSlider.addEventListener('input', (ev)=>{
        const val = parseFloat(ev.target.value);
        masterGain.gain.value = val;
        localStorage.setItem(VOLUME_KEY, String(val));
      });
    }
  }
  return audioCtx;
}

function playSound(){
  const ctx = ensureAudio();
  if(!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = Math.random() < 0.5 ? 'sine' : 'triangle';
  const freq = 220 * Math.pow(2, (Math.random()*2 - 1));
  osc.frequency.setValueAtTime(freq, now);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.12 + Math.random()*0.18, now + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
  osc.connect(g);
  if(masterGain) g.connect(masterGain); else g.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.36 + Math.random()*0.18);
}