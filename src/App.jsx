import { useEffect, useMemo, useRef, useState } from 'react';
import {
  SERVICES,
  PROPERTY_TYPES,
  computeQuote,
  money,
  validateUkPhone,
  validateUkPostcode,
} from './pricing.js';
import { api } from './api.js';
import Success from './components/Success.jsx';

// Broadcast the app's rendered height to the parent window so the embedding
// iframe (e.g. Webflow) can grow/shrink with the content. Safe no-op if not
// embedded or if the parent doesn't listen.
function useBroadcastHeight() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const send = () => {
      try {
        const h = Math.max(
          document.documentElement.scrollHeight,
          document.body?.scrollHeight || 0,
        );
        window.parent?.postMessage({ type: 'cleaniqo:booking-height', height: h }, '*');
      } catch (_) { /* ignore */ }
    };
    send();
    const ro = new ResizeObserver(send);
    ro.observe(document.body);
    window.addEventListener('load', send);
    const interval = setInterval(send, 750);
    return () => {
      ro.disconnect();
      window.removeEventListener('load', send);
      clearInterval(interval);
    };
  }, []);
}

const INITIAL = {
  // Location
  postcode: '',
  address: '',
  // Service
  service: '',
  // Property
  propertyType: '',
  extraBathrooms: 0,
  // Extras / add-on notes — free-form, not charged
  extrasNotes: '',
  // Schedule
  bookingDate: '',
  startTime: '',
  // Customer
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  // Notes
  accessNotes: '',
  specialInstructions: '',
  // Terms
  termsAccepted: false,
};

const BATH_OPTIONS = [
  { v: 0, label: '0 (Property standard)' },
  { v: 1, label: '1 extra' },
  { v: 2, label: '2 extra' },
  { v: 3, label: '3 extra' },
  { v: 4, label: '4 extra' },
];

