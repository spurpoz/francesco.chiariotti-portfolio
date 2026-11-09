import { GlassRenderer, LOGO_FILL, SDF_SPREAD } from './contacts-renderer.js?v=4';
import { buildSdf } from './sdf.js';
const section = document.querySelector('#contacts');
const root = document.querySelector('.work-slides');
if (section && !section.querySelector('#contacts-glass')) {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./contacts-glass.css', import.meta.url).href;
  document.head.appendChild(stylesheet);
  const visual = document.createElement('div');
  visual.className = 'contacts-glass'; visual.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas'); canvas.id = 'contacts-glass';
  const fallback = document.createElement('img');
  fallback.className = 'contacts-glass-fallback'; fallback.alt = '';
  const smileUrl = new URL('./contact-smile.svg?v=3', import.meta.url).href;
  fallback.src = smileUrl; visual.append(canvas, fallback); section.prepend(visual);
  const credit = document.createElement('p'); credit.className = 'contact-glass-credit';
  credit.innerHTML = 'Glass effect based on <a href="https://phileeppov.com/glass/" target="_blank" rel="noopener noreferrer">Glass</a> by <a href="https://x.com/phileeppov" target="_blank" rel="noopener noreferrer">@phileeppov</a>';
  section.appendChild(credit);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const params = {
    n: 5, refraction: 0.59, liquid: 0.72, size: 0.94,
    dispersion: 1, edge: 0.28, motion: 0.32,
    tint: [1, 1, 1], tintMix: 1,
    sideMix: 0.8, sideTwo: 0, angle: Math.PI / 4, spread: 0.4,
    volume: 0.8, depth: 1, facet: 0,
    background: 'dark', bg: [0, 0, 0], frame: 0.8, shadow: 1
  };
  const random = (a, b) => a + Math.random() * (b - a);
  // Six independent agents. Their locations do not track the pointer angle.
  const fragments = Array.from({ length: 6 }, (_, i) => ({
    angle: i * Math.PI / 3 + random(-0.22, 0.22),
    width: random(0.11, 0.22), targetWidth: random(0.11, 0.22),
    strength: random(0.55, 0.95), targetStrength: random(0.55, 0.95),
    velocity: random(-0.15, 0.15), targetVelocity: random(-0.18, 0.18),
    phase: random(0, Math.PI * 2), wait: random(1, 4)
  }));
  const packed = new Float32Array(24);
  const tilt = [0, 0], goal = [0, 0];
  let phase = 0, flowTime = 0, last = 0, raf = null;
  let visible = false, ready = false, failed = false, renderer;
  let pointerPrevious = null, excitation = 0, activity = 0;
  function packFragments() {
    fragments.forEach((f, i) => packed.set([f.angle, f.width, f.strength, f.phase], i * 4));
  }
  packFragments();
  function animateFragments(dt) {
    excitation *= Math.exp(-dt / 0.4);
    activity += (excitation - activity) * (1 - Math.exp(-dt / 0.25));
    const smoothing = 1 - Math.exp(-dt / 1.2);
    fragments.forEach(f => {
      f.wait -= dt;
      if (f.wait <= 0) {
        f.wait = random(1.8, 4.8);
        f.targetVelocity = random(-0.20, 0.20);
        f.targetWidth = random(0.10, 0.23);
        f.targetStrength = random(0.45, 1.0);
      }
      f.velocity += (f.targetVelocity - f.velocity) * smoothing;
      f.width += (f.targetWidth - f.width) * smoothing;
      f.strength += (f.targetStrength - f.strength) * smoothing;
      f.angle += f.velocity * dt * (1 + activity * 1.5);
      f.angle = Math.atan2(Math.sin(f.angle), Math.cos(f.angle));
    });
    packFragments();
  }
  function resize() {
    if (!ready || failed) return;
    renderer.setSize(Math.max(1, Math.min(1400, Math.round(canvas.clientWidth * Math.min(devicePixelRatio, 2)))));
    schedule();
  }
  function draw(now) {
    raf = null;
    if (!ready || failed || !visible || document.hidden) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0; last = now;
    if (!reduced.matches) {
      const smoothing = 1 - Math.exp(-dt / 0.28);
      tilt[0] += (goal[0] - tilt[0]) * smoothing;
      tilt[1] += (goal[1] - tilt[1]) * smoothing;
      phase = (phase + dt / 12) % 1; flowTime += dt;
      animateFragments(dt);
    }
    renderer.render({ ...params, fragments: packed, flowTime: reduced.matches ? 0 : flowTime,
      motion: reduced.matches ? 0 : params.motion,
      tilt: reduced.matches ? [0, 0] : tilt
    }, reduced.matches ? 0 : phase);
    if (!reduced.matches) raf = requestAnimationFrame(draw);
  }
  function schedule() {
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null; last = 0;
    if (ready && !failed && visible && !document.hidden) raf = requestAnimationFrame(draw);
  }
  function resetPointer() { goal.fill(0); pointerPrevious = null; }
  document.addEventListener('pointermove', event => {
    if (!visible || reduced.matches || event.pointerType !== 'mouse' ||
        document.body.classList.contains('mobile-menu-open') || !section.contains(event.target)) {
      resetPointer(); return;
    }
    const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    const x = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = -(event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    // Small internal parallax only; no rotation or deformation of the slab.
    goal[0] = Math.max(-1, Math.min(1, x)) * 0.45;
    goal[1] = Math.max(-1, Math.min(1, y)) * 0.45;
    const now = performance.now();
    if (pointerPrevious) {
      const dt = Math.max((now - pointerPrevious.time) / 1000, 0.008);
      const speed = Math.hypot(x - pointerPrevious.x, y - pointerPrevious.y) / dt;
      excitation = Math.max(excitation, Math.min(1, speed / 4));
    }
    pointerPrevious = { x, y, time: now };
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', resetPointer);
  window.addEventListener('blur', resetPointer);
  const visibility = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting; if (!visible) resetPointer(); schedule();
  }, { root, threshold: 0 });
  visibility.observe(section);
  const sizes = new ResizeObserver(resize); sizes.observe(visual);
  window.addEventListener('resize', resize);
  reduced.addEventListener('change', schedule);
  document.addEventListener('visibilitychange', schedule);
  stylesheet.addEventListener('load', resize);
  function fail(error) { failed = true; schedule(); visual.classList.add('has-fallback'); console.warn('Contact glass unavailable:', error); }
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fail('WebGL context lost; reload to retry.'); });
  async function init() {
    renderer = new GlassRenderer(canvas);
    const image = new Image(); image.src = smileUrl; await image.decode();
    const size = 1024; const shape = document.createElement('canvas'); shape.width = shape.height = size;
    const ctx = shape.getContext('2d'), fill = size * LOGO_FILL;
    ctx.drawImage(image, (size - fill) / 2, (size - fill) / 2, fill, fill);
    const sdf = buildSdf(ctx.getImageData(0, 0, size, size).data, size, SDF_SPREAD);
    const color = document.createElement('canvas'); color.width = color.height = size;
    const cc = color.getContext('2d'); cc.fillStyle = '#fff'; cc.fillRect(0, 0, size, size);
    renderer.setLogo(sdf, color, size); ready = true; resize();
  }
  init().catch(fail);
}
