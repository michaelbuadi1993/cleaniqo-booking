// API client for Cleaniqo public booking endpoints.
// Points to the Cleaniqo backend on Railway.

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) ||
  'https://api.cleaniqo.co.uk';

async function post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

async function get(path) {
  const res = await fetch(`${API_BASE}${path}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  createLead: (payload) => post('/api/public/quote/lead', payload),
  createCheckout: (payload) => post('/api/public/quote/checkout-session', payload),
  lookupAddresses: (postcode) =>
    get(`/api/public/address-lookup?postcode=${encodeURIComponent(postcode)}`),
};
