'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/config';
import { format } from '@/lib/i18n/format';
import { accountsEnabled, supabase } from '@/lib/supabase';
import { PARTNER_SENT } from './PartnerGnu';

export const PARTNER_KINDS = ['stay', 'operator', 'guide', 'transport', 'activity', 'food', 'other'] as const;
type PartnerKind = (typeof PARTNER_KINDS)[number];
const ICON: Record<PartnerKind, string> = { stay: '🛖', operator: '🚙', guide: '🧭', transport: '✈️', activity: '🎈', food: '🍲', other: '✨' };

/** Keuzelijsten; de teksten staan in messages onder partners.opt als `${groep}_${waarde}` */
export const OPTIONS = {
  fac: ['wifi', 'pool', 'restaurant', 'bar', 'hotwater', 'power', 'solar', 'ac', 'parking', 'transfer', 'laundry', 'spa', 'kids', 'access'],
  act: ['drives', 'walking', 'night', 'culture', 'birding', 'boat', 'diving', 'hiking'],
  lang: ['en', 'sw', 'de', 'fr', 'nl', 'it', 'es'],
  season: ['all', 'dry', 'other'],
  channels: ['site', 'whatsapp', 'platforms', 'agents', 'walkin'],
  commission: ['yes', 'maybe', 'no'],
  payments: ['bank', 'mobile', 'card', 'cash'],
  media: ['yes', 'no'],
  near: ['shop', 'atm', 'clinic', 'pharmacy', 'restaurant', 'market', 'fuel', 'beach', 'gate', 'airstrip', 'bus'],
  transport: ['airport', 'transfer', 'drives', 'safari', 'selfdrive'],
  vehicle: ['open4x4', 'popup4x4', 'minibus', 'car', 'boat'],
} as const;
type Group = keyof typeof OPTIONS;
const MULTI: Group[] = ['fac', 'act', 'lang', 'channels', 'payments', 'near', 'transport', 'vehicle'];

const MAX_PHOTOS = 20;
const PHOTO_BUCKET = 'partner-photos';

type Photo = { id: string; file: Blob; url: string; name: string };
/** Eén accommodatie (of tour/activiteit) met eigen naam, tekst en foto's */
type Cat = 'stay' | 'offer';
type Item = { id: string; cat: Cat; name: string; count: string; guests: string; price: string; text: string; photos: Photo[] };
const MAX_ITEMS = 10;
const MAX_ITEM_PHOTOS = 15;
const newItem = (cat: Cat): Item => ({ id: crypto.randomUUID(), cat, name: '', count: '', guests: '', price: '', text: '', photos: [] });
type Props = { t: Dictionary['partners']; places: { id: string; name: string }[]; locale: string };

/** Foto verkleinen in de browser (langste zijde max 2000 px, JPEG): sneller uploaden en onder 5 MB. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

/**
 * Aanmeldformulier voor partners, in vier stappen: bedrijf → aanbod → foto's → samenwerking.
 * Gaat naar de database (foto's naar privé opslag); beheer ziet alles op de beheerpagina.
 */
