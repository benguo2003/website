import React, { useRef, useEffect, useCallback } from 'react';

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

// ── Wormhole config ──
const WORMHOLE_THRESHOLD = 30;    // click-spawned stars before wormhole appears
const WORMHOLE_RADIUS = 70;       // visual outer radius
const WORMHOLE_HIT_RADIUS = 90;   // clickable area
const WORMHOLE_URL = 'https://space-explorer-bay.vercel.app/';
const WORMHOLE_LABEL = 'Space Explorer';

// wormhole swirl particle pool
const NUM_RING_PARTICLES = 120;
const NUM_STREAM_PARTICLES = 60;

function createRingParticle() {
  const depth = Math.random();            // 0 = outer edge, 1 = center
  const angle = Math.random() * TWO_PI;
  const speed = 0.3 + depth * 1.2;       // inner particles orbit faster
  const r = WORMHOLE_RADIUS * (1 - depth * 0.85); // radius from center
  return { depth, angle, speed, r, phase: Math.random() * TWO_PI };
}

function createStreamParticle() {
  return {
    angle: Math.random() * TWO_PI,
    dist: WORMHOLE_RADIUS * (1.5 + Math.random() * 2), // starts far out
    speed: 0.4 + Math.random() * 0.8,
    rotSpeed: 0.2 + Math.random() * 0.6,
    size: 0.5 + Math.random() * 1.5,
    alpha: 0.2 + Math.random() * 0.5,
    color: Math.random() > 0.5 ? '129, 140, 248' : '167, 139, 250',
  };
}

