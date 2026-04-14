export default function Success({ leadId }) {
  return (
    <div className="card success">
      <div className="success__icon">✓</div>
      <h2 className="success__title">Thanks — we've got your details</h2>
      <p className="success__sub">
        Your enquiry is saved (reference #{leadId}). To secure your slot, we've sent you a secure Stripe link by email — your card will be saved but not charged until after your clean.
      </p>
      <a href="/" className="btn btn--primary">Start a new booking</a>
    </div>
  );
}
