import { useMemo, useState } from 'react';
import {
  SERVICES,
  PROPERTY_TYPES,
  EXTRAS,
  computeQuote,
  money,
  validateUkPhone,
  validateUkPostcode,
} from './pricing.js';
import { api } from './api.js';
import Success from './components/Success.jsx';

const CONTACT_HREF = 'https://cleaniqo.co.uk/contact';

const INITIAL = {
  // Location
  postcode: '',
  address: '',
  // Service
  service: '',
  // Property
  propertyType: '',
  extraBathrooms: 0,
  // Extras
  extras: [],
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
              Your deposit is received and your Cleaniqo team is being assigned. Check your inbox
              for the confirmation email with your booking reference and arrival window.
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
  const isPhoneOnly = !!selectedService?.phoneOnly;
  const propertyLabel =
    PROPERTY_TYPES.find((p) => p.key === state.propertyType)?.label || 'Not selected';

  const today = new Date().toISOString().slice(0, 10);

  function validate() {
    const errs = {};
    const pc = validateUkPostcode(state.postcode);
    if (!pc.ok) errs.postcode = pc.error;
    if (!state.address.trim()) errs.address = 'Address is required';
    if (!state.service) errs.service = 'Choose a service';
    if (isPhoneOnly) errs.service = 'This service is arranged over the phone';
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
        extras: state.extras,
        bookingDate: state.bookingDate,
        startTime: state.startTime,
        address: state.address.trim(),
        postcode: validateUkPostcode(state.postcode).value,
        specialInstructions: [state.accessNotes, state.specialInstructions]
          .filter(Boolean)
          .join('\n\n') || null,
        quote: {
          base: quote.base,
          extras: quote.extras,
          total: quote.total,
          deposit: quote.deposit,
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
                    {s.label}{s.phoneOnly ? '' : ` — from ${money(s.fromPrice)}`}
                  </option>
                ))}
              </select>
              {fieldErrors.service && <div className="field__error">{fieldErrors.service}</div>}
              {selectedService && !isPhoneOnly && (
                <div className="field__help">{selectedService.desc}</div>
              )}
            </div>

            {isPhoneOnly && (
              <div className="phone-box">
                <strong>Airbnb turnovers are arranged over the phone.</strong>
                <p>
                  We confirm schedule, linen supply and key access directly so turnovers land
                  without surprises. Give us a ring or drop us a message and we'll set it up
                  the same day.
                </p>
                <a className="btn btn--primary" href={CONTACT_HREF} target="_top" rel="noreferrer">
                  Call or message us →
                </a>
              </div>
            )}

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
            <h3 className="section__title">Optional extras</h3>
            <div className="extras">
              {EXTRAS.map((e) => {
                const checked = state.extras.includes(e.key);
                return (
                  <label key={e.key} className={`extra ${checked ? 'extra--checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = checked
                          ? state.extras.filter((x) => x !== e.key)
                          : [...state.extras, e.key];
                        update({ extras: next });
                      }}
                    />
                    <span>{e.label}</span>
                    <span className="extra__price">+{money(e.price)}</span>
                  </label>
                );
              })}
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
              <strong>Debit or credit card only.</strong>{' '}
              We take a 20% deposit now (refundable up to 24 hours before your clean), and
              charge the balance to the same card once the clean is completed. Your card
              details are handled securely by Stripe — Cleaniqo never sees your card number.
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
              disabled={submitting || isPhoneOnly}
            >
              {submitting ? 'Redirecting to Stripe…' : `Pay deposit · ${money(quote.deposit || 0)}`}
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
      <div className="brand__badge">Secure booking · 20% deposit · Free cancellation up to 24h</div>
    </div>
  );
}

function Sidebar({ state, service, propertyLabel, quote }) {
  const extrasList = (state.extras || [])
    .map((k) => EXTRAS.find((e) => e.key === k)?.label)
    .filter(Boolean);
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
        {extrasList.length > 0 && (
          <div className="summary__row">
            <span>Extras:</span>
            <span>{extrasList.join(', ')}</span>
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
        <span>Total cost</span>
        <span>{money(quote.total || 0)}</span>
      </div>
      {quote.deposit > 0 && (
        <div className="summary__row" style={{ marginTop: 10 }}>
          <span>Deposit due today</span>
          <span>{money(quote.deposit)}</span>
        </div>
      )}

      <p className="summary__note">
        Final price may shift if the property condition differs from what was booked —
        our team will confirm before any change. Your card is charged AFTER the appointment
        is completed.
      </p>
    </aside>
  );
}
