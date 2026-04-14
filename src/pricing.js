// Cleaniqo pricing engine
// Services offered online: Regular, Deep, End of Tenancy
// Airbnb turnovers + recurring schedules are arranged over the phone.

export const SERVICES = [
  {
    key: 'regular',
    label: 'Regular Clean',
    short: 'Regular Clean',
    fromPrice: 60,
    desc: 'Standard cleaning service for maintaining your home',
    hoursPerBedroom: 1.25,
  },
  {
    key: 'deep',
    label: 'Deep Clean',
    short: 'Deep Clean',
    fromPrice: 130,
    desc: 'Top-to-bottom clean — inside appliances, skirtings, detailed work',
    hoursPerBedroom: 2.25,
  },
  {
    key: 'end_of_tenancy',
    label: 'End of Tenancy',
    short: 'End of Tenancy',
    fromPrice: 150,
    desc: 'Deposit-back standard, agent approved',
    hoursPerBedroom: 2.75,
  },
  {
    key: 'airbnb',
    label: 'Airbnb Turnover — call us',
    short: 'Airbnb Turnover',
    fromPrice: 60,
    desc: 'Arranged over the phone so we can confirm linen, access and schedule',
    hoursPerBedroom: 1.25,
    phoneOnly: true,
  },
];

// Property types offered by the form. `bedrooms` is the key into BEDROOM_PRICES.
export const PROPERTY_TYPES = [
  { key: 'house_share',  label: 'Bedroom in house share', bedrooms: 0 },
  { key: 'studio',       label: 'Studio',                 bedrooms: 0 },
  { key: 'one_bed',      label: 'One Bedroom Property',   bedrooms: 1 },
  { key: 'two_bed',      label: 'Two Bedroom Property',   bedrooms: 2 },
  { key: 'three_bed',    label: 'Three Bedroom Property', bedrooms: 3 },
  { key: 'four_bed',     label: 'Four Bedroom Property',  bedrooms: 4 },
  { key: 'five_bed',     label: 'Five Bedroom Property',  bedrooms: 5 },
  { key: 'six_bed',      label: 'Six Bedroom Property',   bedrooms: 6 },
];

// Base prices by bedroom count (one-off, in GBP)
// 0 represents Studio / House share room
export const BEDROOM_PRICES = {
  regular:        { 0: 60,  1: 70,  2: 90,  3: 110, 4: 120, 5: 150, 6: 180 },
  deep:           { 0: 130, 1: 160, 2: 200, 3: 250, 4: 340, 5: 400, 6: 650 },
  end_of_tenancy: { 0: 150, 1: 190, 2: 240, 3: 300, 4: 400, 5: 470, 6: 750 },
};

// Extra bathroom surcharges (each bath beyond the first)
export const EXTRA_BATH_SURCHARGE = {
  regular: 15,
  deep: 25,
  end_of_tenancy: 30,
};

// Optional extras (per-job add-ons)
export const EXTRAS = [
  { key: 'inside_oven',    label: 'Inside oven',         price: 25 },
  { key: 'inside_fridge',  label: 'Inside fridge',       price: 20 },
  { key: 'inside_windows', label: 'Inside windows',      price: 25 },
  { key: 'inside_cabinets',label: 'Inside cabinets',     price: 30 },
  { key: 'laundry',        label: 'Laundry & fold',      price: 20 },
  { key: 'ironing',        label: 'Ironing (1 hour)',    price: 18 },
  { key: 'balcony',        label: 'Balcony / patio',     price: 20 },
  { key: 'pet_hair',       label: 'Pet hair treatment',  price: 15 },
];

export const DEPOSIT_PERCENT = 0.20; // 20% deposit to lock in booking

export function computeQuote(state) {
  const { service, propertyType, extraBathrooms = 0, extras = [] } = state;
  if (!service || !propertyType) {
    return { base: 0, bathSurcharge: 0, extras: 0, subtotal: 0, total: 0, deposit: 0, hours: 0 };
  }

  const svc = SERVICES.find((s) => s.key === service);
  if (!svc || svc.phoneOnly) {
    return { base: 0, bathSurcharge: 0, extras: 0, subtotal: 0, total: 0, deposit: 0, hours: 0, phoneOnly: true };
  }

  const pt = PROPERTY_TYPES.find((p) => p.key === propertyType);
  const bedKey = pt ? pt.bedrooms : 0;
  const table = BEDROOM_PRICES[service] || BEDROOM_PRICES.regular;
  const base = table[bedKey] ?? 0;

  const bathSurcharge = Math.max(extraBathrooms, 0) * (EXTRA_BATH_SURCHARGE[service] || 15);

  const extrasTotal = extras.reduce((acc, k) => {
    const e = EXTRAS.find((x) => x.key === k);
    return acc + (e ? e.price : 0);
  }, 0);

  const subtotal = base + bathSurcharge + extrasTotal;
  const total = +subtotal.toFixed(2);
  const deposit = +(total * DEPOSIT_PERCENT).toFixed(2);

  // Rough cleaner-hours estimate used for the sidebar
  const bedForHours = Math.max(bedKey, 1);
  const hours = +(bedForHours * (svc.hoursPerBedroom || 1.25) + extraBathrooms * 0.5).toFixed(1);

  return { base, bathSurcharge, extras: extrasTotal, subtotal: +subtotal.toFixed(2), total, deposit, hours };
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
