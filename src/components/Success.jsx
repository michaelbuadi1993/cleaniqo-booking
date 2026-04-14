export default function Success({ leadId }) {
  return (
    <div className="card success">
      <div className="success__icon">✓</div>
      <h2 className="success__title">Thanks — we've got your details</h2>
      <p className="success__sub">
        Your enquiry is saved (reference #{leadId}). If you'd like to confirm your slot now, we've sent you a secure payment link by email.
      </p>
      <a href="/" className="btn btn--primary">Start a new booking</a>
    </div>
  );
}
