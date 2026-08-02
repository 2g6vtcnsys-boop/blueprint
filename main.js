/* ==========================================================================
   Blueprint — shared behaviour
   Ported 1:1 from mockups/concept-blueprint-FINAL.html.
   Loaded after GSAP + ScrollTrigger + Lenis + Three.js (CDN, in <head>).
   Sections are guarded by element existence so this file can be shared
   across pages that only carry a lighter subset of the markup.
   ========================================================================== */

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer:fine)').matches;
let mouseX = innerWidth / 2, mouseY = innerHeight / 2;
window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

/* ---- nav wordmark: crop the SVG viewBox to the text's *actual rendered*
   bounding box, measured live. SVG dominant-baseline/font-fallback behaviour
   varies enough across browsers (Safari vs Chromium in particular) that a
   hand-tuned static viewBox drifts out of alignment on other engines — this
   self-corrects regardless of which font/engine actually rendered it. ---- */
(function fitBrandWordmarks(){
  document.querySelectorAll('.brand-word').forEach(svg => {
    const text = svg.querySelector('text');
    if (!text) return;
    const prevDisplay = svg.style.display;
    svg.style.display = 'block'; // force layout even if hidden (display:none) by the light/dark toggle
    const bbox = text.getBBox();
    svg.style.display = prevDisplay;
    if (!bbox.width || !bbox.height) return;
    const pad = bbox.height * 0.056; // matches the icon SVG's own ~5% edge padding
    svg.setAttribute('viewBox', `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`);
  });
})();

