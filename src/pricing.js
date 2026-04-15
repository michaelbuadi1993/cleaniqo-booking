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
    fromPrice: 100,
    desc: 'Deposit-back standard, agent approved',
  },
];

// Property types offered by the form. `sizeKey` indexes the price/time tables below.
export const PROPERTY_TYPES = [
  { key: 'house_share', label: 'Bedroom in house share', sizeKey: 'share'    },
  { key: 'studio',      label: 'Studio',                 sizeKey: 'studio'   },
  { key: 'one_bed',     label: 'One Bedroom Property',   sizeKey: 'bed1'     },
  { key: 'two_bed',     label: 'Two Bedroom Property',   sizeKey: 'bed2'     },
  { key: 'three_bed',   label: 'Three Bedroom Property', sizeKey: 'bed3'     },
  { key: 'four_bed',    label: 'Four Bedroom Property',  sizeKey: 'bed4'     },
  { key: 'five_bed',    label: 'Five Bedroom Property',  sizeKey: 'bed5'     },
  { key: 'six_bed',     label: 'Six Bedroom Property',   sizeKey: 'bed6'     },
];

// Base prices by property size (one-off, in GBP)
// Deep Clean and End of Tenancy share the same base per the price list.
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
  end_of_tenancy: {
    share: 100,
    studio:130,
    bed1:  160,
    bed2:  200,
    bed3:  250,
    bed4:  340,
    bed5:  400,
    bed6:  650,
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
  end_of_tenancy: {
    share:  [2,   3],
    studio: [3,   4],
    bed1:   [4,   5],
    bed2:   [5,   6],
    bed3:   [6,   7.5],
    bed4:   [7.5, 9],
    bed5:   [9,   11],
    bed6:   [9,   11],
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
    studio: [1.5, 2.5],
    bed1:   [2,   2.5],
    bed2:   [2.5, 3.5],
    bed3:   [3,   4],
    bed4:   [4,   5],
    bed5:   [4.5, 6],
    bed6:   [6,   7.5],
  },
};

// Extra bathroom time (1 cleaner, hours) — cumulative per count of extras.
export const EXTRA_BATH_TIME = {
  regular:        { 0: [0,0], 1: [0.45, 1],   2: [1.5, 1.75], 3: [2, 2.5],    4: [2.5, 3] },
  deep:           { 0: [0,0], 1: [1,    1.25],2: [2,   2.25], 3: [2.75, 3.25],4: [3.5, 4] },
  end_of_tenancy: { 0: [0,0], 1: [1,    1.25],2: [2,   2.25], 3: [2.75, 3.25],4: [3.5, 4] },
};

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
    base: 0, bathSurcharge: 0, subtotal: 0, total: 0,
    etaOne: null, etaTwo: null,
  };
  const { service, propertyType, extraBathrooms = 0 } = state;
  if (!service || !propertyType) return empty;

  const pt = PROPERTY_TYPES.find((p) => p.key === propertyType);
  if (!pt) return empty;
  const size = pt.sizeKey;

  const base = lookup(BASE_PRICES, service, size, 0);
  const baths = Math.min(Math.max(Number(extraBathrooms) || 0, 0), 4);
  const bathSurcharge = lookup(EXTRA_BATH_SURCHARGE, service, baths, 0);

  const subtotal = base + bathSurcharge;
  const total = +subtotal.toFixed(2);

  // Base ETA + any extra-bath time
  const baseEtaOne = ETA_ONE_CLEANER?.[service]?.[size] || null;
  const bathEta    = EXTRA_BATH_TIME?.[service]?.[baths] || [0, 0];
  const etaOne     = baseEtaOne ? addRange(baseEtaOne, bathEta) : null;

  // Two-cleaner ETA scales the extra-bath time proportionally (~halve)
  const baseEtaTwo = ETA_TWO_CLEANERS?.[service]?.[size] || null;
  const etaTwo = baseEtaTwo
    ? addRange(baseEtaTwo, [bathEta[0] / 2, bathEta[1] / 2])
    : null;

  return {
    base,
    bathSurcharge,
    subtotal: +subtotal.toFixed(2),
    total,
    etaOne,
    etaTwo,
  };
}

// Format an [a,b] hours range into "2 – 2.5 hours". Handles single-value ranges.
export function formatEta(range) {
  if (!range) return null;
  const [a, b] = range;
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
