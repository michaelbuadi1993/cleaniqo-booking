export default function Progress({ steps, current }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div className="progress">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`progress__step ${i < current ? 'progress__step--done' : ''} ${i === current ? 'progress__step--active' : ''}`}
          />
        ))}
      </div>
      <div className="small muted" style={{ marginBottom: 6 }}>
        Step {current + 1} of {steps.length} — {steps[current]}
      </div>
    </div>
  );
}
