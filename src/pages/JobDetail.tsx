import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useJobs } from '../context/JobsContext'
import './JobDetail.css'

const JobDetail = () => {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { role } = useAuth()
  const { jobs, appliedJobIds, applyToJob } = useJobs()

  if (!role) {
    return <Navigate to="/login" replace />
  }

  const job = jobs.find((entry) => entry.id === jobId)

  if (!job) {
    return (
      <div className="job-detail job-detail--empty">
        <div className="job-detail__shell">
          <h1>We couldn&apos;t find that job.</h1>
          <p>The listing might have been archived or removed. Explore other roles instead.</p>
          <button type="button" onClick={() => navigate('/jobs')}>
            Back to jobs board
          </button>
        </div>
      </div>
    )
  }

  const isApplied = appliedJobIds.has(job.id)

  return (
    <div className="job-detail">
      <div className="job-detail__shell">
        <button type="button" className="job-detail__back" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <header className="job-detail__header">
          <div className="job-detail__identity">
            <div className="job-detail__avatar" aria-hidden>
              {job.company.charAt(0)}
            </div>
            <div>
              <p className="job-detail__company">{job.company}</p>
              <h1>{job.title}</h1>
            </div>
          </div>
          <div className="job-detail__status">
            <span className={job.status === 'archived' ? 'job-detail__pill is-archived' : 'job-detail__pill is-open'}>
              {job.status === 'archived' ? 'Archived' : 'Open role'}
            </span>
            {role === 'candidate' && isApplied && <span className="job-detail__pill is-applied">Applied</span>}
          </div>
        </header>

        <div className="job-detail__tags">
          <span>{job.workArrangement}</span>
          <span>{job.graduatingBatch}</span>
          <span>{job.compensation}</span>
        </div>

        <section className="job-detail__grid">
          <dl>
            <div>
              <dt>Deadline</dt>
              <dd>{job.deadline}</dd>
            </div>
            <div>
              <dt>Date posted</dt>
              <dd>{job.postedOn}</dd>
            </div>
            <div>
              <dt>CGPA</dt>
              <dd>{job.cgpaCutoff}</dd>
            </div>
            <div>
              <dt>Backlogs</dt>
              <dd>{job.backlogsPolicy}</dd>
            </div>
            <div>
              <dt>Departments</dt>
              <dd>{job.departments.join(', ')}</dd>
            </div>
          </dl>

          <aside>
            <h2>Summary</h2>
            <ul>
              {job.stipend && <li><strong>Stipend:</strong> {job.stipend}</li>}
              {job.internshipDetail && <li>{job.internshipDetail}</li>}
              {job.bondDetail && <li>{job.bondDetail}</li>}
            </ul>
          </aside>
        </section>

        <article className="job-detail__content">
          <section>
            <h2>Job description</h2>
            <p>{job.description}</p>
          </section>

          <section>
            <h2>Qualification</h2>
            <p>{job.qualification}</p>
          </section>
        </article>

        {role === 'candidate' && (
          <button
            type="button"
            className="job-detail__apply"
            disabled={isApplied || job.status === 'archived'}
            onClick={() => applyToJob(job.id)}
          >
            {isApplied ? 'Already applied' : job.status === 'archived' ? 'Unavailable' : 'Apply for this role'}
          </button>
        )}

        {role === 'recruiter' && (
          <div className="job-detail__recruiter-note">
            <div className="job-detail__recruiter-controls">
              <Link to={`/jobs/${job.id}/builder`} className="job-detail__recruiter-link">
                Open assessment builder
              </Link>
              <Link to={`/jobs/${job.id}/candidates`} className="job-detail__recruiter-link">
                Open candidate workspace
              </Link>
            </div>
            <p>
              Use the builder to customize screening questions. Candidates will see the apply button below when
              the role is open.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default JobDetail
