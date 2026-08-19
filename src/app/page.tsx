export default function HomePage() {
  return (
    <>
      <h2>Registration, collected once</h2>
      <p className="lede">
        The registration slice for the pilot club: a family enters a player&rsquo;s details one
        time, deterministic rules say immediately what is missing, and the club hands the
        governing body a complete submission instead of a guess that errors and comes back weeks
        later.
      </p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Registrar</h3>
        <p className="hint" style={{ marginTop: 0 }}>
          The season queue: who is ready, who is blocked, and which rule is holding up the most
          registrations.
        </p>
        <p style={{ marginBottom: 0 }}>
          <a className="button" href="/registrar">
            Open the queue
          </a>
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>New registration</h3>
        <p className="hint" style={{ marginTop: 0 }}>
          The family form — legal name and preferred name kept apart, guardian required for a
          minor, and the three consents recorded separately.
        </p>
        <p style={{ marginBottom: 0 }}>
          <a className="button secondary" href="/register">
            Start a registration
          </a>
        </p>
      </div>
    </>
  );
}
