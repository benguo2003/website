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

function StarField() {
  const canvasRef = useRef(null);
  const starsRef = useRef([]);
  const animRef = useRef(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  const addStar = useCallback((x, y) => {
    const stars = starsRef.current;
    if (stars.length >= MAX_STARS) {
      // recycle oldest star
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

    animRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    animRef.current = requestAnimationFrame(draw);

    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < 12; i++) {
      addStar(Math.random() * w, Math.random() * h);
    }

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [resize, draw, addStar]);

  const handleClick = (e) => {
    if (e.target.closest('a, button')) return;
    const count = 2 + ((Math.random() * 3) | 0);
    for (let i = 0; i < count; i++) {
      addStar(
        e.clientX + (Math.random() - 0.5) * 40,
        e.clientY + (Math.random() - 0.5) * 40
      );
    }
  };

  return (
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
      }}
    />
  );
}

export default React.memo(StarField);
