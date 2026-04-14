const TIMES = [
  '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00',
];

function todayIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1); // earliest booking = tomorrow
  return d.toISOString().slice(0, 10);
}

export default function StepDateTime({ state, update }) {
  const min = todayIso();
  return (
    <div>
      <h2 className="step-title">When should we come?</h2>
      <p className="step-subtitle">Earliest booking is tomorrow. If we can't make your slot we'll offer the nearest alternative.</p>

      <div className="field-row">
        <div className="field">
          <label className="field__label">Date</label>
          <input
            type="date"
            className="field__input"
            min={min}
            value={state.bookingDate}
            onChange={(e) => update({ bookingDate: e.target.value })}
          />
        </div>
        <div className="field">
          <label className="field__label">Start time</label>
          <select
            className="field__select"
            value={state.startTime}
            onChange={(e) => update({ startTime: e.target.value })}
          >
            <option value="">Pick a time…</option>
            {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
