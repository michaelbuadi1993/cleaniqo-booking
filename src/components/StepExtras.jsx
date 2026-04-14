import { EXTRAS, money } from '../pricing.js';

export default function StepExtras({ state, update }) {
  const toggle = (key) => {
    const next = state.extras.includes(key)
      ? state.extras.filter((k) => k !== key)
      : [...state.extras, key];
    update({ extras: next });
  };

  return (
    <div>
      <h2 className="step-title">Any add-ons?</h2>
      <p className="step-subtitle">Pick anything that needs a bit of extra love. You can skip this entirely.</p>

      <div className="options">
        {EXTRAS.map((e) => {
          const selected = state.extras.includes(e.key);
          return (
            <button
              key={e.key}
              className={`option ${selected ? 'option--selected' : ''}`}
              onClick={() => toggle(e.key)}
            >
              <span className="option__icon">{e.icon}</span>
              <span className="option__title">{e.label}</span>
              <span className="option__price">+{money(e.price)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
