'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ExternalLink,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Star,
  Trash2,
  Undo2,
} from 'lucide-react';
import {
  MAX_RESTAURANTS_PER_REGION,
  setWantsToTry,
  uniqueRestaurantId,
  validateCatalog,
} from '@/lib/catalog';
import type { StoreInfo } from '@/lib/catalog-store';
import {
  REGIONS,
  REGION_ORDER,
  asRestaurantId,
  createGoogleMapDirections,
  createGoogleMapEmbed,
  type RegionId,
  type Restaurant,
  type RestaurantPhoto,
} from '@/lib/restaurants';

interface AdminPanelProps {
  readonly initialCatalog: readonly Restaurant[];
  readonly store: StoreInfo;
  readonly placesReady: boolean;
}

interface AddState {
  readonly link: string;
  readonly loading: boolean;
  readonly error: string | null;
}

type Notice = { readonly kind: 'success' | 'error'; readonly lines: readonly string[] } | null;

const EMPTY_ADD: AddState = { link: '', loading: false, error: null };

/** Recompute the map links whenever the name, address or pin changes. */
function withMapLinks(r: Restaurant): Restaurant {
  return {
    ...r,
    directionsUrl: createGoogleMapDirections(r.name, r.address),
    mapEmbedUrl: createGoogleMapEmbed(`${r.name}, ${r.address}`, r.coordinates),
  };
}

function blankRestaurant(id: string, region: RegionId): Restaurant {
  return withMapLinks({
    id: asRestaurantId(id),
    region,
    name: '',
    areaName: '',
    googleCategory: 'Vegetarian restaurant',
    openStatusText: '',
    popularTimesPeak: '',
    coordinates: { lat: 0, lng: 0 },
    cuisine: '',
    rating: 0,
    reviewCount: 0,
    priceRange: '',
    address: '',
    postalCode: '',
    hours: 'Daily 11:00 am – 9:30 pm',
    serviceTag: '',
    phone: '',
    websiteUrl: '',
    directionsUrl: '',
    mapEmbedUrl: '',
    description: '',
    vibe: '',
    highlights: [],
    reviews: [],
    photos: [],
  });
}

