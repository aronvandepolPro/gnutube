'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import './map.css';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { Map as MlMap, Marker } from 'maplibre-gl';
import { buildStyle, loadMapData, toCoords } from '@/lib/map-style';
import { buildAreas } from '@/lib/areas';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { kinds, type Kind, type Place } from '@/lib/data';
import { AdvisoryNotice } from '@/components/AdvisoryBadge';
import { KindIcon } from '@/components/KindIcon';
import { format } from '@/lib/i18n/format';
import { readList, readRoute, serverList, serverRoute, subscribe } from '@/lib/trip-store';
import { isDemo, useDoneTrips } from '@/lib/visits';
import { accountsEnabled } from '@/lib/supabase';

type P = Place & { coords: string };
type Props = {
  locale: Locale;
  places: P[];
  /** Foto (of affiche) per plek, voor het kaartje naast de kaart. */
  images: Record<string, ReactNode>;
  /** Namen van de buurlanden (op de kaart, ter oriëntatie). */
  neighbours: { id: string; name: string }[];
  t: Pick<Dictionary, 'map' | 'kind' | 'advisory' | 'search'>;
};

export { KIND_COLOR } from '@/lib/kind-colors';
import { KIND_COLOR } from '@/lib/kind-colors';

/** Plaats van de landnamen: dicht bij de grens met Tanzania, zodat ze in beeld staan. */
const NEIGHBOUR_AT: Record<string, [number, number]> = {
  ke: [37.4, -1.7], ug: [31.0, -0.7], rw: [29.9, -2.0], bi: [29.95, -3.4], cd: [28.3, -5.6],
  zm: [31.0, -9.8], mw: [33.75, -10.7], mz: [37.6, -12.3],
};

