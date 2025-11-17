const app = document.getElementById('app');

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