/* ---- Three.js blueprint high street (hero background) — walk down the street ---- */
function initScene(){
  if (reduce || innerWidth < 900) return;
  if (!window.THREE){ if (!initScene.tries) initScene.tries = 0; if (initScene.tries++ > 40) return; setTimeout(initScene, 50); return; }
  const canvas = document.getElementById('scene');
  if (!canvas) return;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); }
  catch (e) { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xEEF2F7, 0.032);
  const camera = new THREE.PerspectiveCamera(64, innerWidth / innerHeight, 0.1, 160);
  camera.position.set(0, 1.9, 7);

  const lineMat = new THREE.LineBasicMaterial({ color: 0x2F6BBF, transparent: true, opacity: 0.85 });
  const faintMat = new THREE.LineBasicMaterial({ color: 0x2F6BBF, transparent: true, opacity: 0.4 });
  const awnMat = new THREE.MeshBasicMaterial({ color: 0x3E7BD6, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
  function edges(geo, m){ return new THREE.LineSegments(new THREE.EdgesGeometry(geo), m || lineMat); }
  function rect(w, h, m){ return new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)), m || lineMat); }
  function segs(pairs, m){
    const g = new THREE.BufferGeometry(); const a = [];
    pairs.forEach(p => a.push(p[0], p[1], p[2], p[3], p[4], p[5]));
    g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
    return new THREE.LineSegments(g, m || lineMat);
  }
  function label(text){
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const x = c.getContext('2d');
    x.clearRect(0, 0, 256, 64); x.font = 'bold 30px monospace'; x.fillStyle = '#4E86D6';
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 36);
    const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter;
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, opacity: 0.92 }));
  }
  function shop(w, h, d, name){
    const g = new THREE.Group();
    g.add(edges(new THREE.BoxGeometry(w, h, d)));
    const fz = d / 2 + 0.02;
    // ground-floor shopfront glazing
    const sfH = h * 0.32, sfY = -h / 2 + sfH / 2 + 0.06;
    const sf = rect(w * 0.84, sfH); sf.position.set(0, sfY, fz); g.add(sf);
    for (let i = 1; i < 4; i++){ const mx = -w * 0.42 + (w * 0.84) * (i / 4); g.add(segs([[mx, sfY - sfH / 2, fz, mx, sfY + sfH / 2, fz]], faintMat)); }
    // window display (a small framed rect behind the glazing)
    const disp = rect(w * 0.2, sfH * 0.55); disp.position.set(-w * 0.22, sfY, fz + 0.01); g.add(disp);
    g.add(segs([
      [-w * 0.22 - w * 0.1, sfY - sfH * 0.27, fz + 0.01, -w * 0.22 + w * 0.1, sfY + sfH * 0.27, fz + 0.01],
      [-w * 0.22 + w * 0.1, sfY - sfH * 0.27, fz + 0.01, -w * 0.22 - w * 0.1, sfY + sfH * 0.27, fz + 0.01]
    ], faintMat));
    // door + step
    const door = rect(w * 0.16, sfH * 0.92); door.position.set(w * 0.3, sfY - sfH * 0.04, fz); g.add(door);
    g.add(segs([[w * 0.2, -h / 2 + 0.01, fz + 0.06, w * 0.4, -h / 2 + 0.01, fz + 0.06]]));
    // fascia band + label
    const fY = sfY + sfH / 2 + 0.16;
    const fascia = rect(w * 0.9, 0.3); fascia.position.set(0, fY, fz); g.add(fascia);
    const lb = label(name); lb.scale.set(w * 0.6, 0.32, 1); lb.position.set(0, fY, fz + 0.04); g.add(lb);
    // projecting hanging sign
    if (Math.random() < 0.45){
      g.add(segs([[w * 0.36, fY - 0.05, fz + 0.02, w * 0.36, fY - 0.05, fz + 0.32]], faintMat));
      const sign = rect(0.34, 0.24, faintMat);
      sign.rotation.y = Math.PI / 2; sign.position.set(w * 0.36, fY - 0.22, fz + 0.32); g.add(sign);
    }
    // upper-floor windows
    const floors = Math.max(1, Math.floor((h - sfH - 0.8) / 0.95));
    for (let f = 0; f < floors; f++){
      const wy = fY + 0.55 + f * 0.95; if (wy > h / 2 - 0.35) break;
      for (let i = 0; i < 3; i++){
        const wx = -w * 0.3 + i * w * 0.3;
        const wd = rect(w * 0.16, 0.5); wd.position.set(wx, wy, fz); g.add(wd);
        g.add(segs([[wx, wy, fz, wx, wy, fz]], faintMat));
      }
    }
    // roof: gable or parapet
    if (Math.random() < 0.5){
      const rh = h * 0.26;
      g.add(segs([
        [-w / 2, h / 2, d / 2, 0, h / 2 + rh, d / 2],
        [w / 2, h / 2, d / 2, 0, h / 2 + rh, d / 2],
        [-w / 2, h / 2, -d / 2, 0, h / 2 + rh, -d / 2],
        [w / 2, h / 2, -d / 2, 0, h / 2 + rh, -d / 2],
        [0, h / 2 + rh, d / 2, 0, h / 2 + rh, -d / 2]
      ]));
    } else {
      const p = edges(new THREE.BoxGeometry(w * 1.03, h * 0.1, d * 1.03));
      p.position.y = h / 2 + h * 0.05; g.add(p);
    }
    if (Math.random() < 0.4){
      const c = edges(new THREE.BoxGeometry(w * 0.12, h * 0.24, w * 0.12));
      c.position.set(w * 0.26, h / 2 + h * 0.14, 0); g.add(c);
    }
    // awning
    if (Math.random() < 0.5){
      const aw = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, 0.42), awnMat);
      aw.position.set(0, sfY + sfH / 2 + 0.02, fz + 0.24); aw.rotation.x = -0.6; g.add(aw);
      const al = rect(w * 0.86, 0.42); al.position.copy(aw.position); al.rotation.x = -0.6; g.add(al);
    }
    return g;
  }
  const namesL = ['CAFÉ', 'BAKERY', 'BARBER', 'FLORIST', 'BOOKS', 'PHARMACY'];
  const namesR = ['DELI', 'CYCLES', 'SALON', 'GROCER', 'RECORDS', 'HARDWARE'];
  const street = new THREE.Group();
  const N = 6, spacing = 5.6;
  for (let i = 0; i < N; i++){
    const hL = 3.4 + Math.random() * 2.4; const L = shop(4, hL, 3, namesL[i]);
    L.position.set(-4.4, hL / 2 - 2.2, -i * spacing); L.rotation.y = Math.PI / 2; street.add(L);
    const hR = 3.4 + Math.random() * 2.4; const R = shop(4, hR, 3, namesR[i]);
    R.position.set(4.4, hR / 2 - 2.2, -i * spacing); R.rotation.y = -Math.PI / 2; street.add(R);
  }
  scene.add(street);
  const streetLen = N * spacing;
  // road + pavements
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, streetLen + 16, 3, Math.round(streetLen + 16)),
    new THREE.MeshBasicMaterial({ color: 0x2F6BBF, wireframe: true, transparent: true, opacity: 0.2 })
  );
  road.rotation.x = -Math.PI / 2; road.position.set(0, -2.2, -streetLen / 2 + 3); scene.add(road);
  // centre dashes
  for (let z = 4; z > -(streetLen + 12); z -= 1.6){ scene.add(segs([[0, -2.19, z, 0, -2.19, z - 0.7]], faintMat)); }
  function pave(sx){
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, streetLen + 16, 2, Math.round((streetLen + 16) / 1.1)),
      new THREE.MeshBasicMaterial({ color: 0x2F6BBF, wireframe: true, transparent: true, opacity: 0.26 })
    );
    p.rotation.x = -Math.PI / 2; p.position.set(sx, -2.19, -streetLen / 2 + 3); scene.add(p);
    // kerb
    scene.add(segs([[sx + (sx < 0 ? 0.8 : -0.8), -2.18, 6, sx + (sx < 0 ? 0.8 : -0.8), -2.18, -(streetLen + 10)]]));
  }
  pave(-2.1); pave(2.1);
  // lampposts
  function lamp(x, z){
    const a = [[x, -2.2, z, x, 0.6, z], [x, 0.6, z, x + (x < 0 ? 0.55 : -0.55), 0.72, z]];
    const grp = segs(a);
    const head = edges(new THREE.BoxGeometry(0.22, 0.14, 0.22));
    head.position.set(x + (x < 0 ? 0.55 : -0.55), 0.66, z);
    const gg = new THREE.Group(); gg.add(grp); gg.add(head); return gg;
  }
  for (let i = 0; i < N + 1; i++){ scene.add(lamp(-1.3, -i * spacing + 2)); scene.add(lamp(1.3, -i * spacing + 2)); }

  // camera-walk checkpoints, evenly split across hero / build / showcase / deep
  // so the street keeps advancing through the whole page (see the zone tweens below)
  const campointsZ = (() => {
    const zStart = 7, zTotal = streetLen + 13, seg = zTotal / 4;
    return [zStart, zStart - seg, zStart - 2 * seg, zStart - 3 * seg, zStart - zTotal];
  })();
  window.__campointsZ = campointsZ;
  window.__setCameraZ = (z) => { camera.position.z = z; };
  let running = true;
  const clock = new THREE.Clock();
  function animate(){
    if (!running) return;
    const t = clock.getElapsedTime();
    camera.position.x = Math.sin(t * 0.22) * 0.4;
    camera.position.y = 1.95;
    camera.lookAt(0, 1.1, camera.position.z - 6);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  // pause the render loop only when the tab itself isn't visible — the scene
  // is a fixed full-page background, not just a hero decoration, so it needs
  // to keep rendering (and the camera needs to keep walking) the whole way down
  document.addEventListener('visibilitychange', () => {
    const wasRunning = running;
    running = !document.hidden;
    if (running && !wasRunning) animate();
  });
  window.__setNight = (on) => {
    scene.fog.color.set(on ? 0x0B2545 : 0xEEF2F7);
    const c = on ? 0x6FA8FF : 0x2F6BBF;
    lineMat.color.set(c); faintMat.color.set(c); road.material.color.set(c);
  };
}
// wait a frame so layout has settled before checking viewport width
requestAnimationFrame(() => requestAnimationFrame(initScene));

