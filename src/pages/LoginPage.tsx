import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

const LoginPage = () => {
  const [formState, setFormState] = useState({ email: '', password: '' })
  const [selectedRole, setSelectedRole] = useState<'candidate' | 'recruiter'>('candidate')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedRole) {
      setError('Choose whether you are signing in as a candidate or recruiter.')
      return
    }

    login(selectedRole)
    setSubmitted(true)
    setError(null)
    setTimeout(() => {
      navigate('/jobs', { replace: true })
    }, 350)
  }

  return (
    <div className="login">
      <div className="login__panel">
        <div className="login__brand">
          <Link to="/" aria-label="Back to TalentFlow home">
            TalentFlow
          </Link>
        </div>

        <div className="login__content">
          <h1>Welcome back</h1>
          <p>
            Sign in to access the hiring workspace, manage jobs, review
            candidates, and publish new assessments.
          </p>

          <form className="login__form" onSubmit={handleSubmit} noValidate>
            <fieldset className="login__role">
              <legend>Sign in as</legend>
              <label>
                <input
                  type="radio"
                  name="role"
                  value="candidate"
                  checked={selectedRole === 'candidate'}
                  onChange={() => setSelectedRole('candidate')}
                />
                Candidate
              </label>
              <label>
                <input
                  type="radio"
                  name="role"
                  value="recruiter"
                  checked={selectedRole === 'recruiter'}
                  onChange={() => setSelectedRole('recruiter')}
                />
                Recruiter
              </label>
            </fieldset>

            <label htmlFor="email">Work email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
              value={formState.email}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, email: event.target.value }))
              }
            />

            <label htmlFor="password">
              Password <span>(mock login only)</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Enter a secure password"
              value={formState.password}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
            />

            <button type="submit" className="login__submit">
              Continue
            </button>
          </form>

          <p className="login__hint">
            This demo authentication flow doesn&apos;t connect to a backend. Use
            any credentials to get started.
          </p>

          {error && <p className="login__error">{error}</p>}

          {submitted && (
            <div className="login__success" role="status">
              <strong>Success!</strong> You can now proceed to explore the app
              flow defined in the assessment.
            </div>
          )}
        </div>
      </div>

      <aside className="login__aside" aria-label="Assessment highlights">
        <h2>What you&apos;ll unlock</h2>
        <ul>
          <li>25 job postings with drag-and-drop prioritisation</li>
          <li>1,000 candidates ready to triage across stages</li>
          <li>Assessment builder with live preview and validation rules</li>
        </ul>
      </aside>
    </div>
  )
}

export default LoginPage