export function AdminPanel({ initialCatalog, store, placesReady }: AdminPanelProps) {
  const [catalog, setCatalog] = useState<readonly Restaurant[]>(initialCatalog);
  const [savedJson, setSavedJson] = useState<string>(() => JSON.stringify(initialCatalog));
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [adding, setAdding] = useState<Partial<Record<RegionId, AddState>>>({});
  const [warnings, setWarnings] = useState<Readonly<Record<string, readonly string[]>>>({});
  const [saving, setSaving] = useState<boolean>(false);
  const [notice, setNotice] = useState<Notice>(null);

  const dirty = useMemo(() => JSON.stringify(catalog) !== savedJson, [catalog, savedJson]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const toggleExpanded = (id: string, open?: boolean) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open ?? !next.has(id)) next.add(id);
      else next.delete(id);
      return next;
    });

  const update = (id: string, patch: Partial<Restaurant>, relink = false) =>
    setCatalog((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        return relink ? withMapLinks(next) : next;
      })
    );

  const remove = (restaurant: Restaurant) => {
    if (!window.confirm(`Remove ${restaurant.name || 'this restaurant'}? It disappears from the site after you save.`)) return;
    setCatalog((prev) => prev.filter((r) => r.id !== restaurant.id));
  };

  const setAdd = (region: RegionId, patch: Partial<AddState>) =>
    setAdding((prev) => ({ ...prev, [region]: { ...EMPTY_ADD, ...prev[region], ...patch } }));

  const addFromGoogle = async (region: RegionId) => {
    const link = adding[region]?.link.trim() ?? '';
    if (!link) {
      setAdd(region, { error: 'Paste a Google Maps link first.' });
      return;
    }
    setAdd(region, { loading: true, error: null });
    try {
      const res = await fetch('/api/admin/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link, region, takenIds: catalog.map((r) => r.id) }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        restaurant?: Restaurant;
        warnings?: string[];
      };
      if (!res.ok || !data.ok || !data.restaurant) {
        setAdd(region, { loading: false, error: data.error ?? 'Lookup failed.' });
        return;
      }
      const added = data.restaurant;
      setCatalog((prev) => [...prev, added]);
      setWarnings((prev) => ({ ...prev, [added.id]: data.warnings ?? [] }));
      toggleExpanded(added.id, true);
      setAdd(region, { link: '', loading: false, error: null });
    } catch {
      setAdd(region, { loading: false, error: 'Network error while contacting Google.' });
    }
  };

  const addBlank = (region: RegionId) => {
    const id = uniqueRestaurantId(
      catalog.map((r) => r.id),
      `new-${region}-restaurant`
    );
    setCatalog((prev) => [...prev, blankRestaurant(id, region)]);
    toggleExpanded(id, true);
  };

  const save = async () => {
    const checked = validateCatalog(catalog);
    if (!checked.ok) {
      setNotice({ kind: 'error', lines: checked.errors });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalog: checked.catalog }),
      });
      const data = (await res.json()) as { ok?: boolean; errors?: string[]; catalog?: Restaurant[] };
      if (!res.ok || !data.ok || !data.catalog) {
        setNotice({ kind: 'error', lines: data.errors ?? ['Saving failed.'] });
        return;
      }
      setCatalog(data.catalog);
      setSavedJson(JSON.stringify(data.catalog));
      setWarnings({});
      setNotice({ kind: 'success', lines: ['Saved. The site now shows these restaurants.'] });
    } catch {
      setNotice({ kind: 'error', lines: ['Network error while saving.'] });
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (!window.confirm('Discard all unsaved changes?')) return;
    setCatalog(JSON.parse(savedJson) as Restaurant[]);
    setWarnings({});
    setNotice(null);
  };

  return (
    <main className="min-h-dvh bg-gradient-to-br from-[var(--page-from)] via-[var(--page-via)] to-[var(--page-to)] text-white">
      {/* Sticky toolbar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[var(--page-bg)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">Restaurant Admin</h1>
            <p className="text-[11px] sm:text-xs text-rose-200/80">{store.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-bold text-rose-100 hover:bg-white/15"
            >
              View site <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {dirty && (
              <button
                type="button"
                onClick={discard}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-bold text-rose-100 hover:bg-white/15 cursor-pointer"
              >
                <Undo2 className="h-3.5 w-3.5" /> Discard
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving || !store.writable}
              className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {!placesReady && (
          <p className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Auto-fill from Google Maps links is off: set <code className="font-mono">SERPAPI_API_KEY</code> on the
            server. You can still add restaurants manually.
          </p>
        )}

        {notice && (
          <div
            role={notice.kind === 'error' ? 'alert' : 'status'}
            className={`rounded-2xl border px-4 py-3 text-sm ${
              notice.kind === 'error'
                ? 'border-rose-500/50 bg-rose-950/70 text-rose-100'
                : 'border-emerald-400/40 bg-emerald-950/60 text-emerald-100'
            }`}
          >
            {notice.lines.length === 1 ? (
              notice.lines[0]
            ) : (
              <ul className="list-disc space-y-1 pl-5">
                {notice.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {REGION_ORDER.map((region) => {
          const meta = REGIONS[region];
          const list = catalog.filter((r) => r.region === region);
          const addState = adding[region] ?? EMPTY_ADD;
          const full = list.length >= MAX_RESTAURANTS_PER_REGION;
          return (
            <section
              key={region}
              aria-labelledby={`region-${region}`}
              className="rounded-3xl border border-white/10 bg-[var(--surface-card)]/90 p-4 sm:p-5 shadow-xl"
            >
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={`region-${region}`} className="text-base sm:text-lg font-extrabold">
                  {meta.name}
                </h2>
                <span className={`text-xs font-bold ${full ? 'text-amber-300' : 'text-rose-200/80'}`}>
                  {list.length} / {MAX_RESTAURANTS_PER_REGION} restaurants
                </span>
              </div>

              <ul className="space-y-3">
                {list.map((restaurant) => (
                  <RestaurantRow
                    key={restaurant.id}
                    restaurant={restaurant}
                    open={expanded.has(restaurant.id)}
                    warnings={warnings[restaurant.id] ?? []}
                    canRemove={list.length > 1}
                    onToggle={() => toggleExpanded(restaurant.id)}
                    onWantToTry={(on) => setCatalog((prev) => setWantsToTry(prev, restaurant.id, on))}
                    onRemove={() => remove(restaurant)}
                    onChange={(patch, relink) => update(restaurant.id, patch, relink)}
                  />
                ))}
              </ul>

              {full ? (
                <p className="mt-3 text-xs text-rose-200/70">
                  This region is full. Remove a restaurant to add another.
                </p>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-white/20 p-3">
                  <label htmlFor={`add-${region}`} className="mb-1.5 block text-xs font-bold text-rose-100">
                    Add a restaurant: paste its Google Maps link
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      id={`add-${region}`}
                      type="url"
                      inputMode="url"
                      value={addState.link}
                      disabled={!placesReady || addState.loading}
                      onChange={(e) => setAdd(region, { link: e.target.value, error: null })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void addFromGoogle(region);
                        }
                      }}
                      placeholder="https://maps.app.goo.gl/…"
                      className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm placeholder:text-rose-200/40 focus:border-rose-400 focus:outline-none disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => void addFromGoogle(region)}
                      disabled={!placesReady || addState.loading}
                      className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-2 text-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {addState.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {addState.loading ? 'Fetching…' : 'Fetch details'}
                    </button>
                  </div>
                  {addState.error && (
                    <p role="alert" className="mt-2 text-xs font-semibold text-rose-300">
                      {addState.error}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => addBlank(region)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-200/80 underline-offset-2 hover:underline cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Or add one manually
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* One restaurant: summary row + editor                                */
/* ------------------------------------------------------------------ */

function RestaurantRow({
  restaurant,
  open,
  warnings,
  canRemove,
  onToggle,
  onWantToTry,
  onRemove,
  onChange,
}: {
  readonly restaurant: Restaurant;
  readonly open: boolean;
  readonly warnings: readonly string[];
  readonly canRemove: boolean;
  readonly onToggle: () => void;
  readonly onWantToTry: (on: boolean) => void;
  readonly onRemove: () => void;
  readonly onChange: (patch: Partial<Restaurant>, relink?: boolean) => void;
}) {
  const pick = Boolean(restaurant.hostWantsToTry);
  const thumb = restaurant.photos[0]?.url;
  return (
    <li
      className={`rounded-2xl border bg-black/20 ${pick ? 'border-amber-400/70 shadow-[0_0_24px_rgba(251,191,36,0.18)]' : 'border-white/10'}`}
    >
      <div className="flex flex-wrap items-center gap-3 p-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/5">
          {thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">
            {restaurant.name || <span className="text-rose-200/60">Unnamed restaurant</span>}
            {restaurant.chineseName && <span className="ml-1.5 font-normal text-rose-200">{restaurant.chineseName}</span>}
          </p>
          <p className="truncate text-xs text-rose-100/75">
            {[restaurant.cuisine, restaurant.rating ? `★ ${restaurant.rating} (${restaurant.reviewCount})` : '', restaurant.priceRange]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className="truncate text-[11px] text-rose-200/60">{restaurant.address}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={pick}
            onClick={() => onWantToTry(!pick)}
            title="Shown as the gold pick: first on mobile, in the middle on desktop"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold cursor-pointer transition-colors ${
              pick ? 'btn-gold' : 'border border-white/15 bg-white/5 text-rose-100 hover:bg-white/15'
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${pick ? 'fill-current' : ''}`} />
            I want to try
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-rose-100 hover:bg-white/15 cursor-pointer"
          >
            {open ? 'Close' : 'Edit'}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={!canRemove}
            title={canRemove ? 'Remove restaurant' : 'Each region needs at least one restaurant'}
            aria-label={`Remove ${restaurant.name || 'restaurant'}`}
            className="grid h-8 w-8 place-items-center rounded-full border border-rose-400/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/25 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {warnings.length > 0 && (
        <ul className="mx-3 mb-3 list-disc space-y-0.5 rounded-xl border border-amber-400/40 bg-amber-500/10 py-2 pl-7 pr-3 text-xs text-amber-100">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      {open && <RestaurantEditor restaurant={restaurant} onChange={onChange} />}
    </li>
  );
}

const inputClass =
  'w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-rose-200/40 focus:border-rose-400 focus:outline-none';

function Field({
  label,
  hint,
  className = '',
  children,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly className?: string;
  readonly children: React.ReactElement<{ id?: string }>;
}) {
  const id = React.useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-rose-200/80">
        {label}
      </label>
      {React.cloneElement(children, { id })}
      {hint && <p className="mt-1 text-[11px] text-rose-200/55">{hint}</p>}
    </div>
  );
}

/** Number input that commits on blur, so typing "1.4" isn't cut short at "1.". */
function NumberInput({
  id,
  value,
  step,
  onCommit,
}: {
  readonly id?: string;
  readonly value: number;
  readonly step: string;
  readonly onCommit: (value: number) => void;
}) {
  const [text, setText] = useState<string>(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      step={step}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const n = Number(text);
        if (Number.isFinite(n)) onCommit(n);
        else setText(String(value));
      }}
      className={inputClass}
    />
  );
}

function RestaurantEditor({
  restaurant: r,
  onChange,
}: {
  readonly restaurant: Restaurant;
  readonly onChange: (patch: Partial<Restaurant>, relink?: boolean) => void;
}) {
  const [newPhoto, setNewPhoto] = useState<string>('');
  const text = (key: keyof Restaurant, relink = false) => ({
    value: String(r[key] ?? ''),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ [key]: e.target.value } as Partial<Restaurant>, relink),
    className: inputClass,
  });
  const setPhotos = (photos: readonly RestaurantPhoto[]) => onChange({ photos });

  return (
    <div className="space-y-4 border-t border-white/10 p-3 sm:p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <input {...text('name', true)} />
        </Field>
        <Field label="Chinese name (optional)">
          <input {...text('chineseName')} />
        </Field>
        <Field label="Cuisine badge" hint="Short label shown on the card, e.g. “Homestyle Nanyang & Claypot Zi Char”">
          <input {...text('cuisine')} />
        </Field>
        <Field label="Area" hint="Shown above the name, e.g. “Woodlands Ave 1 · Woodlands”">
          <input {...text('areaName')} />
        </Field>
        <Field label="Google category">
          <input {...text('googleCategory')} />
        </Field>
        <Field label="Price range" hint="e.g. $10–20">
          <input {...text('priceRange')} />
        </Field>
        <Field label="Rating (0–5)">
          <NumberInput value={r.rating} step="0.1" onCommit={(rating) => onChange({ rating })} />
        </Field>
        <Field label="Review count">
          <NumberInput value={r.reviewCount} step="1" onCommit={(reviewCount) => onChange({ reviewCount: Math.round(reviewCount) })} />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <input {...text('address', true)} />
        </Field>
        <Field label="Postal code">
          <input {...text('postalCode')} inputMode="numeric" />
        </Field>
        <Field label="Phone">
          <input {...text('phone')} type="tel" />
        </Field>
        <Field label="Opening hours" hint="Format: Daily 11:00 am – 9:30 pm (separate split shifts with a comma)" className="sm:col-span-2">
          <input {...text('hours')} />
        </Field>
        <Field label="Latitude">
          <NumberInput value={r.coordinates.lat} step="any" onCommit={(lat) => onChange({ coordinates: { ...r.coordinates, lat } }, true)} />
        </Field>
        <Field label="Longitude">
          <NumberInput value={r.coordinates.lng} step="any" onCommit={(lng) => onChange({ coordinates: { ...r.coordinates, lng } }, true)} />
        </Field>
        <Field label="Website">
          <input {...text('websiteUrl')} type="url" />
        </Field>
        <Field label="Service tag" hint="Small line under the phone number">
          <input {...text('serviceTag')} />
        </Field>
        <Field label="Description" hint="Used in the email Zi Ren receives" className="sm:col-span-2">
          <textarea {...text('description')} rows={3} />
        </Field>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-rose-200/80">
          Photos ({r.photos.length}) · the card shows the first three
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {r.photos.map((photo, index) => (
            <li key={`${photo.url}-${index}`} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" referrerPolicy="no-referrer" className="h-12 w-16 shrink-0 rounded-lg bg-white/5 object-cover" />
              <input
                aria-label={`Caption for photo ${index + 1}`}
                value={photo.caption}
                onChange={(e) => setPhotos(r.photos.map((p, i) => (i === index ? { ...p, caption: e.target.value } : p)))}
                className={`${inputClass} py-1.5 text-xs`}
              />
              <button
                type="button"
                aria-label={`Remove photo ${index + 1}`}
                onClick={() => setPhotos(r.photos.filter((_, i) => i !== index))}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-rose-300 hover:bg-rose-500/20 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-2">
          <input
            type="url"
            aria-label="New photo link"
            value={newPhoto}
            onChange={(e) => setNewPhoto(e.target.value)}
            placeholder="Paste a photo link (https://…)"
            className={`${inputClass} text-xs`}
          />
          <button
            type="button"
            disabled={!/^https:\/\//.test(newPhoto.trim())}
            onClick={() => {
              setPhotos([...r.photos, { url: newPhoto.trim(), caption: r.name }]);
              setNewPhoto('');
            }}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-rose-100 hover:bg-white/15 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <Plus className="h-3.5 w-3.5" /> Add photo
          </button>
        </div>
      </div>
    </div>
  );
}