/* ---- Lenis smooth scroll + GSAP ticker bootstrap ---- */
if (!reduce && window.Lenis){
  const lenis = new Lenis({ lerp: 0.09 });
  lenis.on('scroll', () => ScrollTrigger.update());
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---- inquiry form -> Formspree ----
   Posts with fetch so the visitor stays on the page and keeps our own
   confirmation styling. The rule this replaces an earlier version for:
   only ever claim success on a real 2xx. The previous handler showed
   "inquiry received" unconditionally, which meant a prospect could be
   told they'd reached us when nothing had been sent anywhere. ---- */
(function initContactForm(){
  const form = document.getElementById('contactForm');
  if (!form) return;
  const status = document.getElementById('formStatus');
  const btn = form.querySelector('button[type="submit"]');
  const btnLabel = btn ? btn.textContent : '';

  const say = (msg, kind) => {
    if (!status) return;
    status.textContent = msg;
    status.classList.remove('ok', 'err');
    status.classList.add('show', kind);
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (btn){ btn.disabled = true; btn.textContent = 'Sending…'; }
    if (status) status.classList.remove('show', 'ok', 'err');

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }   // else Formspree redirects away
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      form.style.display = 'none';
      say("Thanks — inquiry received. I'll get back to you within a day or two.", 'ok');
    } catch (err) {
      // Leave the form filled in so nothing they typed is lost, and point at
      // a route that doesn't depend on this request working.
      console.error('[inquiry form]', err);
      if (btn){ btn.disabled = false; btn.textContent = btnLabel; }
      say("That didn't send. Please email dougbridge8@gmail.com instead, or try again in a moment.", 'err');
    }
  });
})();