function StarField() {
  const canvasRef = useRef(null);
  const starsRef = useRef([]);
  const animRef = useRef(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  // wormhole state
  const starsCreatedRef = useRef(0);
  const wormholeRef = useRef(null);
  const wormholeHoveredRef = useRef(false);
  const mouseRef = useRef({ x: -1, y: -1 });
  const ringParticlesRef = useRef([]);
  const streamParticlesRef = useRef([]);

  const spawnWormhole = useCallback(() => {
    if (wormholeRef.current) return;
    const { w, h } = sizeRef.current;
    // place in upper area, off to one side
    const side = Math.random() > 0.5 ? 1 : -1;
    const x = w / 2 + side * (w * 0.2 + Math.random() * w * 0.15);
    const y = h * 0.18 + Math.random() * h * 0.2;
    wormholeRef.current = {
      x: Math.max(WORMHOLE_RADIUS + 20, Math.min(w - WORMHOLE_RADIUS - 20, x)),
      y: Math.max(WORMHOLE_RADIUS + 20, Math.min(h - WORMHOLE_RADIUS - 20, y)),
      born: Date.now(),
      alpha: 0,
    };
    // init particle pools
    ringParticlesRef.current = Array.from({ length: NUM_RING_PARTICLES }, createRingParticle);
    streamParticlesRef.current = Array.from({ length: NUM_STREAM_PARTICLES }, createStreamParticle);
  }, []);

  const addStar = useCallback((x, y) => {
    const stars = starsRef.current;
    starsCreatedRef.current++;

    if (starsCreatedRef.current >= WORMHOLE_THRESHOLD && !wormholeRef.current) {
      spawnWormhole();
    }

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
  }, [spawnWormhole]);

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
  }, []);

  // ── Draw the wormhole ──
  const drawWormhole = useCallback((ctx, now) => {
    const wh = wormholeRef.current;
    if (!wh) return;

    const age = now - wh.born;
    const fadeIn = Math.min(age / 2500, 1); // 2.5s fade
    wh.alpha = fadeIn;
    if (fadeIn <= 0) return;

    const hovered = wormholeHoveredRef.current;
    const hoverIntensity = hovered ? 1.3 : 1;
    const cx = wh.x;
    const cy = wh.y;
    const t = now * 0.001; // time in seconds

    ctx.save();

    // ── 1. Gravitational lensing: pull nearby stars ──
    const stars = starsRef.current;
    const gravRange = WORMHOLE_RADIUS * 4;
    const gravRangeSq = gravRange * gravRange;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const dx = cx - s.x;
      const dy = cy - s.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < gravRangeSq && distSq > 400) {
        const dist = Math.sqrt(distSq);
        const force = (fadeIn * 0.15) / (dist * 0.05);
        s.vx += (dx / dist) * force * 0.001;
        s.vy += (dy / dist) * force * 0.001;
      }
    }

    // ── 2. Outer ambient glow ──
    const outerGlowR = WORMHOLE_RADIUS * 3 * hoverIntensity;
    const outerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerGlowR);
    outerGrad.addColorStop(0, `rgba(129, 140, 248, ${0.08 * fadeIn * hoverIntensity})`);
    outerGrad.addColorStop(0.4, `rgba(167, 139, 250, ${0.04 * fadeIn})`);
    outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.beginPath();
    ctx.arc(cx, cy, outerGlowR, 0, TWO_PI);
    ctx.fillStyle = outerGrad;
    ctx.fill();

    // ── 3. Accretion disk (tilted ellipse) ──
    const tilt = 0.35; // perspective tilt
    const diskPulse = 1 + Math.sin(t * 1.5) * 0.05;
    for (let ring = 5; ring >= 0; ring--) {
      const ringFrac = ring / 5;
      const rOuter = WORMHOLE_RADIUS * (0.6 + ringFrac * 0.8) * diskPulse * hoverIntensity;
      const rInner = rOuter - 3;
      const rotation = t * (0.3 + ringFrac * 0.2);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.scale(1, tilt);

      const alpha = (0.06 + ringFrac * 0.04) * fadeIn * hoverIntensity;
      const hue = ringFrac > 0.5 ? '167, 139, 250' : '129, 140, 248';
      ctx.beginPath();
      ctx.arc(0, 0, rOuter, 0, TWO_PI);
      if (rInner > 0) {
        ctx.arc(0, 0, rInner, 0, TWO_PI, true);
      }
      ctx.fillStyle = `rgba(${hue}, ${alpha})`;
      ctx.fill();

      ctx.restore();
    }

    // ── 4. Vortex tunnel rings (concentric ellipses at depth) ──
    const numRings = 12;
    for (let i = 0; i < numRings; i++) {
      const depth = i / numRings;
      const r = WORMHOLE_RADIUS * (1 - depth * 0.9) * fadeIn * hoverIntensity;
      const ringTilt = tilt + depth * 0.15;
      const rotation = t * (0.5 + depth * 2) * (i % 2 === 0 ? 1 : -1);
      const alpha = (0.04 + depth * 0.08) * fadeIn * hoverIntensity;

      // color shifts from indigo (outer) to cyan (inner)
      const cr = Math.round(129 - depth * 80);
      const cg = Math.round(140 + depth * 80);
      const cb = Math.round(248 + depth * 7);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.scale(1, ringTilt);

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TWO_PI);
      ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
      ctx.lineWidth = 1 + depth * 1.5;
      ctx.stroke();

      ctx.restore();
    }

    // ── 5. Ring particles (orbiting at different depths) ──
    const ringParts = ringParticlesRef.current;
    for (let i = 0; i < ringParts.length; i++) {
      const p = ringParts[i];
      p.angle += p.speed * 0.016; // ~60fps

      const wobble = Math.sin(t * 2 + p.phase) * 0.1;
      const currentR = p.r * (1 + wobble) * fadeIn * hoverIntensity;
      const perspTilt = tilt + p.depth * 0.15;

      const px = cx + Math.cos(p.angle) * currentR;
      const py = cy + Math.sin(p.angle) * currentR * perspTilt;

      // skip if behind the "disk" (simple z-sort via sin)
      const z = Math.sin(p.angle);
      if (z < -0.2 && p.depth > 0.3) continue;

      const alpha = (0.15 + p.depth * 0.5) * fadeIn * (0.6 + z * 0.4) * hoverIntensity;
      const size = (0.5 + p.depth * 1.5) * fadeIn;

      // color: outer is indigo, inner is bright cyan/white
      const cr = Math.round(129 + p.depth * 126);
      const cg = Math.round(140 + p.depth * 115);
      const cb = 248;

      // particle glow
      const glowR = size * 4;
      const pGrad = ctx.createRadialGradient(px, py, 0, px, py, glowR);
      pGrad.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${alpha * 0.6})`);
      pGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(px, py, glowR, 0, TWO_PI);
      ctx.fillStyle = pGrad;
      ctx.fill();

      // particle core
      ctx.beginPath();
      ctx.arc(px, py, size, 0, TWO_PI);
      ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
      ctx.fill();
    }

    // ── 6. Stream particles (spiraling inward from far away) ──
    const streamParts = streamParticlesRef.current;
    for (let i = 0; i < streamParts.length; i++) {
      const sp = streamParts[i];
      sp.dist -= sp.speed * 0.3;
      sp.angle += sp.rotSpeed * 0.016;

      // respawn when reaching center
      if (sp.dist < 8) {
        sp.dist = WORMHOLE_RADIUS * (1.5 + Math.random() * 2);
        sp.angle = Math.random() * TWO_PI;
      }

      const spx = cx + Math.cos(sp.angle) * sp.dist * fadeIn;
      const spy = cy + Math.sin(sp.angle) * sp.dist * fadeIn * 0.5; // flatten for perspective

      const distFrac = 1 - sp.dist / (WORMHOLE_RADIUS * 3.5);
      const alpha = sp.alpha * fadeIn * Math.max(0, distFrac) * hoverIntensity;

      if (alpha < 0.01) continue;

      // trail line toward center
      const trailLen = 8 + distFrac * 12;
      const angleToCenter = Math.atan2(cy - spy, cx - spx);
      const tx = spx - Math.cos(angleToCenter) * trailLen;
      const ty = spy - Math.sin(angleToCenter) * trailLen;

      ctx.beginPath();
      ctx.moveTo(spx, spy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = `rgba(${sp.color}, ${alpha * 0.4})`;
      ctx.lineWidth = sp.size * 0.5;
      ctx.stroke();

      // particle dot
      ctx.beginPath();
      ctx.arc(spx, spy, sp.size * fadeIn, 0, TWO_PI);
      ctx.fillStyle = `rgba(${sp.color}, ${alpha})`;
      ctx.fill();
    }

    // ── 7. Event horizon (dark center with bright rim) ──
    const coreR = WORMHOLE_RADIUS * 0.18 * fadeIn * hoverIntensity;

    // bright rim glow
    const rimGlowR = coreR * 4;
    const rimGrad = ctx.createRadialGradient(cx, cy, coreR * 0.5, cx, cy, rimGlowR);
    rimGrad.addColorStop(0, `rgba(200, 210, 255, ${0.15 * fadeIn * hoverIntensity})`);
    rimGrad.addColorStop(0.3, `rgba(129, 140, 248, ${0.1 * fadeIn})`);
    rimGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, rimGlowR, 0, TWO_PI);
    ctx.fillStyle = rimGrad;
    ctx.fill();

    // dark core
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    coreGrad.addColorStop(0, `rgba(5, 5, 15, ${0.95 * fadeIn})`);
    coreGrad.addColorStop(0.7, `rgba(10, 10, 30, ${0.8 * fadeIn})`);
    coreGrad.addColorStop(1, `rgba(129, 140, 248, ${0.3 * fadeIn})`);
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, TWO_PI);
    ctx.fillStyle = coreGrad;
    ctx.fill();

    // inner bright ring
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, TWO_PI);
    ctx.strokeStyle = `rgba(199, 210, 254, ${0.4 * fadeIn * hoverIntensity})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ── 8. Spiral arms ──
    const numArms = 3;
    for (let arm = 0; arm < numArms; arm++) {
      const baseAngle = (TWO_PI / numArms) * arm + t * 0.4;
      ctx.beginPath();
      let started = false;
      for (let step = 0; step < 80; step++) {
        const frac = step / 80;
        const angle = baseAngle + frac * Math.PI * 3; // 1.5 full turns
        const r = WORMHOLE_RADIUS * (0.2 + frac * 1.3) * fadeIn * hoverIntensity;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r * (tilt + frac * 0.2);
        if (!started) { ctx.moveTo(px, py); started = true; }
        else ctx.lineTo(px, py);
      }
      const armAlpha = 0.06 * fadeIn * hoverIntensity;
      ctx.strokeStyle = `rgba(167, 139, 250, ${armAlpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
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

    // draw wormhole on top
    drawWormhole(ctx, now);

    // update hover state
    const wh = wormholeRef.current;
    if (wh && wh.alpha > 0.5) {
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const dx = wh.x - mx;
      const dy = wh.y - my;
      wormholeHoveredRef.current = dx * dx + dy * dy < WORMHOLE_HIT_RADIUS * WORMHOLE_HIT_RADIUS;
    } else {
      wormholeHoveredRef.current = false;
    }

    if (canvasRef.current) {
      canvasRef.current.style.cursor = wormholeHoveredRef.current ? 'pointer' : 'crosshair';
    }

    animRef.current = requestAnimationFrame(draw);
  }, [drawWormhole]);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    animRef.current = requestAnimationFrame(draw);

    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < 12; i++) {
      addStar(Math.random() * w, Math.random() * h);
    }
    starsCreatedRef.current = 0; // don't count seed stars

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [resize, draw, addStar]);

  const handleClick = (e) => {
    if (e.target.closest('a, button')) return;

    // check wormhole click
    const wh = wormholeRef.current;
    if (wh && wh.alpha > 0.5) {
      const dx = wh.x - e.clientX;
      const dy = wh.y - e.clientY;
      if (dx * dx + dy * dy < WORMHOLE_HIT_RADIUS * WORMHOLE_HIT_RADIUS) {
        window.open(WORMHOLE_URL, '_blank', 'noopener,noreferrer');
        return;
      }
    }

    const count = 2 + ((Math.random() * 3) | 0);
    for (let i = 0; i < count; i++) {
      addStar(
        e.clientX + (Math.random() - 0.5) * 40,
        e.clientY + (Math.random() - 0.5) * 40
      );
    }
  };

  const handleMouseMove = (e) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
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
  );
}

export default React.memo(StarField);
