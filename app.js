/* ==========================================================================
   TANK INOX - Landing premium
   Un solo rAF controla todo el movimiento ligado al scroll (sin listeners de scroll).
   Los módulos se aíslan con safe() para que un fallo no rompa el resto de la página.
   ========================================================================== */
(() => {
'use strict';

/* ---------- Utilidades ---------- */
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const root = document.documentElement;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE_POINTER = matchMedia('(hover: hover) and (pointer: fine)').matches;
const WA_NUMBER = '522463251770';
const waUrl = msg => `https://wa.me/${WA_NUMBER}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`;
const safe = (name, fn) => { try { fn(); } catch (err) { console.error(`[Tank Inox] ${name}:`, err); } };

root.classList.add(REDUCED ? 'rm' : 'pin-ready');

let lenis = null;
let vh = innerHeight;
const hooks = [];          // funciones por frame (render 3D, burbujas, etc.)
const trackers = [];       // elementos ligados al scroll

/* ==========================================================================
   MOTOR DE SCROLL
   ========================================================================== */
function track(el, fn) {
    if (!el) return null;
    const t = { el, fn, top: 0, h: 0, vis: true };
    trackers.push(t);
    return t;
}
function measure() {
    vh = innerHeight;
    const sy = window.scrollY;
    trackers.forEach(t => {
        const r = t.el.getBoundingClientRect();
        t.top = r.top + sy;
        t.h = r.height;
    });
}
const pinProgress = (y, t) => clamp((y - t.top) / Math.max(1, t.h - vh));
const viewProgress = (y, t) => clamp((y + vh - t.top) / (vh + t.h));

const visObserver = new IntersectionObserver(entries => {
    entries.forEach(e => { const t = trackers.find(x => x.el === e.target); if (t) t.vis = e.isIntersecting; });
}, { rootMargin: '25% 0px 25% 0px' });

function registerTrackers() { trackers.forEach(t => visObserver.observe(t.el)); }

let lastY = 0, scrollVel = 0;
const header = $('#header');
const progressBar = $('#progress');
let headerHidden = false;

function coreEngine(y) {
    scrollVel = y - lastY;
    const docH = Math.max(1, root.scrollHeight - vh);
    progressBar.style.setProperty('--sp', (y / docH).toFixed(4));
    header.classList.toggle('is-solid', y > 24);
    if (!root.classList.contains('header-on-menu')) {
        if (scrollVel > 6 && y > 500 && !headerHidden) { headerHidden = true; header.classList.add('is-hidden'); }
        else if ((scrollVel < -4 || y < 500) && headerHidden) { headerHidden = false; header.classList.remove('is-hidden'); }
    }
    lastY = y;
    trackers.forEach(t => { if (t.vis) t.fn(y, t); });
}

function startEngine() {
    let last = performance.now();
    const frame = now => {
        const dt = Math.min(.05, (now - last) / 1000);
        last = now;
        if (lenis) lenis.raf(now);
        const y = lenis ? lenis.scroll : window.scrollY;
        coreEngine(y);
        hooks.forEach(h => h(now, dt));
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
}

function scrollToY(y) {
    if (lenis) lenis.scrollTo(y, { duration: 1.7, easing: easeInOut });
    else window.scrollTo({ top: y, behavior: REDUCED ? 'auto' : 'smooth' });
}
function scrollToEl(el) { scrollToY(el.getBoundingClientRect().top + window.scrollY); }
const lockScroll = () => { if (lenis) lenis.stop(); else root.style.overflow = 'hidden'; };
const unlockScroll = () => { if (lenis) lenis.start(); else root.style.overflow = ''; };

/* ==========================================================================
   LOADER
   ========================================================================== */
const wavePath = (x0, x1, y, amp, period, depth) => {
    const seg = period / 2, n = Math.ceil((x1 - x0) / seg);
    let d = `M${x0} ${y} q${period / 4} ${-amp} ${seg} 0`;
    for (let i = 1; i < n; i++) d += ` t${seg} 0`;
    return d + ` V${y + depth} H${x0} Z`;
};

function initLoader() {
    const loader = $('#loader');
    const pct = $('#ldPct'), msg = $('#ldMsg'), bar = $('#ldBar'), tank = $('.loader__tank');
    $('#ldWave').setAttribute('d', wavePath(-60, 220, 40, 4.5, 40, 10));
    $('#ldWave').style.animation = 'loaderWave 1.4s linear infinite';

    const messages = [[0, 'Preparando acero 304'], [.25, 'Soldando costuras'], [.5, 'Puliendo acabado sanitario'], [.75, 'Probando presión'], [.97, 'Listo para producir']];
    const minTime = REDUCED ? 250 : 2700;
    const t0 = performance.now();
    let loaded = document.readyState === 'complete';
    window.addEventListener('load', () => { loaded = true; });
    setTimeout(() => { loaded = true; }, 7000);
    let shown = 0, done = false;

    const tick = now => {
        const raw = clamp((now - t0) / minTime);
        const target = Math.min(easeInOut(raw), loaded ? 1 : .9);
        shown = Math.max(shown, target);
        pct.textContent = Math.round(shown * 100);
        bar.style.transform = `scaleX(${shown})`;
        tank.style.setProperty('--ld', shown.toFixed(3));
        for (let i = messages.length - 1; i >= 0; i--) if (shown >= messages[i][0]) { if (msg.textContent !== messages[i][1]) msg.textContent = messages[i][1]; break; }
        if (shown >= 1 && !done) { done = true; finish(); return; }
        requestAnimationFrame(tick);
    };
    const finish = () => {
        setTimeout(() => {
            loader.classList.add('is-done');
            root.classList.remove('is-loading');
            root.classList.add('is-ready');
            unlockScroll();
            setTimeout(() => { loader.classList.add('is-gone'); loader.setAttribute('aria-hidden', 'true'); }, 1300);
        }, 350);
    };
    requestAnimationFrame(tick);
}

/* ==========================================================================
   ENLACES WHATSAPP + NAVEGACIÓN
   ========================================================================== */
function initLinks() {
    $$('[data-wa]').forEach(a => { a.href = waUrl(a.dataset.wa); });
    $('#year').textContent = new Date().getFullYear();

    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const target = $(id);
        if (!target) return;
        e.preventDefault();
        closeMenu();
        scrollToEl(target);
    }));

    // sección actual en el menú
    const links = $$('.nav a');
    const secs = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
    const io = new IntersectionObserver(entries => entries.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(l => l.classList.toggle('is-current', l.getAttribute('href') === `#${e.target.id}`));
    }), { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(s => io.observe(s));
}

