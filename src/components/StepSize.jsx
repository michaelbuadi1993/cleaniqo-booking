import { bedroomLabel } from '../pricing.js';

function Stepper({ label, sub, value, onChange, min = 0, max = 6 }) {
  return (
    <div className="stepper">
      <div>
        <div className="stepper__label">{label}</div>
        <div className="stepper__sub">{sub}</div>
      </div>
      <div className="stepper__controls">
        <button
          className="stepper__btn"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >−</button>
        <span className="stepper__value">{value}</span>
        <button
          className="stepper__btn"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
        >+</button>
      </div>
    </div>
  );
}

export default function StepSize({ state, update }) {
  return (
    <div>
      <h2 className="step-title">How big is your home?</h2>
      <p className="step-subtitle">
        A quick headcount lets us send the right team and tools. {state.bedrooms === 0 && '(0 bedrooms = studio or house share room)'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Stepper
          label="Bedrooms"
          sub={bedroomLabel(state.bedrooms)}
          value={state.bedrooms}
          onChange={(v) => update({ bedrooms: v })}
          min={0}
          max={6}
        />
        <Stepper
          label="Bathrooms"
          sub={state.bathrooms === 1 ? '1 bathroom (included)' : `${state.bathrooms} bathrooms`}
          value={state.bathrooms}
          onChange={(v) => update({ bathrooms: v })}
          min={1}
          max={6}
        />
      </div>
    </div>
  );
}
