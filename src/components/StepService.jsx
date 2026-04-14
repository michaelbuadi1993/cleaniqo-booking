import { SERVICES } from '../pricing.js';

export default function StepService({ state, update }) {
  return (
    <div>
      <h2 className="step-title">What kind of clean do you need?</h2>
      <p className="step-subtitle">Pick the service closest to what you're after — you can customise the details next.</p>

      <div className="options">
        {SERVICES.map((s) => {
          const selected = state.service === s.key;
          return (
            <button
              key={s.key}
              className={`option ${selected ? 'option--selected' : ''}`}
              onClick={() => update({ service: s.key })}
            >
              <span className="option__icon">{s.icon}</span>
              <span className="option__title">{s.label}</span>
              <span className="option__desc">{s.desc}</span>
              {s.custom && <span className="option__badge">Custom</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