/* Menú móvil */
const menu = $('#menu'), burger = $('#burger');
function openMenu() {
    menu.classList.add('is-open'); menu.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Cerrar menú');
    root.classList.add('header-on-menu'); header.classList.remove('is-hidden'); lockScroll();
}
function closeMenu() {
    if (!menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open'); menu.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Abrir menú');
    root.classList.remove('header-on-menu'); unlockScroll();
}
function initMenu() {
    $$('.menu__nav a').forEach((a, i) => a.style.setProperty('--k', i));
    burger.addEventListener('click', () => (menu.classList.contains('is-open') ? closeMenu() : openMenu()));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    matchMedia('(min-width:1024px)').addEventListener('change', e => { if (e.matches) closeMenu(); });
}

/* ==========================================================================
   REVELADOS, TEXTO DIVIDIDO, CONTADORES
   ========================================================================== */
function splitWords(el) {
    let i = 0;
    el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
    const walk = node => Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
            const frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(p => {
                if (!p) return;
                if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
                const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
                const wi = document.createElement('span'); wi.className = 'wi'; wi.style.setProperty('--i', i++); wi.textContent = p;
                w.appendChild(wi); frag.appendChild(w);
            });
            n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
    });
    walk(el);
}

function initReveal() {
    $$('[data-split]').forEach(splitWords);
    $$('[data-delay]').forEach(el => el.style.setProperty('--d', el.dataset.delay));
    const io = new IntersectionObserver(entries => entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
    }), { threshold: .14, rootMargin: '0px 0px -6% 0px' });
    $$('[data-reveal],[data-split]').forEach(el => io.observe(el));
}

function initCounters() {
    const fmt = (n, sep) => (sep ? n.toLocaleString('es-MX') : String(n));
    const els = $$('[data-count]');
    if (!REDUCED) els.forEach(el => { el.textContent = '0'; });
    const io = new IntersectionObserver(entries => entries.forEach(e => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const el = e.target, end = +el.dataset.count, sep = !!el.dataset.sep;
        if (REDUCED) { el.textContent = fmt(end, sep); return; }
        const dur = 1900, t0 = performance.now();
        const step = now => {
            const p = clamp((now - t0) / dur);
            el.textContent = fmt(Math.round(end * easeOutExpo(p)), sep);
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }), { threshold: .6 });
    els.forEach(el => io.observe(el));
}

/* ==========================================================================
   HERO: burbujas, parallax por mouse, botones magnéticos
   ========================================================================== */
