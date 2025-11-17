const app = document.getElementById('app');
// touch-shapes: consolidated script
// Features: spawn random shapes at pointer/touch positions, play short sounds

const app = document.getElementById('app');
const SHAPES = ['circle','square','triangle'];

// --- helpers ---
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const randColor = () => `hsl(${randInt(0,360)} ${randInt(60,90)}% ${randInt(45,65)}%)`;

// --- shape creation ---
function createShapeAt(x, y){
  // Use a pooled element to reduce DOM churn
  const type = SHAPES[randInt(0, SHAPES.length - 1)];
  const size = randInt(26, 110);

  const el = acquireShapeEl();
  // reset classes and base styles
  el.className = 'shape ' + type;
  el.style.transition = '';
  el.style.opacity = '1';
  el.style.transform = `rotate(${randInt(0,360)}deg)`;

  if(type === 'triangle'){
    const base = Math.round(size * 0.6);
    const height = Math.round(size * 1.2);
    el.style.width = '0px';
    el.style.height = '0px';
    el.style.borderLeft = `${base}px solid transparent`;
    el.style.borderRight = `${base}px solid transparent`;
    el.style.borderBottom = `${height}px solid ${randColor()}`;
    el.style.left = `${x - base}px`;
    el.style.top = `${y - height}px`;
  } else {
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.left = `${x - size/2}px`;
    el.style.top = `${y - size/2}px`;
    el.style.background = randColor();
  }

  // schedule reuse after animation completes
  scheduleRecycle(el, 1600);
}

// --- pooling ---
const POOL_MAX = 60; // cap total pooled elements
const pool = [];
const inUse = new Set();

function acquireShapeEl(){
  let el = pool.pop();
  if(!el && (pool.length + inUse.size) < POOL_MAX){
    el = document.createElement('div');
    app.appendChild(el);
  }
  if(!el){
    // reuse the oldest in-use element (fallback)
    const it = inUse.values().next();
    if(it.done) el = document.createElement('div');
    else el = it.value;
  }
  inUse.add(el);
  return el;
}

function scheduleRecycle(el, delay){
  clearTimeout(el._recycleTimer);
  el._recycleTimer = setTimeout(()=>{
    // prepare for reuse
    inUse.delete(el);
    // clear inline styles that may accumulate
    el.style.removeProperty('width');
    el.style.removeProperty('height');
    el.style.removeProperty('left');
    el.style.removeProperty('top');
    el.style.removeProperty('background');
    el.style.removeProperty('border-left');
    el.style.removeProperty('border-right');
    el.style.removeProperty('border-bottom');
    el.style.opacity = '0';
    if(pool.length < POOL_MAX) pool.push(el);
    else el.remove();
  }, delay);
}

// --- Audio (Web Audio API) ---
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx(){
  if(audioCtx) return audioCtx;
  try{ audioCtx = new AudioCtx(); }catch(e){ audioCtx = null }
  return audioCtx;
}

function playFeedback(){
  const ctx = getAudioCtx();
  if(!ctx) return;

  const now = ctx.currentTime;

  // oscillator + percussive envelope
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = Math.random() < 0.5 ? 'sine' : 'triangle';
  const freq = 220 * Math.pow(2, rand(-1, 1));
  osc.frequency.setValueAtTime(freq, now);

  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.12 + Math.random()*0.18, now + 0.006);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.32 + Math.random()*0.28);

  // short noise click
  const buffer = ctx.createBuffer(1, 600, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i=0;i<data.length;i++) data[i] = (Math.random()*2 - 1) * Math.exp(-i/120);
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const ng = ctx.createGain();
  ng.gain.value = 0.06;

  osc.connect(g); g.connect(ctx.destination);
  noise.connect(ng); ng.connect(ctx.destination);

  osc.start(now);
  noise.start(now + 0.002);
  osc.stop(now + 0.35 + Math.random()*0.25);
  noise.stop(now + 0.06);
}

// --- unified pointer / touch handling ---
let isPointerDown = false;
let lastMoveTime = 0;
const MOVE_THROTTLE_MS = 80; // limit pointermove spawn rate

function spawnFromEvent(x, y){
  createShapeAt(x, y);
  playFeedback();
}

// pointer events cover mouse, touch (in many browsers) and pen
app.addEventListener('pointerdown', e => {
  isPointerDown = true;
  spawnFromEvent(e.clientX, e.clientY);
});

app.addEventListener('pointermove', e => {
  if(!isPointerDown) return;
  const now = performance.now();
  if(now - lastMoveTime < MOVE_THROTTLE_MS) return;
  lastMoveTime = now;
  spawnFromEvent(e.clientX, e.clientY);
});

['pointerup','pointercancel','pointerout','pointerleave'].forEach(ev =>
  window.addEventListener(ev, ()=> isPointerDown = false)
);

// Touch fallback for some mobile browsers: handle multi-touch
app.addEventListener('touchstart', e => {
  for(const t of e.changedTouches) spawnFromEvent(t.clientX, t.clientY);
}, {passive:true});

app.addEventListener('touchmove', e => {
  const now = performance.now();
  if(now - lastMoveTime < MOVE_THROTTLE_MS) return;
  lastMoveTime = now;
  for(const t of e.changedTouches) spawnFromEvent(t.clientX, t.clientY);
}, {passive:true});

// keyboard support: space/enter spawns at center
window.addEventListener('keydown', e => {
  if(e.key === ' ' || e.key === 'Enter') spawnFromEvent(window.innerWidth/2, window.innerHeight/2);
});

// ensure app uses full viewport height
function setAppHeight(){ app.style.height = window.innerHeight + 'px'; }
window.addEventListener('resize', setAppHeight);
setAppHeight();