export function PartnerForm({ t, places, locale }: Props) {
  const [step, setStep] = useState(0);
  // Meerdere soorten tegelijk mogelijk, bv. lodge én safaribedrijf
  const [kinds, setKinds] = useState<PartnerKind[]>([]);
  const kind = kinds.includes('stay') ? 'stay' : (kinds[0] ?? '');
  const showStay = kinds.length === 0 || kinds.includes('stay');
  const showOffer = kinds.some((k) => k !== 'stay');
  const [f, setF] = useState({ business: '', contact: '', email: '', phone: '', place: '', website: '', message: '' });
  const [info, setInfo] = useState({ currency: 'USD', seasonNote: '', licence: '', impact: '', facOther: '', nearOther: '', vehicles: '', transportNote: '' });
  const [safariPlaces, setSafariPlaces] = useState<string[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [picked, setPicked] = useState<Record<Group, string[]>>({
    fac: [],
    act: [],
    lang: [],
    season: [],
    channels: [],
    commission: [],
    payments: [],
    media: [],
    near: [],
    transport: [],
    vehicle: [],
  });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [agree, setAgree] = useState(false);
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'failed' | 'photoFailed'>('idle');
  const [touched, setTouched] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const loc = locale as Locale;

  // Voorbeeldjes van foto's opruimen als het formulier weggaat
  const photosRef = useRef<Photo[]>([]);
  useEffect(() => {
    photosRef.current = [...photos, ...items.flatMap((x) => x.photos)];
  }, [photos, items]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim());
  const step1Ok = !!kind && f.business.trim().length >= 2 && f.contact.trim().length >= 2 && emailOk;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const setI = (k: keyof typeof info) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setInfo({ ...info, [k]: e.target.value });

  const steps = [t.sBusiness, t.sOffer, t.sPhotos, t.sDeal];
  const go = (n: number) => {
    if (n > 0 && !step1Ok) {
      setTouched(true);
      setStep(0);
      return;
    }
    setStep(n);
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggle = (g: Group, v: string) =>
    setPicked((p) => {
      const on = p[g].includes(v);
      if (MULTI.includes(g)) return { ...p, [g]: on ? p[g].filter((x) => x !== v) : [...p[g], v] };
      return { ...p, [g]: on ? [] : [v] };
    });

  const toPhotos = async (files: FileList | null, room: number): Promise<Photo[]> => {
    if (!files || room <= 0) return [];
    const list = Array.from(files)
      .filter((x) => /^image\/(jpeg|png|webp|heic|heif)$/.test(x.type) || /\.(jpe?g|png|webp|heic)$/i.test(x.name))
      .slice(0, room);
    return Promise.all(
      list.map(async (file) => {
        const blob = await shrink(file);
        return { id: crypto.randomUUID(), file: blob, url: URL.createObjectURL(blob), name: file.name };
      }),
    );
  };
  const addPhotos = async (files: FileList | null) => {
    const added = await toPhotos(files, MAX_PHOTOS - photos.length);
    setPhotos((p) => [...p, ...added].slice(0, MAX_PHOTOS));
  };
  const updateItem = (id: string, patch: Partial<Item>) => setItems((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const addItemPhotos = async (id: string, files: FileList | null) => {
    const item = items.find((x) => x.id === id);
    if (!item) return;
    const added = await toPhotos(files, MAX_ITEM_PHOTOS - item.photos.length);
    setItems((list) => list.map((x) => (x.id === id ? { ...x, photos: [...x.photos, ...added].slice(0, MAX_ITEM_PHOTOS) } : x)));
  };
  const removeItemPhoto = (id: string, photoId: string) =>
    setItems((list) =>
      list.map((x) => {
        if (x.id !== id) return x;
        const ph = x.photos.find((y) => y.id === photoId);
        if (ph) URL.revokeObjectURL(ph.url);
        return { ...x, photos: x.photos.filter((y) => y.id !== photoId) };
      }),
    );
  const removeItem = (id: string) =>
    setItems((list) => {
      list.find((x) => x.id === id)?.photos.forEach((ph) => URL.revokeObjectURL(ph.url));
      return list.filter((x) => x.id !== id);
    });
  const removePhoto = (id: string) =>
    setPhotos((p) => {
      const x = p.find((y) => y.id === id);
      if (x) URL.revokeObjectURL(x.url);
      return p.filter((y) => y.id !== id);
    });

  /** Alleen ingevulde antwoorden bewaren */
  const details = (paths: string[], itemPaths: string[][]) => {
    const out: Record<string, unknown> = {};
    const num = (v: string, max: number) => {
      const n = parseFloat(v);
      return n > 0 ? Math.min(n, max) : null;
    };
    const list = items
      .map((x, i) => {
        const o: Record<string, unknown> = {};
        o.cat = x.cat;
        if (x.name.trim()) o.name = x.name.trim().slice(0, 120);
        const count = num(x.count, 1000);
        if (count) o.count = Math.round(count);
        const guests = num(x.guests, 1000);
        if (guests) o.guests = Math.round(guests);
        const price = num(x.price, 100000000);
        if (price) o.price = { amount: price, currency: info.currency };
        if (x.text.trim()) o.text = x.text.trim().slice(0, 1000);
        if (itemPaths[i]?.length) o.photos = itemPaths[i];
        return o;
      })
      .filter((o) => Object.keys(o).length > 1);
    if (list.length) out.items = list;
    if (kinds.length > 1) out.kinds = kinds;
    (Object.keys(picked) as Group[]).forEach((g) => {
      if (!picked[g].length) return;
      out[g] = MULTI.includes(g) ? picked[g] : picked[g][0];
    });
    if (info.seasonNote.trim()) out.seasonNote = info.seasonNote.trim().slice(0, 300);
    if (info.facOther.trim()) out.facOther = info.facOther.trim().slice(0, 500);
    if (info.nearOther.trim()) out.nearOther = info.nearOther.trim().slice(0, 500);
    const vehicles = num(info.vehicles, 1000);
    if (vehicles) out.vehicles = Math.round(vehicles);
    if (safariPlaces.length) out.safariPlaces = safariPlaces;
    if (info.transportNote.trim()) out.transportNote = info.transportNote.trim().slice(0, 1000);
    if (info.licence.trim()) out.licence = info.licence.trim().slice(0, 100);
    if (info.impact.trim()) out.impact = info.impact.trim().slice(0, 1000);
    if (paths.length) out.photos = paths;
    return Object.keys(out).length ? out : null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!step1Ok || !kind) return go(0);
    if (!agree) return;
    const sb = supabase();
    if (!sb) return;
    setState('busy');
    // Eerst de foto's (privé map per aanmelding), dan de aanmelding met de paden erin
    const folder = `aanmelding/${crypto.randomUUID()}`;
    const paths: string[] = [];
    const upload = async (p: Photo, path: string) => {
      const ext = p.file.type === 'image/png' ? 'png' : p.file.type === 'image/webp' ? 'webp' : 'jpg';
      const full = `${path}.${ext}`;
      const { error } = await sb.storage.from(PHOTO_BUCKET).upload(full, p.file, { contentType: p.file.type || 'image/jpeg', upsert: false });
      return error ? null : full;
    };
    for (const [i, p] of photos.entries()) {
      const path = await upload(p, `${folder}/${i + 1}`);
      if (!path) return setState('photoFailed');
      paths.push(path);
    }
    const itemPaths: string[][] = [];
    for (const [i, item] of items.entries()) {
      const list: string[] = [];
      for (const [j, p] of item.photos.entries()) {
        const path = await upload(p, `${folder}/item-${i + 1}/${j + 1}`);
        if (!path) return setState('photoFailed');
        list.push(path);
      }
      itemPaths.push(list);
    }
    const { error } = await sb.from('partner_applications').insert({
      kind,
      business: f.business.trim(),
      contact: f.contact.trim(),
      email: f.email.trim(),
      phone: f.phone.trim() || null,
      place_id: f.place || null,
      website: f.website.trim() || null,
      message: f.message.trim() || null,
      details: details(paths, itemPaths),
    });
    if (error) return setState('failed');
    setState('sent');
    window.dispatchEvent(new Event(PARTNER_SENT));
  };

  if (state === 'sent') {
    return (
      <div className="panel flex flex-col items-start gap-3 p-6 sm:p-8" role="status">
        <span className="text-[44px]" aria-hidden="true">
          🎉
        </span>
        <p className="m-0 text-[26px] font-semibold text-ink">{t.sentTitle}</p>
        <p className="m-0 text-[16px] text-muted">{t.sentText}</p>
      </div>
    );
  }

  const field = 'field !min-h-12';
  const q = 'text-[14.5px] font-semibold text-ink';
  const chips = (g: Group) => (
    <div className="flex flex-wrap gap-2">
      {OPTIONS[g].map((o) => (
        <button key={o} type="button" aria-pressed={picked[g].includes(o)} className="chip !min-h-10" onClick={() => toggle(g, o)}>
          {t.opt[`${g}_${o}` as keyof typeof t.opt]}
        </button>
      ))}
    </div>
  );
  const group = (title: string, g: Group, extra?: React.ReactNode) => (
    <div className="flex flex-col gap-2" role="group" aria-label={title}>
      <span className={q}>{title}</span>
      {chips(g)}
      {extra}
    </div>
  );

  const itemSection = (cat: Cat) => (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className={q}>{cat === 'stay' ? t.itemsTitleStay : t.itemsTitleOther}</span>
        <span className="text-[14px] text-muted">{cat === 'stay' ? t.itemsSubStay : t.itemsSubOther}</span>
      </div>
      {items
        .filter((x) => x.cat === cat)
        .map((x, i) => (
          <div key={x.id} className="flex flex-col gap-3 rounded-2xl border border-rule bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-dark text-[13px] font-bold text-white">{i + 1}</span>
              <input
                className={`${field} flex-1`}
                value={x.name}
                onChange={(e) => updateItem(x.id, { name: e.target.value })}
                maxLength={120}
                aria-label={t.itemName}
                placeholder={format(cat === 'stay' ? t.itemNamePhStay : t.itemNamePhOther, { n: i + 1 }, loc)}
              />
              <button type="button" className="btn btn-ghost !min-h-11 text-[#A33]" onClick={() => removeItem(x.id)} aria-label={t.itemRemove}>
                ✕
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className="text-[13px] font-semibold text-muted">{cat === 'stay' ? t.itemCountStay : t.itemCountOther}</span>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  className={field}
                  value={x.count}
                  onChange={(e) => updateItem(x.id, { count: e.target.value })}
                  placeholder="1"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[13px] font-semibold text-muted">{t.itemGuests}</span>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  className={field}
                  value={x.guests}
                  onChange={(e) => updateItem(x.id, { guests: e.target.value })}
                  placeholder="2"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[13px] font-semibold text-muted">{format(t.itemPrice, { cur: info.currency }, loc)}</span>
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  className={field}
                  value={x.price}
                  onChange={(e) => updateItem(x.id, { price: e.target.value })}
                  placeholder={t.priceHint}
                />
              </label>
            </div>
            <textarea
              className="field min-h-20 py-3"
              value={x.text}
              onChange={(e) => updateItem(x.id, { text: e.target.value })}
              maxLength={1000}
              aria-label={t.itemText}
              placeholder={cat === 'stay' ? t.itemTextPhStay : t.itemTextPhOther}
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {x.photos.map((p) => (
                <figure key={p.id} className="relative m-0 aspect-[4/3] overflow-hidden rounded-xl border border-rule bg-sand">
                  {/* eslint-disable-next-line @next/next/no-img-element -- lokale voorbeeldfoto (blob) */}
                  <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeItemPhoto(x.id, p.id)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-black/80"
                    aria-label={t.photosRemove}
                  >
                    ✕
                  </button>
                </figure>
              ))}
              {x.photos.length < MAX_ITEM_PHOTOS && (
                <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-dashed border-rule text-center text-[12.5px] font-semibold text-muted transition-colors hover:border-brand-dark hover:text-ink">
                  <span className="text-[20px]" aria-hidden="true">
                    📷
                  </span>
                  {format(t.itemPhotos, { n: x.photos.length, max: MAX_ITEM_PHOTOS }, loc)}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      void addItemPhotos(x.id, e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        ))}
      {items.filter((x) => x.cat === cat).length < MAX_ITEMS && (
        <button
          type="button"
          onClick={() => setItems((list) => [...list, newItem(cat)])}
          className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-dark/40 bg-brand-soft/50 text-[15px] font-semibold text-brand-dark transition-colors hover:border-brand-dark hover:bg-brand-soft"
        >
          ＋ {cat === 'stay' ? t.itemAddStay : t.itemAddOther}
        </button>
      )}
    </section>
  );

  return (
    <form onSubmit={submit} noValidate className="panel flex flex-col gap-6 p-6 sm:p-8">
      <div ref={top} className="flex scroll-mt-28 flex-col gap-1">
        <h2 className="m-0 text-[26px] font-semibold text-ink">{t.formTitle}</h2>
        <p className="m-0 text-[15px] text-muted">{t.formSub}</p>
      </div>

      {/* Stappen bovenaan: waar ben je, en terugspringen kan altijd */}
      <ol className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-4" aria-label={format(t.stepOf, { n: step + 1, total: steps.length }, loc)}>
        {steps.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => go(i)}
              aria-current={step === i ? 'step' : undefined}
              className={`flex w-full items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-[14px] font-semibold transition-colors ${
                step === i
                  ? 'border-brand-dark bg-brand-dark text-white'
                  : i < step
                    ? 'border-brand-dark/30 bg-brand-soft text-brand-dark'
                    : 'border-rule bg-white text-muted hover:border-brand-dark'
              }`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] ${step === i ? 'bg-white text-brand-dark' : i < step ? 'bg-brand-dark text-white' : 'bg-sand text-subtle'}`}
              >
                {i < step ? '✓' : i + 1}
              </span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <>
          <div className="flex items-start gap-3 rounded-2xl border border-[#E8C9A3] bg-brand-soft px-4 py-3">
            <span className="text-[22px] leading-none" aria-hidden="true">
              🔍
            </span>
            <p className="m-0 text-[15px] leading-relaxed text-ink">
              <strong>{t.verifyTitle}</strong> {t.verifyText}
            </p>
          </div>
          <fieldset className="m-0 border-0 p-0">
            <legend className={`${q} mb-3`}>
              {t.kindLabel} <span className="font-normal text-muted">{t.kindMulti}</span>
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PARTNER_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kinds.includes(k)}
                  onClick={() => setKinds((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]))}
                  className="flex flex-col items-center gap-1 rounded-2xl border border-rule bg-white px-2 py-3 text-center text-[14px] font-medium text-ink transition-colors hover:border-brand-dark aria-pressed:border-brand-dark aria-pressed:bg-brand-soft"
                >
                  <span className="text-[24px]" aria-hidden="true">
                    {ICON[k]}
                  </span>
                  {t.kinds[k]}
                </button>
              ))}
            </div>
            {touched && !kind && <p className="m-0 mt-2 text-[13px] font-semibold text-[#A33]">{t.kindRequired}</p>}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={q}>{t.business}</span>
              <input
                className={field}
                value={f.business}
                onChange={set('business')}
                maxLength={120}
                autoComplete="organization"
                aria-invalid={touched && f.business.trim().length < 2}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={q}>{t.contact}</span>
              <input
                className={field}
                value={f.contact}
                onChange={set('contact')}
                maxLength={120}
                autoComplete="name"
                aria-invalid={touched && f.contact.trim().length < 2}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={q}>{t.email}</span>
              <input
                type="email"
                className={field}
                value={f.email}
                onChange={set('email')}
                maxLength={200}
                autoComplete="email"
                aria-invalid={touched && !emailOk}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={q}>{t.phone}</span>
              <input type="tel" className={field} value={f.phone} onChange={set('phone')} maxLength={40} autoComplete="tel" placeholder="+255 …" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={q}>{t.place}</span>
              <select className={`${field} cursor-pointer`} value={f.place} onChange={set('place')}>
                <option value="">{t.placeOther}</option>
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={q}>{t.website}</span>
              <input type="url" inputMode="url" className={field} value={f.website} onChange={set('website')} maxLength={300} placeholder="https://…" />
            </label>
          </div>
          {touched && !step1Ok && kind && <p className="m-0 text-[13px] font-semibold text-[#A33]">{t.incomplete1}</p>}
        </>
      )}

      {step === 1 && (
        <>
          <p className="m-0 -mt-2 text-[15px] text-muted">{t.offerSub}</p>
          <label className="flex flex-col gap-1.5">
            <span className={q}>{t.aboutLabel}</span>
            <textarea className="field min-h-28 py-3" value={f.message} onChange={set('message')} maxLength={2000} placeholder={t.messagePlaceholder} />
          </label>

          {showStay && itemSection('stay')}
          {showOffer && itemSection('offer')}
          <section className="flex flex-col gap-3">
            <label className="flex items-center gap-2 self-start text-[13px] text-muted">
              {t.currency}
              <select className="field !min-h-9 w-24 cursor-pointer py-1 text-[14px]" value={info.currency} onChange={setI('currency')}>
                {['USD', 'TZS', 'EUR'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </section>

          {group(
            t.facilities,
            'fac',
            <input className={field} value={info.facOther} onChange={setI('facOther')} maxLength={500} placeholder={t.facOtherPh} aria-label={t.facOther} />,
          )}
          {group(t.activities, 'act')}
          {group(t.languages, 'lang')}
          {group(
            t.near,
            'near',
            <input className={field} value={info.nearOther} onChange={setI('nearOther')} maxLength={500} placeholder={t.nearOtherPh} aria-label={t.near} />,
          )}

          {/* Vervoer en safari's: chauffeur, transfers, en naar welke plekken */}
          <section className="flex flex-col gap-4 rounded-2xl border border-rule bg-sand/40 p-4">
            <span className={q}>🚙 {t.transportTitle}</span>
            {group(t.transport, 'transport')}
            {picked.transport.length > 0 && (
              <>
                <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
                  <label className="flex flex-col gap-1">
                    <span className="text-[13px] font-semibold text-muted">{t.vehicles}</span>
                    <input type="number" min={1} inputMode="numeric" className={field} value={info.vehicles} onChange={setI('vehicles')} placeholder="2" />
                  </label>
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] font-semibold text-muted">{t.vehicleTypes}</span>
                    {chips('vehicle')}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-muted">{t.safariPlaces}</span>
                  <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
                    {places.map((p) => {
                      const on = safariPlaces.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          aria-pressed={on}
                          className="chip !min-h-9 text-[13.5px]"
                          onClick={() => setSafariPlaces((l) => (on ? l.filter((x) => x !== p.id) : [...l, p.id]))}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <textarea
                  className="field min-h-20 py-3"
                  value={info.transportNote}
                  onChange={setI('transportNote')}
                  maxLength={1000}
                  placeholder={t.transportNotePh}
                  aria-label={t.transportTitle}
                />
              </>
            )}
          </section>
          {group(
            t.season,
            'season',
            picked.season[0] === 'other' && (
              <input className={field} value={info.seasonNote} onChange={setI('seasonNote')} maxLength={300} placeholder={t.seasonHint} aria-label={t.season} />
            ),
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={q}>{t.licence}</span>
              <input className={field} value={info.licence} onChange={setI('licence')} maxLength={100} placeholder={t.licenceHint} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={q}>{t.impact}</span>
              <textarea className="field min-h-24 py-3" value={info.impact} onChange={setI('impact')} maxLength={1000} placeholder={t.impactHint} />
            </label>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="flex flex-col gap-1">
            <span className={q}>{t.photosTitle}</span>
            <p className="m-0 text-[14.5px] text-muted">{t.photosSub}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((p) => (
              <figure key={p.id} className="relative m-0 aspect-[4/3] overflow-hidden rounded-2xl border border-rule bg-sand">
                {/* eslint-disable-next-line @next/next/no-img-element -- lokale voorbeeldfoto (blob) */}
                <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(p.id)}
                  className="absolute right-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-black/80"
                >
                  ✕ {t.photosRemove}
                </button>
              </figure>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-rule bg-white text-center text-[14px] font-semibold text-muted transition-colors hover:border-brand-dark hover:text-ink">
                <span className="text-[28px]" aria-hidden="true">
                  📷
                </span>
                {t.photosAdd}
                <span className="text-[12px] font-normal text-subtle">{format(t.photosCount, { n: photos.length, max: MAX_PHOTOS }, loc)}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    void addPhotos(e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <p className="m-0 -mt-2 text-[15px] text-muted">{t.dealSub}</p>
          {group(t.channels, 'channels')}
          {group(t.commissionQ, 'commission')}
          {group(t.payments, 'payments')}
          {group(t.mediaQ, 'media')}
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-rule bg-white p-3 text-[14.5px] has-[:checked]:border-brand-dark has-[:checked]:bg-brand-soft">
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[#5A4030]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>
              {t.agree}{' '}
              <Link href={`/${locale}/privacy`} className="underline underline-offset-2">
                {t.privacyLink}
              </Link>
            </span>
          </label>
        </>
      )}

      {/* Onderbalk: vorige / volgende, en in de laatste stap versturen */}
      <div className="flex flex-col gap-2 border-t border-rule pt-5">
        {step === 3 && touched && !agree && <p className="m-0 text-[13px] font-semibold text-[#A33]">{t.agreeRequired}</p>}
        {state === 'failed' && (
          <p className="m-0 text-[14px] font-semibold text-[#A33]" role="alert">
            {t.failed}
          </p>
        )}
        {state === 'photoFailed' && (
          <p className="m-0 text-[14px] font-semibold text-[#A33]" role="alert">
            {t.photosFailed}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {step > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => go(step - 1)}>
              ← {t.prev}
            </button>
          )}
          {step < 3 ? (
            <button type="button" className="btn btn-primary ml-auto" onClick={() => go(step + 1)}>
              {t.next} →
            </button>
          ) : (
            <button
              type="submit"
              disabled={!accountsEnabled || state === 'busy'}
              className="btn btn-primary ml-auto disabled:cursor-not-allowed disabled:opacity-60"
            >
              🤝 {state === 'busy' ? (photos.length || items.some((x) => x.photos.length) ? t.photosUploading : t.sending) : t.submit}
            </button>
          )}
        </div>
        {!accountsEnabled && <p className="m-0 text-[13px] text-subtle">{t.soon}</p>}
      </div>
    </form>
  );
}