function initHero() {
    const hero = $('#inicio'), cv = $('#bubbles'), ctx = cv.getContext('2d');
    const shot = $('.hero__shot'), copy = $('.hero__copy');
    let w = 0, h = 0, dpr = 1, bubbles = [], heroVisible = true, mouse = { x: -999, y: -999 };

    const spawn = (fromBottom) => {
        const r = 2 + Math.pow(Math.random(), 2.2) * 15;
        return { x: Math.random() * w, y: fromBottom ? h + r + Math.random() * 60 : Math.random() * h, r, vy: 14 + Math.random() * 26 + (18 - r) * 1.2, ph: Math.random() * 6.28, amp: 6 + Math.random() * 20, a: .25 + Math.random() * .45, x0: 0 };
    };
    const resize = () => {
        dpr = Math.min(devicePixelRatio || 1, 2);
        w = cv.clientWidth; h = cv.clientHeight;
        cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const n = clamp(Math.round(w * h / 24000), 14, 44);
        bubbles = Array.from({ length: n }, () => { const b = spawn(false); b.x0 = b.x; return b; });
    };
    resize();
    new ResizeObserver(resize).observe(cv);
    new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe(hero);
    if (FINE_POINTER) hero.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });

    if (!REDUCED) {
        let tt = 0;
        hooks.push((now, dt) => {
            if (!heroVisible) return;
            tt += dt;
            ctx.clearRect(0, 0, w, h);
            for (const b of bubbles) {
                b.y -= b.vy * dt;
                let x = b.x0 + Math.sin(b.ph + tt * (.6 + 6 / b.r * .1)) * b.amp;
                const dx = x - mouse.x, dy = b.y - mouse.y, d2 = dx * dx + dy * dy;
                if (d2 < 9000) { const f = (1 - d2 / 9000) * 28; x += (dx / (Math.sqrt(d2) + 1)) * f; b.y += (dy / (Math.sqrt(d2) + 1)) * f * .1; }
                if (b.y < -b.r * 2) { Object.assign(b, spawn(true)); b.x0 = b.x; }
                ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, 6.2832);
                ctx.fillStyle = `rgba(255,255,255,${b.a * .55})`; ctx.fill();
                ctx.lineWidth = 1.2; ctx.strokeStyle = `rgba(0,146,221,${b.a})`; ctx.stroke();
                if (b.r > 5) { ctx.beginPath(); ctx.arc(x - b.r * .3, b.y - b.r * .32, b.r * .28, 3.6, 5.2); ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, b.a * 2)})`; ctx.lineWidth = 1.4; ctx.stroke(); }
            }
        });
    }

    // inclinación 3D de la foto con el mouse
    if (FINE_POINTER && !REDUCED) {
        const stage = $('#heroStage'), strength = +shot.dataset.parallaxMouse || 12;
        stage.addEventListener('pointermove', e => {
            const r = stage.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
            shot.style.setProperty('--mx', `${(nx * strength).toFixed(1)}px`);
            shot.style.setProperty('--my', `${(ny * strength * .7).toFixed(1)}px`);
            shot.style.setProperty('--ry', `${(nx * 7).toFixed(2)}deg`);
            shot.style.setProperty('--rx', `${(-ny * 6).toFixed(2)}deg`);
        });
        stage.addEventListener('pointerleave', () => ['--mx', '--my', '--ry', '--rx'].forEach(v => shot.style.setProperty(v, '0')));
    }

    // parallax de salida al hacer scroll
    if (!REDUCED) track(hero, (y, t) => {
        const p = clamp(y / (t.h * .9));
        shot.style.setProperty('--sy', `${(p * 70).toFixed(1)}px`);
        copy.style.transform = `translate3d(0,${(p * 28).toFixed(1)}px,0)`;
        copy.style.opacity = (1 - p * 1.1).toFixed(3);
    });
}

function initMagnetic() {
    if (!FINE_POINTER || REDUCED) return;
    $$('[data-magnetic]').forEach(el => {
        el.addEventListener('pointermove', e => {
            const r = el.getBoundingClientRect();
            const x = (e.clientX - (r.left + r.width / 2)) * .22, y = (e.clientY - (r.top + r.height / 2)) * .32;
            el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
        });
        el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
}

/* ==========================================================================
   MARQUEE (reacciona a la velocidad del scroll)
   ========================================================================== */
function initMarquee() {
    const track_ = $('#marquee');
    if (!track_ || REDUCED) return;
    const group = track_.firstElementChild;
    for (let i = 0; i < 2; i++) { const c = group.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track_.appendChild(c); }
    let x = 0, dir = 1, gw = group.offsetWidth, vis = true;
    new ResizeObserver(() => { gw = group.offsetWidth; }).observe(group);
    new IntersectionObserver(([e]) => { vis = e.isIntersecting; }).observe(track_.parentElement);
    hooks.push((now, dt) => {
        if (!vis) return;
        if (scrollVel > .5) dir = 1; else if (scrollVel < -.5) dir = -1;
        x += dir * (60 + Math.min(Math.abs(scrollVel), 80) * 14) * dt;
        const wrapped = ((x % gw) + gw) % gw;
        track_.style.transform = `translate3d(${-wrapped}px,0,0)`;
    });
}

/* ==========================================================================
   MANIFIESTO: las palabras se encienden con el scroll
   ========================================================================== */
function initManifesto() {
    const el = $('#manifestoText');
    if (!el) return;
    const tokens = [];
    const walk = node => Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
            const frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(p => {
                if (!p) return;
                if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
                const s = document.createElement('span'); s.className = 'sw'; s.textContent = p; tokens.push(s); frag.appendChild(s);
            });
            n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.classList.contains('inline-img')) tokens.push(n);
    });
    walk(el);
    if (REDUCED) return;
    let lit = -1;
    track(el, (y, t) => {
        const p = clamp((y + vh * .88 - t.top) / (t.h + vh * .3));
        const n = Math.round(p * (tokens.length + 3));
        if (n === lit) return;
        lit = n;
        tokens.forEach((tk, i) => tk.classList.toggle('is-lit', i < n));
    });
}

/* ==========================================================================
   BREWHOUSE: pines sobre la foto + lista sincronizada
   ========================================================================== */
function initBrew() {
    const items = $$('.spec__item'), pins = $$('.pin'), section = $('#brewhouse');
    let current = 0, timer = null, userTouched = false, visible = false;
    const set = i => {
        current = i;
        items.forEach((it, k) => { const on = k === i; it.classList.toggle('is-active', on); $('.spec__btn', it).setAttribute('aria-expanded', on); });
        pins.forEach((p, k) => p.classList.toggle('is-active', k === i));
    };
    const restart = () => {
        clearInterval(timer);
        if (REDUCED) return;
        timer = setInterval(() => { if (visible) set((current + 1) % items.length); }, userTouched ? 7000 : 4200);
    };
    items.forEach((it, i) => $('.spec__btn', it).addEventListener('click', () => { userTouched = true; set(i); restart(); }));
    pins.forEach((p, i) => p.addEventListener('click', () => { userTouched = true; set(i); restart(); }));
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: .25 }).observe(section);
    set(0); restart();
}

/* ==========================================================================
   PROCESO: diagrama pinned que se arma con el scroll
   ========================================================================== */
function initFlow() {
    const section = $('#proceso'), svg = $('#flowSvg'), pan = $('#flowPan');
    if (!section || !svg) return;

    // olas de cada tanque
    $$('.lq', svg).forEach(lq => {
        const rect = $('rect', lq), wave = $('.lq__wave', lq), y = +rect.getAttribute('y') + 1;
        wave.setAttribute('d', wavePath(-140, 210, y, 4, 56, 14));
    });
    // placas del chiller
    const plates = $('.plates', svg);
    for (let i = 0; i < 13; i++) {
        const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        r.setAttribute('x', -52 + i * 8.4); r.setAttribute('y', -124); r.setAttribute('width', 5); r.setAttribute('height', 116); r.setAttribute('rx', 1.5);
        r.style.setProperty('--k', i); plates.appendChild(r);
    }

    const nodes = $$('.node', svg), pipes = $$('.pipe', svg), pump = $('.pump', svg);
    const steps = $$('.flow__step'), railBtns = $$('#flowRail button'), bar = $('#flowBar');
    const nodeX = [110, 300, 490, 690, 880];
    const STATES = [
        { a: 0, fill: { 0: .84 }, on: [0], pipes: [], flow: [] },
        { a: 1, fill: { 0: .36, 1: .78 }, on: [1], pipes: [0], flow: [0] },
        { a: 2, fill: { 0: .36, 1: .16, 2: .82 }, on: [2], pipes: [0, 1], flow: [1] },
        { a: 3, fill: { 0: .36, 1: .16, 2: .12, 4: .5 }, on: [3], pipes: [0, 1, 2, 3], flow: [2, 3] },
        { a: 4, fill: { 0: .36, 1: .16, 2: .12, 4: .9 }, on: [4], pipes: [0, 1, 2, 3], flow: [] },
        { a: -1, fill: { 0: .36, 1: .16, 2: .12, 4: .9 }, on: [4], pipes: [0, 1, 2, 3], flow: [] }
    ];
    let current = -1, trk = null;

    const panTo = i => {
        const vp = pan.parentElement.clientWidth, pw = pan.offsetWidth;
        if (pw <= vp + 2) { pan.style.transform = ''; return; }
        const cx = (i < 0 || i > 4 ? 500 : nodeX[i]) / 1000 * pw;
        pan.style.transform = `translateX(${-clamp(cx - vp / 2, 0, pw - vp)}px)`;
    };
    const apply = i => {
        if (i === current) return;
        current = i;
        const S = STATES[i];
        nodes.forEach((n, k) => {
            n.classList.toggle('is-active', S.a === k || S.a === -1);
            n.classList.toggle('is-done', S.a !== -1 && k < S.a);
            n.classList.toggle('is-on', S.on.includes(k));
            const lq = $('.lq', n); if (lq) lq.style.setProperty('--fill', S.fill[k] || 0);
        });
        pipes.forEach((p, k) => { p.classList.toggle('is-drawn', S.pipes.includes(k)); p.classList.toggle('is-flow', S.flow.includes(k)); });
        pump.classList.toggle('is-on', S.flow.includes(1));
        steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
        railBtns.forEach((b, k) => { b.classList.toggle('is-active', k === Math.min(i, 4) && i < 5); b.classList.toggle('is-done', k < i); });
        panTo(S.a);
    };

    railBtns.forEach((b, k) => b.addEventListener('click', () => {
        const t = trk; if (!t) return;
        scrollToY(t.top + ((k + .5) / 6) * (t.h - vh) + 2);
    }));

    if (REDUCED) { current = -1; apply(4); steps.forEach(s => s.classList.remove('is-active')); return; }
    trk = track(section, (y, t) => {
        const p = pinProgress(y, t);
        bar.style.setProperty('--fp', p.toFixed(3));
        apply(Math.min(5, Math.floor(p * 6)));
    });
    apply(0);
    addEventListener('resize', () => panTo(STATES[Math.max(current, 0)].a));
}

/* ==========================================================================
   IMAGEN QUE SE EXPANDE
   ========================================================================== */
function initExpand() {
    const section = $('#calidad'), stage = $('.expand__stage', section);
    if (REDUCED || !section) return;
    let last = -1;
    track(section, (y, t) => {
        const p = pinProgress(y, t);
        const e = easeInOut(clamp(p / .7));
        if (Math.abs(e - last) < .0015) return;
        last = e;
        stage.style.setProperty('--e', e.toFixed(4));
    });
    stage.style.setProperty('--e', 0);
}

/* ==========================================================================
   BENTO: tilt 3D + spotlight, placas animadas
   ========================================================================== */
function initBento() {
    $$('.plates-art i').forEach((el, k) => { el.style.animationDelay = `${(k * .13).toFixed(2)}s`; });
    if (!FINE_POINTER || REDUCED) return;
    $$('[data-tilt]').forEach(card => {
        card.addEventListener('pointermove', e => {
            const r = card.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
            card.style.setProperty('--mx', `${x}px`); card.style.setProperty('--my', `${y}px`);
            card.style.setProperty('--ry', `${((x / r.width - .5) * 6).toFixed(2)}deg`);
            card.style.setProperty('--rx', `${(-(y / r.height - .5) * 6).toFixed(2)}deg`);
        });
        card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
    });
}

/* ==========================================================================
   BEBIDAS: scroll horizontal fijado (>= 900px)
   ========================================================================== */
function initBev() {
    const section = $('#bebidas'), trackEl = $('#bevTrack'), bar = $('#bevBar');
    if (!section || REDUCED) return;
    const mq = matchMedia('(min-width:900px)');
    let dist = 0;
    const size = () => {
        if (!mq.matches) { section.style.removeProperty('--bev-h'); trackEl.style.removeProperty('--bx'); return; }
        const gutter = parseFloat(getComputedStyle($('.bev__viewport', section)).paddingLeft) || 0;
        dist = Math.max(0, trackEl.scrollWidth - innerWidth + gutter * 2);
        section.style.setProperty('--bev-h', `${Math.round(dist + innerHeight)}px`);
    };
    size();
    addEventListener('resize', size);
    addEventListener('load', () => { size(); measure(); });
    track(section, (y, t) => {
        if (!mq.matches) return;
        const p = pinProgress(y, t);
        trackEl.style.setProperty('--bx', `${(-p * dist).toFixed(1)}px`);
        bar.style.setProperty('--bp', p.toFixed(3));
    });
}

/* ==========================================================================
   CONFIGURADOR 3D
   ========================================================================== */
const CAPS = [200, 300, 500, 1000, 2000, 3000, 5000];

function initConfigurator() {
    const form = $('#cfgForm'), range = $('#cfgRange'), outEl = $('#cfgOut'), volEl = $('#cfgVol');
    const sumEl = $('#cfgSummary'), cta = $('#cfgCta'), drainTxt = $('#tagDrainTxt');
    const state = { idx: +range.value, jacket: false, feet: 'Niveladores', valve: 'Válvula de mariposa' };

    const fmt = n => n.toLocaleString('es-MX');
    let shownVol = CAPS[state.idx], volTween = 0;
    const tweenVolume = to => {
        cancelAnimationFrame(volTween);
        const from = shownVol, t0 = performance.now();
        const step = now => {
            const p = clamp((now - t0) / 600);
            shownVol = Math.round(lerp(from, to, easeOutExpo(p)));
            volEl.textContent = fmt(shownVol);
            if (p < 1) volTween = requestAnimationFrame(step);
        };
        volTween = requestAnimationFrame(step);
    };

    const readForm = () => {
        state.idx = +range.value;
        state.jacket = form.elements.jacket.value.startsWith('Enchaquetado');
        state.feet = form.elements.feet.value;
        state.valve = form.elements.valve.value;
    };
    const update = (animate = true) => {
        readForm();
        const L = CAPS[state.idx];
        outEl.textContent = `${fmt(L)} litros`;
        range.style.setProperty('--rp', `${(state.idx / (CAPS.length - 1)) * 100}%`);
        if (animate && !REDUCED) tweenVolume(L); else volEl.textContent = fmt(L);
        const body = state.jacket ? 'enchaquetado (dimple jacket)' : 'cilindro sencillo';
        const feet = state.feet.toLowerCase();
        const valve = state.valve.toLowerCase();
        sumEl.textContent = `${fmt(L)} L, ${body}, patas con ${feet}, ${valve}.`;
        drainTxt.textContent = state.valve;
        cta.href = waUrl(`Hola, quiero cotizar un fermentador isobárico: ${fmt(L)} litros, ${body}, patas con ${feet}, ${valve}.`);
        if (scene) scene.apply(state);
    };
    let scene = null;
    form.addEventListener('input', () => update(true));
    form.addEventListener('submit', e => e.preventDefault());
    update(false);

    // carga diferida de Three.js cuando la sección está cerca
    const viewer = $('#cfgViewer'), section = $('#fermentadores');
    let started = false;
    const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting || started) return;
        started = true; io.disconnect();
        buildTank(viewer, state).then(s => { scene = s; if (scene) scene.apply(state); }).catch(err => { console.warn('[Tank Inox] 3D no disponible:', err); showFallback(viewer); });
    }, { rootMargin: '700px 0px' });
    io.observe(section);
}

function showFallback(viewer) {
    $('#tank3d').hidden = true;
    $('.cfg__fallback', viewer).hidden = false;
    $('#cfgTags').hidden = true;
    $('.cfg__hint', viewer).hidden = true;
}

async function buildTank(viewer, initial) {
    const canvas = $('#tank3d');
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
    const V3 = THREE.Vector3;

    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch (e) { showFallback(viewer); return null; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, .1, 200);

    /* Entorno de estudio: tiras de luz para que el acero refleje como en una foto de producto */
    const envCv = document.createElement('canvas'); envCv.width = 1024; envCv.height = 512;
    const g = envCv.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, 512);
    bg.addColorStop(0, '#1b4a75'); bg.addColorStop(.42, '#7390aa'); bg.addColorStop(.52, '#41607c'); bg.addColorStop(1, '#06121d');
    g.fillStyle = bg; g.fillRect(0, 0, 1024, 512);
    const strip = (x, w, y0, y1, col) => {
        const gx = g.createLinearGradient(x - w, 0, x + w, 0);
        gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(.5, col); gx.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gx; g.fillRect(x - w, y0, 2 * w, y1 - y0);
    };
    strip(120, 120, 70, 440, '#ffffff'); strip(400, 76, 90, 420, '#ffffff'); strip(690, 140, 60, 450, '#ffffff');
    strip(930, 64, 100, 410, '#ffffff'); strip(560, 44, 110, 400, '#2aa9f0');
    const top = g.createLinearGradient(0, 0, 0, 130); top.addColorStop(0, 'rgba(255,255,255,.95)'); top.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = top; g.fillRect(0, 0, 1024, 130);
    const envTex = new THREE.CanvasTexture(envCv);
    envTex.mapping = THREE.EquirectangularReflectionMapping; envTex.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(envTex).texture;
    pmrem.dispose();

    const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(4, 8, 6); scene.add(key);
    const rim = new THREE.PointLight(0x0092dd, 60, 40); rim.position.set(-6, 4, -5); scene.add(rim);

    /* Materiales */
    const steel = new THREE.MeshPhysicalMaterial({ color: 0xd3dce3, metalness: 1, roughness: .24, envMapIntensity: 1.35, side: THREE.DoubleSide });
    const steelDull = new THREE.MeshStandardMaterial({ color: 0xb4c0cb, metalness: 1, roughness: .4, envMapIntensity: 1 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x0092dd, metalness: .2, roughness: .38 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x151a1f, roughness: .75 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe9f8, metalness: 0, roughness: .06, transparent: true, opacity: .38, depthWrite: false });
    const liquidMat = new THREE.MeshStandardMaterial({ color: 0x2aa9f0, roughness: .3, transparent: true, opacity: .85 });

    /* Textura del termómetro */
    const dialCv = document.createElement('canvas'); dialCv.width = dialCv.height = 256;
    const d = dialCv.getContext('2d');
    d.fillStyle = '#fff'; d.beginPath(); d.arc(128, 128, 124, 0, 6.2832); d.fill();
    d.strokeStyle = '#0a1622'; d.fillStyle = '#0a1622'; d.textAlign = 'center'; d.textBaseline = 'middle';
    for (let i = 0; i <= 50; i++) {
        const a = (-225 + i * 5.4) * Math.PI / 180, big = i % 10 === 0;
        d.lineWidth = big ? 4 : 2;
        d.beginPath(); d.moveTo(128 + Math.cos(a) * (big ? 92 : 100), 128 + Math.sin(a) * (big ? 92 : 100)); d.lineTo(128 + Math.cos(a) * 114, 128 + Math.sin(a) * 114); d.stroke();
        if (big) { d.font = '600 22px sans-serif'; d.fillText(String(i * 2), 128 + Math.cos(a) * 70, 128 + Math.sin(a) * 70); }
    }
    d.font = '700 18px sans-serif'; d.fillText('°C', 128, 190);
    const dialTex = new THREE.CanvasTexture(dialCv); dialTex.colorSpace = THREE.SRGBColorSpace; dialTex.anisotropy = 4;
    const dialFace = new THREE.MeshStandardMaterial({ map: dialTex, roughness: .4, metalness: .05 });

    /* Textura de hoyuelos (dimple jacket) */
    const dimCv = document.createElement('canvas'); dimCv.width = dimCv.height = 128;
    const dc = dimCv.getContext('2d'); dc.fillStyle = '#000'; dc.fillRect(0, 0, 128, 128);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const cx = c * 32 + (r % 2 ? 32 : 16), cy = r * 32 + 16;
        const rg = dc.createRadialGradient(cx, cy, 2, cx, cy, 15); rg.addColorStop(0, '#fff'); rg.addColorStop(1, '#000');
        dc.fillStyle = rg; dc.beginPath(); dc.arc(cx, cy, 15, 0, 6.2832); dc.fill();
    }
    const dimTex = new THREE.CanvasTexture(dimCv); dimTex.wrapS = dimTex.wrapT = THREE.RepeatWrapping; dimTex.repeat.set(18, 5);
    const jacketMat = new THREE.MeshPhysicalMaterial({ color: 0xd9e1e8, metalness: 1, roughness: .32, envMapIntensity: 1.2, bumpMap: dimTex, bumpScale: 2.2, side: THREE.DoubleSide });

    const tube = (a, b, r, mat, seg = 14) => {
        const dir = new V3().subVectors(b, a), len = dir.length();
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
        m.position.copy(a).addScaledVector(dir, .5);
        m.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir.normalize());
        return m;
    };
    const lathe = (pts, mat) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 112), mat);
    const ring = (y, r, t = .016) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 10, 112), steelDull); m.rotation.x = Math.PI / 2; m.position.y = y; return m; };
    const radial = (phi, y, rad = 1) => new V3(Math.sin(phi) * rad, y, Math.cos(phi) * rad);

    /* ----- Fermentador (radio = 1) ----- */
    const tank = new THREE.Group();
    const tipY = .55, coneTop = tipY + 1 / Math.tan(Math.PI / 6), cylTop = coneTop + 2.2;
    tank.add(lathe([[.09, tipY], [1, coneTop]], steel));
    tank.add(lathe([[1, coneTop], [1, cylTop]], steel));
    const dome = []; for (let i = 0; i <= 18; i++) { const t = i / 18 * Math.PI / 2; dome.push([Math.cos(t), cylTop + Math.sin(t) * .32]); }
    tank.add(lathe(dome, steel));
    tank.add(ring(coneTop, 1.004), ring(cylTop, 1.004));

    // patas, travesaños
    const legTop = [], legBot = [];
    for (let i = 0; i < 3; i++) {
        const th = Math.PI / 2 + i * Math.PI * 2 / 3;
        const a = radial(th, 3, .98), b = radial(th, .05, 1.08);
        legTop.push(a); legBot.push(b);
        tank.add(tube(a, b, .05, steelDull));
    }
    for (let i = 0; i < 3; i++) {
        const th1 = Math.PI / 2 + i * Math.PI * 2 / 3, th2 = Math.PI / 2 + ((i + 1) % 3) * Math.PI * 2 / 3;
        tank.add(tube(radial(th1, .95, 1.03), radial(th2, .95, 1.03), .033, steelDull));
    }
    const levelers = new THREE.Group(), wheels = new THREE.Group();
    legBot.forEach((b, i) => {
        const th = Math.PI / 2 + i * Math.PI * 2 / 3;
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(.1, .11, .05, 24), steelDull); foot.position.set(b.x, .025, b.z);
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .14, 10), steel); rod.position.set(b.x, .1, b.z);
        levelers.add(foot, rod);
        const wh = new THREE.Group();
        const tyre = new THREE.Mesh(new THREE.CylinderGeometry(.105, .105, .07, 28), rubber); tyre.rotation.z = Math.PI / 2;
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .09, 16), steel); hub.rotation.z = Math.PI / 2;
        const fork = new THREE.Mesh(new THREE.BoxGeometry(.11, .05, .06), steelDull); fork.position.y = .125;
        wh.add(tyre, hub, fork); wh.position.set(b.x * 1.04, .105, b.z * 1.04); wh.rotation.y = th;
        wheels.add(wh);
    });
    wheels.visible = false;
    tank.add(levelers, wheels);

    // enchaquetado con hoyuelos
    const jacket = new THREE.Group();
    const jBody = new THREE.Mesh(new THREE.CylinderGeometry(1.032, 1.032, 1.2, 112, 1, true), jacketMat);
    jBody.position.y = 3.05; jacket.add(jBody);
    [2.45, 3.65].forEach(y => { const r = ring(y, 1.032, .022); r.material = steel; jacket.add(r); });
    [[2.62, 1], [3.5, 1]].forEach(([y], k) => {
        const stub = new THREE.Group();
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .26, 14), steel); pipe.rotation.x = Math.PI / 2; pipe.position.z = 1.1;
        const col = new THREE.Mesh(new THREE.TorusGeometry(.065, .018, 8, 24), k ? steel : blueMat); col.position.z = 1.22;
        stub.add(pipe, col); stub.position.y = y; stub.rotation.y = -.95; jacket.add(stub);
    });
    jacket.visible = false; jacket.scale.y = .001; tank.add(jacket);

    // termómetro con carátula
    const dial = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .16, 12), steel); stem.rotation.x = Math.PI / 2; stem.position.z = .98;
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(.165, .02, 12, 40), steel); bezel.position.z = 1.1;
    const face = new THREE.Mesh(new THREE.CircleGeometry(.16, 40), dialFace); face.position.z = 1.105;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .09, 40), steel); cap.rotation.x = Math.PI / 2; cap.position.z = 1.06;
    const needle = new THREE.Mesh(new THREE.BoxGeometry(.012, .125, .004), new THREE.MeshBasicMaterial({ color: 0xd32f2f })); needle.position.z = 1.112; needle.geometry.translate(0, .045, 0);
    dial.add(stem, cap, bezel, face, needle); dial.position.y = 4.15; dial.rotation.y = .5; tank.add(dial);

    // válvula de muestreo
    const sample = new THREE.Group();
    const sFer = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .2, 14), steel); sFer.rotation.x = Math.PI / 2; sFer.position.z = 1.05;
    const sBall = new THREE.Mesh(new THREE.SphereGeometry(.075, 20, 16), steel); sBall.position.z = 1.2;
    const sLever = new THREE.Mesh(new THREE.BoxGeometry(.04, .04, .26), blueMat); sLever.position.set(.1, .05, 1.2); sLever.rotation.y = .4;
    const sOut = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .16, 10), steel); sOut.position.set(0, -.1, 1.2);
    sample.add(sFer, sBall, sLever, sOut); sample.position.y = 3.9; sample.rotation.y = -.7; tank.add(sample);

    // tapa: registro clamp y airlock
    const hatch = new THREE.Group();
    const hatchDisc = new THREE.Mesh(new THREE.CylinderGeometry(.36, .38, .06, 56), steel); hatchDisc.position.y = cylTop + .31;
    const clampRing = new THREE.Mesh(new THREE.TorusGeometry(.375, .03, 12, 56), steelDull); clampRing.rotation.x = Math.PI / 2; clampRing.position.y = cylTop + .3;
    const bolt = new THREE.Mesh(new THREE.BoxGeometry(.1, .08, .1), steel); bolt.position.set(.4, cylTop + .3, 0);
    const wing = new THREE.Mesh(new THREE.SphereGeometry(.05, 14, 10), blueMat); wing.position.set(.47, cylTop + .3, 0);
    hatch.add(hatchDisc, clampRing, bolt, wing); tank.add(hatch);
    const airlock = new THREE.Group();
    const port = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .3, 16), steel); port.position.y = cylTop + .38;
    const fer = new THREE.Mesh(new THREE.TorusGeometry(.075, .017, 8, 24), steelDull); fer.rotation.x = Math.PI / 2; fer.position.y = cylTop + .53;
    const alVessel = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .2, 18), glass); alVessel.position.y = cylTop + .66;
    const alLiquid = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .08, 16), liquidMat); alLiquid.position.y = cylTop + .62;
    airlock.add(port, fer, alVessel, alLiquid); airlock.position.set(.55, -.05, 0); tank.add(airlock);

    // drenaje: mariposa o esfera
    const drainPipe = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .26, 16), steel); drainPipe.position.y = tipY - .02;
    tank.add(drainPipe);
    const bfly = new THREE.Group();
    const bBody = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .085, 28), steel); bBody.position.y = .31;
    const bNeck = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .14, 12), steel); bNeck.position.set(.15, .31, 0); bNeck.rotation.z = Math.PI / 2;
    const bHandle = new THREE.Mesh(new THREE.BoxGeometry(.34, .035, .06), blueMat); bHandle.position.set(.3, .31, 0);
    const bOut = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .5, 16), steel); bOut.rotation.z = Math.PI / 2; bOut.position.set(-.22, .17, 0);
    bfly.add(bBody, bNeck, bHandle, bOut);
    const ball = new THREE.Group();
    const lBody = new THREE.Mesh(new THREE.SphereGeometry(.14, 26, 20), steel); lBody.position.y = .3;
    const lLever = new THREE.Mesh(new THREE.BoxGeometry(.5, .035, .05), blueMat); lLever.position.set(.28, .43, 0);
    const lOut = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .5, 16), steel); lOut.rotation.z = Math.PI / 2; lOut.position.set(-.22, .17, 0);
    ball.add(lBody, lLever, lOut); ball.visible = false;
    tank.add(bfly, ball);

    /* ----- Persona de referencia (1.75 m) ----- */
    const humanMat = new THREE.MeshStandardMaterial({ color: 0x8fd3f5, transparent: true, opacity: .42, roughness: .5, depthWrite: false });
    const human = new THREE.Group();
    const hBody = new THREE.Mesh(new THREE.CapsuleGeometry(.14, 1.18, 6, 16), humanMat); hBody.position.y = .73;
    const hHead = new THREE.Mesh(new THREE.SphereGeometry(.1, 20, 16), humanMat); hHead.position.y = 1.6;
    human.add(hBody, hHead);

    /* ----- Piso ----- */
    const floorCv = document.createElement('canvas'); floorCv.width = floorCv.height = 256;
    const fc = floorCv.getContext('2d'); const fg = fc.createRadialGradient(128, 128, 10, 128, 128, 128);
    fg.addColorStop(0, 'rgba(0,146,221,.5)'); fg.addColorStop(.55, 'rgba(0,146,221,.14)'); fg.addColorStop(1, 'rgba(0,146,221,0)');
    fc.fillStyle = fg; fc.fillRect(0, 0, 256, 256);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(floorCv), transparent: true, depthWrite: false }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = .003;
    const floorRing = new THREE.Mesh(new THREE.RingGeometry(.97, 1, 96), new THREE.MeshBasicMaterial({ color: 0x2aa9f0, transparent: true, opacity: .55, side: THREE.DoubleSide }));
    floorRing.rotation.x = -Math.PI / 2; floorRing.position.y = .004;

    const world = new THREE.Group(), tankHolder = new THREE.Group();
    tankHolder.add(tank); world.add(tankHolder, floor, floorRing);
    scene.add(world, human);

    /* ----- Puntos de anclaje para las etiquetas ----- */
    const anchors = {
        airlock: { local: new V3(.55, cylTop + .8, 0), onTank: true },
        clamp: { local: new V3(-.2, cylTop + .36, .28), onTank: true },
        dial: { local: radial(.5, 4.15, 1.2), onTank: true },
        sample: { local: radial(-.7, 3.9, 1.28), onTank: true },
        cone: { local: radial(.25, 1.5, .62), onTank: true },
        drain: { local: new V3(.3, .38, 0), onTank: true },
        human: { local: new V3(0, 1.78, 0), onTank: false }
    };
    const tags = $$('#cfgTags li').map(li => ({ li, a: anchors[li.dataset.anchor] }));

    /* ----- Estado animado ----- */
    const Rreal = L => Math.cbrt((L / 1000) / 8.7);
    const cur = { R: Rreal(initial ? CAPS[initial.idx] : 500), jacket: 0, yaw: -.55, vel: 0 };
    const tgt = { R: cur.R, jacket: 0 };
    let dragging = false, lastX = 0, lastMove = performance.now(), hintHidden = false;

    const apply = s => {
        tgt.R = Rreal(CAPS[s.idx]); tgt.jacket = s.jacket ? 1 : 0;
        levelers.visible = s.feet === 'Niveladores'; wheels.visible = s.feet === 'Ruedas';
        bfly.visible = s.valve === 'Válvula de mariposa'; ball.visible = s.valve === 'Válvula de esfera';
    };
    apply(initial);
    cur.jacket = tgt.jacket; cur.R = tgt.R;

    /* ----- Interacción: arrastrar para girar ----- */
    const hint = $('.cfg__hint', viewer);
    viewer.addEventListener('pointerdown', e => {
        dragging = true; lastX = e.clientX; cur.vel = 0; viewer.setPointerCapture(e.pointerId);
        if (!hintHidden) { hintHidden = true; hint.classList.add('is-hidden'); }
    });
    viewer.addEventListener('pointermove', e => {
        if (!dragging) return;
        const dx = e.clientX - lastX; lastX = e.clientX;
        cur.yaw += dx * .0095; cur.vel = dx * .0095 * 60; lastMove = performance.now();
    });
    const endDrag = () => { dragging = false; lastMove = performance.now(); };
    viewer.addEventListener('pointerup', endDrag); viewer.addEventListener('pointercancel', endDrag);

    /* ----- Tamaño y encuadre ----- */
    const size = { w: 1, h: 1 };
    const resize = () => {
        size.w = viewer.clientWidth; size.h = viewer.clientHeight;
        renderer.setSize(size.w, size.h, false);
        camera.aspect = size.w / size.h; camera.updateProjectionMatrix();
    };
    resize(); new ResizeObserver(resize).observe(viewer);

    const camState = { dist: 8, y: 1.5, x: -.4 };
    const fit = () => {
        const R = cur.R, H = Math.max(5.05 * R, 1.85), W = 2 * R + .95;
        const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const needV = (H * 1.2) / 2 / tanHalf, needH = (W * 1.16) / 2 / (tanHalf * camera.aspect);
        return { dist: Math.max(needV, needH), y: H * .5, x: -.4 * (1 - 0) };
    };

    let visible = false;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '80px' }).observe(viewer);

    const tmp = new V3(), ndc = new V3(), wpos = new V3();
    let first = true;
    hooks.push((now, dt) => {
        if (!visible) return;
        // interpolaciones
        const k = 1 - Math.pow(.0009, dt);
        cur.R = lerp(cur.R, tgt.R, k * .9);
        cur.jacket = lerp(cur.jacket, tgt.jacket, k);
        // giro
        if (!dragging) {
            cur.yaw += cur.vel * dt; cur.vel *= Math.pow(.04, dt);
            if (!REDUCED && now - lastMove > 2200) cur.yaw += .22 * dt;
        }
        world.rotation.y = cur.yaw;
        tankHolder.scale.setScalar(cur.R);
        human.position.set(-(cur.R + .62), 0, 0);
        const fr = cur.R + .8;
        floor.scale.setScalar(fr * 1.5); floorRing.scale.setScalar(fr);
        jacket.visible = cur.jacket > .02; jacket.scale.y = Math.max(.001, cur.jacket);
        jacket.position.y = 3.05 * (1 - cur.jacket);
        needle.rotation.z = -.9 + Math.sin(now * .0011) * .06;
        alLiquid.position.y = cylTop + .62 + Math.sin(now * .004) * .004;

        // cámara
        const f = fit();
        if (first) { camState.dist = f.dist; camState.y = f.y; camState.x = f.x; first = false; }
        camState.dist = lerp(camState.dist, f.dist, k * .8); camState.y = lerp(camState.y, f.y, k * .8); camState.x = lerp(camState.x, f.x, k * .8);
        camera.position.set(camState.x, camState.y + camState.dist * .1, camState.dist);
        camera.lookAt(camState.x, camState.y, 0);
        camera.updateMatrixWorld();
        renderer.render(scene, camera);

        // etiquetas HUD: se proyectan los anclajes 3D a pantalla
        const toCam = new V3(camera.position.x, 0, camera.position.z).normalize();
        tags.forEach(({ li, a }) => {
            if (a.onTank) wpos.copy(a.local).multiplyScalar(cur.R).applyMatrix4(world.matrixWorld);
            else wpos.copy(a.local).add(human.position);
            const rad = tmp.set(wpos.x, 0, wpos.z);
            const faces = !a.onTank || rad.length() < .45 * cur.R || rad.normalize().dot(toCam) > .05;
            ndc.copy(wpos).project(camera);
            const x = (ndc.x * .5 + .5) * size.w, y = (-ndc.y * .5 + .5) * size.h;
            li.style.setProperty('--ax', `${x.toFixed(1)}px`); li.style.setProperty('--ay', `${y.toFixed(1)}px`);
            li.classList.toggle('is-left', x > size.w * .52);
            li.classList.toggle('is-on', faces && ndc.z < 1);
        });
    });

    return { apply };
}

/* ==========================================================================
   LÍNEA DE TIEMPO, FOOTER, GALERÍA
   ========================================================================== */
function initTimeline() {
    const tl = $('#timeline'), fill = $('#timelineFill');
    if (!tl) return;
    if (REDUCED) { fill.parentElement.style.setProperty('--tp', 1); return; }
    track(tl, (y, t) => tl.style.setProperty('--tp', clamp((y + vh * .62 - t.top) / t.h).toFixed(3)));
}

function initFooter() {
    const word = $('#footerWord');
    if (!word) return;
    if (REDUCED) { word.style.setProperty('--fp', 1); return; }
    track(word, (y, t) => word.style.setProperty('--fp', clamp((y + vh - t.top) / (vh * .75 + t.h * .3)).toFixed(3)));
}

function initGallery() {
    // parallax interno de cada foto
    if (!REDUCED) $$('[data-parallax-img]').forEach(img => {
        const sp = +img.dataset.parallaxImg || .08, tile = img.closest('.tile');
        track(tile, (y, t) => {
            const d = (y + vh / 2) - (t.top + t.h / 2);
            img.style.setProperty('--py', `${(-d * sp).toFixed(1)}px`);
        });
    });

    // lightbox
    const lb = $('#lightbox'), img = $('#lbImg'), cap = $('#lbCap');
    const tiles = $$('[data-lightbox]');
    let idx = 0, lastFocus = null;
    const show = i => {
        idx = (i + tiles.length) % tiles.length;
        const t = tiles[idx], im = $('img', t);
        img.src = t.dataset.lightbox; img.alt = im.alt; cap.textContent = $('figcaption', t).textContent;
        img.width = +t.dataset.w; img.height = +t.dataset.h;
    };
    const open = i => {
        lastFocus = document.activeElement; show(i);
        lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false'); lockScroll();
        $('#lbClose').focus({ preventScroll: true });
    };
    const close = () => {
        lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); unlockScroll();
        if (lastFocus) lastFocus.focus({ preventScroll: true });
    };
    tiles.forEach((t, i) => {
        t.setAttribute('tabindex', '0'); t.setAttribute('role', 'button'); t.setAttribute('aria-label', `Ampliar foto: ${$('figcaption', t).textContent}`);
        t.addEventListener('click', () => open(i));
        t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } });
    });
    $('#lbClose').addEventListener('click', close);
    $('#lbPrev').addEventListener('click', () => show(idx - 1));
    $('#lbNext').addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => {
        if (!lb.classList.contains('is-open')) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft') show(idx - 1);
        if (e.key === 'ArrowRight') show(idx + 1);
        if (e.key === 'Tab') {   // atrapa el foco dentro del diálogo
            const f = $$('button', lb), first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });
}

/* ==========================================================================
   FAQ + FORMULARIO
   ========================================================================== */
function initFaq() {
    const items = $$('.qa');
    items.forEach(qa => $('.qa__q', qa).addEventListener('click', () => {
        const open = !qa.classList.contains('is-open');
        items.forEach(o => { o.classList.remove('is-open'); $('.qa__q', o).setAttribute('aria-expanded', 'false'); });
        if (open) { qa.classList.add('is-open'); $('.qa__q', qa).setAttribute('aria-expanded', 'true'); }
    }));
}

function initForm() {
    const form = $('#contactForm'), ok = $('#formOk'), okLink = $('#formOkLink');
    const name = $('#f-name'), phone = $('#f-phone');
    const setErr = (input, id, text) => { $(id).textContent = text; input.closest('.field').classList.toggle('has-err', !!text); input.setAttribute('aria-invalid', !!text); if (text) input.setAttribute('aria-describedby', id.slice(1)); };
    const validate = () => {
        let valid = true;
        if (name.value.trim().length < 2) { setErr(name, '#e-name', 'Escribe tu nombre para saber con quién hablamos.'); valid = false; } else setErr(name, '#e-name', '');
        const digits = phone.value.replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 13) { setErr(phone, '#e-phone', 'Escribe un número de 10 dígitos, con lada.'); valid = false; } else setErr(phone, '#e-phone', '');
        return valid;
    };
    [name, phone].forEach(i => i.addEventListener('input', () => { if (i.closest('.field').classList.contains('has-err')) validate(); }));
    form.addEventListener('submit', e => {
        e.preventDefault();
        if (!validate()) { (form.querySelector('.has-err input') || name).focus(); return; }
        const f = new FormData(form);
        const litros = String(f.get('litros') || '').trim(), extra = String(f.get('mensaje') || '').trim();
        let msg = `Hola, soy ${String(f.get('nombre')).trim()}. Quiero cotizar: ${String(f.get('equipo')).toLowerCase()}, para producir ${String(f.get('bebida')).toLowerCase()}.`;
        if (litros) msg += ` Capacidad aproximada: ${litros} litros.`;
        if (extra) msg += ` ${extra}`;
        msg += ` Mi WhatsApp: ${String(f.get('telefono')).trim()}.`;
        const url = waUrl(msg);
        okLink.href = url; ok.hidden = false;
        window.open(url, '_blank', 'noopener');
    });
}

function initWaFloat() {
    const wa = $('#waFloat');
    setTimeout(() => { wa.classList.add('is-peek'); setTimeout(() => wa.classList.remove('is-peek'), 4200); }, 7000);
}

/* ==========================================================================
   ARRANQUE
   ========================================================================== */
function boot() {
    safe('links', initLinks);
    safe('menu', initMenu);
    safe('reveal', initReveal);
    safe('counters', initCounters);
    safe('hero', initHero);
    safe('magnetic', initMagnetic);
    safe('marquee', initMarquee);
    safe('manifesto', initManifesto);
    safe('brew', initBrew);
    safe('flow', initFlow);
    safe('expand', initExpand);
    safe('bento', initBento);
    safe('bev', initBev);
    safe('configurator', initConfigurator);
    safe('timeline', initTimeline);
    safe('footer', initFooter);
    safe('gallery', initGallery);
    safe('faq', initFaq);
    safe('form', initForm);
    safe('wa', initWaFloat);

    // scroll suave inercial (si Lenis cargó)
    if (!REDUCED && window.Lenis) {
        lenis = new Lenis({ duration: 1.2, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true, wheelMultiplier: .95 });
    }
    lockScroll();

    measure();
    registerTrackers();
    startEngine();
    safe('loader', initLoader);

    addEventListener('load', () => { measure(); });
    document.fonts && document.fonts.ready.then(measure);
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(measure, 120); });
    new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(measure, 200); }).observe(document.body);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
