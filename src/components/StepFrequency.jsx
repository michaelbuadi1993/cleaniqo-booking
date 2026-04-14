import { FREQUENCIES } from '../pricing.js';

export default function StepFrequency({ state, update }) {
  return (
    <div>
      <h2 className="step-title">How often should we clean?</h2>
      <p className="step-subtitle">Regular cleans are cheaper per visit — you save the most going weekly.</p>

      <div className="options">
        {FREQUENCIES.map((f) => {
          const selected = state.frequency === f.key;
          return (
            <button
              key={f.key}
              className={`option ${selected ? 'option--selected' : ''}`}
              onClick={() => update({ frequency: f.key })}
            >
              <span className="option__title">{f.label}</span>
              <span className="option__desc">{f.desc}</span>
              {f.badge && <span className="option__badge">{f.badge}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
