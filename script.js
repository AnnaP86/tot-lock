
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
