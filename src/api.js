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
    const err = new Error(data?.error || data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
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

// One customer photo: ask for an upload slot, send the file straight to storage, then let the server check it.
async function uploadPhoto(leadId, token, file) {
  const slot = await post('/api/public/quote/photo-upload', { leadId, token, mimeType: file.type, sizeBytes: file.size });
  const put = await fetch(slot.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!put.ok) throw new Error('Upload failed');
  return post('/api/public/quote/photo-done', { leadId, token, photoId: slot.photoId });
}

// A photo for the photo check at booking (060): upload slot, straight to storage, then the server checks the file.
async function uploadSessionPhoto(sessionId, token, file) {
  const slot = await post('/api/public/quote/photo-session/upload', { sessionId, token, mimeType: file.type, sizeBytes: file.size });
  const put = await fetch(slot.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!put.ok) throw new Error('Upload failed');
  return post('/api/public/quote/photo-session/done', { sessionId, token, photoId: slot.photoId });
}

export const api = {
  photoSession: (choices) => post('/api/public/quote/photo-session', choices),
  uploadSessionPhoto,
  checkPhotos: (sessionId, token) => post('/api/public/quote/photo-session/check', { sessionId, token }),
  createLead: (payload) => post('/api/public/quote/lead', payload),
  createCheckout: (payload) => post('/api/public/quote/checkout-session', payload),
  callback: (payload) => post('/api/public/callback', payload),
  uploadPhoto,
  lookupAddresses: (postcode) =>
    get(`/api/public/address-lookup?postcode=${encodeURIComponent(postcode)}`),
};

export const WHATSAPP_URL = 'https://wa.me/447348472250';
