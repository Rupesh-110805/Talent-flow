import { Link } from 'react-router-dom'
import './LandingPage.css'

const LandingPage = () => {
  return (
    <div className="landing">
      <header className="landing__hero">
        <nav className="landing__nav">
          <span className="landing__brand">TalentFlow</span>
          <div className="landing__nav-links">
            <Link to="/jobs" className="landing__nav-link landing__nav-link--secondary">
              Jobs board
            </Link>
            <Link to="/login" className="landing__nav-link">
              Login
            </Link>
          </div>
        </nav>
        <div className="landing__hero-content">
          <p className="landing__badge">Mini hiring platform challenge</p>
          <h1>
            Streamline hiring decisions with structured assessments and a single
            source of truth.
          </h1>
          <p className="landing__subtitle">
            TalentFlow empowers your recruitment team to plan roles, assess
            candidates, and collaborate from application to offer without
            wrestling multiple tools.
          </p>
          <div className="landing__cta-group">
            <Link to="/login" className="landing__cta-primary">
              Go to Login
            </Link>
            <Link to="/jobs" className="landing__cta-secondary">
              Browse jobs board
            </Link>
          </div>
          <dl className="landing__stats">
            <div>
              <dt>Jobs tracked</dt>
              <dd>25 active</dd>
            </div>
            <div>
              <dt>Candidates managed</dt>
              <dd>1,000+</dd>
            </div>
            <div>
              <dt>Assessment library</dt>
              <dd>30+ templates</dd>
            </div>
          </dl>
        </div>
      </header>

      <section id="features" className="landing__section">
        <h2>Everything your hiring squad needs</h2>
        <div className="landing__feature-grid">
          <article>
            <h3>Smart job board</h3>
            <p>
              Create, prioritise, and archive requisitions with drag-and-drop
              ordering and deep links for quick sharing.
            </p>
          </article>
          <article>
            <h3>Pipeline visibility</h3>
            <p>
              Monitor candidate progress across stages with virtualised lists,
              Kanban moves, and collaborative notes.
            </p>
          </article>
          <article>
            <h3>Assessment builder</h3>
            <p>
              Compose rich question sets, preview the candidate experience, and
              capture responses with local-first persistence.
            </p>
          </article>
        </div>
      </section>

      <section id="showcase" className="landing__section landing__section--alt">
        <div className="landing__showcase">
          <div>
            <h2>Purpose-built for the assessment brief</h2>
            <p>
              TalentFlow mirrors the specification provided in your assignment,
              giving recruiters a realistic demo environment to evaluate the
              full flow from role design to candidate feedback.
            </p>
            <ul className="landing__bullets">
              <li>Mock API backed by IndexedDB for offline-friendly data.</li>
              <li>Optimistic UI with graceful rollback when errors occur.</li>
              <li>Accessible components and responsive layouts out of the box.</li>
            </ul>
          </div>
          <div className="landing__card">
            <h3>Recruiter spotlight</h3>
            <p>
              “We finally have a single workspace to coordinate hiring
              activities. Assessments, pipeline insights, and feedback now live
              together.”
            </p>
            <span>— Alex, Lead Recruiter</span>
          </div>
        </div>
      </section>

      <footer className="landing__footer">
        <p>© {new Date().getFullYear()} TalentFlow. Built for the mini hiring platform assessment.</p>
        <div className="landing__footer-links">
          <a href="#features">Features</a>
          <Link to="/login">Login</Link>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
