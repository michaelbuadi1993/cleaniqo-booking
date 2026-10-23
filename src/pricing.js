// Cleaniqo pricing engine
// Source: Cleaniqo official price list (spreadsheet, Apr 2026)
// Services offered online: Regular, Deep, End of Tenancy
// Airbnb turnovers + recurring schedules are arranged over the phone.

export const SERVICES = [
  {
    key: 'regular',
    label: 'Regular Clean',
    short: 'Regular Clean',
    fromPrice: 60,
    desc: 'Standard cleaning service for maintaining your home',
  },
  {
    key: 'deep',
    label: 'Deep Clean',
    short: 'Deep Clean',
    fromPrice: 100,
    desc: 'Top-to-bottom clean — inside appliances, skirtings, detailed work',
  },
  {
    key: 'end_of_tenancy',
    label: 'End of Tenancy',
    short: 'End of Tenancy',
    fromPrice: 120,
    desc: 'Deposit-back standard, agent approved',
  },
];

// Property types offered by the form. `sizeKey` indexes the price/time tables below.
export const PROPERTY_TYPES = [
  { key: 'house_share', label: 'Bedroom in house share', sizeKey: 'share', bedrooms: 0    },
  { key: 'studio',      label: 'Studio',                 sizeKey: 'studio', bedrooms: 0   },
  { key: 'one_bed',     label: 'One Bedroom Property',   sizeKey: 'bed1', bedrooms: 1     },
  { key: 'two_bed',     label: 'Two Bedroom Property',   sizeKey: 'bed2', bedrooms: 2     },
  { key: 'three_bed',   label: 'Three Bedroom Property', sizeKey: 'bed3', bedrooms: 3     },
  { key: 'four_bed',    label: 'Four Bedroom Property',  sizeKey: 'bed4', bedrooms: 4     },
  { key: 'five_bed',    label: 'Five Bedroom Property',  sizeKey: 'bed5', bedrooms: 5     },
  { key: 'six_bed',     label: 'Six Bedroom Property',   sizeKey: 'bed6', bedrooms: 6     },
];

// Base prices by property size (one-off, in GBP)
// End of Tenancy is Deep + 20%.
export const BASE_PRICES = {
  regular: {
    share:  60,
    studio: 60,
    bed1:   70,
    bed2:   90,
    bed3:  110,
    bed4:  120,
    bed5:  150,
    bed6:  180,
  },
  deep: {
    share: 100,
    studio:130,
    bed1:  160,
    bed2:  200,
    bed3:  250,
    bed4:  340,
    bed5:  400,
    bed6:  650,
  },
  // End of Tenancy = Deep + 20% (owner, 23 Oct 2026; Cleaniqo price guide).
  // It includes the inside oven, fridge/freezer and stairs, which are add-ons on Deep.
  end_of_tenancy: {
    share: 120,
    studio:156,
    bed1:  192,
    bed2:  240,
    bed3:  300,
    bed4:  408,
    bed5:  480,
    bed6:  780,
  },
};

// Extra bathroom surcharges — stepped, not linear (as per price list).
// Keys = number of extra bathrooms beyond the one included with the property.
export const EXTRA_BATH_SURCHARGE = {
  regular:        { 0: 0, 1: 15, 2: 30, 3: 40, 4: 50 },
  deep:           { 0: 0, 1: 25, 2: 50, 3: 70, 4: 90 },
  end_of_tenancy: { 0: 0, 1: 25, 2: 50, 3: 70, 4: 90 },
};

// Estimated time of completion (in hours) for a SINGLE cleaner.
// Expressed as [minHours, maxHours]. Drives the sidebar ETA display.
export const ETA_ONE_CLEANER = {
  regular: {
    share:  [1,   1.5],
    studio: [1.5, 2],
    bed1:   [2,   2.5],
    bed2:   [2.5, 3],
    bed3:   [3,   3.5],
    bed4:   [4,   4.5],
    bed5:   [4.5, 5.5],
    bed6:   [5.5, 6],
  },
  deep: {
    share:  [2,   3],
    studio: [3,   4],
    bed1:   [4,   5],
    bed2:   [5,   6],
    bed3:   [6,   7.5],
    bed4:   [7.5, 9],
    bed5:   [9,   11],
    bed6:   [9,   11],
  },
  // End of Tenancy = Deep + 1.5 h (oven and fridge included).
  end_of_tenancy: {
    share:  [3.5, 4.5],
    studio: [4.5, 5.5],
    bed1:   [5.5, 6.5],
    bed2:   [6.5, 7.5],
    bed3:   [7.5, 9],
    bed4:   [9, 10.5],
    bed5:   [10.5, 12.5],
    bed6:   [10.5, 12.5],
  },
};

