import { useMemo, useState } from 'react';
import { computeQuote } from './pricing.js';
import { api } from './api.js';
import Progress from './components/Progress.jsx';
import PricePanel from './components/PricePanel.jsx';
import StepService from './components/StepService.jsx';
import StepFrequency from './components/StepFrequency.jsx';
import StepSize from './components/StepSize.jsx';
import StepExtras from './components/StepExtras.jsx';
import StepDateTime from './components/StepDateTime.jsx';
import StepContact from './components/StepContact.jsx';
import Success from './components/Success.jsx';

const INITIAL = {
  service: '',
  frequency: 'one_off',
  bedrooms: 1,
  bathrooms: 1,
  extras: [],
  bookingDate: '',
  startTime: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  postcode: '',
  specialInstructions: '',
};

const STEPS = ['Service', 'Frequency', 'Size', 'Extras', 'Date', 'Details'];

export default function App() {
  const [state, setState] = useState(INITIAL);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successLeadId, setSuccessLeadId] = useState(null);

  const quote = useMemo(() => computeQuote(state), [state]);

  const update = (patch) => setState((s) => ({ ...s, ...patch }));

  const canGoNext = (() => {
    if (step === 0) return !!state.service;
    if (step === 1) return !!state.frequency;
    if (step === 2) return state.bedrooms >= 0 && state.bathrooms >= 1;
    if (step === 3) return true;
    if (step === 4) return !!state.bookingDate && !!state.startTime;
    if (step === 5) return (
      state.firstName.trim() &&
      state.lastName.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email) &&
      state.phone.trim() &&
      state.address.trim() &&
      state.postcode.trim()
    );
    return false;
  })();

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        ...state,
        quote, // include pricing snapshot
      };
      // Step 1: persist lead (captures even if Stripe abandons)
      const lead = await api.createLead(payload);
      // Step 2: Stripe checkout session
      const session = await api.createCheckout({
        leadId: lead.id,
        successUrl: `${window.location.origin}/?success=1&lead=${lead.id}`,
        cancelUrl: `${window.location.origin}/?cancelled=1&lead=${lead.id}`,
      });
      if (session?.url) {
        window.top.location.href = session.url;
        return;
      }
      // Fallback: show success without redirect
      setSuccessLeadId(lead.id);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Check URL params for post-Stripe state
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
              Thank you — your deposit is received and your cleaner is on their way to being assigned.
              Check your inbox for the confirmation email.
            </p>
            <a href="/" className="btn btn--primary">Book another</a>
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

  return (
    <div className="app">
      <Brand />
      <div className="shell">
        <div className="card">
          <Progress steps={STEPS} current={step} />
          {error && <div className="error">{error}</div>}
          {postPaymentCancelled && (
            <div className="error" style={{ background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fcd34d' }}>
              Payment cancelled — your details are saved. Finish the booking whenever you're ready.
            </div>
          )}

          {step === 0 && <StepService state={state} update={update} />}
          {step === 1 && <StepFrequency state={state} update={update} />}
          {step === 2 && <StepSize state={state} update={update} />}
          {step === 3 && <StepExtras state={state} update={update} />}
          {step === 4 && <StepDateTime state={state} update={update} />}
          {step === 5 && <StepContact state={state} update={update} />}

          <div className="actions">
            <button
              className="btn btn--ghost"
              onClick={goBack}
              disabled={step === 0 || submitting}
            >
              ← Back
            </button>
            {step < STEPS.length - 1 ? (
              <button className="btn btn--primary" onClick={goNext} disabled={!canGoNext}>
                Continue →
              </button>
            ) : (
              <button
                className="btn btn--primary"
                onClick={handleSubmit}
                disabled={!canGoNext || submitting}
              >
                {submitting ? 'Redirecting…' : 'Pay deposit & book'}
              </button>
            )}
          </div>
        </div>

        <PricePanel state={state} quote={quote} />
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="brand">
      <div className="brand__logo">Cleaniqo</div>
      <div className="brand__badge">Secure booking · Deposit £20% · Free cancellation</div>
    </div>
  );
}
