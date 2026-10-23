'use client';

import { useEffect, useRef } from 'react';

type Geo = { africa: { rings: number[][] }[]; world: number[][] };

const TZ: [number, number] = [34.8, -6.3];
const N = 24000;

/** Landkaart (lengte/breedte) als raster: 1 = land. Getekend op een kleine canvas en uitgelezen. */
function landMask(geo: Geo) {
  const W = 720;
  const H = 360;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.fillStyle = '#fff';
  const rings = [...geo.world, ...geo.africa.flatMap((a) => a.rings)];
  for (const r of rings) {
    // Ringen die de datumgrens oversteken overslaan (kleine eilanden), anders een streep over de kaart
    let span = false;
    for (let i = 2; i < r.length; i += 2) if (Math.abs(r[i] - r[i - 2]) > 180) span = true;
    if (span) continue;
    g.beginPath();
    for (let i = 0; i < r.length; i += 2) {
      const x = ((r[i] + 180) / 360) * W;
      const y = ((90 - r[i + 1]) / 180) * H;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.closePath();
    g.fill();
  }
  const d = g.getImageData(0, 0, W, H).data;
  return (lon: number, lat: number) => {
    const x = Math.min(W - 1, Math.floor(((lon + 180) / 360) * W));
    const y = Math.min(H - 1, Math.floor(((90 - lat) / 180) * H));
    return d[(y * W + x) * 4 + 3] > 0;
  };
}

/**
 * Sierlijke wereldbol onderaan elke pagina: land als stippen, langzaam draaiend, Tanzania licht op.
 * Kleur komt uit --footer-tint van de footer. Draait alleen als hij in beeld is; stil bij 'minder beweging'.
 */
export function FooterGlobe({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let dots: Float32Array | null = null; // x,y,z per stip (eenheidsbol)
    let raf = 0;
    let visible = false;
    // Begint net vóór Tanzania, zodat Afrika langzaam naar voren draait
    let rot = (-(90 + TZ[0]) * Math.PI) / 180 - 0.5;
    let last = 0;
    let tint = '#f2b44f';
    let frame = 0;

    fetch('/geo/globe.json')
      .then((r) => r.json())
      .then((geo: Geo) => {
        const isLand = landMask(geo);
        const out: number[] = [];
        const golden = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < N; i++) {
          const y = 1 - (i / (N - 1)) * 2;
          const r = Math.sqrt(1 - y * y);
          const t = golden * i;
          const x = Math.cos(t) * r;
          const z = Math.sin(t) * r;
          const lat = (Math.asin(y) * 180) / Math.PI;
          const lon = (Math.atan2(z, x) * 180) / Math.PI;
          if (isLand(lon, lat)) out.push(x, y, z);
        }
        dots = new Float32Array(out);
        draw(performance.now());
      })
      .catch(() => {});

    const toXYZ = (lon: number, lat: number): [number, number, number] => {
      const la = (lat * Math.PI) / 180;
      const lo = (lon * Math.PI) / 180;
      return [Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo)];
    };
    const tz = toXYZ(...TZ);
    const tilt = 0.32; // kantelen zodat het noorden iets naar achteren valt

    function draw(now: number) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas!.clientWidth;
      const h = canvas!.clientHeight;
      if (canvas!.width !== Math.round(w * dpr)) {
        canvas!.width = Math.round(w * dpr);
        canvas!.height = Math.round(h * dpr);
      }
      if (frame++ % 20 === 0) {
        const v = getComputedStyle(canvas!).getPropertyValue('--footer-tint').trim();
        if (v) tint = v;
      }
      const dt = last ? Math.min(64, now - last) : 0;
      last = now;
      if (!reduce) rot += dt * 0.00006;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const R = Math.min(w * 0.44, h * 0.4);
      const cx = w / 2;
      const cy = h / 2; // hele bol in beeld, met ruimte voor de dampkring

      // Dampkring
      const atm = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.25);
      atm.addColorStop(0, tint);
      atm.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = atm;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2);
      ctx.fill();

      // Bol zelf
      const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.45, R * 0.1, cx, cy, R);
      body.addColorStop(0, '#1c1c1c');
      body.addColorStop(1, '#050505');
      ctx.globalAlpha = 1;
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = tint;
      ctx.lineWidth = 1;
      ctx.stroke();

      const cr = Math.cos(rot);
      const sr = Math.sin(rot);
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      const project = (x: number, y: number, z: number) => {
        const x1 = x * cr - z * sr;
        const z1 = x * sr + z * cr;
        const y2 = y * ct - z1 * st;
        const z2 = y * st + z1 * ct;
        return [cx + x1 * R, cy - y2 * R, z2] as const;
      };

      if (dots) {
        const size = Math.max(1, R / 190);
        ctx.fillStyle = tint;
        for (let i = 0; i < dots.length; i += 3) {
          const [px, py, z] = project(dots[i], dots[i + 1], dots[i + 2]);
          // z < 0 = voorkant (naar de kijker)
          if (z > 0.05) continue;
          ctx.globalAlpha = 0.25 + Math.min(1, -z) * 0.75;
          ctx.fillRect(px - size / 2, py - size / 2, size, size);
        }
        // Tanzania: kloppende stip
        const [tx, ty, tz2] = project(...tz);
        if (tz2 < 0) {
          const pulse = reduce ? 0.5 : (Math.sin(now / 500) + 1) / 2;
          ctx.globalAlpha = 0.25 * (1 - pulse);
          ctx.beginPath();
          ctx.arc(tx, ty, 6 + pulse * 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (visible && !reduce) raf = requestAnimationFrame(draw);
    }

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      last = 0;
      if (visible) raf = requestAnimationFrame(draw);
    });
    io.observe(canvas);
    const onResize = () => !visible && draw(performance.now());
    window.addEventListener('resize', onResize);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