/* ---- hero heading: assemble from scattered, rotating character fragments ---- */
(function initScatterHeading(){
  const h = document.querySelector('[data-scatter]');
  if (!h) return;
  const frag = [];
  [...h.childNodes].forEach(n => {
    const em = n.nodeType === 1 && n.classList && n.classList.contains('emph');
    [...n.textContent].forEach(ch => frag.push({ ch, em }));
  });
  // group into words so a line break can only land between words, never mid-word
  const words = []; let word = [];
  frag.forEach(f => {
    if (f.ch === ' ') { if (word.length) { words.push(word); word = []; } words.push(' '); }
    else word.push(f);
  });
  if (word.length) words.push(word);
  h.innerHTML = words.map(w => w === ' ' ? ' ' :
    `<span class="word">${w.map(f => `<span class="char${f.em ? ' em' : ''}">${f.ch}</span>`).join('')}</span>`
  ).join('');
})();

/* ---- custom crosshair cursor with live coordinates ---- */
if (fine && !reduce && document.getElementById('cursor')){
  const cur = document.getElementById('cursor'), coord = document.getElementById('coord');
  const setX = gsap.quickSetter(cur, 'x', 'px'), setY = gsap.quickSetter(cur, 'y', 'px');
  let cx = mouseX, cy = mouseY;
  gsap.ticker.add(() => {
    cx += (mouseX - cx) * 0.2; cy += (mouseY - cy) * 0.2;
    setX(cx); setY(cy);
    if (coord) coord.textContent = 'X' + String(Math.round(mouseX)).padStart(3, '0') + ' Y' + String(Math.round(mouseY)).padStart(3, '0');
  });
  document.querySelectorAll('a,.mag').forEach(el => {
    el.addEventListener('mouseenter', () => gsap.to('.cursor .ring', { scale: 1.6, duration: .3 }));
    el.addEventListener('mouseleave', () => gsap.to('.cursor .ring', { scale: 1, duration: .3 }));
  });
} else {
  document.body.classList.remove('cursor-hidden');
  const c = document.getElementById('cursor');
  if (c) c.style.display = 'none';
}

