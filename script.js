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
  playSound();
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

// --- Web Audio: short feedback sounds ---
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function ensureAudio(){
  if(audioCtx) return audioCtx;
  try{ audioCtx = new AudioCtx(); }catch(e){ audioCtx = null }
  return audioCtx;
}

function playSound(){
  const ctx = ensureAudio();
  if(!ctx) return; // Audio not available

  const now = ctx.currentTime;

  // create a short percussive tone + click
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // random frequency based on a pleasant range
  const freq = 220 * Math.pow(2, (Math.random()*2 - 1)); // ~110-880
  osc.type = Math.random() < 0.5 ? 'sine' : 'triangle';
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12 + Math.random()*0.18, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32 + Math.random()*0.28);

  // subtle high click
  const click = ctx.createBufferSource();
  const buffer = ctx.createBuffer(1, 1000, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i=0;i<data.length;i++) data[i] = (Math.random()*2-1) * Math.exp(-i/100);
  click.buffer = buffer;
  const clickGain = ctx.createGain();
  clickGain.gain.value = 0.07;

  osc.connect(gain);
  gain.connect(ctx.destination);
  click.connect(clickGain);
  clickGain.connect(ctx.destination);

  osc.start(now);
  click.start(now + 0.002);
  osc.stop(now + 0.35 + Math.random()*0.25);
  click.stop(now + 0.06);
}