// ETA for TWO cleaners — only applies to Deep / End of Tenancy, studios and up.
// null = not offered for that size (e.g. a bedroom in a house share).
export const ETA_TWO_CLEANERS = {
  deep: {
    share:  null,
    studio: [1.5, 2.5],
    bed1:   [2,   2.5],
    bed2:   [2.5, 3.5],
    bed3:   [3,   4],
    bed4:   [4,   5],
    bed5:   [4.5, 6],
    bed6:   [6,   7.5],
  },
  end_of_tenancy: {
    share:  null,
    studio: [2.25, 3.25],
    bed1:   [2.75, 3.25],
    bed2:   [3.25, 4.25],
    bed3:   [3.75, 4.75],
    bed4:   [4.75, 5.75],
    bed5:   [5.25, 6.75],
    bed6:   [6.75, 8.25],
  },
};

// Extra bathroom time (1 cleaner, hours) — cumulative per count of extras.
export const EXTRA_BATH_TIME = {
  regular:        { 0: [0,0], 1: [0.45, 1],   2: [1.5, 1.75], 3: [2, 2.5],    4: [2.5, 3] },
  deep:           { 0: [0,0], 1: [1,    1.25],2: [2,   2.25], 3: [2.75, 3.25],4: [3.5, 4] },
  end_of_tenancy: { 0: [0,0], 1: [1,    1.25],2: [2,   2.25], 3: [2.75, 3.25],4: [3.5, 4] },
};

// ── Add-ons ─────────────────────────────────────────────────────────────────
// Same keys, prices and minutes as the dashboard's service_extras (migration 025).
// The server repeats this calculation and refuses a booking whose total differs.
// Each tile is ticked on; `pick: 'one'` shows a choice, `pick: 'count'` shows
// quantities, a tile with no `pick` is just on or off.
const ALL = ['regular', 'deep', 'end_of_tenancy'];

export const ADDONS = [
  { id: 'oven', label: 'Inside oven', services: ['regular', 'deep'],
    options: [{ key: 'oven', label: 'Inside oven', price: 75, minutes: 60 }] },
  { id: 'fridge', label: 'Inside fridge', services: ['regular', 'deep'],
    options: [{ key: 'fridge', label: 'Inside fridge', price: 30, minutes: 30 }] },
  { id: 'upholstery', label: 'Sofa & armchair steam', services: ALL, pick: 'count',
    minCharge: 60, setupMinutes: 15,
    help: 'Not for leather, silk or velvet. £60 minimum. We’ll ask for a photo of the care label.',
    options: [
      { key: 'uph_armchair', label: 'Armchair', price: 25, minutes: 15 },
      { key: 'uph_2seat', label: '2-seater', price: 40, minutes: 30 },
      { key: 'uph_3seat', label: '3-seater', price: 60, minutes: 45 },
    ] },
  { id: 'carpet', label: 'Carpet clean', services: ALL, pick: 'count',
    options: [{ key: 'carpet', label: 'Rooms', price: 60, minutes: 45 }] },
  { id: 'curtains', label: 'Curtain steam', services: ['deep', 'end_of_tenancy'], pick: 'count',
    help: 'A refresh where they hang, not stain removal. Full length = over 1.5 m drop.',
    options: [
      { key: 'curtain_half', label: 'Half-length pair', price: 30, minutes: 20 },
      { key: 'curtain_full', label: 'Full-length pair', price: 40, minutes: 30 },
    ] },
  { id: 'windows', label: 'Outside windows', services: ALL, pick: 'one',
    help: 'Ground floor, reachable from the ground. More windows? £3 each, added on the day.',
    options: [
      { key: 'windows_flat', label: 'Flat, up to 6', price: 25, minutes: 30 },
      { key: 'windows_house', label: 'House, up to 10', price: 35, minutes: 45 },
    ] },
  { id: 'outdoor', label: 'Balcony, patio, garden', services: ALL, pick: 'one',
    help: 'Sweep, clear leaves, wipe furniture. No gardening. We’ll ask for a photo.',
    options: [
      { key: 'balcony', label: 'Balcony / small patio', price: 30, minutes: 30 },
      { key: 'outdoor_large', label: 'Garden / large patio', price: 50, minutes: 60 },
    ] },
  { id: 'stairs', label: 'Stairs', services: ['regular', 'deep'], pick: 'count',
    options: [{ key: 'staircase', label: 'Flights', price: 25, minutes: 30 }] },
  { id: 'garage', label: 'Garage (empty)', services: ['end_of_tenancy'], pick: 'one',
    options: [
      { key: 'garage_single', label: 'Single', price: 45, minutes: 45 },
      { key: 'garage_double', label: 'Double', price: 65, minutes: 75 },
    ] },
  { id: 'eco', label: 'Eco products', services: ALL,
    options: [{ key: 'eco', label: 'Eco products', price: 15, minutes: 0 }] },
];

// Shown under the add-ons on End of Tenancy, so nobody pays twice.
export const INCLUDED_NOTE = {
  end_of_tenancy: 'Inside oven, fridge/freezer and stairs are already included.',
};

export function addonsFor(service) {
  return ADDONS.filter((a) => a.services.includes(service));
}

