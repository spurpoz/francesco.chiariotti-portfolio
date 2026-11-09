import { GlassRenderer, LOGO_FILL, SDF_SPREAD } from './renderer.js';
import { buildSdf } from './sdf.js';
import { Sound } from './sound.js';
import { PAN, fieldAt } from './tune.js';
const canvas=document.querySelector('#info-glass');
const button=document.querySelector('#glass-sound');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
// Switch dei suoni al tocco.
// Viene inserito nel body, fuori dallo sfondo
// che ha pointer-events: none.
const touchSwitch = document.createElement('div');

touchSwitch.id = 'glass-touch-switch';
touchSwitch.hidden = true;
touchSwitch.setAttribute('role', 'group');
touchSwitch.setAttribute('aria-label', 'Suono del logo');

touchSwitch.innerHTML = `
  <button
    type="button"
    data-touch-mode="melody"
    aria-pressed="true"
  >
    melody
  </button>

  <button
    type="button"
    data-touch-mode="bass"
    aria-pressed="false"
  >
    bass
  </button>
`;

// Barra unica per selettore e accompagnamento.
const glassControls = document.createElement('div');

glassControls.id = 'glass-controls';

document.body.appendChild(glassControls);

// Sposta qui gli elementi esistenti.
// Il pulsante sound conserva il proprio listener.
glassControls.appendChild(touchSwitch);
glassControls.appendChild(button);

// Crediti del progetto originale.
const glassCredit = document.createElement('div');

glassCredit.id = 'glass-credit';

glassCredit.innerHTML = `
  Glass effect based on
  <a
    href="https://phileeppov.com/glass/"
    target="_blank"
    rel="noopener noreferrer"
  >Glass</a>
  by
  <a
    href="https://x.com/phileeppov"
    target="_blank"
    rel="noopener noreferrer"
  >@phileeppov</a>
`;

document.body.appendChild(glassCredit);

touchSwitch.addEventListener('click', event => {
  const target = event.target.closest('[data-touch-mode]');

  if (!target || !sound) return;

  sound.setTouchMode(target.dataset.touchMode);

  touchSwitch.querySelectorAll('[data-touch-mode]').forEach(item => {
    item.setAttribute(
      'aria-pressed',
      String(item === target)
    );
  });
});
// User settings. Blend corresponds to the original shader's liquid parameter.
const settings={n:2,refraction:.59,liquid:0.6,size:.57,dispersion:1,edge:3,motion:0.4,
 tint:[1,1,1],tintMix:0.3,sideMix:0.7,sideTwo:0,angle:Math.PI/2,spread:8,
 volume:.45,depth:2.5,facet:.3,background:'dark',bg:[0,0,0],dark:1,frame:.8,shadow:1};
let renderer,sound,raf,last=0,phase=0,enabled=false;
const tilt=[0,0];
const tiltGoal = [0, 0];

// Stesse zone e tempi di risposta del progetto originale.
const fields = PAN.map((p, i) => ({
  ...p,
  energy: 0,
  goal: 0,
  attack: 0.025,
  decay: 0.95 - 0.06 * i
}));

const packedFields = new Float32Array(36);

function excite(field, amount = 1, attack = 0.025) {
  const f = fields[PAN.indexOf(field)];
  f.goal = Math.min(1.4, f.energy + amount);
  f.attack = attack;
}

