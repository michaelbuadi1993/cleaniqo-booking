import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { PROPERTY_TYPES, computeQuote, addonsFor, INCLUDED_NOTE, money, formatEta, validateUkPhone, validateUkPostcode } from './pricing.js';
import { api, WHATSAPP_URL } from './api.js';

/*
 * The booking page, one question per screen (owner, 26 Oct 2026: "super simplified", "headache free").
 * One-off cleans and specialist cleans (carpets, sofas, ovens…) are booked and paid here as before
 * (lead → Stripe → webhook). Regular cleaners and Airbnb turnovers leave their details for a call back,
 * or go straight to WhatsApp. Prices come from pricing.js; the server re-prices and refuses any difference.
 */

// Broadcast the app's rendered height to the parent window so the embedding iframe (Webflow) can grow and
// shrink with the content. Safe no-op if not embedded or if the parent doesn't listen.
function useBroadcastHeight() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const send = () => {
      try {
        const h = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0);
        window.parent?.postMessage({ type: 'cleaniqo:booking-height', height: h }, '*');
      } catch (_) { /* ignore */ }
    };
    send();
    const ro = new ResizeObserver(send);
    ro.observe(document.body);
    window.addEventListener('load', send);
    const interval = setInterval(send, 750);
    return () => { ro.disconnect(); window.removeEventListener('load', send); clearInterval(interval); };
  }, []);
}

// Simple line icons (24px grid).
const ICONS = {
  home: 'M4 20h16M6 20V9l6-5 6 5v11M10 20v-5h4v5',
  sofa: 'M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M2 12a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2zM5 17v2M19 17v2',
  plan: 'M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5',
  key: 'M7.5 20a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM10.7 12.3 21 2M17 6l3 3M15 8l2 2',
  deep: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z',
  box: 'M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8',
  carpet: 'M4 5h16v14H4zM4 9h16M4 15h16',
  oven: 'M4 4h16v16H4zM4 9h16M8 13h8v4H8z',
  window: 'M4 3h16v18H4zM12 3v18M4 12h16',
  fridge: 'M6 2h12v20H6zM6 10h12M9 5v2M9 13v3',
  curtain: 'M3 3h18M6 3v18c2-3 3-8 3-18M18 3v18c-2-3-3-8-3-18',
  stairs: 'M3 21h5v-5h5v-5h5V6h3',
  eco: 'M11 20A7 7 0 0 1 4 13c0-6 7-9 16-9 0 9-3 16-9 16zM4 20l7-7',
  leaf: 'M12 22V12M12 12C12 7 8 4 3 4c0 5 3 8 9 8zM12 12c0-4 3-7 9-7 0 4-3 7-9 7',
  garage: 'M3 21V9l9-6 9 6v12M7 21v-8h10v8M7 17h10',
  me: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 21v-1a6 6 0 0 1 12 0v1',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  door: 'M6 21V3h12v18M14 12h.01',
  any: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM16 11a3 3 0 1 0 0-6M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M17 15a4 4 0 0 1 4 4v2',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  camera: 'M4 7h3l2-3h6l2 3h3v13H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  calendar: 'M4 5h16v16H4zM4 10h16M8 3v4M16 3v4',
  paw: 'M7 9.5a1.5 2 0 1 0 3 0 1.5 2 0 1 0-3 0zM14 9.5a1.5 2 0 1 0 3 0 1.5 2 0 1 0-3 0zM4 13.5a1.5 1.8 0 1 0 3 0 1.5 1.8 0 1 0-3 0zM17 13.5a1.5 1.8 0 1 0 3 0 1.5 1.8 0 1 0-3 0zM8 19c0-2.5 1.8-4.5 4-4.5s4 2 4 4.5c0 1.2-1 1.5-2 1.5h-4c-1 0-2-.3-2-1.5z',
  none: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8',
};
const TILE_ICON = { oven: 'oven', fridge: 'fridge', upholstery: 'sofa', carpet: 'carpet', curtains: 'curtain', windows: 'window', outdoor: 'leaf', stairs: 'stairs', garage: 'garage', eco: 'eco' };
const TILE_SHORT = { upholstery: 'Sofa & armchairs', carpet: 'Carpets', curtains: 'Curtains', windows: 'Outside windows', outdoor: 'Balcony or garden', garage: 'Garage', eco: 'Eco products', stairs: 'Stairs', oven: 'Oven', fridge: 'Fridge' };
const SIZE_SHORT = { house_share: 'Room in a share', studio: 'Studio', one_bed: '1 bed', two_bed: '2 beds', three_bed: '3 beds', four_bed: '4 beds', five_bed: '5 beds', six_bed: '6 beds' };
const KIND_NAME = { regular: 'Regular clean', deep: 'Deep clean', end_of_tenancy: 'Moving-out clean', specialist: 'Specialist clean' };
const ACCESS = { home: 'I’ll be in', keysafe: 'Key safe', concierge: 'Concierge or neighbour', other: 'Something else' };
const NOTE_Q = { keysafe: 'Where’s the key safe?', concierge: 'Who has the key?', other: 'How do we get in?' };
const NOTE_PH = { keysafe: 'Where it is, and the code', concierge: 'Name or flat number', other: 'Tell us how' };
const LEVEL_TEXT = { moderate: 'Moderately dirty', heavy: 'Heavily soiled' };
const PREF = { any: 'Don’t mind', female: 'Female', male: 'Male' };
const PETS = { none: 'No pets', dog: 'Dog', cat: 'Cat', other: 'Other pets' };
const petText = (p) => ['dog', 'cat', 'other'].filter((k) => p[k]).map((k) => PETS[k].toLowerCase()).join(', ');
const TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
const MAX_PHOTOS = 6;
const SAVED = 'cleaniqo:booking';

const INITIAL = {
  path: '', i: 0, service: '', size: '', baths: 0, on: {}, addons: {}, day: '', time: '', postcode: '', address: '', borough: '',
  access: '', accessNote: '', pref: '', pets: {}, firstName: '', lastName: '', name: '', phone: '', email: '', terms: false,
  leadId: null, token: null, photosSent: 0, ph: null, link: null, linkExpired: false, addrSet: false, disc: null,
};