if (reduce){
  /* ---- reduced-motion: settle everything into its final, static state ---- */
  gsap.set('.reveal', { opacity: 1, y: 0 });
  gsap.set('.hero-h .char', { opacity: 1, x: 0, y: 0, rotation: 0 });
  gsap.set('.built', { opacity: 1 });
  const deepBg = document.querySelector('.deep-bg'), gridBg = document.querySelector('.grid-bg'), gridNight = document.querySelector('.grid-night');
  if (deepBg) deepBg.style.opacity = 1;
  if (gridBg) gridBg.style.opacity = 0;
  if (gridNight) gridNight.style.opacity = .9;
  document.body.classList.add('night');
} else {
  gsap.registerPlugin(ScrollTrigger);

  /* ---- hero heading assembly + supporting reveals ---- */
  if (document.querySelector('.hero-h .char')){
    gsap.from('.hero-h .char', {
      opacity: 0, x: () => gsap.utils.random(-220, 220), y: () => gsap.utils.random(-160, 160),
      rotation: () => gsap.utils.random(-90, 90), duration: 1.1, ease: 'power3.out',
      stagger: { each: .018, from: 'random' }, delay: .2
    });
  }
  if (document.querySelector('.hero .reveal')) gsap.to('.hero .reveal', { opacity: 1, y: 0, duration: .9, ease: 'power2.out', stagger: .12, delay: .7 });
  if (document.querySelector('.page-hero .reveal')) gsap.to('.page-hero .reveal', { opacity: 1, y: 0, duration: .9, ease: 'power2.out', stagger: .12, delay: .3 });
  gsap.utils.toArray('.reveal').forEach(el => {
    if (el.closest('.hero') || el.closest('.page-hero')) return;
    gsap.to(el, { opacity: 1, y: 0, duration: .9, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%' } });
  });

  /* ---- floating tick + rotating compass ---- */
  if (document.querySelector('[data-float]')) gsap.to('[data-float]', { y: -6, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  if (document.querySelector('.compass')) gsap.to('.compass', { rotation: 360, transformOrigin: '50% 50%', repeat: -1, duration: 60, ease: 'none' });

  /* ---- scroll-velocity skew on headings ---- */
  const skewTargets = gsap.utils.toArray('.iso-cap, .about .wrap, .lead-col');
  if (skewTargets.length){
    const setters = skewTargets.map(el => gsap.quickSetter(el, 'skewY', 'deg'));
    const clamp = gsap.utils.clamp(-6, 6);
    ScrollTrigger.create({
      onUpdate: self => {
        const v = clamp(self.getVelocity() / -340);
        setters.forEach(s => s(v));
        clearTimeout(window._sk);
        window._sk = setTimeout(() => setters.forEach(s => s(0)), 90);
      }
    });
  }

  /* ---- cursor-parallax on the fixed background layers ---- */
  if (fine){
    const layers = [...document.querySelectorAll('[data-depth]')];
    if (layers.length){
      let cx = 0, cy = 0;
      gsap.ticker.add(() => {
        const tx = (mouseX / innerWidth - .5), ty = (mouseY / innerHeight - .5);
        cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
        layers.forEach(l => {
          const d = parseFloat(l.dataset.depth) || 0;
          l.style.transform = `translate(${cx * d * 60}px,${cy * d * 60}px)`;
        });
      });
    }
  }

  /* ---- compass + crosshair scroll drift ---- */
  if (document.querySelector('.compass')) gsap.to('.compass', { y: -80, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 1 } });
  if (document.querySelector('.cross')) gsap.to('.cross', { y: -140, rotation: 90, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 1.2 } });

  /* ---- pinned build sequence: wireframe draws, dimension counts up, stages label, morphs into finished site ---- */
  let buildTl = null, hworkTween = null;
  if (document.querySelector('.build')){
    const wire = gsap.utils.toArray('.wire *');
    wire.forEach(s => { const l = s.getTotalLength ? s.getTotalLength() : 400; s.style.strokeDasharray = l; s.style.strokeDashoffset = l; });
    const counter = { v: 0 };
    const ro = document.querySelector('.dim-readout');
    const mark = document.getElementById('stagemark');
    const tl = buildTl = gsap.timeline({ scrollTrigger: { trigger: '.build', start: 'top top', end: '+=260%', pin: '.build-pin', scrub: .6 } });
    tl.to(wire, { strokeDashoffset: 0, duration: 2, ease: 'none', stagger: .05 }, 0)
      .to(counter, { v: 1200, duration: 2, ease: 'none', onUpdate: () => { if (ro) ro.textContent = 'W ' + Math.round(counter.v) + ' MM'; } }, 0)
      .add(() => { if (mark) mark.textContent = 'STAGE 02 — DIMENSIONED'; }, 2)
      .to('.note', { opacity: 1, y: 0, duration: .4, stagger: .2 }, 2)
      .to('.fillable', { fill: 'rgba(47,107,191,0.16)', duration: .6, stagger: .05 }, 2.1)
      .add(() => { if (mark) mark.textContent = 'STAGE 03 — BUILT'; }, 3.2)
      .to('.wire', { opacity: 0, duration: .6 }, 3.3)
      .to('.dim-readout', { opacity: 0, duration: .4 }, 3.3)
      .to('.note', { opacity: 0, duration: .4 }, 3.3)
      .to('.built', { opacity: 1, duration: .7, ease: 'power2.out' }, 3.4);
  }

  /* ---- horizontal showcase: pinned section scrolls concept cards sideways ----
     Only pin when there is genuinely something off-screen to travel to. The
     track holds four real concepts now rather than eight placeholders, so on a
     wide monitor it can fit entirely in view — and pinning the section for the
     45px that remained just froze the page for a moment and let go, which reads
     as a scroll bug rather than a device. Below the threshold every card is
     visible anyway, so the section is left alone. A null hworkTween is already
     an expected state: the mobile branch does the same, and the camera walk
     below falls back to buildEnd when it is missing. */
  const HPIN_MIN = 140;
  if (document.querySelector('.hwork') && (fine || innerWidth > 900)){
    const track = document.querySelector('.htrack');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth + 60);
    if (dist() > HPIN_MIN){
      hworkTween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: '.hwork', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .7, invalidateOnRefresh: true }
      });
    }
  }

  /* ---- camera walk: one global scroll tracker (kept separate from the build/
     hwork pins so it can't interfere with their pin-spacing math), remapped
     through each section's real pixel range so the street advances evenly
     across the whole page instead of stalling after the pinned sections ---- */
  if (document.getElementById('scene')){
    const heroEl = document.querySelector('.hero');
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: () => {
        // initScene() boots on a later frame (it waits for layout + the Three.js
        // CDN script), so these may not exist yet on the very first scroll ticks
        if (!window.__setCameraZ || !window.__campointsZ) return;
        const cpZ = window.__campointsZ, setZ = window.__setCameraZ;
        const heroEnd = heroEl ? heroEl.getBoundingClientRect().bottom + scrollY : 0;
        const buildEnd = buildTl && buildTl.scrollTrigger ? buildTl.scrollTrigger.end : heroEnd;
        const hworkEnd = hworkTween && hworkTween.scrollTrigger ? hworkTween.scrollTrigger.end : buildEnd;
        const pts = [0, heroEnd, buildEnd, hworkEnd, ScrollTrigger.maxScroll(window)];
        const y = scrollY;
        let seg = 3;
        for (let i = 0; i < 4; i++){ if (y <= pts[i + 1]){ seg = i; break; } }
        const segStart = pts[seg], segEnd = Math.max(pts[seg + 1], segStart + 1);
        const t = Math.min(1, Math.max(0, (y - segStart) / (segEnd - segStart)));
        setZ(cpZ[seg] + (cpZ[seg + 1] - cpZ[seg]) * t);
      }
    });
  }

  /* ---- background dim during the build sequence + showcase ---- */
  if (document.querySelector('.build')) ScrollTrigger.create({ trigger: '.build', start: 'top 75%', end: 'bottom 15%', onToggle: s => document.body.classList.toggle('dim', s.isActive) });
  if (document.querySelector('.hwork')) ScrollTrigger.create({ trigger: '.hwork', start: 'top 85%', end: 'bottom 15%', onToggle: s => document.body.classList.toggle('dim', s.isActive) });

  /* ---- light → deep blueprint "night" mode crossfade ---- */
  if (document.querySelector('.deep')){
    gsap.to('.deep-bg', { opacity: .9, ease: 'none', scrollTrigger: { trigger: '.deep', start: 'top 85%', end: 'top 35%', scrub: true } });
    gsap.to('.grid-bg', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.deep', start: 'top 85%', end: 'top 35%', scrub: true } });
    gsap.to('.grid-night', { opacity: .6, ease: 'none', scrollTrigger: { trigger: '.deep', start: 'top 85%', end: 'top 35%', scrub: true } });
    ScrollTrigger.create({
      trigger: '.deep', start: 'top 55%', end: 'bottom bottom',
      onEnter: () => { document.body.classList.add('night'); if (window.__setNight) window.__setNight(true); },
      onLeaveBack: () => { document.body.classList.remove('night'); if (window.__setNight) window.__setNight(false); }
    });
  }

  /* ---- layered badge: continuous turn + separate into layers on scroll ---- */
  if (document.getElementById('stack3d')){
    gsap.to('#stack3d', { rotationY: 45, rotationX: -18, duration: 6.5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    const lst = { trigger: '.iso', start: 'top 82%', end: 'top 32%', scrub: true };
    gsap.fromTo('.p1', { z: -14 }, { z: -70, scrollTrigger: lst });
    gsap.fromTo('.p3', { z: 14 }, { z: 70, scrollTrigger: lst });
    gsap.from('.plate', { opacity: 0, duration: .6, stagger: .12, scrollTrigger: { trigger: '.iso', start: 'top 74%' } });
  }

  /* ---- side progress rail: highlight the section in view ---- */
  const rail = gsap.utils.toArray('.rail a');
  if (rail.length){
    ['build', 'work', 'iso', 'about', 'contact'].forEach(id => {
      if (!document.getElementById(id)) return;
      ScrollTrigger.create({
        trigger: '#' + id, start: 'top 55%', end: 'bottom 55%',
        onToggle: self => { if (self.isActive) rail.forEach(a => a.classList.toggle('on', a.dataset.sec === id)); }
      });
    });
  }

}

/* ---- sticky nav condense ----
   Deliberately a plain scroll listener rather than a ScrollTrigger. A trigger's
   active range is [start, end) — exclusive of the end — and with no end supplied
   GSAP defaults it to maximum scroll, so the frosted panel dropped out at exactly
   the bottom of the page: the moment you stop scrolling to read the last block,
   which is when you need it most. Living outside the reduced-motion branch also
   means the header is legible with Reduce Motion on, which it previously wasn't. */
const nav = document.querySelector('.nav');
if (nav){
  const syncNav = () => nav.classList.toggle('solid', (window.scrollY || document.documentElement.scrollTop) > 40);
  syncNav();
  addEventListener('scroll', syncNav, { passive: true });
  addEventListener('resize', syncNav);
}

/* ---- magnetic buttons ---- */
if (!reduce && fine){
  document.querySelectorAll('.mag').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * 0.35, y: (e.clientY - r.top - r.height / 2) * 0.5, duration: .4, ease: 'power2.out' });
    });
    btn.addEventListener('mouseleave', () => gsap.to(btn, { x: 0, y: 0, duration: .5, ease: 'elastic.out(1,.4)' }));
  });
}