export default function App() {
  useBroadcastHeight();
  const [state, setState] = useState(INITIAL);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successLeadId, setSuccessLeadId] = useState(null);

  const update = (patch) => setState((s) => ({ ...s, ...patch }));

  const quote = useMemo(() => computeQuote(state), [state]);

  // URL params for post-Stripe state
  const urlParams = new URLSearchParams(window.location.search);
  const postPaymentSuccess = urlParams.get('success') === '1';
  const postPaymentCancelled = urlParams.get('cancelled') === '1';

  if (postPaymentSuccess) {
    return (
      <div className="app">
        <Brand />
        <div className="shell" style={{ gridTemplateColumns: '1fr' }}>
          <div className="card success">
            <div className="success__icon">✓</div>
            <h2 className="success__title">Booking confirmed!</h2>
            <p className="success__sub">
              Your card is saved and your Cleaniqo team is being assigned — you'll only be charged
              once the clean is completed. Check your inbox for the confirmation email with your
              booking reference and arrival window.
            </p>
            <a href="/" className="btn btn--primary">Book another clean</a>
          </div>
        </div>
      </div>
    );
  }

  if (successLeadId) {
    return (
      <div className="app">
        <Brand />
        <div className="shell" style={{ gridTemplateColumns: '1fr' }}>
          <Success leadId={successLeadId} />
        </div>
      </div>
    );
  }

  const selectedService = SERVICES.find((s) => s.key === state.service);
  const propertyLabel =
    PROPERTY_TYPES.find((p) => p.key === state.propertyType)?.label || 'Not selected';

  const today = new Date().toISOString().slice(0, 10);

  function validate() {
    const errs = {};
    const pc = validateUkPostcode(state.postcode);
    if (!pc.ok) errs.postcode = pc.error;
    if (!state.address.trim()) errs.address = 'Address is required';
    if (!state.service) errs.service = 'Choose a service';
    if (!state.propertyType) errs.propertyType = 'Select a property type';
    if (!state.bookingDate) errs.bookingDate = 'Pick a date';
    if (!state.startTime) errs.startTime = 'Pick a start time';
    if (!state.firstName.trim()) errs.firstName = 'First name is required';
    if (!state.lastName.trim()) errs.lastName = 'Last name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email || '')) errs.email = 'Valid email required';
    const ph = validateUkPhone(state.phone);
    if (!ph.ok) errs.phone = ph.error;
    if (!state.termsAccepted) errs.terms = 'Please accept the terms to continue';
    return errs;
  }

  const handleSubmit = async () => {
    setError('');
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError('Please fix the highlighted fields above.');
      // scroll to first error
      setTimeout(() => {
        const firstErr = document.querySelector('.field__error');
        firstErr?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    setSubmitting(true);
    try {
      const pt = PROPERTY_TYPES.find((p) => p.key === state.propertyType);
      const payload = {
        firstName: state.firstName.trim(),
        lastName: state.lastName.trim(),
        email: state.email.trim().toLowerCase(),
        phone: validateUkPhone(state.phone).value,
        service: state.service,
        frequency: 'one_off',
        bedrooms: pt ? pt.bedrooms : 0,
        bathrooms: 1 + Number(state.extraBathrooms || 0),
        extras: [],
        bookingDate: state.bookingDate,
        startTime: state.startTime,
        address: state.address.trim(),
        postcode: validateUkPostcode(state.postcode).value,
        specialInstructions: [
          state.accessNotes,
          state.extrasNotes ? `Additional requests: ${state.extrasNotes}` : '',
          state.specialInstructions,
        ]
          .filter(Boolean)
          .join('\n\n') || null,
        quote: {
          base: quote.base,
          extras: 0,
          total: quote.total,
          discountPct: 0,
        },
      };

      const lead = await api.createLead(payload);
      const session = await api.createCheckout({
        leadId: lead.id,
        successUrl: `${window.location.origin}/?success=1&lead=${lead.id}`,
        cancelUrl: `${window.location.origin}/?cancelled=1&lead=${lead.id}`,
      });
      if (session?.url) {
        // Escape the iframe on Webflow if embedded
        (window.top || window).location.href = session.url;
        return;
      }
      setSuccessLeadId(lead.id);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app">
      <Brand />

      <div className="intro">
        <h1 className="intro__title">
          Book your <span className="accent">Cleaniqo</span> clean
        </h1>
        <p className="intro__sub">
          Guest-ready homes across London — vetted cleaners, consistent results, every time.
          Book online in a couple of minutes; we'll confirm your slot by text.
        </p>
      </div>

      <div className="shell">
        <div className="card">
          {postPaymentCancelled && (
            <div className="error" style={{ borderColor: 'rgba(251, 191, 36, 0.38)', background: 'rgba(251, 191, 36, 0.09)', color: '#fde68a' }}>
              Payment cancelled — your details are saved. Finish the booking whenever you're ready.
            </div>
          )}
          {error && <div className="error">{error}</div>}

          {/* ── 1. Location ───────────────────────────────────────────────── */}
          <section className="section">
            <h3 className="section__title">Location</h3>
            <div className="note-box">
              <strong>🇬🇧 London service area only.</strong>{' '}
              We currently clean across Greater London — enter a London postcode (e.g. SW1A 1AA, E1 6AN, NW1 5LS)
              and we'll confirm coverage.
            </div>

            <div className="field">
              <label className="field__label">Postcode <span className="req">*</span></label>
              <input
                className="field__input"
                placeholder="E.g. SW1A 1AA"
                value={state.postcode}
                onChange={(e) => update({ postcode: e.target.value.toUpperCase() })}
                autoComplete="postal-code"
              />
              {fieldErrors.postcode && <div className="field__error">{fieldErrors.postcode}</div>}
            </div>

            <div className="field">
              <label className="field__label">Address <span className="req">*</span></label>
              <input
                className="field__input"
                placeholder="House / flat number and street"
                value={state.address}
                onChange={(e) => update({ address: e.target.value })}
                autoComplete="street-address"
              />
              {fieldErrors.address && <div className="field__error">{fieldErrors.address}</div>}
            </div>
          </section>

          {/* ── 2. Service Type ───────────────────────────────────────────── */}
          <section className="section">
            <h3 className="section__title">Service type</h3>
            <div className="field">
              <label className="field__label">Select service <span className="req">*</span></label>
              <select
                className="field__select"
                value={state.service}
                onChange={(e) => update({ service: e.target.value })}
              >
                <option value="">Select a service…</option>
                {SERVICES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label} — from {money(s.fromPrice)}
                  </option>
                ))}
              </select>
              {fieldErrors.service && <div className="field__error">{fieldErrors.service}</div>}
              {selectedService && (
                <div className="field__help">{selectedService.desc}</div>
              )}
            </div>

            <div className="note-box" style={{ marginTop: 18 }}>
              <strong>Need a weekly, fortnightly or monthly clean?</strong>{' '}
              Book a one-off below — we'll set up the recurring schedule (and apply your
              discount) on a quick call afterwards.
            </div>
          </section>

          {/* ── 3. Property details ───────────────────────────────────────── */}
          <section className="section">
            <h3 className="section__title">Property details</h3>
            <div className="field-row">
              <div className="field">
                <label className="field__label">Type of property <span className="req">*</span></label>
                <select
                  className="field__select"
                  value={state.propertyType}
                  onChange={(e) => update({ propertyType: e.target.value })}
                >
                  <option value="">Select property type…</option>
                  {PROPERTY_TYPES.map((p) => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
                {fieldErrors.propertyType && <div className="field__error">{fieldErrors.propertyType}</div>}
              </div>
              <div className="field">
                <label className="field__label">Extra bathrooms <span className="req">*</span></label>
                <select
                  className="field__select"
                  value={state.extraBathrooms}
                  onChange={(e) => update({ extraBathrooms: Number(e.target.value) })}
                >
                  {BATH_OPTIONS.map((b) => (
                    <option key={b.v} value={b.v}>{b.label}</option>
                  ))}
                </select>
                <div className="field__help">One bathroom is included with every property type.</div>
              </div>
            </div>
          </section>

          {/* ── 4. Extras ─────────────────────────────────────────────────── */}
          <section className="section">
            <h3 className="section__title">Any additional requests?</h3>
            <div className="field">
              <textarea
                className="field__textarea"
                placeholder="E.g. inside oven, inside fridge, inside windows, balcony, ironing… message us anything extra you'd like and we'll sort it on the day."
                value={state.extrasNotes}
                onChange={(e) => update({ extrasNotes: e.target.value })}
              />
              <div className="field__help">
                Optional — not charged here. If you'd like any add-ons, just tell us what you need and we'll organise it directly with your cleaner.
              </div>
            </div>
          </section>

          {/* ── 5. Scheduling ─────────────────────────────────────────────── */}
          <section className="section">
            <h3 className="section__title">When would you like us?</h3>
            <div className="field-row">
              <div className="field">
                <label className="field__label">Date <span className="req">*</span></label>
                <input
                  type="date"
                  className="field__input"
                  min={today}
                  value={state.bookingDate}
                  onChange={(e) => update({ bookingDate: e.target.value })}
                />
                {fieldErrors.bookingDate && <div className="field__error">{fieldErrors.bookingDate}</div>}
              </div>
              <div className="field">
                <label className="field__label">Start time <span className="req">*</span></label>
                <select
                  className="field__select"
                  value={state.startTime}
                  onChange={(e) => update({ startTime: e.target.value })}
                >
                  <option value="">Select a start time…</option>
                  {['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {fieldErrors.startTime && <div className="field__error">{fieldErrors.startTime}</div>}
              </div>
            </div>
          </section>

          {/* ── 6. Customer details ───────────────────────────────────────── */}
          <section className="section">
            <h3 className="section__title">Your details</h3>
            <div className="field-row">
              <div className="field">
                <label className="field__label">First name <span className="req">*</span></label>
                <input
                  className="field__input"
                  value={state.firstName}
                  onChange={(e) => update({ firstName: e.target.value })}
                  autoComplete="given-name"
                />
                {fieldErrors.firstName && <div className="field__error">{fieldErrors.firstName}</div>}
              </div>
              <div className="field">
                <label className="field__label">Last name <span className="req">*</span></label>
                <input
                  className="field__input"
                  value={state.lastName}
                  onChange={(e) => update({ lastName: e.target.value })}
                  autoComplete="family-name"
                />
                {fieldErrors.lastName && <div className="field__error">{fieldErrors.lastName}</div>}
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label className="field__label">Email <span className="req">*</span></label>
                <input
                  type="email"
                  className="field__input"
                  value={state.email}
                  onChange={(e) => update({ email: e.target.value })}
                  autoComplete="email"
                />
                {fieldErrors.email && <div className="field__error">{fieldErrors.email}</div>}
              </div>
              <div className="field">
                <label className="field__label">Phone <span className="req">*</span></label>
                <input
                  type="tel"
                  className="field__input"
                  placeholder="07123 456789"
                  value={state.phone}
                  onChange={(e) => update({ phone: e.target.value })}
                  autoComplete="tel-national"
                  inputMode="tel"
                />
                <div className="field__help">Enter your UK number starting with 0 — no +44 needed.</div>
                {fieldErrors.phone && <div className="field__error">{fieldErrors.phone}</div>}
              </div>
            </div>
          </section>

          {/* ── 7. Key / job notes ────────────────────────────────────────── */}
          <section className="section">
            <h3 className="section__title">Key information & access</h3>
            <div className="field">
              <label className="field__label">How will our cleaner get in?</label>
              <textarea
                className="field__textarea"
                placeholder="E.g. meet me there, key in a lockbox (code 1234), concierge has a spare key, leave on doormat…"
                value={state.accessNotes}
                onChange={(e) => update({ accessNotes: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="field__label">Special notes for your cleaner</label>
              <textarea
                className="field__textarea"
                placeholder="Anything they should know — pets, fragile items, areas to focus on or skip."
                value={state.specialInstructions}
                onChange={(e) => update({ specialInstructions: e.target.value })}
              />
            </div>
          </section>

          {/* ── 8. Payment ────────────────────────────────────────────────── */}
          <section className="section">
            <h3 className="section__title">Payment</h3>
            <div className="note-box">
              <strong>Debit or credit card only — no charge today.</strong>{' '}
              Your card is saved securely by Stripe when you confirm. Nothing leaves your account
              until your clean is completed — we only charge the full amount afterwards.
              Cancel free of charge up to 24 hours before your slot. Cleaniqo never sees your
              card number.
            </div>

            <div className="terms">
              <input
                type="checkbox"
                id="terms"
                checked={state.termsAccepted}
                onChange={(e) => update({ termsAccepted: e.target.checked })}
              />
              <label htmlFor="terms">
                I affirm that I have read and agree to the{' '}
                <a href="https://cleaniqo.co.uk/terms" target="_top" rel="noreferrer">Terms of Service</a>{' '}
                and{' '}
                <a href="https://cleaniqo.co.uk/privacy" target="_top" rel="noreferrer">Privacy Policy</a>.
                You agree and authorise Cleaniqo and its affiliates to deliver booking confirmations,
                scheduling updates and relevant service communication using the details above.
              </label>
            </div>
            {fieldErrors.terms && <div className="field__error">{fieldErrors.terms}</div>}
          </section>

          <div className="submit-row">
            <button
              className="btn btn--primary btn--lg"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Redirecting to Stripe…' : `Confirm booking · ${money(quote.total || 0)}`}
            </button>
          </div>
        </div>

        <Sidebar state={state} service={selectedService} propertyLabel={propertyLabel} quote={quote} />
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="brand">
      <div className="brand__logo">Cleaniqo</div>
      <div className="brand__badge">Secure booking · Pay after clean · Free cancellation up to 24h</div>
    </div>
  );
}

function Sidebar({ state, service, propertyLabel, quote }) {
  return (
    <aside className="summary">
      <h3 className="summary__title">Booking summary</h3>

      <div className="summary__group">
        <div className="summary__heading">Service details</div>
        <div className="summary__row">
          <span>Service type:</span>
          <span>{service ? service.short : 'Not selected'}</span>
        </div>
        <div className="summary__row">
          <span>Property type:</span>
          <span>{propertyLabel}</span>
        </div>
        <div className="summary__row">
          <span>Extra bathrooms:</span>
          <span>
            {Number(state.extraBathrooms || 0) === 0
              ? 'None (standard included)'
              : `${state.extraBathrooms} extra`}
          </span>
        </div>
        {state.extrasNotes && state.extrasNotes.trim() && (
          <div className="summary__row">
            <span>Additional requests:</span>
            <span>Included in notes</span>
          </div>
        )}
        {state.bookingDate && state.startTime && (
          <div className="summary__row">
            <span>Schedule:</span>
            <span>{state.bookingDate} · {state.startTime}</span>
          </div>
        )}
      </div>

      <div className="summary__group">
        <div className="summary__heading">Estimated time</div>
        <div className="summary__row">
          <span>Cleaner:</span>
          <span>{quote.hours ? `${quote.hours} hours` : '—'}</span>
        </div>
      </div>

      <div className="summary__total">
        <span>Total — charged after clean</span>
        <span>{money(quote.total || 0)}</span>
      </div>
      <div className="summary__row" style={{ marginTop: 10 }}>
        <span>Due today</span>
        <span>£0.00</span>
      </div>

      <p className="summary__note">
        Your card is saved securely by Stripe when you confirm your booking. We only charge
        the full amount once your clean is completed. Final price may shift if the property
        condition differs from what was booked — our team will confirm before any change.
      </p>
    </aside>
  );
}