// Turn {key: qty} into priced lines for this service. Unknown, not-offered or
// zero-quantity add-ons are dropped; the server refuses them outright.
export function priceAddons(service, selected = {}) {
  const lines = [];
  let total = 0;
  let minutes = 0;
  for (const tile of addonsFor(service)) {
    let tileTotal = 0;
    let picked = 0;
    for (const o of tile.options) {
      const qty = Math.floor(Number(selected[o.key]) || 0);
      if (qty < 1) continue;
      if (tile.pick === 'one' && picked > 0) continue;   // one option only
      const q = tile.pick === 'count' ? Math.min(qty, 20) : 1;
      picked += 1;
      lines.push({ key: o.key, qty: q, label: tile.options.length === 1 ? `${tile.label}${q > 1 ? ` × ${q}` : ''}` : `${tile.label} — ${o.label}${q > 1 ? ` × ${q}` : ''}`, amount: o.price * q });
      tileTotal += o.price * q;
      minutes += o.minutes * q;
    }
    if (picked && tile.minCharge && tileTotal < tile.minCharge) {
      lines.push({ key: `${tile.id}_minimum`, qty: 1, label: `${tile.label} — minimum charge`, amount: tile.minCharge - tileTotal });
      tileTotal = tile.minCharge;
    }
    if (picked && tile.setupMinutes) minutes += tile.setupMinutes;
    total += tileTotal;
  }
  return { lines, total: +total.toFixed(2), minutes };
}

// Card is authorised or saved now and only charged once the clean is completed —
// so the customer always sees the full amount as the figure to be charged.

function lookup(table, service, size, fallback = 0) {
  return table?.[service]?.[size] ?? fallback;
}

function addRange(a, b) {
  if (!a || !b) return a || b || [0, 0];
  return [a[0] + b[0], a[1] + b[1]];
}

export function computeQuote(state) {
  const empty = {
    base: 0, bathSurcharge: 0, extras: 0, extrasLines: [], subtotal: 0, total: 0,
    etaOne: null, etaTwo: null,
  };
  const { service, propertyType, extraBathrooms = 0, addons = {} } = state;
  if (!service || !propertyType) return empty;

  const pt = PROPERTY_TYPES.find((p) => p.key === propertyType);
  if (!pt) return empty;
  const size = pt.sizeKey;

  const base = lookup(BASE_PRICES, service, size, 0);
  const baths = Math.min(Math.max(Number(extraBathrooms) || 0, 0), 4);
  const bathSurcharge = lookup(EXTRA_BATH_SURCHARGE, service, baths, 0);
  const add = priceAddons(service, addons);

  const subtotal = base + bathSurcharge + add.total;
  const total = +subtotal.toFixed(2);

  // Base ETA + any extra-bath time + add-on time
  const addHours = add.minutes / 60;
  const baseEtaOne = ETA_ONE_CLEANER?.[service]?.[size] || null;
  const bathEta    = EXTRA_BATH_TIME?.[service]?.[baths] || [0, 0];
  const etaOne     = baseEtaOne ? addRange(addRange(baseEtaOne, bathEta), [addHours, addHours]) : null;

  // Two cleaners share the extra-bath and add-on time (~halve)
  const baseEtaTwo = ETA_TWO_CLEANERS?.[service]?.[size] || null;
  const etaTwo = baseEtaTwo
    ? addRange(baseEtaTwo, [(bathEta[0] + addHours) / 2, (bathEta[1] + addHours) / 2])
    : null;

  return {
    base,
    bathSurcharge,
    extras: add.total,
    extrasLines: add.lines,
    subtotal: +subtotal.toFixed(2),
    total,
    etaOne,
    etaTwo,
  };
}

// Format an [a,b] hours range into "2 – 2.5 hours". Handles single-value ranges.
export function formatEta(range) {
  if (!range) return null;
  // Round to the nearest quarter hour so add-on minutes don't show as 6.08 hours.
  const [a, b] = range.map((h) => Math.round(h * 4) / 4);
  const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ''));
  if (a === b) return `${fmt(a)} hours`;
  return `${fmt(a)} – ${fmt(b)} hours`;
}

export function money(n) {
  const v = Number(n || 0);
  return `£${v.toLocaleString('en-GB', { minimumFractionDigits: v % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

// UK domestic phone validation — accepts 0 + 10 digits, strips spaces.
// Rejects numbers starting with +44 (per product decision: domestic 0 only).
export function validateUkPhone(raw) {
  const v = String(raw || '').replace(/[\s\-()]/g, '');
  if (!v) return { ok: false, error: 'Phone is required' };
  if (v.startsWith('+')) return { ok: false, error: 'Enter your number starting with 0 (no +44)' };
  if (!/^0\d{9,10}$/.test(v)) return { ok: false, error: 'UK number, e.g. 07123 456789' };
  return { ok: true, value: v };
}

// UK postcode (permissive — final validation at the Stripe/admin side)
export function validateUkPostcode(raw) {
  const v = String(raw || '').replace(/\s+/g, '').toUpperCase();
  if (!v) return { ok: false, error: 'Postcode is required' };
  if (!/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(v)) {
    return { ok: false, error: 'Enter a valid UK postcode, e.g. SW1A 1AA' };
  }
  // Re-insert the space before the last 3 chars for display
  const display = v.slice(0, v.length - 3) + ' ' + v.slice(-3);
  return { ok: true, value: display };
}
