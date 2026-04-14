// Cleaniqo pricing engine — rates from official pricing model
// (Cleaniqo_Subscription_Pricing_Model.xlsx)

export const SERVICES = [
  {
    key: 'regular',
    label: 'Regular Clean',
    desc: 'Kitchen, bathrooms, dusting, vacuum, mop',
    icon: '🧽',
  },
  {
    key: 'deep',
    label: 'Deep Clean',
    desc: 'Top-to-bottom, inside appliances, skirtings',
    icon: '✨',
  },
  {
    key: 'end_of_tenancy',
    label: 'End of Tenancy',
    desc: 'Deposit-back standard, agent-approved',
    icon: '🔑',
  },
  {
    key: 'airbnb',
    label: 'Airbnb Turnover',
    desc: 'Arranged over the phone — tap to see how',
    icon: '🏠',
    phoneOnly: true,
  },
];

// One-off only through the booking form.
// Recurring cleans (weekly / fortnightly / monthly) are set up over the phone.
export const FREQUENCIES = [
  { key: 'one_off', label: 'One-off', desc: 'Just this once', discount: 0 },
];

// Base prices by bedroom count (one-off)
// 0 represents Studio / House share room
export const BEDROOM_PRICES = {
  regular: { 0: 60, 1: 70, 2: 90, 3: 110, 4: 120, 5: 150, 6: 180 },
  deep:    { 0: 130, 1: 160, 2: 200, 3: 250, 4: 340, 5: 400, 6: 650 },
  // Specialist services use deep as their baseline + surcharge
  end_of_tenancy: { 0: 150, 1: 190, 2: 240, 3: 300, 4: 400, 5: 470, 6: 750 },
};

// Extra bathroom surcharges (each additional bath beyond first)
export const EXTRA_BATH_SURCHARGE = {
  regular: 15,
  deep: 25,
  end_of_tenancy: 30,
};

export const EXTRAS = [
  { key: 'inside_oven',    label: 'Inside oven',    price: 25, icon: '🔥' },
  { key: 'inside_fridge',  label: 'Inside fridge',  price: 20, icon: '❄️' },
  { key: 'inside_windows', label: 'Inside windows', price: 25, icon: '🪟' },
  { key: 'inside_cabinets',label: 'Inside cabinets',price: 30, icon: '🗄️' },
  { key: 'laundry',        label: 'Laundry & fold', price: 20, icon: '🧺' },
  { key: 'ironing',        label: 'Ironing (1h)',   price: 18, icon: '👔' },
  { key: 'balcony',        label: 'Balcony / patio',price: 20, icon: '🌿' },
  { key: 'pet_hair',       label: 'Pet hair treatment', price: 15, icon: '🐾' },
];

export const DEPOSIT_PERCENT = 0.20; // 20% deposit to lock in booking

export function computeQuote(state) {
  const { service, frequency, bedrooms = 0, bathrooms = 1, extras = [] } = state;
  if (!service) return { base: 0, extras: 0, subtotal: 0, discount: 0, total: 0, deposit: 0, discountPct: 0 };

  const bedroomTable = BEDROOM_PRICES[service] || BEDROOM_PRICES.regular;
  const bedKey = Math.min(Math.max(bedrooms, 0), 6);
  const base = bedroomTable[bedKey] ?? 0;

  const extraBaths = Math.max(bathrooms - 1, 0);
  const bathSurcharge = extraBaths * (EXTRA_BATH_SURCHARGE[service] || 15);

  const extrasTotal = extras.reduce((acc, k) => {
    const e = EXTRAS.find((x) => x.key === k);
    return acc + (e ? e.price : 0);
  }, 0);

  const subtotal = base + bathSurcharge + extrasTotal;

  // One-off only through the form — recurring discounts are handled on the phone.
  const effectivePct = 0;
  const discount = 0;

  const total = +(subtotal - discount).toFixed(2);
  const deposit = +(total * DEPOSIT_PERCENT).toFixed(2);

  return {
    base,
    bathSurcharge,
    extras: extrasTotal,
    subtotal: +subtotal.toFixed(2),
    discount,
    discountPct: effectivePct,
    total,
    deposit,
  };
}

export function bedroomLabel(n) {
  if (n === 0) return 'Studio / Room';
  if (n === 1) return '1 bedroom';
  return `${n} bedrooms`;
}

export function money(n) {
  const v = Number(n || 0);
  return `£${v.toLocaleString('en-GB', { minimumFractionDigits: v % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}