export function MapView({ locale, places, images, neighbours, t }: Props) {
  const params = useSearchParams();
  const initial = params.get('plek');
  const [kind, setKind] = useState<Kind | ''>('');
  const [selected, setSelected] = useState<string | null>(initial && places.some((p) => p.id === initial) ? initial : null);
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef<Map<string, Marker>>(new Map());
  const home = useRef<[[number, number], [number, number]] | null>(null);
  /** Ver uitgezoomd (wereldbol in beeld): dan verschijnt de knop 'Zoom naar Tanzania'. */
  const [far, setFar] = useState(false);
  /** De punten staan op de kaart (pas daarna kunnen kleuren en vinkjes erop). */
  const [pinsReady, setPinsReady] = useState(false);
  /** Gebieden rond elke plek staan op de kaart (Mijn kaart kleurt ze groen). */
  const [areasReady, setAreasReady] = useState(false);
  const areaIds = useRef<Map<string, number>>(new Map());
  /** Oppervlakte van elk gebied, voor het percentage van Tanzania dat je bezocht. */
  const [areaSize, setAreaSize] = useState<Map<string, number>>(new Map());
  /** Net bezocht en nog niet ingekleurd: die worden één voor één groen (met stempel). */
  const [pending, setPending] = useState<Set<string>>(new Set());

  const visible = useMemo(() => places.filter((p) => !kind || p.kinds.includes(kind)), [places, kind]);

  // Mijn kaart: waar je al was (zelf afgevinkt of uit een gemaakte reis) en wat er in je huidige reis staat
  const [mine, setMine] = useState(params.get('mijn') === '1');
  const route = useSyncExternalStore(subscribe, readRoute, serverRoute);
  const tripIds = useSyncExternalStore(subscribe, () => readList('trip'), serverList);
  // Bezocht = alleen uit gemaakte reizen (betaald, bevestigd, voorbij); zelf aanvinken kan niet
  const { user, trips: doneTrips, loaded } = useDoneTrips();
  const fromTrips = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of doneTrips) for (const id of d.place_ids) if (!m.has(id)) m.set(id, d.start_day);
    return m;
  }, [doneTrips]);
  const visited = useMemo(() => new Set([...fromTrips.keys()].filter((id) => places.some((p) => p.id === id))), [fromTrips, places]);
  const planned = useMemo(() => new Set(tripIds.filter((id) => !visited.has(id))), [tripIds, visited]);
  // Percentage van Tanzania (oppervlakte): klopt met hoeveel van de kaart groen is. Zolang de gebieden laden: per plek.
  const totalArea = [...areaSize.values()].reduce((a, b) => a + b, 0);
  const pct = totalArea
    ? Math.round(([...visited].reduce((a, id) => a + (areaSize.get(id) ?? 0), 0) / totalArea) * 100)
    : places.length
      ? Math.round((visited.size / places.length) * 100)
      : 0;
  const pctLabel = visited.size && pct === 0 ? '<1' : String(pct);
  /** Melding na afvinken (en bij mijlpalen een feestje). */
  const [cheer, setCheer] = useState<{ text: string; big: boolean; n: number } | null>(null);
  // De kaartpunten worden één keer gemaakt; hun klik leest de actuele stand via refs
  const state = useRef({ mine, visited });
  useEffect(() => {
    state.current = { mine, visited };
  }, [mine, visited]);
  useEffect(() => {
    if (!cheer) return;
    const id = window.setTimeout(() => setCheer(null), cheer.big ? 4200 : 2600);
    return () => window.clearTimeout(id);
  }, [cheer]);

  /** Vinkje op de kaart zetten (na een gemaakte reis): stempel, ring en confetti op het punt. */
  const stamp = (id: string) => {
    const el = markers.current.get(id)?.getElement();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (el && !reduce) {
      el.classList.remove('is-ticked');
      void el.offsetWidth;
      el.classList.add('is-ticked');
      // Confetti: kleine stukjes die in een kring wegspringen
      const colors = ['#2F6B2A', '#F07F1E', '#F0C08F', '#8EE08A', '#5A4030'];
      for (let i = 0; i < 14; i++) {
        const c = document.createElement('i');
        c.className = 'kt-confetti';
        const a = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
        const r = 26 + Math.random() * 26;
        c.style.setProperty('--dx', `${Math.cos(a) * r}px`);
        c.style.setProperty('--dy', `${Math.sin(a) * r - 10}px`);
        c.style.setProperty('--rot', `${Math.round(Math.random() * 360)}deg`);
        c.style.background = colors[i % colors.length];
        el.appendChild(c);
        window.setTimeout(() => c.remove(), 900);
      }
      window.setTimeout(() => el.classList.remove('is-ticked'), 1100);
    }
  };
  const onPin = (id: string) => setSelected(id);
  // Nieuw afgevinkt sinds je laatste bezoek aan Mijn kaart: één voor één met een stempel op de kaart zetten
  useEffect(() => {
    if (!mine || !user || !loaded || !visited.size || !pinsReady || !areasReady) return;
    const key = `kt-map-seen-${user.id}`;
    let seen: string[] = [];
    try {
      seen = JSON.parse(localStorage.getItem(key) ?? '[]');
    } catch {
      /* geen opslag */
    }
    const fresh = [...visited].filter((id) => !seen.includes(id));
    if (!fresh.length) return;
    const timers = [window.setTimeout(() => setPending(new Set(fresh)), 0)];
    // Eén voor één: gebied wordt groen, stempel en confetti op de plek
    fresh.forEach((id, i) =>
      timers.push(
        window.setTimeout(() => {
          setPending((cur) => {
            const next = new Set(cur);
            next.delete(id);
            return next;
          });
          stamp(id);
        }, 1100 + i * 550),
      ),
    );
    const n = visited.size;
    const total = places.length;
    const milestone = n === total ? t.map.cheerAll : [5, 10, 15, 20, 25, 30, 40, 50].includes(n) || n === Math.ceil(total / 2) ? format(t.map.cheerMilestone, { n }, locale) : null;
    timers.push(
      window.setTimeout(() => {
        setCheer({ text: milestone ?? format(t.map.cheerNew, { n: fresh.length }, locale), big: true, n: Date.now() });
        try {
          localStorage.setItem(key, JSON.stringify([...visited]));
        } catch {
          /* geen opslag */
        }
      }, 1100 + fresh.length * 550),
    );
    return () => {
      timers.forEach((x) => window.clearTimeout(x));
      setPending(new Set());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine, user?.id, loaded, visited, pinsReady, areasReady]);

  // Gebieden inkleuren: groen = bezocht, oranje = in je reis; de gekozen plek krijgt een rand
  useEffect(() => {
    const m = map.current;
    if (!m || !areasReady) return;
    const vis = mine ? 'visible' : 'none';
    m.setLayoutProperty('kt-areas-fill', 'visibility', vis);
    m.setLayoutProperty('kt-areas-line', 'visibility', vis);
    for (const [pid, fid] of areaIds.current) {
      const s = visited.has(pid) && !pending.has(pid) ? 'v' : planned.has(pid) ? 'p' : '';
      m.setFeatureState({ source: 'kt-areas', id: fid }, { s, sel: pid === selected });
    }
  }, [mine, visited, planned, pending, selected, areasReady]);

  const pinClick = useRef(onPin);
  useEffect(() => {
    pinClick.current = onPin;
  });
  const current = places.find((p) => p.id === selected) ?? null;

  // Kaart één keer opzetten, met de eigen kaartstijl
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [maplibregl, [geo, detail]] = await Promise.all([import('maplibre-gl'), loadMapData()]);
      maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
      if (cancelled || !container.current) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const lons = places.map((p) => p.lon);
      const lats = places.map((p) => p.lat);
      home.current = places.length
        ? [[Math.min(...lons) - 0.8, Math.min(...lats) - 0.8], [Math.max(...lons) + 0.8, Math.max(...lats) + 0.8]]
        : [[-26, -37], [60, 38]];
      // Intro: van de wereldbol naar Tanzania vliegen (niet bij 'minder beweging' of als er al een plek gekozen is)
      const intro = !reduce && !initial;
      const m = new maplibregl.Map({
        container: container.current,
        style: buildStyle(geo, detail),
        ...(intro ? { center: [-5, 8] as [number, number], zoom: 1.15 } : { bounds: home.current, fitBoundsOptions: { padding: 40 } }),
        minZoom: 1,
        // Verder inzoomen heeft geen zin: de landsgrenzen zijn vereenvoudigd
        maxZoom: 8.5,
        renderWorldCopies: false,
        attributionControl: { compact: true, customAttribution: 'Natural Earth' },
        fadeDuration: reduce ? 0 : 300,
        dragRotate: false,
        pitchWithRotate: false,
      });
      m.touchZoomRotate.disableRotation();
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      // Namen van de grote meren (schuin, blauw)
      for (const l of geo.lakes.filter((x) => x.area > 0.3)) {
        const el = document.createElement('span');
        el.className = 'kt-lake';
        el.textContent = l.name[locale] ?? (l.name.en === 'Nyanza' ? 'Victoria' : l.name.en);
        new maplibregl.Marker({ element: el }).setLngLat(l.label).addTo(m);
      }

      // Buurlanden en de oceaan, licht en klein
      const label = (text: string, at: [number, number], cls: string) => {
        const el = document.createElement('span');
        el.className = cls;
        el.textContent = text;
        new maplibregl.Marker({ element: el }).setLngLat(at).addTo(m);
      };
      for (const n of neighbours) if (NEIGHBOUR_AT[n.id]) label(n.name, NEIGHBOUR_AT[n.id], 'kt-country');
      label(t.map.ocean, [40.25, -8.3], 'kt-ocean');

      // Steden en plaatsen (de grootste altijd, kleinere pas bij inzoomen); niet waar al een Gnutube-plek staat
      const near = (a: [number, number]) => places.some((p) => Math.hypot(p.lon - a[0], p.lat - a[1]) < 0.12);
      for (const c of detail.places) {
        if (near(c.at)) continue;
        const el = document.createElement('span');
        el.className = `kt-town ${c.rank <= 4 ? '' : c.rank <= 6 ? 'kt-min-6' : 'kt-min-7'}${c.capital ? ' is-capital' : ''}`;
        el.innerHTML = '<i></i><span></span>';
        (el.lastChild as HTMLElement).textContent = c.name;
        new maplibregl.Marker({ element: el, anchor: 'left', offset: [-4, 0] }).setLngLat(c.at).addTo(m);
      }
      // Bergtoppen met hoogte
      for (const k of detail.peaks) {
        const el = document.createElement('span');
        el.className = 'kt-peak';
        el.innerHTML = '<i>▲</i><span></span>';
        (el.lastChild as HTMLElement).textContent = `${k.name.replace(/^Mount /, '')} · ${k.elevation.toLocaleString(locale)} m`;
        new maplibregl.Marker({ element: el, anchor: 'left', offset: [-6, 0] }).setLngLat(k.at).addTo(m);
      }

      // Plekken als eigen punten (kleur per soort, naam bij inzoomen of aanwijzen)
      for (const p of places) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = `kt-pin${p.advisory ? ' is-advisory' : ''}`;
        el.style.setProperty('--pin', KIND_COLOR[p.kind]);
        el.setAttribute('aria-label', p.name);
        el.innerHTML = '<span class="kt-pin-dot"></span><span class="kt-pin-label"></span>';
        (el.lastChild as HTMLElement).textContent = p.name;
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          pinClick.current(p.id);
        });
        el.style.setProperty('--i', String(markers.current.size));
        markers.current.set(p.id, new maplibregl.Marker({ element: el }).setLngLat([p.lon, p.lat]).addTo(m));
      }
      setPinsReady(true);

      // Gebieden rond elke plek (Mijn kaart): onder rivieren, meren en wegen, zodat die zichtbaar blijven
      const tz = geo.africa.find((c) => c.id === 'tz');
      const areas = buildAreas(
        places.map((p) => ({ id: p.id, lon: p.lon, lat: p.lat })),
        (tz?.rings ?? []).map((r) => toCoords(r)),
      );
      areaIds.current = new Map(areas.features.map((f) => [String(f.properties?.pid), Number(f.id)]));
      setAreaSize(new Map(areas.features.map((f) => [String(f.properties?.pid), Number(f.properties?.area) || 0])));
      const addAreas = () => {
        m.addSource('kt-areas', { type: 'geojson', data: areas });
        m.addLayer(
          {
            id: 'kt-areas-fill',
            type: 'fill',
            source: 'kt-areas',
            layout: { visibility: 'none' },
            paint: {
              'fill-color': ['match', ['feature-state', 's'], 'v', '#3E8E3A', 'p', '#F5A65B', '#FFFFFF'],
              'fill-opacity': ['match', ['feature-state', 's'], 'v', 0.62, 'p', 0.38, 0.01],
            },
          },
          'rivers',
        );
        m.addLayer(
          {
            id: 'kt-areas-line',
            type: 'line',
            source: 'kt-areas',
            layout: { visibility: 'none', 'line-join': 'round' },
            paint: {
              'line-color': ['case', ['boolean', ['feature-state', 'sel'], false], '#2A1F17', '#C9B8A4'],
              'line-width': ['case', ['boolean', ['feature-state', 'sel'], false], 2.5, 0.8],
              'line-opacity': 0.9,
            },
          },
          'rivers',
        );
        setAreasReady(true);
      };
      if (m.isStyleLoaded()) addAreas();
      else m.once('load', addAreas);
      // Op een gebied klikken = die plek bekijken; aanwijzen toont de naam
      const hoverPop = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'kt-area-pop', offset: 10 });
      const nameOf = new Map(places.map((p) => [p.id, p.name]));
      m.on('click', 'kt-areas-fill', (e) => {
        const pid = e.features?.[0]?.properties?.pid;
        if (pid) pinClick.current(String(pid));
      });
      m.on('mousemove', 'kt-areas-fill', (e) => {
        const pid = e.features?.[0]?.properties?.pid;
        m.getCanvas().style.cursor = 'pointer';
        if (pid) hoverPop.setLngLat(e.lngLat).setText(nameOf.get(String(pid)) ?? '').addTo(m);
      });
      m.on('mouseleave', 'kt-areas-fill', () => {
        m.getCanvas().style.cursor = '';
        hoverPop.remove();
      });
      // Namen altijd tonen zodra je wat bent ingezoomd
      const labels = () => {
        const z = m.getZoom();
        const el = container.current;
        el?.classList.toggle('kt-map-labels', z >= 6.3);
        el?.classList.toggle('kt-z6', z >= 5.6);
        el?.classList.toggle('kt-z7', z >= 6.6);
        // Ver weg (wereldbol): geen namen en punten, dat wordt een kluwen
        el?.classList.toggle('kt-far', z < 4);
      };
      m.on('zoom', labels);
      m.on('zoomend', () => setFar(m.getZoom() < 4.2 && !container.current?.classList.contains('kt-intro')));
      labels();
      map.current = m;

      if (intro) {
        const box = container.current;
        box.classList.add('kt-intro');
        const done = () => {
          box.classList.remove('kt-intro');
          box.classList.add('kt-landed');
        };
        m.once('load', () => {
          const target = m.cameraForBounds(home.current!, { padding: 40 });
          // Eerst rustig naar Afrika draaien, dan in één vloeiende vlucht naar Tanzania
          m.easeTo({ center: [30, -2], zoom: 1.6, duration: 1800, easing: (t) => t * (2 - t) });
          m.once('moveend', () => {
            if (!target) return done();
            m.flyTo({ ...target, duration: 3600, curve: 1.3, essential: false });
            m.once('moveend', done);
          });
        });
        // Wie sleept of scrolt, onderbreekt de vlucht
        m.once('dragstart', done);
      }
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

  // Filter, gekozen plek en (op Mijn kaart) bezocht/gepland op de punten zetten
  useEffect(() => {
    const show = new Set(visible.map((p) => p.id));
    container.current?.classList.toggle('kt-mine', mine);
    for (const [id, mk] of markers.current) {
      const el = mk.getElement();
      el.classList.toggle('is-hidden', !show.has(id));
      el.classList.toggle('is-active', id === selected);
      el.classList.toggle('is-visited', mine && visited.has(id) && !pending.has(id));
      el.classList.toggle('is-planned', mine && planned.has(id));
    }
  }, [visible, selected, mine, visited, planned, pending, pinsReady]);

  // Naar de gekozen plek
  useEffect(() => {
    const m = map.current;
    if (!m || !current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    m.easeTo({ center: [current.lon, current.lat], zoom: Math.max(m.getZoom(), 6), duration: reduce ? 0 : 900 });
  }, [current]);

  const reset = () => {
    setSelected(null);
    if (map.current && home.current) map.current.fitBounds(home.current, { padding: 40, duration: 800 });
  };
  /** Van ver weg in één vlucht terug naar Tanzania. */
  const flyHome = () => {
    const m = map.current;
    if (!m || !home.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target = m.cameraForBounds(home.current, { padding: 40 });
    if (target) m.flyTo({ ...target, duration: reduce ? 0 : 2800, curve: 1.3 });
    setFar(false);
  };

  return (
    <div className="pt-6">
      {/* Alle plekken, of je eigen kaart met vinkjes */}
      <div className="mb-4 flex w-fit gap-1 rounded-full border border-rule bg-white p-1 shadow-sm" role="group" aria-label={t.map.title}>
        {([false, true] as const).map((m) => (
          <button
            key={String(m)}
            type="button"
            aria-pressed={mine === m}
            onClick={() => setMine(m)}
            className="min-h-10 rounded-full px-4 text-[14px] font-semibold text-ink transition-colors aria-pressed:bg-brand-dark aria-pressed:text-white"
          >
            {m ? t.map.modeMine : t.map.modeAll}
          </button>
        ))}
      </div>
      {mine && (
        <div className="panel mb-4 flex flex-col gap-3 p-5" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="m-0 text-[22px] font-semibold text-ink">
              ✅ <span key={visited.size} className="kt-count-pop inline-block">{format(t.map.visitedCount, { pct: pctLabel }, locale)}</span>
            </p>
            <span className="text-[13px] text-subtle">
              {user && isDemo() && <span className="mr-2 rounded-full bg-warning px-2.5 py-1 text-[12px] font-semibold text-warning-ink">Voorbeeld</span>}
              🔒 {t.map.privateNote}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-rule" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={format(t.map.visitedCount, { pct: pctLabel }, locale)}>
            <div className="h-full rounded-full bg-[#2F6B2A] transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="m-0 text-[14px] text-muted">{t.map.visitedSub}</p>
          <div className="flex flex-wrap gap-4 text-[13px] text-muted">
            <span className="flex items-center gap-1.5"><span className="h-4 w-5 rounded-[4px] bg-[#3E8E3A]/70" aria-hidden="true" />{t.map.legendVisited}</span>
            <span className="flex items-center gap-1.5"><span className="h-4 w-5 rounded-[4px] bg-[#F5A65B]/60" aria-hidden="true" />{t.map.legendPlanned}</span>
            <span className="flex items-center gap-1.5"><span className="h-4 w-5 rounded-[4px] border border-[#C9B8A4] bg-white" aria-hidden="true" />{t.map.legendTodo}</span>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label={t.kind.label}>
        <button type="button" className="chip" aria-pressed={!kind} onClick={() => setKind('')}>{t.kind.all}</button>
        {kinds.map((k) => (
          <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: KIND_COLOR[k] }} />
            {t.kind[k]}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="relative">
          <div
            ref={container}
            className="kt-map h-[68vh] min-h-[460px] overflow-hidden rounded-[28px] border border-rule shadow-[0_20px_50px_-30px_rgba(42,31,23,0.45)]"
            role="region"
            aria-label={t.map.title}
          />
          {/* Mijn kaart: uitleg, en de melding na afvinken */}
          {mine && (
            <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-[13px] font-semibold text-ink shadow-md">
              ✨ {t.map.autoTick}
            </span>
          )}
          {cheer && (
            <div
              key={cheer.n}
              role="status"
              className={`kt-cheer pointer-events-none absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-2xl px-5 py-3 text-center font-semibold shadow-xl ${
                cheer.big ? 'bg-[#2F6B2A] text-[18px] text-white' : 'bg-white text-[15px] text-ink'
              }`}
            >
              {cheer.text}
            </div>
          )}
          {/* Ver uitgezoomd: in één klik terug naar Tanzania */}
          {far && (
            <button
              type="button"
              onClick={flyHome}
              className="kt-fly-home absolute left-1/2 top-5 flex -translate-x-1/2 items-center gap-2 rounded-full bg-brand-dark px-5 py-3 text-[15px] font-semibold text-white shadow-xl transition-transform hover:scale-105"
            >
              <span aria-hidden="true">🎯</span> {t.map.flyHome}
            </button>
          )}
          {/* Legenda en terug naar overzicht, zwevend op de kaart */}
          <div className="pointer-events-none absolute bottom-4 left-4 flex flex-wrap items-center gap-2">
            <span className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[12.5px] text-muted shadow-md backdrop-blur">
              <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full border-[3px] border-[#E0694A] bg-white" />
              {t.map.legendAdvisory}
            </span>
            {selected && (
              <button type="button" onClick={reset} className="pointer-events-auto rounded-full bg-white/90 px-3 py-1.5 text-[12.5px] font-semibold text-ink shadow-md backdrop-blur hover:bg-white">
                ⤢ {t.map.reset}
              </button>
            )}
          </div>
        </div>

        <aside className="panel flex flex-col gap-4 overflow-hidden p-0" aria-live="polite">
          {current ? (
            <>
              <div className="relative aspect-[4/3] overflow-hidden">
                {images[current.id]}
                <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[13px] font-semibold text-ink">
                  <KindIcon kind={current.kind} color={KIND_COLOR[current.kind]} size={16} />
                  {t.kind[current.kind]}
                </span>
              </div>
              <div className="flex flex-col gap-3 px-5 pb-5">
                <span className="eyebrow">{current.region} · {current.coords}</span>
                <h2 className="m-0 text-[30px] font-semibold leading-tight text-ink">{current.name}</h2>
                <p className="m-0 text-[16px] text-muted">{current.tagline}</p>
                {current.advisory && <AdvisoryNotice t={t.advisory} />}
                {mine && fromTrips.has(current.id) && (
                  <p className="m-0 rounded-xl bg-[#E3F1E0] px-3 py-2 text-[14px] font-semibold text-[#2F6B2A]">
                    ✓ {format(t.map.fromTrip, { trip: new Date(`${fromTrips.get(current.id)}T12:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' }) }, locale)}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Link href={`/${locale}/plek/${current.id}`} className="btn btn-primary">{t.search.view}</Link>
                  <Link href={`/${locale}/kijken?plek=${current.id}`} className="btn btn-ghost">▶ {t.map.watch}</Link>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2 p-5">
              <span className="text-[34px]" aria-hidden="true">🗺️</span>
              <p className="m-0 text-[17px] font-semibold text-ink">{t.map.pick}</p>
              <p className="m-0 text-[14px] text-muted">{t.map.pickSub}</p>
            </div>
          )}

          {/* Mijn kaart: je gemaakte reizen (uit je boekingen) en je huidige reis */}
          {mine && (
            <div className="mx-5 flex flex-col gap-3 border-t border-rule pt-4">
              <p className="m-0 text-[16px] font-semibold text-ink">🧳 {t.map.yourTrips}</p>
              {!accountsEnabled && !user ? (
                <p className="m-0 text-[14px] text-muted">{t.map.mineSoon}</p>
              ) : !user ? (
                <div className="flex flex-col gap-2">
                  <p className="m-0 text-[14px] text-muted">{t.map.mineLogin}</p>
                  <Link href={`/${locale}/inloggen`} className="btn btn-primary !min-h-10 w-fit">{t.map.login}</Link>
                </div>
              ) : doneTrips.length === 0 ? (
                <p className="m-0 text-[14px] text-muted">{t.map.noTrips}</p>
              ) : (
                doneTrips.map((d) => (
                  <div key={d.group_id} className="flex items-center gap-3 rounded-2xl border border-rule p-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#2F6B2A] text-[15px] font-bold text-white" aria-hidden="true">✓</span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[15px] font-semibold text-ink">
                        {new Date(`${d.start_day}T12:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                      </span>
                      <span className="text-[12.5px] text-subtle">{t.map.allDone} · {d.place_ids.length}</span>
                    </span>
                  </div>
                ))
              )}
              {tripIds.length > 0 && (
                <div className="flex items-center gap-3 rounded-2xl border border-dashed border-brand p-3">
                  <span className="h-8 w-8 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-subtle">{t.map.currentTrip}</span>
                    <span className="truncate text-[15px] font-semibold text-ink">{route.name || '—'} · {tripIds.length}</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Toetsenbordvriendelijk alternatief voor de kaartpunten */}
          <details className="mx-5 mb-5 border-t border-rule pt-3">
            <summary className="min-h-11 cursor-pointer py-2 text-[15px]">{t.map.listTitle} ({visible.length})</summary>
            <ul className="m-0 max-h-72 list-none overflow-y-auto p-0">
              {visible.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setSelected(p.id)} className="flex min-h-11 w-full items-center gap-2 text-left text-[15px] hover:underline">
                    {mine ? (
                      <span aria-hidden="true" className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] text-white ${visited.has(p.id) ? 'bg-[#2F6B2A]' : planned.has(p.id) ? 'bg-brand' : 'bg-[#C9C1B8]'}`}>
                        {visited.has(p.id) ? '✓' : ''}
                      </span>
                    ) : (
                      <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: KIND_COLOR[p.kind] }} />
                    )}
                    {p.name} <span className="text-ink/45">· {p.region}</span>
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </aside>
      </div>
    </div>
  );
}
