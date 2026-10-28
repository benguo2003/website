import React, { useRef, useEffect, useCallback } from 'react';
import { createBlackHole, ASPECT as BH_ASPECT, SHADOW_FRAC } from './BlackHole';

const CONNECTION_DIST = 150;
const CONNECTION_DIST_SQ = CONNECTION_DIST * CONNECTION_DIST;
const MAX_STARS = 200;
const TWO_PI = Math.PI * 2;

const COLORS = [
  '129, 140, 248',
  '167, 139, 250',
  '228, 228, 231',
  '161, 161, 170',
  '199, 210, 254',
];

// ── Black hole config ──
const BLACK_HOLE_THRESHOLD = 30;  // click-spawned stars before the black hole appears
const BLACK_HOLE_PREWARM = 12;    // start compiling the shader in the background at this count
const BLACK_HOLE_URL = 'https://space-explorer-bay.vercel.app/';
const BLACK_HOLE_FADE_MS = 3500;
const CONTENT_WIDTH = 620;        // .main max-width in App.css

// The visible disk spans ~VISIBLE_HALF of the canvas width either side of center
// (the rest is fade-out margin), so placement keeps that much on screen.
const VISIBLE_HALF = 0.44;

// canvas size in CSS px, scaled to fit the margin beside the content column;
// the disk is wide and flat, so the canvas is too
function blackHoleSize(w) {
  const gutter = Math.max(0, (w - CONTENT_WIDTH) / 2);
  const bw = Math.round(Math.min(860, w * 0.92, Math.max(340, gutter * 1.45)));
  return { bw, bh: Math.round(bw / BH_ASPECT) };
}

// render at full Retina resolution when the light paths are precomputed;
// the per-frame ray tracing fallback stays at 1x to keep it smooth
function renderScale(renderer) {
  return Math.min(window.devicePixelRatio || 1, renderer.baked ? 2 : 1);
}

// Page content the black hole / label must stay clear of. Text is measured per
// line box (a paragraph's box spans the whole column even when its text doesn't);
// pills and cards are measured as their full visible boxes.
const TEXT_SELECTOR = '.main .hero > p, .main .hero > h1';
const BOX_SELECTOR = '.main .email-pill, .main .link-card';
const LABEL_CLEARANCE = 10;       // min px between the label and any text / screen edge
const MIN_NARROW_HEIGHT = 110;    // smallest the black hole gets when squeezed above the text

function contentRects() {
  const range = document.createRange();
  const rects = [];
  document.querySelectorAll(TEXT_SELECTOR).forEach((el) => {
    range.selectNodeContents(el);
    rects.push(...range.getClientRects());
  });
  document.querySelectorAll(BOX_SELECTOR).forEach((el) => rects.push(el.getBoundingClientRect()));
  return rects.filter((r) => r.width > 0 && r.height > 0);
}

// true when the box (with padding) is fully on screen and touches none of the rects
function isClear(l, t, r, b, pad, w, h, rects) {
  if (l - pad < 0 || r + pad > w || t - pad < 0 || b + pad > h) return false;
  return rects.every((rc) => rc.right < l - pad || rc.left > r + pad || rc.bottom < t - pad || rc.top > b + pad);
}

// visible extent of the black hole (lensed arcs + bright disk) around its center
function holeBox(x, y, bw, bh) {
  return [x - bw * VISIBLE_HALF, y - bh * 0.31, x + bw * VISIBLE_HALF, y + bh * 0.31];
}

// Find a spot near the black hole where the label clears all page content and stays
// on screen: below the lower arc first, then above, then beside, and as a last resort
// over the lower arc itself. null = no spot (the label stays hidden).
function findLabelSpot(hole, label, w, h) {
  const lw = label.offsetWidth;
  const lh = label.offsetHeight;
  const rects = contentRects();
  const cx = (x) => Math.max(lw / 2 + LABEL_CLEARANCE, Math.min(w - lw / 2 - LABEL_CLEARANCE, x));
  const side = hole.w * VISIBLE_HALF + 8 + lw / 2;
  const spots = [
    ...[0.36, 0.3, 0.24].map((k) => ({ x: cx(hole.x), top: hole.y + hole.h * k })),
    ...[0.36, 0.3].map((k) => ({ x: cx(hole.x), top: hole.y - hole.h * k - lh })),
    { x: hole.x - side, top: hole.y - lh / 2 },
    { x: hole.x + side, top: hole.y - lh / 2 },
    ...[0.16, 0.1].map((k) => ({ x: cx(hole.x), top: hole.y + hole.h * k })),
  ];
  return spots.find(({ x, top }) => isClear(x - lw / 2, top, x + lw / 2, top + lh, LABEL_CLEARANCE, w, h, rects)) || null;
}

