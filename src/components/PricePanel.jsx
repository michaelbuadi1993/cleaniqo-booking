import { FREQUENCIES, SERVICES, money } from '../pricing.js';

export default function PricePanel({ state, quote }) {
  const service = SERVICES.find((s) => s.key === state.service);
  const freq = FREQUENCIES.find((f) => f.key === state.frequency);
  const hasService = !!state.service;

  return (
    <aside className="price-panel">
      <div className="price-panel__label">Your quote</div>
      <div className="price-panel__total">{money(quote.total)}</div>
      <div className="price-panel__per">
        {freq && freq.key !== 'one_off' ? `per clean, ${freq.label.toLowerCase()}` : 'per visit'}
      </div>

      <div className="price-panel__divider" />

      {hasService ? (
        <>
          <div className="price-line">
            <span>{service?.label}</span>
            <span className="price-line--value">{money(quote.base)}</span>
          </div>
          {quote.bathSurcharge > 0 && (
            <div className="price-line">
              <span>Extra bathrooms</span>
              <span className="price-line--value">+{money(quote.bathSurcharge)}</span>
            </div>
          )}
          {quote.extras > 0 && (
            <div className="price-line">
              <span>Add-ons ({state.extras.length})</span>
              <span className="price-line--value">+{money(quote.extras)}</span>
            </div>
          )}
          {quote.discount > 0 && (
            <div className="price-line price-line--discount">
              <span>{freq.label} discount ({Math.round(quote.discountPct * 100)}%)</span>
              <span>−{money(quote.discount)}</span>
            </div>
          )}

          <div className="price-deposit">
            <span className="price-deposit__label">Deposit to book</span>
            <span className="price-deposit__value">{money(quote.deposit)}</span>
            {' '}<span className="muted small">· balance on the day</span>
          </div>
        </>
      ) : (
        <div className="muted small">Pick a service to see your price.</div>
      )}

      <div className="price-panel__divider" />
      <div className="small muted">
        Fully insured · Vetted cleaners · 100% satisfaction promise
      </div>
    </aside>
  );
}
