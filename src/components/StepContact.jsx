export default function StepContact({ state, update }) {
  return (
    <div>
      <h2 className="step-title">Where and who?</h2>
      <p className="step-subtitle">Final details — we'll use your email only to confirm the booking.</p>

      <div className="field-row">
        <div className="field">
          <label className="field__label">First name</label>
          <input className="field__input" value={state.firstName} onChange={(e) => update({ firstName: e.target.value })} autoComplete="given-name" />
        </div>
        <div className="field">
          <label className="field__label">Last name</label>
          <input className="field__input" value={state.lastName} onChange={(e) => update({ lastName: e.target.value })} autoComplete="family-name" />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label className="field__label">Email</label>
          <input type="email" className="field__input" value={state.email} onChange={(e) => update({ email: e.target.value })} autoComplete="email" />
        </div>
        <div className="field">
          <label className="field__label">Phone</label>
          <input type="tel" className="field__input" value={state.phone} onChange={(e) => update({ phone: e.target.value })} autoComplete="tel" />
        </div>
      </div>

      <div className="field">
        <label className="field__label">Address</label>
        <input className="field__input" placeholder="Street address, flat number" value={state.address} onChange={(e) => update({ address: e.target.value })} autoComplete="street-address" />
      </div>

      <div className="field-row">
        <div className="field">
          <label className="field__label">Postcode</label>
          <input className="field__input" placeholder="e.g. SW4 7AA" value={state.postcode} onChange={(e) => update({ postcode: e.target.value.toUpperCase() })} autoComplete="postal-code" />
        </div>
        <div className="field">
          <label className="field__label">Borough (optional)</label>
          <input className="field__input" placeholder="e.g. Lambeth" value={state.borough || ''} onChange={(e) => update({ borough: e.target.value })} />
        </div>
      </div>

      <div className="field">
        <label className="field__label">Anything we should know? (optional)</label>
        <textarea className="field__textarea" placeholder="Access code, pets, allergies, eco products, etc." value={state.specialInstructions} onChange={(e) => update({ specialInstructions: e.target.value })} />
      </div>
    </div>
  );
}