const media = (q) => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(q).matches;
const NO_HOVER = media('(hover: none)');
// custom cursor only where there's a real mouse
const FINE_POINTER = media('(hover: hover) and (pointer: fine)');
const REDUCED_MOTION = media('(prefers-reduced-motion: reduce)');

// four-point sparkle
const SPARKLE_PATH = 'M12 0C12.8 7.2 16.8 11.2 24 12C16.8 12.8 12.8 16.8 12 24C11.2 16.8 7.2 12.8 0 12C7.2 11.2 11.2 7.2 12 0Z';

function hitsBlackHole(hole, x, y) {
  if (!hole || hole.fade < 0.5) return false;
  const dx = (x - hole.x) / (hole.w * 0.36);
  const dy = (y - hole.y) / (hole.h * 0.42);
  return dx * dx + dy * dy < 1;
}

function StarField() {
  const canvasRef = useRef(null);
  const bhCanvasRef = useRef(null);
  const labelRef = useRef(null);
  const starsRef = useRef([]);
  const animRef = useRef(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  // black hole state
  const starsCreatedRef = useRef(0);
  const rendererRef = useRef(null);   // null = not created yet, false = WebGL unavailable
  const holeRef = useRef(null);
  const hoveredRef = useRef(false);
  const mouseRef = useRef({ x: -1, y: -1 });

  // custom cursor: one element pinned to the pointer (sparkle + state ring + click ripple)
  const cursorElRef = useRef(null);
  const rippleRef = useRef(null);
  const cursorRef = useRef({ visible: false, overLink: false, state: '' });

  const setCursorState = useCallback((state) => {
    const cur = cursorRef.current;
    if (state !== cur.state && cursorElRef.current) {
      cursorElRef.current.dataset.state = state;
      cur.state = state;
    }
  }, []);

  const ensureRenderer = useCallback(() => {
    if (rendererRef.current === null && bhCanvasRef.current) {
      rendererRef.current = createBlackHole(bhCanvasRef.current) || false;
    }
    return rendererRef.current || null;
  }, []);

  // position the hover label clear of all text, or disable it if there's no room
  const placeLabel = useCallback(() => {
    const hole = holeRef.current;
    const label = labelRef.current;
    if (!hole || !label) return;
    const spot = findLabelSpot(hole, label, sizeRef.current.w, sizeRef.current.h);
    hole.labelFits = !!spot;
    if (spot) {
      label.style.left = `${spot.x}px`;
      label.style.top = `${spot.top}px`;
    }
  }, []);

  // size + place the black hole canvas in the margin beside the content column;
  // side/fy keep its spot across resizes
  const layoutBlackHole = useCallback(() => {
    const hole = holeRef.current;
    const c = bhCanvasRef.current;
    if (!hole || !c) return;
    const { w, h } = sizeRef.current;
    let { bw, bh } = blackHoleSize(w);
    const gutter = Math.max(0, (w - CONTENT_WIDTH) / 2);
    if (gutter >= bw * VISIBLE_HALF) {
      // hug the screen edge but never let the disk run off it
      const fromEdge = Math.min(w / 2, bw * VISIBLE_HALF);
      hole.x = hole.side > 0 ? w - fromEdge : fromEdge;
      hole.y = Math.min(h - bh / 2, Math.max(bh / 2, hole.fy * h));
    } else {
      // No side margin (phones, narrow windows). Prefer centered above the first line
      // of text, sized so the arcs plus the label fit; otherwise (e.g. landscape phones,
      // where the text starts at the top) use the smallest size in the first corner
      // that's clear of content.
      const rects = contentRects();
      const textTop = Math.min(h, ...rects.map((r) => r.top));
      const lh = labelRef.current ? labelRef.current.offsetHeight : 30;
      const fitted = Math.round(Math.min(bh, (textTop - lh - LABEL_CLEARANCE - 8) / 0.62));
      const small = MIN_NARROW_HEIGHT;
      const smallW = small * BH_ASPECT;
      const top = (sz) => 4 + sz * 0.32;
      const candidates = [
        ...(fitted >= small ? [{ x: w / 2, y: top(fitted), sz: fitted }] : []),
        { x: w / 2, y: top(small), sz: small },
        { x: w - smallW * VISIBLE_HALF, y: top(small), sz: small },
        { x: smallW * VISIBLE_HALF, y: top(small), sz: small },
        { x: w - smallW * VISIBLE_HALF, y: h - top(small), sz: small },
        { x: smallW * VISIBLE_HALF, y: h - top(small), sz: small },
      ];
      const pick = candidates.find(({ x, y, sz }) => {
        const [l, t, r, b] = holeBox(x, y, sz * BH_ASPECT, sz);
        return isClear(l, t, r, b, 0, w, h, rects);
      }) || candidates[0];
      bh = pick.sz;
      bw = bh * BH_ASPECT;
      hole.x = pick.x;
      hole.y = pick.y;
    }
    hole.w = bw;
    hole.h = bh;
    hole.shadowR = (SHADOW_FRAC * bh) / 2;
    c.style.width = `${bw}px`;
    c.style.height = `${bh}px`;
    c.style.transform = `translate(${hole.x - bw / 2}px, ${hole.y - bh / 2}px)`;
    placeLabel();
  }, [placeLabel]);

  const spawnBlackHole = useCallback(() => {
    if (holeRef.current || !ensureRenderer()) return;
    holeRef.current = {
      side: Math.random() > 0.5 ? 1 : -1,
      fy: 0.14 + Math.random() * 0.1,
      born: 0,        // set once the shader + precomputed light paths are ready
      lastFrame: 0,
      fade: 0,
      hover: 0,
      time: 0,
      labelShown: false,
      labelFits: false,
    };
    layoutBlackHole();
  }, [ensureRenderer, layoutBlackHole]);

  const addStar = useCallback((x, y) => {
    const stars = starsRef.current;

    if (stars.length >= MAX_STARS) {
      const star = stars.shift();
      star.x = x;
      star.y = y;
      star.r = 1.2 + Math.random() * 1.5;
      star.alpha = 0.4 + Math.random() * 0.4;
      star.phase = Math.random() * TWO_PI;
      star.color = COLORS[(Math.random() * COLORS.length) | 0];
      star.vx = (Math.random() - 0.5) * 0.06;
      star.vy = (Math.random() - 0.5) * 0.06;
      star.born = Date.now();
      stars.push(star);
    } else {
      stars.push({
        x, y,
        r: 1.2 + Math.random() * 1.5,
        alpha: 0.4 + Math.random() * 0.4,
        phase: Math.random() * TWO_PI,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        vx: (Math.random() - 0.5) * 0.06,
        vy: (Math.random() - 0.5) * 0.06,
        born: Date.now(),
      });
    }
  }, []);

  const resize = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    c.width = w * dpr;
    c.height = h * dpr;
    sizeRef.current = { w, h };
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    layoutBlackHole();
  }, [layoutBlackHole]);

  // ── Render the black hole + its pull on nearby stars ──
  const updateBlackHole = useCallback((now) => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const hole = holeRef.current;

    if (renderer.failed()) {
      holeRef.current = null;
      bhCanvasRef.current.style.display = 'none';
      if (labelRef.current) labelRef.current.classList.remove('visible');
      return;
    }

    // keep compiling / precomputing in small per-frame slices, starting at prewarm
    // (the size only depends on the window, so this is done before the black hole exists)
    const { bw, bh } = hole ? { bw: hole.w, bh: hole.h } : blackHoleSize(sizeRef.current.w);
    const scale = renderScale(renderer);
    renderer.setSize(Math.round(bw * scale), Math.round(bh * scale));
    const ready = renderer.step(!!(hole && hole.born));
    if (!hole || !ready) return;

    if (!hole.born) {
      hole.born = now;
      hole.lastFrame = now;
      bhCanvasRef.current.style.display = 'block';
    }

    const dt = Math.min(now - hole.lastFrame, 100);
    hole.lastFrame = now;

    const t = Math.min((now - hole.born) / BLACK_HOLE_FADE_MS, 1);
    hole.fade = t * t * (3 - 2 * t);
    hole.hover += ((hoveredRef.current ? 1 : 0) - hole.hover) * Math.min(1, dt / 220);
    hole.time += (dt / 1000) * (1 + 2.2 * hole.hover);   // disk spins up on hover
    renderer.render(hole.time, hole.fade, hole.hover);

    const showLabel = hole.labelFits && hole.fade > 0.6 && (hoveredRef.current || NO_HOVER);
    if (showLabel !== hole.labelShown && labelRef.current) {
      labelRef.current.classList.toggle('visible', showLabel);
      hole.labelShown = showLabel;
    }

    // gravity: pull nearby stars in (much harder on hover), swallow ones that cross the shadow
    const stars = starsRef.current;
    const gravRange = hole.w * (0.45 + 0.25 * hole.hover);
    const gravRangeSq = gravRange * gravRange;
    const swallowSq = hole.shadowR * hole.shadowR * 0.8;
    const pull = hole.fade * (0.15 + 1.2 * hole.hover);
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      const dx = hole.x - s.x;
      const dy = hole.y - s.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < swallowSq) {
        stars.splice(i, 1);
      } else if (distSq < gravRangeSq) {
        const dist = Math.sqrt(distSq);
        const force = pull / (dist * 0.05);
        // radial pull plus a tangential nudge so stars spiral in rather than fall straight
        s.vx += ((dx - dy * 0.6 * hole.hover) / dist) * force * 0.001;
        s.vy += ((dy + dx * 0.6 * hole.hover) / dist) * force * 0.001;
      }
    }
  }, []);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const stars = starsRef.current;
    const { w, h } = sizeRef.current;
    const now = Date.now();

    ctx.clearRect(0, 0, w, h);

    // cull off-screen stars
    const margin = 50;
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      if (s.x < -margin || s.x > w + margin || s.y < -margin || s.y > h + margin) {
        stars.splice(i, 1);
      }
    }

    // batch all connection lines
    ctx.lineWidth = 0.6;
    for (let i = 0; i < stars.length; i++) {
      const a = stars[i];
      for (let j = i + 1; j < stars.length; j++) {
        const b = stars[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < CONNECTION_DIST_SQ) {
          const alpha = (1 - Math.sqrt(distSq) / CONNECTION_DIST) * 0.25;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(129,140,248,${alpha})`;
          ctx.stroke();
        }
      }
    }

    // draw stars
    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      const age = now - star.born;
      const fadeIn = age < 800 ? age / 800 : 1;
      const pulse = 1 + Math.sin(now * 0.002 + star.phase) * 0.25;
      const r = star.r * pulse * fadeIn;
      const alpha = star.alpha * fadeIn;

      // glow
      const glowR = r * 5;
      const grad = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowR);
      grad.addColorStop(0, `rgba(${star.color},${alpha * 0.35})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(star.x, star.y, glowR, 0, TWO_PI);
      ctx.fillStyle = grad;
      ctx.fill();

      // core
      ctx.beginPath();
      ctx.arc(star.x, star.y, r, 0, TWO_PI);
      ctx.fillStyle = `rgba(${star.color},${alpha})`;
      ctx.fill();

      // drift
      star.x += star.vx;
      star.y += star.vy;
    }

    // black hole renders on its own WebGL canvas layered above this one
    updateBlackHole(now);

    const cur = cursorRef.current;
    hoveredRef.current = !cur.overLink && hitsBlackHole(holeRef.current, mouseRef.current.x, mouseRef.current.y);
    c.style.cursor = hoveredRef.current ? 'pointer' : 'crosshair';   // used only without the custom cursor

    if (cur.visible) setCursorState(hoveredRef.current ? 'hole' : cur.overLink ? 'link' : 'idle');

    animRef.current = requestAnimationFrame(draw);
  }, [updateBlackHole, setCursorState]);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    // the text scrolls but the label is fixed, so re-check for collisions
    window.addEventListener('scroll', placeLabel, { passive: true });
    animRef.current = requestAnimationFrame(draw);

    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < 12; i++) {
      addStar(Math.random() * w, Math.random() * h);
    }

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', placeLabel);
      cancelAnimationFrame(animRef.current);
      if (rendererRef.current) rendererRef.current.dispose();
      rendererRef.current = null;
      holeRef.current = null;
    };
  }, [resize, draw, addStar, placeLabel]);

  const handleClick = (e) => {
    if (e.target.closest('a, button')) return;

    if (hitsBlackHole(holeRef.current, e.clientX, e.clientY)) {
      window.open(BLACK_HOLE_URL, '_blank', 'noopener,noreferrer');
      return;
    }

    const count = 2 + ((Math.random() * 3) | 0);
    for (let i = 0; i < count; i++) {
      addStar(
        e.clientX + (Math.random() - 0.5) * 40,
        e.clientY + (Math.random() - 0.5) * 40
      );
    }

    const prev = starsCreatedRef.current;
    const created = prev + count;
    starsCreatedRef.current = created;
    // compile the shader during idle time well before it's needed, so the reveal never hitches
    if (prev < BLACK_HOLE_PREWARM && created >= BLACK_HOLE_PREWARM) {
      const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
      idle(ensureRenderer);
    }
    if (created >= BLACK_HOLE_THRESHOLD) spawnBlackHole();
  };

  // pointer tracking lives on window so it keeps working over links and text
  useEffect(() => {
    const onMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      const cur = cursorRef.current;
      cur.overLink = !!(e.target.closest && e.target.closest('a, button'));
      const el = cursorElRef.current;
      if (!FINE_POINTER || !el) return;
      // moved in the event itself (not on the next animation frame) so it never lags
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      if (cur.overLink) setCursorState('link');
      if (!cur.visible) {
        cur.visible = true;
        el.classList.add('visible');
      }
    };
    const onLeave = () => {
      if (!cursorRef.current.visible) return;
      cursorRef.current.visible = false;
      mouseRef.current = { x: -1, y: -1 };
      if (cursorElRef.current) cursorElRef.current.classList.remove('visible');
    };
    // click feedback: the sparkle flares and a ripple expands from the pointer
    const onDown = () => {
      if (!FINE_POINTER || REDUCED_MOTION || !cursorElRef.current) return;
      const timing = { duration: 420, easing: 'cubic-bezier(.2, .8, .2, 1)' };
      rippleRef.current.animate([
        { transform: 'scale(0.3)', opacity: 0.9 },
        { transform: 'scale(1.6)', opacity: 0 },
      ], timing);
      cursorElRef.current.querySelector('.cursor-star').animate([
        { transform: 'scale(1)' }, { transform: 'scale(1.6)', offset: 0.3 }, { transform: 'scale(1)' },
      ], timing);
    };

    // the pointer left the window: mouseout with nowhere to go
    const onOut = (e) => {
      if (!e.relatedTarget) onLeave();
    };

    const root = document.documentElement;
    if (FINE_POINTER) root.classList.add('custom-cursor');
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('blur', onLeave);
    document.addEventListener('mouseout', onOut);
    return () => {
      root.classList.remove('custom-cursor');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('blur', onLeave);
      document.removeEventListener('mouseout', onOut);
    };
  }, [setCursorState]);

  return (
    <>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'auto',
          cursor: 'crosshair',
        }}
      />
      <canvas
        ref={bhCanvasRef}
        width={1}
        height={1}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 0,
          display: 'none',
          pointerEvents: 'none',
        }}
      />
      <div ref={labelRef} className="bh-label" aria-hidden="true">
        Enter Space Explorer
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 17L17 7"/>
          <path d="M7 7h10v10"/>
        </svg>
      </div>
      <div ref={cursorElRef} className="cursor" data-state="idle" aria-hidden="true">
        <div className="cursor-ring" />
        <div ref={rippleRef} className="cursor-ripple" />
        <div className="cursor-star">
          {/* dark outline keeps it visible on white text and the bright disk */}
          <svg viewBox="-3 -3 30 30">
            <path d={SPARKLE_PATH} fill="currentColor" stroke="#0a0a0a" strokeWidth="2.2" strokeLinejoin="round" paintOrder="stroke" />
          </svg>
        </div>
      </div>
    </>
  );
}

export default React.memo(StarField);
