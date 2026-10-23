'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import '@/app/[lang]/kaart/map.css';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { Map as MlMap, Marker } from 'maplibre-gl';
import { buildStyle, loadMapData } from '@/lib/map-style';

export type ResultPoint = { id: string; name: string; lat: number; lon: number; color: string; on: boolean };

/**
 * Lichte kaart naast de zoekresultaten: plekken die bij je zoekopdracht passen in hun kleur (met naam),
 * de rest klein en grijs. Klik op een plek = naar de plekpagina. De kaart zoomt mee met de resultaten.
 */
export function ResultsMap({ points, locale, label }: { points: ResultPoint[]; locale: string; label: string }) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef<Map<string, Marker>>(new Map());
  const pointsRef = useRef(points);
  useEffect(() => {
    pointsRef.current = points;
  });

  /** Resultaten in kleur, de rest grijs; inzoomen op de resultaten. */
  const sync = () => {
    const m = map.current;
    if (!m) return;
    const pts = pointsRef.current;
    const on = pts.filter((p) => p.on);
    for (const p of pts) {
      const el = markers.current.get(p.id)?.getElement();
      if (!el) continue;
      el.classList.toggle('is-muted', !p.on);
      el.classList.toggle('is-named', p.on && on.length <= 10);
    }
    if (on.length && on.length < pts.length) {
      const lons = on.map((p) => p.lon);
      const lats = on.map((p) => p.lat);
      m.fitBounds([[Math.min(...lons) - 0.7, Math.min(...lats) - 0.7], [Math.max(...lons) + 0.7, Math.max(...lats) + 0.7]], { padding: 40, duration: 700, maxZoom: 7 });
    } else m.fitBounds([[29, -12], [41, -0.8]], { padding: 24, duration: 700 });
  };

  // Kaart één keer opzetten
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [maplibregl, [geo, detail]] = await Promise.all([import('maplibre-gl'), loadMapData()]);
      maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
      if (cancelled || !box.current) return;
      const m = new maplibregl.Map({
        container: box.current,
        style: buildStyle(geo, detail),
        bounds: [[29, -12], [41, -0.8]],
        fitBoundsOptions: { padding: 24 },
        minZoom: 3.5,
        maxZoom: 8.5,
        dragRotate: false,
        pitchWithRotate: false,
        attributionControl: { compact: true, customAttribution: 'Natural Earth' },
      });
      m.touchZoomRotate.disableRotation();
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      for (const p of points) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'kt-pin';
        el.style.setProperty('--pin', p.color);
        el.setAttribute('aria-label', p.name);
        el.innerHTML = '<span class="kt-pin-dot"></span><span class="kt-pin-label"></span>';
        (el.lastChild as HTMLElement).textContent = p.name;
        el.addEventListener('click', () => router.push(`/${locale}/plek/${p.id}`));
        markers.current.set(p.id, new maplibregl.Marker({ element: el }).setLngLat([p.lon, p.lat]).addTo(m));
      }
      map.current = m;
      m.once('load', () => sync());
    })();
    const all = markers.current;
    return () => {
      cancelled = true;
      all.clear();
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Alleen opnieuw als de resultaten veranderen (niet bij elke render, dan zou de kaart je verschuiven)
  const sig = points.filter((p) => p.on).map((p) => p.id).join(',');
  useEffect(() => {
    sync();
  }, [sig]);

  return <div ref={box} className="kt-map h-full w-full" role="region" aria-label={label} />;
}