function animateTouch(dt) {
  const smoothing = 1 - Math.exp(-dt / 0.32);

  for (let i = 0; i < 2; i++) {
    tilt[i] += (tiltGoal[i] - tilt[i]) * smoothing;
  }

  fields.forEach((f, i) => {
    if (f.goal > f.energy) {
      f.energy += (f.goal - f.energy)
        * (1 - Math.exp(-dt / f.attack));

      if (f.goal - f.energy < 0.01) f.goal = 0;
    } else {
      f.energy *= Math.exp(-dt / f.decay);
    }

    if (f.energy < 0.002 && !f.goal) f.energy = 0;

    packedFields.set(
      [f.x, f.y, f.r, f.energy],
      i * 4
    );
  });
}
async function init(){
 renderer=new GlassRenderer(canvas);sound=new Sound();
 const img=new Image();
 // Resolve from page root, not the module directory.
 img.src=new URL('favicon.png',document.baseURI).href;
 await img.decode();
 const size=1024,source=document.createElement('canvas');source.width=img.naturalWidth;source.height=img.naturalHeight;
 const sc=source.getContext('2d');sc.drawImage(img,0,0);const pixels=sc.getImageData(0,0,source.width,source.height).data;
 let x0=source.width,y0=source.height,x1=-1,y1=-1;
 for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)if(pixels[(y*source.width+x)*4+3]>8){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 if(x1<0)throw Error('Empty favicon');
 const w=x1-x0+1,h=y1-y0+1,k=size*LOGO_FILL/Math.max(w,h);
 const color=document.createElement('canvas');color.width=color.height=size;const ctx=color.getContext('2d');
 const paint=()=>ctx.drawImage(img,x0,y0,w,h,(size-w*k)/2,(size-h*k)/2,w*k,h*k);
 paint();const shape=ctx.getImageData(0,0,size,size).data;const sdf=buildSdf(shape,size,SDF_SPREAD);
 ctx.clearRect(0,0,size,size);for(const blur of [24,6,0]){ctx.filter=blur?`blur(${blur}px)`:'none';paint();}
 const data=ctx.getImageData(0,0,size,size);let rgb=[0,0,0],n=0;
 for(let i=0;i<shape.length;i+=4)if(shape[i+3]>128){for(let j=0;j<3;j++)rgb[j]+=shape[i+j];n++;}
 rgb=rgb.map(v=>v/Math.max(n,1));for(let i=0;i<data.data.length;i+=4){if(!data.data[i+3])for(let j=0;j<3;j++)data.data[i+j]=rgb[j];data.data[i+3]=255;}ctx.putImageData(data,0,0);
 renderer.setLogo(sdf, color, size);

button.hidden = false;
touchSwitch.hidden = false;

resize();
schedule();
}
function resize(){if(renderer)renderer.setSize(Math.min(1400,Math.round(canvas.clientWidth*Math.min(devicePixelRatio,2))));}
function draw(now) {
  raf = null;

  const dt = last ? Math.min(now - last, 50) / 1000 : 0;
  last = now;

  if (!reduced.matches) {
    phase = (phase + dt / 8) % 1;
    animateTouch(dt);
  }

  sound.update(dt * 1000);

  renderer.render({
    ...settings,

    // Direzione dei riflessi stabile:
    // il movimento interno continua attraverso phase.
    angle: settings.angle,

    tilt: reduced.matches ? [0, 0] : tilt,

    fields: reduced.matches
      ? new Float32Array(36)
      : packedFields,

    sound: reduced.matches
      ? [0, 0, 0, 0]
      : [0, sound.bass, sound.hit, 0],

    bands: reduced.matches
      ? new Float32Array(8)
      : sound.bands
  }, phase);

  if (!reduced.matches && !document.hidden) {
    raf = requestAnimationFrame(draw);
  }
}
function schedule(){cancelAnimationFrame(raf);last=0;if(!document.hidden)raf=requestAnimationFrame(draw);}
button.addEventListener('click',async()=>{button.disabled=true;try{if(enabled){sound.off();enabled=false;}else{await sound.demo();enabled=true;}button.textContent=enabled?'sound off':'sound on';button.setAttribute('aria-pressed',String(enabled));}catch(e){sound.off();enabled=false;button.textContent='retry sound';console.warn(e);}finally{button.disabled=false;}});
window.addEventListener('resize',()=>{resize();if(renderer)schedule();});
reduced.addEventListener('change',()=>{if(renderer)schedule();});
document.addEventListener('visibilitychange',()=>{if(sound?.ctx){if(document.hidden)sound.ctx.suspend();else if(enabled)sound.ctx.resume().catch(()=>{});}if(renderer)schedule();});
init().catch(e => {
  canvas.hidden = true;
  button.hidden = true;
  touchSwitch.hidden = true;

  console.warn('Glass unavailable:', e);
});

function glassPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const frame = settings.frame ?? 0.8;

  const x = ((event.clientX - rect.left) / rect.width - 0.5)
    * 2 / frame;

  const y = -((event.clientY - rect.top) / rect.height - 0.5)
    * 2 / frame;

  const blocked = event.target.closest(
    'a, button, input, textarea, select, [role="button"]'
  );

  const insideCanvas =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;

  return {
    x,
    y,
    active: !blocked &&
      insideCanvas &&
      Math.hypot(x, y) <= 1.3
  };
}

// Il canvas resta dietro al testo.
// Il cursore viene applicato all'elemento sotto il mouse.
let cursorTarget = null;
let previousCursor = '';

function clearGlassCursor() {
  if (!cursorTarget) return;

  cursorTarget.style.cursor = previousCursor;
  cursorTarget = null;
}

document.addEventListener('pointermove', event => {
  const point = glassPoint(event);

  clearGlassCursor();

  if (point.active && !canvas.hidden) {
    cursorTarget = event.target;
    previousCursor = cursorTarget.style.cursor;
    cursorTarget.style.cursor = 'pointer';
  }

  if (event.pointerType === 'mouse') {
    tiltGoal[0] = point.active
      ? Math.max(-1, Math.min(1, point.x * settings.frame))
      : 0;

    tiltGoal[1] = point.active
      ? Math.max(-1, Math.min(1, point.y * settings.frame))
      : 0;
  }
});

document.documentElement.addEventListener('pointerleave', () => {
  clearGlassCursor();
  tiltGoal.fill(0);
});

let glassPress = null;

function playGlass(x, y) {
  sound.touch(x, y);

  if (reduced.matches) return;

  const field = fieldAt(x, y);
  excite(field);

  const twin = PAN.find(
    other => other !== field &&
      other.midi % 12 === field.midi % 12
  );

  if (twin) excite(twin, 0.22, 0.09);
}

document.addEventListener('pointerdown', event => {
  if (!sound || canvas.hidden || event.button !== 0) return;

  const point = glassPoint(event);
  if (!point.active) return;

  sound.revive();

  const played = sound.ready;

  glassPress = {
    id: event.pointerId,
    x: point.x,
    y: point.y,
    screenX: event.clientX,
    screenY: event.clientY,
    played
  };

  // Dopo lo sblocco audio, risposta immediata alla pressione.
  if (played) playGlass(point.x, point.y);
});

document.addEventListener('pointerup', async event => {
  if (!glassPress || glassPress.id !== event.pointerId) return;

  const press = glassPress;
  glassPress = null;

  if (press.played) return;

  // Il primo tocco sblocca l'audio al rilascio.
  if (Math.hypot(
    event.clientX - press.screenX,
    event.clientY - press.screenY
  ) > 10) return;

  if (window.getSelection()?.toString()) return;

  try {
    sound.ensure();
    await sound.ctx.resume();
    playGlass(press.x, press.y);
  } catch (error) {
    console.error('Errore audio del logo:', error);
  }
});

document.addEventListener('pointercancel', () => {
  glassPress = null;
});

window.addEventListener('blur', () => {
  glassPress = null;
  clearGlassCursor();
  tiltGoal.fill(0);
});