// Today's date in London, then the next days as YYYY-MM-DD.
function londonDays(from, n) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
  const base = new Date(`${today}T12:00:00Z`);
  return Array.from({ length: n }, (_, k) => {
    const d = new Date(base.getTime() + (from + k) * 864e5);
    return d.toISOString().slice(0, 10);
  });
}
const dayName = (iso, opts) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', ...opts });

function Icon({ name, size = 36 }) {
  return (
    <svg className="ic" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

function Tile({ icon, label, sub, on, multi, onClick, className = '' }) {
  return (
    <button type="button" className={`tile${icon ? '' : ' num'} ${className}`} aria-pressed={on ? 'true' : 'false'} onClick={onClick}>
      {multi && on && <span className="ck" aria-hidden="true">✓</span>}
      {icon && <Icon name={icon} />}
      <span className="tt">{label}</span>
      {sub && <span className="ts">{sub}</span>}
    </button>
  );
}

// Photos are made smaller in the browser (longest side 1600 px, JPEG) before they're sent: quicker on a phone, and
// iPhone HEIC photos arrive as JPEG. Returns null when the browser can't read the file.
async function shrink(file) {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.82));
    if (!blob) throw new Error('no blob');
    return new File([blob], (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch (_) {
    return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 5 * 1024 * 1024 ? file : null;
  }
}

function readSaved() {
  try { return JSON.parse(sessionStorage.getItem(SAVED) || 'null'); } catch (_) { return null; }
}
function writeSaved(s) {
  try { sessionStorage.setItem(SAVED, JSON.stringify(s)); } catch (_) { /* private mode: fine */ }
}
function clearSaved() {
  try { sessionStorage.removeItem(SAVED); } catch (_) { /* ignore */ }
}

export default function App() {
  useBroadcastHeight();
  const params = new URLSearchParams(window.location.search);
  const paid = params.get('success') === '1';
  const cancelled = params.get('cancelled') === '1';

  // Back from Stripe without paying: put them back on the last screen with everything as they left it.
  const [s, setS] = useState(() => {
    if (cancelled) { const saved = readSaved(); if (saved) return { ...INITIAL, ...saved }; }
    return INITIAL;
  });
  const [photos, setPhotos] = useState([]);           // { file, url }
  const [photoMsg, setPhotoMsg] = useState('');
  const [addr, setAddr] = useState({ loading: false, error: '', list: [], manual: false });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(paid ? 'booked' : '');
  const [moreDates, setMoreDates] = useState(false);
  const h1 = useRef(null);

  useEffect(() => { if (paid) clearSaved(); }, [paid]);

  // A booking link from our team (061): the clean is already chosen, so open on "Your details".
  const linkToken = params.get('link');
  const [linkNote, setLinkNote] = useState('');
  const [linkLoading, setLinkLoading] = useState(!!linkToken && !cancelled && !paid);
  useEffect(() => {
    if (!linkToken || cancelled || paid) return;
    let off = false;
    api.bookingLink(linkToken).then((r) => {
      if (off) return;
      const p = r.prefill || {};
      const service = p.service;
      const addons = p.addons && typeof p.addons === 'object' ? p.addons : {};
      const on = {};
      addonsFor(service).forEach((t) => { if (t.options.some((o) => addons[o.key] > 0)) on[t.id] = true; });
      setS((x) => ({
        ...x, path: service === 'specialist' ? 'spec' : 'home', service: service === 'specialist' ? '' : service, size: p.size || '', baths: Number(p.baths) || 1,
        on, addons, day: r.expired ? '' : (p.day || ''), time: r.expired ? '' : (p.time || ''), postcode: p.postcode || '', address: p.address || '',
        access: p.access || 'home', accessNote: p.accessNote || '', pref: p.pref || 'any', pets: p.pets && typeof p.pets === 'object' ? p.pets : {},
        firstName: r.customer?.firstName || '', lastName: r.customer?.lastName || '', phone: r.customer?.phone || '', email: r.customer?.email || '',
        link: linkToken, linkExpired: !!r.expired, addrSet: !!(p.postcode && p.address), i: 0,
      }));
      setLinkNote('');
    }).catch((e) => { if (!off) setLinkNote(e.message || 'This booking link isn’t working. You can book below, or message us on WhatsApp.'); })
      .finally(() => { if (!off) setLinkLoading(false); });
    return () => { off = true; };
  }, [linkToken]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), []);   // eslint-disable-line react-hooks/exhaustive-deps

  // Anything changed after a quote was made means a fresh quote when they book.
  const set = (patch) => setS((x) => ({ ...x, ...patch, leadId: null, token: null, photosSent: 0 }));
  const go = (patch) => setS((x) => ({ ...x, ...(patch || {}), i: x.i + 1, ...(patch ? { leadId: null, token: null, photosSent: 0 } : {}) }));
  // On the one-page booking from a link, picking the address just fills it in on the same page.
  const afterAddress = (patch) => (s.link ? set({ ...patch, addrSet: true }) : go(patch));
  const back = () => { setError(''); setS((x) => ({ ...x, i: Math.max(0, x.i - 1) })); };

  const booking = s.path === 'home' || s.path === 'spec';
  const service = s.path === 'spec' ? 'specialist' : s.service;
  const tiles = useMemo(() => (service ? addonsFor(service) : []), [service]);
  const onTiles = tiles.filter((t) => s.on[t.id]);
  const needsQty = onTiles.some((t) => t.pick);
  const quote = useMemo(() => computeQuote({ service, propertyType: s.size, extraBathrooms: Math.min(Math.max(s.baths - 1, 0), 4), addons: s.addons }), [service, s.size, s.baths, s.addons]);

  // The provisional photo price (060): the same percentage the server applies, on the price-list price before add-ons.
  const photoExtra = s.ph && s.ph.pct > 0 && service !== 'specialist' ? Math.round((quote.base + quote.bathSurcharge) * s.ph.pct) / 100 : 0;
  // A discount code (062) comes off the clean and its extras (not the photo price), never below zero; the server
  // works it out the same way and checks it again when they book.
  const discAmount = s.disc ? +Math.min(Math.max(s.disc.kind === 'percent' ? quote.total * s.disc.value / 100 : s.disc.value, 0), quote.total).toFixed(2) : 0;
  const total = Math.round((quote.total - discAmount + photoExtra) * 100) / 100;

  // Over about 4 hours for one cleaner, we may send a team (owner, 26 Oct 2026: "for specific jobs we may send a team").
  const bigJob = !!quote.etaOne && quote.etaOne[1] > 4;

  const screens = useMemo(() => {
    if (done) return ['done'];
    if (s.link) return ['linkpage'];   // a booking link from our team: everything on one page (owner, 26 Oct 2026)
    const end = ['day', 'time', 'postcode', 'access', ...(s.access && s.access !== 'home' ? ['note'] : []), 'pref', 'pets', 'photos', ...(s.ph && s.ph.priced ? ['photoresult'] : []), 'details', 'review'];
    if (s.path === 'home') return ['start', 'kind', 'size', 'baths', 'extras', ...(needsQty ? ['qty'] : []), ...end];
    if (s.path === 'spec') return ['start', 'spec', ...(needsQty ? ['qty'] : []), ...end];
    if (s.path === 'regular' || s.path === 'turnover') return ['start', 'callback'];
    return ['start'];
  }, [done, s.path, s.access, needsQty, s.ph, s.link]);
  const cur = linkLoading ? 'loading' : screens[Math.min(s.i, screens.length - 1)];

  useEffect(() => {
    try { window.scrollTo({ top: 0 }); } catch (_) { /* ignore */ }
    h1.current?.focus({ preventScroll: true });
    window.parent?.postMessage({ type: 'cleaniqo:booking-step', step: cur }, '*');
  }, [cur]);

  // ── add-ons ───────────────────────────────────────────────────────────────
  const toggleTile = (t) => {
    const addons = { ...s.addons };
    const on = { ...s.on };
    t.options.forEach((o) => { delete addons[o.key]; });
    if (on[t.id]) delete on[t.id];
    else {
      on[t.id] = true;
      // On/off and "pick one" start on the first option; a single counted option starts at 1;
      // several counted options (armchair, 2-seater…) start empty and are chosen on the next screen.
      if (!t.pick || t.pick === 'one' || t.options.length === 1) addons[t.options[0].key] = 1;
    }
    set({ on, addons });
  };
  const tileFrom = (t) => {
    const p = Math.min(...t.options.map((o) => o.price));
    if (t.options.length > 1) return `from ${money(p)}`;
    return t.pick === 'count' ? `${money(p)} each` : money(p);
  };
  const qtyOk = onTiles.every((t) => t.options.some((o) => (s.addons[o.key] || 0) > 0));

  // ── address ───────────────────────────────────────────────────────────────
  const pc = validateUkPostcode(s.postcode);
  const findAddress = async () => {
    if (!pc.ok) return;
    setS((x) => ({ ...x, postcode: pc.value }));   // always shown in full, e.g. SE5 8JA
    setAddr({ loading: true, error: '', list: [], manual: false });
    try {
      const data = await api.lookupAddresses(pc.value.replace(/\s+/g, ''));
      const list = Array.isArray(data?.addresses) ? data.addresses : [];
      setAddr({ loading: false, error: list.length ? '' : 'We couldn’t find addresses for that postcode. Type yours instead.', list, manual: !list.length });
    } catch (_) {
      setAddr({ loading: false, error: 'Address search isn’t working just now. Type your address instead.', list: [], manual: true });
    }
  };

  // ── photos ────────────────────────────────────────────────────────────────
  const addPhotos = async (files) => {
    const picked = Array.from(files || []).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    const room = MAX_PHOTOS - photos.length;
    const out = [];
    for (const f of picked.slice(0, room)) { const small = await shrink(f); if (small) out.push(small); }
    const skipped = Array.from(files || []).length - out.length;
    setPhotoMsg(skipped > 0 ? (picked.length > room ? `Up to ${MAX_PHOTOS} photos.` : 'Some files couldn’t be read. Try a JPEG or PNG photo.') : '');
    if (out.length) {
      setPhotos((p) => [...p, ...out.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
      set({ ph: null });
    }
  };
  const removePhoto = (k) => { setPhotos((p) => { URL.revokeObjectURL(p[k].url); return p.filter((_, j) => j !== k); }); set({ ph: null }); setPhotoMsg(''); };

  // Send the photos and, when the photo price is on, let Claude look at them before the customer goes on.
  const sendPhotos = async () => {
    setError('');
    try {
      setBusy('Sending your photos…');
      const sess = await api.photoSession({ service, propertyType: service === 'specialist' ? undefined : s.size,
        extraBathrooms: Math.min(Math.max(s.baths - 1, 0), 4), extras: quote.extrasLines.filter((l) => !l.key.endsWith('_minimum')).map((l) => ({ key: l.key, qty: l.qty })) });
      let sent = 0;
      for (let k = 0; k < photos.length; k += 1) {
        setBusy(`Sending your photos… ${k + 1} of ${photos.length}`);
        try { await api.uploadSessionPhoto(sess.sessionId, sess.token, photos[k].file); sent += 1; } catch (_) { /* skip this one */ }
      }
      let ph = { id: sess.sessionId, token: sess.token, sent, priced: false, level: null, pct: 0, reasons: [] };
      if (sess.priced && sent > 0) {
        setBusy('Looking at your photos…');
        const r = await api.checkPhotos(sess.sessionId, sess.token);
        ph = { ...ph, priced: !!r.priced, level: r.level, pct: Number(r.pct || 0), reasons: r.reasons || [] };
      }
      setBusy('');
      go({ ph });
    } catch (e) {
      setBusy('');
      setError(e.status === 503 ? 'Photos aren’t available just now. You can skip them.' : (e.message || 'Your photos couldn’t be sent. Try again, or skip them.'));
    }
  };

  // ── details ───────────────────────────────────────────────────────────────
  const phoneOk = validateUkPhone(s.phone).ok;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email.trim());
  const detailsOk = s.firstName.trim().length > 0 && s.lastName.trim().length > 0 && phoneOk && emailOk;
  const callbackOk = s.name.trim().length > 1 && phoneOk && pc.ok && (!s.email.trim() || emailOk);

  const sendCallback = async () => {
    setError(''); setBusy('Sending…');
    try {
      await api.callback({ kind: s.path, name: s.name.trim(), phone: validateUkPhone(s.phone).value, postcode: pc.value, email: s.email.trim() || null });
      setDone('callback');
      setS((x) => ({ ...x, i: 0 }));
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again, or message us on WhatsApp.');
    } finally { setBusy(''); }
  };

  // ── discount code ─────────────────────────────────────────────────────────
  const [codeIn, setCodeIn] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const choices = () => ({ service, ...(service === 'specialist' ? {} : { propertyType: s.size, extraBathrooms: Math.min(Math.max(s.baths - 1, 0), 4) }),
    extras: quote.extrasLines.filter((l) => !l.key.endsWith('_minimum')).map((l) => ({ key: l.key, qty: l.qty })) });
  const applyCode = async () => {
    const code = codeIn.trim().toUpperCase().replace(/\s+/g, '');
    if (!code) return;
    setCodeErr(''); setCodeBusy(true);
    try {
      const r = await api.discount({ code, ...choices() });
      set({ disc: { code: r.code, kind: r.kind, value: Number(r.value), label: r.label } });
      setCodeIn('');
    } catch (e) {
      setCodeErr(e.status === 400 ? (e.message || 'That code isn’t valid') : 'Codes can’t be checked just now. Try again in a moment.');
    } finally { setCodeBusy(false); }
  };
  const codeBox = (
    <div className="code">
      {s.disc ? (
        <div className="code__on">
          <span><b>{s.disc.code}</b> · {s.disc.label}</span>
          <span className="code__amt">−{money(discAmount)}</span>
          <button type="button" className="code__x" onClick={() => set({ disc: null })}>Remove</button>
        </div>
      ) : (
        <>
          <label className="lbl" htmlFor="code">Discount code <span className="opt-l">(optional)</span></label>
          <div className="code__row">
            <input id="code" className="inp inp--upper" value={codeIn} autoComplete="off" autoCapitalize="characters" spellCheck={false}
              onChange={(e) => { setCodeIn(e.target.value); setCodeErr(''); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCode(); } }} />
            <button type="button" className="code__apply" disabled={!codeIn.trim() || codeBusy} onClick={applyCode}>{codeBusy ? 'Checking…' : 'Apply'}</button>
          </div>
          {codeErr && <div className="err" role="alert">{codeErr}</div>}
        </>
      )}
    </div>
  );

  // The price lines, shown on the summary and on the one-page booking.
  const priceLines = () => {
    const lines = [];
    if (service !== 'specialist' && quote.base) lines.push([`${KIND_NAME[service]}, ${(SIZE_SHORT[s.size] || '').toLowerCase()}`, money(quote.base)]);
    if (quote.bathSurcharge) lines.push([`${Math.min(s.baths - 1, 4)} extra bathroom${s.baths > 2 ? 's' : ''}`, money(quote.bathSurcharge)]);
    quote.extrasLines.forEach((l) => lines.push([l.label, money(l.amount)]));
    if (discAmount > 0) lines.push([`Discount: ${s.disc.code}`, `−${money(discAmount)}`]);
    if (photoExtra > 0) lines.push([`From your photos: ${LEVEL_TEXT[s.ph.level].toLowerCase()} (provisional)`, money(photoExtra)]);
    return lines;
  };
  const sumBox = (
    <div className="sum">
      {priceLines().map(([k, v]) => <Fragment key={k}><span className="k">{k}</span><span className="v">{v}</span></Fragment>)}
      <span className="sum__total">Total</span><span className="v sum__total">{money(total)}</span>
    </div>
  );
  const termsBox = (
    <label className="tk">
      <input type="checkbox" checked={s.terms} onChange={(e) => setS((x) => ({ ...x, terms: e.target.checked }))} />
      <span>
        I agree to the <a href="https://cleaniqo.co.uk/terms" target="_top" rel="noreferrer">Terms</a> and{' '}
        <a href="https://cleaniqo.co.uk/privacy" target="_top" rel="noreferrer">Privacy Policy</a>, and to Cleaniqo contacting me about this booking by text, email, phone or WhatsApp.
      </span>
    </label>
  );

  const instructions = () => [
    s.access ? `Access: ${ACCESS[s.access]}${s.accessNote.trim() && s.access !== 'home' ? ` — ${s.accessNote.trim()}` : ''}` : '',
    s.pref && s.pref !== 'any' ? `Cleaner preference: ${s.pref}` : '',
    s.pets.none ? 'Pets: none' : petText(s.pets) ? `Pets: ${petText(s.pets)}` : '',
  ].filter(Boolean).join('\n') || null;

  const book = async () => {
    setError('');
    try {
      let { leadId, token } = s;
      let sent = s.photosSent;
      if (!leadId) {
        setBusy('Saving your booking…');
        const pt = PROPERTY_TYPES.find((p) => p.key === s.size);
        const lead = await api.createLead({
          firstName: s.firstName.trim(), lastName: s.lastName.trim(), email: s.email.trim().toLowerCase(), phone: validateUkPhone(s.phone).value,
          service, frequency: 'one_off',
          ...(service === 'specialist' ? {} : { propertyType: s.size, bedrooms: pt ? pt.bedrooms : 0, bathrooms: Math.max(s.baths, 1), extraBathrooms: Math.min(Math.max(s.baths - 1, 0), 4) }),
          extras: quote.extrasLines.filter((l) => !l.key.endsWith('_minimum')).map((l) => ({ key: l.key, qty: l.qty })),
          bookingDate: s.day, startTime: s.time, address: s.address.trim(), postcode: pc.value, borough: s.borough || undefined,
          cleanerPreference: s.pref || 'any', specialInstructions: instructions(),
          quote: { base: quote.base + quote.bathSurcharge, extras: quote.extras, total, discountPct: 0 },
          ...(s.disc ? { discountCode: s.disc.code } : {}),
          ...(s.ph ? { photoSessionId: s.ph.id, photoToken: s.ph.token } : {}),
          ...(s.link ? { bookingLink: s.link } : {}),
        });
        leadId = lead.id; token = lead.uploadToken;
        sent = s.ph ? s.ph.sent : 0;
        setS((x) => ({ ...x, leadId, token, photosSent: sent }));
      }
      setBusy('Opening secure payment…');
      writeSaved({ ...s, leadId, token, photosSent: sent, i: Math.max(0, screens.indexOf('review')) });
      const session = await api.createCheckout({
        leadId,
        successUrl: `${window.location.origin}/?success=1&lead=${leadId}`,
        cancelUrl: `${window.location.origin}/?cancelled=1&lead=${leadId}`,
      });
      if (session?.url) { (window.top || window).location.href = session.url; return; }
      setError('We couldn’t open the payment page. Please try again in a moment.');
    } catch (e) {
      if (s.disc && /code/i.test(e.message || '')) setS((x) => ({ ...x, disc: null }));
      setError(e.message || 'Something went wrong. Please try again.');
    }
    setBusy('');
  };

  // The postcode and address picker: its own screen on the form, and a section of the one-page booking.
  const addressPicker = (
    <>
      <label className="lbl" htmlFor="pc">Postcode</label>
      <input id="pc" className="inp inp--pc" value={s.postcode} placeholder="e.g. SE5 8JA" autoComplete="postal-code"
        onChange={(e) => { set({ postcode: e.target.value.toUpperCase(), address: '', borough: '' }); setAddr({ loading: false, error: '', list: [], manual: false }); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); findAddress(); } }} />
      {!addr.list.length && !addr.manual && (
        <button type="button" className="btn" disabled={!pc.ok || addr.loading} onClick={findAddress}>{addr.loading ? 'Looking…' : 'Find my address'}</button>
      )}
      {addr.error && <div className="msg msg--amber" role="status">{addr.error}</div>}
      {addr.list.length > 0 && (
        <div className="list" role="group" aria-label="Your address">
          {addr.list.map((a) => (
            <button type="button" key={a.full} onClick={() => afterAddress({ address: a.full, postcode: (validateUkPostcode(a.postcode).value || pc.value), borough: a.district || a.town || '' })}>
              {a.full}, {validateUkPostcode(a.postcode).value || pc.value}
            </button>
          ))}
          <button type="button" className="list__other" onClick={() => setAddr((x) => ({ ...x, list: [], manual: true }))}>It’s not here</button>
        </div>
      )}
      {addr.manual && (
        <>
          <label className="lbl" htmlFor="ad">First line of the address</label>
          <input id="ad" className="inp" value={s.address} placeholder="e.g. Flat 2, 14 Elm Road" autoComplete="address-line1" onChange={(e) => set({ address: e.target.value })} />
          <button type="button" className="btn" disabled={!pc.ok || s.address.trim().length < 4} onClick={() => afterAddress({ address: s.address.trim(), postcode: pc.value })}>Continue</button>
        </>
      )}
    </>
  );

  // ── screens ───────────────────────────────────────────────────────────────
  let q = '', sub = '', body = null;
  const days = londonDays(1, 8);
  switch (cur) {
    case 'start':
      q = 'What do you need?'; sub = 'Tap one';
      body = (
        <>
          {cancelled && !s.path && <div className="msg msg--amber">Payment cancelled. Nothing was taken.</div>}
          <div className="g2" role="group" aria-label={q}>
            <Tile icon="home" label="Clean my home" sub="One-off, deep or moving out" onClick={() => setS({ ...INITIAL, path: 'home', i: 1 })} />
            <Tile icon="sofa" label="Carpets, sofas, ovens & more" sub="On their own" onClick={() => setS({ ...INITIAL, path: 'spec', i: 1 })} />
            <Tile icon="plan" label="A regular cleaner" sub="Weekly or fortnightly" onClick={() => setS({ ...INITIAL, path: 'regular', i: 1 })} />
            <Tile icon="key" label="Airbnb turnovers" sub="For hosts" onClick={() => setS({ ...INITIAL, path: 'turnover', i: 1 })} />
          </div>
          <p className="note">Not sure? <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="wa-link">Ask us on WhatsApp</a></p>
        </>
      );
      break;
    case 'kind':
      q = 'What kind of clean?';
      body = (
        <div className="g3" role="group" aria-label={q}>
          {[['regular', 'Regular', 'home', 'from £60'], ['deep', 'Deep', 'deep', 'from £100'], ['end_of_tenancy', 'Moving out', 'box', 'from £120']].map(([k, l, ic, sb]) => (
            <Tile key={k} icon={ic} label={l} sub={sb} on={s.service === k}
              onClick={() => { const keep = addonsFor(k).map((t) => t.id); const on = {}; const addons = {};
                Object.keys(s.on).forEach((id) => { if (keep.includes(id)) on[id] = true; });
                addonsFor(k).forEach((t) => t.options.forEach((o) => { if (on[t.id] && s.addons[o.key]) addons[o.key] = s.addons[o.key]; }));
                go({ service: k, on, addons }); }} />
          ))}
        </div>
      );
      break;
    case 'size':
      q = 'How big is it?';
      body = (
        <div className="g2" role="group" aria-label={q}>
          {PROPERTY_TYPES.map((p) => <Tile key={p.key} label={SIZE_SHORT[p.key] || p.label} on={s.size === p.key} onClick={() => go({ size: p.key })} />)}
        </div>
      );
      break;
    case 'baths':
      q = 'How many bathrooms?'; sub = 'One is included';
      body = (
        <div className="gflex" style={{ '--cols': 5, '--pcols': 5 }} role="group" aria-label={q}>
          {[1, 2, 3, 4, 5].map((n) => <Tile key={n} label={n === 5 ? '5+' : String(n)} on={s.baths === n} onClick={() => go({ baths: n })} />)}
        </div>
      );
      break;
    case 'extras':
    case 'spec':
      q = cur === 'spec' ? 'What needs cleaning?' : 'Anything extra?';
      sub = cur === 'spec' ? 'Tap any' : (INCLUDED_NOTE[service] ? `Optional. ${INCLUDED_NOTE[service]}` : 'Optional. Tap any you’d like.');
      body = (
        <>
          <div className="gflex" style={{ '--cols': [3, 5, 6, 9].includes(tiles.length) ? 3 : 4 }} role="group" aria-label={q}>
            {tiles.map((t) => <Tile key={t.id} multi icon={TILE_ICON[t.id] || 'dots'} label={TILE_SHORT[t.id] || t.label} sub={tileFrom(t)} on={!!s.on[t.id]} onClick={() => toggleTile(t)} />)}
          </div>
          <button type="button" className="btn" disabled={cur === 'spec' && !onTiles.length} onClick={() => go()}>
            {cur === 'extras' && !onTiles.length ? 'No thanks' : 'Continue'}
          </button>
        </>
      );
      break;
    case 'qty':
      q = 'Which ones?';
      body = (
        <>
          {onTiles.filter((t) => t.pick).map((t) => (
            <fieldset key={t.id} className="qgroup">
              <legend>{TILE_SHORT[t.id] || t.label}</legend>
              {t.help && <p className="ts qhelp">{t.help}</p>}
              {t.pick === 'one' ? (
                <div className="g2">
                  {t.options.map((o) => (
                    <Tile key={o.key} label={o.label} sub={money(o.price)} on={(s.addons[o.key] || 0) > 0} className="opt"
                      onClick={() => { const addons = { ...s.addons }; t.options.forEach((x) => { delete addons[x.key]; }); addons[o.key] = 1; set({ addons }); }} />
                  ))}
                </div>
              ) : t.options.map((o) => {
                const n = s.addons[o.key] || 0;
                const min = t.options.length === 1 ? 1 : 0;
                const label = t.options.length === 1 ? `${o.label}` : o.label;
                const put = (v) => { const addons = { ...s.addons }; if (v > 0) addons[o.key] = v; else delete addons[o.key]; set({ addons }); };
                return (
                  <div className="qty" key={o.key}>
                    <span><b>{label}</b><span className="ts" style={{ display: 'block' }}>{money(o.price)} each</span></span>
                    <span className="stp">
                      <button type="button" aria-label={`Fewer: ${o.label}`} disabled={n <= min} onClick={() => put(Math.max(min, n - 1))}>−</button>
                      <span aria-live="polite">{n}</span>
                      <button type="button" aria-label={`More: ${o.label}`} disabled={n >= 20} onClick={() => put(Math.min(20, n + 1))}>+</button>
                    </span>
                  </div>
                );
              })}
            </fieldset>
          ))}
          <button type="button" className="btn" disabled={!qtyOk} onClick={() => go()}>Continue</button>
        </>
      );
      break;
    case 'day':
      q = 'Which day?';
      body = (
        <>
          <div className="g2" role="group" aria-label={q}>
            {days.map((d) => <Tile key={d} label={dayName(d, { weekday: 'short' })} sub={dayName(d, { day: 'numeric', month: 'short' })} on={s.day === d} onClick={() => go({ day: d })} />)}
          </div>
          {!moreDates && <button type="button" className="link" onClick={() => setMoreDates(true)}>Another date</button>}
          {moreDates && (
            <label className="lbl">Pick a date
              <input type="date" className="inp" min={days[0]} max={londonDays(1, 120).pop()} value={s.day && !days.includes(s.day) ? s.day : ''}
                onChange={(e) => e.target.value && go({ day: e.target.value })} />
            </label>
          )}
        </>
      );
      break;
    case 'time':
      q = 'What time?'; sub = 'When we arrive';
      body = (
        <div className="g3" role="group" aria-label={q}>
          {TIMES.map((t) => <Tile key={t} label={t} on={s.time === t} onClick={() => go({ time: t })} />)}
        </div>
      );
      break;
    case 'postcode':
      q = 'Where is it?'; sub = 'We clean across London';
      body = (
        addressPicker
      );
      break;
    case 'access':
      q = 'How will we get in?';
      body = (
        <div className="g2" role="group" aria-label={q}>
          {[['home', 'me'], ['keysafe', 'lock'], ['concierge', 'door'], ['other', 'dots']].map(([k, ic]) => (
            <Tile key={k} icon={ic} label={ACCESS[k]} on={s.access === k} onClick={() => go({ access: k, ...(k !== s.access ? { accessNote: '' } : {}) })} />
          ))}
        </div>
      );
      break;
    case 'note':
      q = NOTE_Q[s.access] || 'How do we get in?'; sub = 'Only your cleaner sees this';
      body = (
        <>
          <input className="inp" value={s.accessNote} placeholder={NOTE_PH[s.access] || ''} aria-label={q} onChange={(e) => set({ accessNote: e.target.value })} />
          <button type="button" className="btn" disabled={s.accessNote.trim().length < 3} onClick={() => go()}>Continue</button>
        </>
      );
      break;
    case 'pref':
      q = 'Any preference for your cleaner?';
      body = (
        <div className="g3" role="group" aria-label={q}>
          {[['any', 'any'], ['female', 'me'], ['male', 'me']].map(([k, ic]) => <Tile key={k} icon={ic} label={PREF[k]} on={s.pref === k} onClick={() => go({ pref: k })} />)}
        </div>
      );
      break;
    case 'pets': {
      q = 'Any pets at home?'; sub = 'So your cleaner knows before they arrive';
      const tap = (k) => set({ pets: k === 'none' ? (s.pets.none ? {} : { none: true }) : { ...s.pets, none: false, [k]: !s.pets[k] } });
      body = (
        <>
          <div className="g2" role="group" aria-label={q}>
            {[['none', 'none'], ['dog', 'paw'], ['cat', 'paw'], ['other', 'paw']].map(([k, ic]) => <Tile key={k} multi icon={ic} label={PETS[k]} on={!!s.pets[k]} onClick={() => tap(k)} />)}
          </div>
          <button type="button" className="btn" disabled={!s.pets.none && !petText(s.pets)} onClick={() => go()}>Continue</button>
        </>
      );
      break;
    }
    case 'photos':
      q = 'Anything that needs special care?'; sub = 'Photos of stubborn stains, delicate surfaces or hard-to-reach spots help us bring the right kit and allow enough time. Our team checks them, and only we see them.';
      body = (
        <>
          {photos.length === 0 ? (
            <div className="g2">
              <label className="tile">
                <input type="file" accept="image/*" multiple className="sr" onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
                <Icon name="camera" /><span className="tt">Add photos</span><span className="ts">Stains, delicate or hard-to-reach spots</span>
              </label>
              <Tile icon="arrow" label="Skip" sub="Nothing special" onClick={() => go({ ph: null })} />
            </div>
          ) : (
            <>
              <div className="thumbs">
                {photos.map((p, k) => (
                  <span className="thumb" key={p.url}>
                    <img src={p.url} alt={`Photo ${k + 1}`} />
                    <button type="button" aria-label={`Remove photo ${k + 1}`} onClick={() => removePhoto(k)}>×</button>
                  </span>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <label className="thumb thumb--add">
                    <input type="file" accept="image/*" multiple className="sr" onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
                    <span aria-hidden="true">+</span><span className="sr">Add more photos</span>
                  </label>
                )}
              </div>
              <button type="button" className="btn" disabled={!!busy} onClick={() => (s.ph && s.ph.sent === photos.length ? go() : sendPhotos())}>{busy || `Continue with ${photos.length} photo${photos.length === 1 ? '' : 's'}`}</button>
            </>
          )}
          {photoMsg && <div className="msg msg--amber" role="status">{photoMsg}</div>}
          {error && <div className="msg msg--red" role="alert">{error}</div>}
        </>
      );
      break;
    case 'photoresult': {
      const more = photoExtra > 0;
      q = more ? 'From your photos' : 'Thanks for the photos';
      sub = more ? 'Your home looks like it needs a bit more time than usual.' : 'Nothing unusual: no change to your price.';
      body = (
        <>
          <div className={`pres${more ? ' pres--more' : ''}`}>
            <div className="pres__top">
              <span className="pres__level">{more ? LEVEL_TEXT[s.ph.level] : 'As expected'}</span>
              <b className="pres__amt">{more ? `+${money(photoExtra)}` : money(0)}</b>
            </div>
            {more && s.ph.reasons.length > 0 && <ul className="pres__why">{s.ph.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
            <p className="pres__note">{more
              ? 'This is provisional. Our team checks your photos before the clean and can only lower it, never raise it. Your card is held, not charged, until the clean is done.'
              : 'Our team will still look at them, so your cleaner arrives with the right kit.'}</p>
          </div>
          <button type="button" className="btn" onClick={() => go()}>Continue</button>
        </>
      );
      break;
    }
    case 'details':
      q = 'Your details'; sub = 'For your confirmation and updates on the day';
      body = (
        <>
          <div className="row2">
            <label className="lbl">First name<input className="inp" value={s.firstName} autoComplete="given-name" onChange={(e) => set({ firstName: e.target.value })} /></label>
            <label className="lbl">Last name<input className="inp" value={s.lastName} autoComplete="family-name" onChange={(e) => set({ lastName: e.target.value })} /></label>
          </div>
          <label className="lbl">Mobile<input className="inp" type="tel" inputMode="tel" value={s.phone} placeholder="07123 456789" autoComplete="tel-national" onChange={(e) => set({ phone: e.target.value })} /></label>
          {s.phone.replace(/\s/g, '').length >= 11 && !phoneOk && <div className="err">{validateUkPhone(s.phone).error}</div>}
          <label className="lbl">Email<input className="inp" type="email" value={s.email} autoComplete="email" onChange={(e) => set({ email: e.target.value })} /></label>
          <button type="button" className="btn" disabled={!detailsOk} onClick={() => go()}>Continue</button>
        </>
      );
      break;
    case 'review': {
      q = 'All good?';
      const rows = [
        ['When', s.day ? `${dayName(s.day, { weekday: 'short', day: 'numeric', month: 'short' })}, ${s.time}` : ''],
        ['Where', `${s.address}, ${pc.value}`],
        ['Getting in', s.access === 'home' ? ACCESS.home : `${ACCESS[s.access]}: ${s.accessNote}`],
        ...(s.pref && s.pref !== 'any' ? [['Cleaner', PREF[s.pref]]] : []),
        ...(s.pets.none || petText(s.pets) ? [['Pets', s.pets.none ? 'None' : petText(s.pets).replace(/^./, (c) => c.toUpperCase())]] : []),
        ...(photos.length || s.photosSent ? [['Photos', `${photos.length || s.photosSent} for our team to check`]] : []),
      ];
      body = (
        <>
          {sumBox}
          {bigJob && <div className="msg msg--info">For a bigger job like this, we may send a team of cleaners so it’s finished sooner. The price stays the same.</div>}
          <dl className="sum sum--info">
            {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
          {codeBox}
          {termsBox}
          {error && <div className="msg msg--red" role="alert">{error}</div>}
          <button type="button" className="btn" disabled={!s.terms || !!busy} onClick={book}>{busy || `Book · ${money(total)}`}</button>
          <p className="note">Your card is held, not charged. You pay once the clean is done. Free to cancel up to 24 hours before.</p>
        </>
      );
      break;
    }
    case 'loading':
      q = 'Your booking'; sub = 'Just a moment…';
      break;
    case 'linkpage': {
      // One page (owner, 26 Oct 2026: "it shouldn't be too many pages i think it should be one, that also has a section
      // for discount codes too"): the clean as chosen with our team, then the few things only they can give, and pay.
      q = 'Your booking'; sub = 'We’ve filled this in from your chat with us. Check it, add your details and book.';
      const whenOk = !!s.day && !!s.time;
      const whereOk = s.addrSet && pc.ok && s.address.trim().length >= 4;
      const ready = whenOk && whereOk && detailsOk && s.terms;
      const missing = [!whenOk && 'a day and time', !whereOk && 'your address', !detailsOk && 'your details', !s.terms && 'the tick box'].filter(Boolean);
      const info = [
        ['Getting in', s.access === 'home' ? ACCESS.home : `${ACCESS[s.access]}${s.accessNote ? `: ${s.accessNote}` : ''}`],
        ...(s.pref && s.pref !== 'any' ? [['Cleaner', PREF[s.pref]]] : []),
        ...(s.pets.none || petText(s.pets) ? [['Pets', s.pets.none ? 'None' : petText(s.pets).replace(/^./, (c) => c.toUpperCase())]] : []),
      ];
      body = (
        <>
          <section className="sec" aria-labelledby="sec-clean">
            <h2 id="sec-clean">Your clean</h2>
            {sumBox}
            {bigJob && <div className="msg msg--info">For a bigger job like this, we may send a team of cleaners so it’s finished sooner. The price stays the same.</div>}
            <dl className="sum sum--info">{info.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
            <p className="note">Want to change the clean itself? <a className="wa-link" href={`${WHATSAPP_URL}?text=${encodeURIComponent('Hi, I’d like to change the booking you sent me.')}`} target="_blank" rel="noopener noreferrer">Message us on WhatsApp</a></p>
          </section>

          <section className="sec" aria-labelledby="sec-when">
            <h2 id="sec-when">When</h2>
            {s.linkExpired && <div className="msg msg--amber" role="status">This link has run out, so please choose a new day and time.</div>}
            {whenOk && !s.linkExpired ? (
              <div className="pick"><span>{dayName(s.day, { weekday: 'long', day: 'numeric', month: 'long' })}, {s.time}</span>
                <button type="button" className="pick__ch" onClick={() => set({ linkExpired: true })}>Change</button></div>
            ) : (
              <div className="row2">
                <label className="lbl">Day<input type="date" className="inp" min={days[0]} max={londonDays(1, 120).pop()} value={s.day} onChange={(e) => set({ day: e.target.value })} /></label>
                <label className="lbl">Start time<select className="inp" value={s.time} onChange={(e) => set({ time: e.target.value })}>
                  <option value="">Choose</option>{TIMES.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
              </div>
            )}
          </section>

          <section className="sec" aria-labelledby="sec-where">
            <h2 id="sec-where">Where</h2>
            {s.addrSet ? (
              <div className="pick"><span>{s.address}, {pc.value}</span>
                <button type="button" className="pick__ch" onClick={() => { set({ addrSet: false }); setAddr({ loading: false, error: '', list: [], manual: false }); }}>Change</button></div>
            ) : addressPicker}
          </section>

          <section className="sec" aria-labelledby="sec-you">
            <h2 id="sec-you">Your details</h2>
            <div className="row2">
              <label className="lbl">First name<input className="inp" value={s.firstName} autoComplete="given-name" onChange={(e) => set({ firstName: e.target.value })} /></label>
              <label className="lbl">Last name<input className="inp" value={s.lastName} autoComplete="family-name" onChange={(e) => set({ lastName: e.target.value })} /></label>
            </div>
            <label className="lbl">Mobile<input className="inp" type="tel" inputMode="tel" value={s.phone} placeholder="07123 456789" autoComplete="tel-national" onChange={(e) => set({ phone: e.target.value })} /></label>
            {s.phone.replace(/\s/g, '').length >= 11 && !phoneOk && <div className="err">{validateUkPhone(s.phone).error}</div>}
            <label className="lbl">Email<input className="inp" type="email" value={s.email} autoComplete="email" onChange={(e) => set({ email: e.target.value })} /></label>
          </section>

          <div className="sec">{codeBox}</div>

          <div className="sec sec--pay">
            <div className="paytotal"><span>Total</span><b>{money(total)}</b></div>
            {termsBox}
            {error && <div className="msg msg--red" role="alert">{error}</div>}
            <button type="button" className="btn" disabled={!ready || !!busy} onClick={book}>{busy || `Book · ${money(total)}`}</button>
            {!ready && !busy && <p className="note">Still needed: {missing.join(', ')}.</p>}
            <p className="note">Your card is held, not charged. You pay once the clean is done. Free to cancel up to 24 hours before.</p>
          </div>
        </>
      );
      break;
    }
    case 'callback': {
      const host = s.path === 'turnover';
      q = host ? 'Airbnb turnovers' : 'A regular cleaner';
      sub = 'Leave a few details and one of our team will call you. Or chat to us on WhatsApp straight away.';
      body = (
        <>
          <label className="lbl">Name<input className="inp" value={s.name} autoComplete="name" onChange={(e) => set({ name: e.target.value })} /></label>
          <label className="lbl">Mobile<input className="inp" type="tel" inputMode="tel" value={s.phone} placeholder="07123 456789" autoComplete="tel-national" onChange={(e) => set({ phone: e.target.value })} /></label>
          <label className="lbl">Postcode<input className="inp inp--upper" value={s.postcode} placeholder="e.g. SE5 8JA" autoComplete="postal-code" onChange={(e) => set({ postcode: e.target.value.toUpperCase() })} /></label>
          <label className="lbl">Email <span className="opt-l">(optional)</span><input className="inp" type="email" value={s.email} autoComplete="email" onChange={(e) => set({ email: e.target.value })} /></label>
          {error && <div className="msg msg--red" role="alert">{error}</div>}
          <button type="button" className="btn" disabled={!callbackOk || !!busy} onClick={sendCallback}>{busy || 'Call me back'}</button>
          <div className="or"><span className="note">or</span>
            <a className="wa" href={`${WHATSAPP_URL}?text=${encodeURIComponent(host ? 'Hi, I’d like to talk about Airbnb turnovers.' : 'Hi, I’d like a regular cleaner.')}`} target="_blank" rel="noopener noreferrer">Chat on WhatsApp now</a>
          </div>
        </>
      );
      break;
    }
    case 'done':
      q = done === 'booked' ? 'You’re booked!' : 'Thanks, we’ll call you';
      body = (
        <div className="done">
          <div className="done__tick" aria-hidden="true">✓</div>
          <p className="sub">
            {done === 'booked'
              ? 'We’ve emailed your confirmation. We’ll message you when your cleaner is on the way.'
              : 'A member of our team will call you, usually within one working day. Want to talk now? Message us on WhatsApp.'}
          </p>
          <a className="wa" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Message us on WhatsApp</a>
          <a className="link" href="/">Back to the start</a>
        </div>
      );
      break;
    default:
      break;
  }

  const showBar = booking && !done && quote.total > 0 && cur !== 'review' && cur !== 'linkpage' && cur !== 'loading';
  const progress = done ? 100 : screens.length > 1 ? Math.round(((s.i + 1) / screens.length) * 100) : 6;
  const eta = formatEta(quote.etaOne);

  return (
    <div className="app">
      <div className="wrap">
        <div className="top">
          {s.i > 0 && !done && !s.link ? <button type="button" className="backb" onClick={back}>‹ Back</button> : <span />}
          <img className="logo" src="/cleaniqo-logo.png" alt="Cleaniqo" />
          <span />
        </div>
        {!s.link && !linkLoading && <div className="pbar" role="progressbar" aria-label="Progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>}
        <h1 ref={h1} tabIndex={-1}>{q}</h1>
        {sub && <p className="sub">{sub}</p>}
        {linkNote && cur === 'start' && <div className="msg msg--info" role="status">{linkNote}</div>}
        {body}
      </div>
      {showBar && (
        <div className="bar">
          <div className="barin">
            <b>{money(total)}</b>
            <span>{eta && <>About {eta}{bigJob ? ' for one cleaner' : ''}<br /></>}Pay after the clean</span>
          </div>
        </div>
      )}
    </div>
  );
}
