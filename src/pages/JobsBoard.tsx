import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useJobs } from '../context/JobsContext'
import './JobsBoard.css'

type StatusFilter = 'all' | 'open' | 'archived'
const PAGE_SIZE = 6

const JobsBoard = () => {
  const { role, logout } = useAuth()
  const { jobs, appliedJobIds, addJob, applyToJob, toggleArchive } = useJobs()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')
  const [showAppliedOnly, setShowAppliedOnly] = useState(false)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [composerError, setComposerError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const filteredJobs = useMemo(() => {
    if (!role) {
      return jobs
    }
    const normalizedQuery = searchTerm.trim().toLowerCase()
    return jobs.filter((job) => {
      const matchesText = normalizedQuery
        ? [
            job.title,
            job.company,
            job.description,
            job.qualification,
            job.departments.join(' '),
          ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery)
        : true

      const matchesStatus =
        statusFilter === 'all' ? true : job.status === statusFilter

      const matchesApplied =
        role === 'candidate' && showAppliedOnly
          ? appliedJobIds.has(job.id)
          : true

      return matchesText && matchesStatus && matchesApplied
    })
  }, [appliedJobIds, jobs, role, searchTerm, showAppliedOnly, statusFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [role, searchTerm, showAppliedOnly, statusFilter])

  useEffect(() => {
    if (filteredJobs.length === 0) {
      setCurrentPage((prev) => (prev === 1 ? prev : 1))
      return
    }
    const lastPage = Math.ceil(filteredJobs.length / PAGE_SIZE)
    setCurrentPage((prev) => {
      if (prev > lastPage) {
        return lastPage
      }
      return prev
    })
  }, [filteredJobs])

  const totalPages = filteredJobs.length > 0 ? Math.ceil(filteredJobs.length / PAGE_SIZE) : 0

  const visibleJobs = useMemo(() => {
    if (filteredJobs.length === 0) {
      return []
    }
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredJobs.slice(start, start + PAGE_SIZE)
  }, [currentPage, filteredJobs])

  if (!role) {
    return <Navigate to="/login" replace />
  }

  const handleApply = (jobId: string) => {
    applyToJob(jobId)
  }

  const handleComposerSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    const company = data.get('company')?.toString().trim() ?? ''
    const title = data.get('title')?.toString().trim() ?? ''
    const workArrangement = data.get('workArrangement')?.toString().trim() ?? ''
    const graduatingBatch = data.get('graduatingBatch')?.toString().trim() ?? ''
    const compensation = data.get('compensation')?.toString().trim() ?? ''
    const deadline = data.get('deadline')?.toString().trim() ?? ''
    const postedOn = data.get('postedOn')?.toString().trim() ?? ''
    const cgpaCutoff = data.get('cgpaCutoff')?.toString().trim() ?? ''
    const backlogsPolicy = data.get('backlogsPolicy')?.toString().trim() ?? ''
    const departmentsInput = data.get('departments')?.toString().trim() ?? ''
    const stipend = data.get('stipend')?.toString().trim() ?? undefined
    const internshipDetail = data.get('internshipDetail')?.toString().trim() ?? undefined
    const bondDetail = data.get('bondDetail')?.toString().trim() ?? undefined
    const description = data.get('description')?.toString().trim() ?? ''
    const qualification = data.get('qualification')?.toString().trim() ?? ''

    if (!company || !title || !compensation || !description || !qualification) {
      setComposerError('Company, title, compensation, description, and qualification are required.')
      return
    }

    const departments = departmentsInput
      .split(',')
      .map((dept) => dept.trim())
      .filter(Boolean)

    addJob({
      company,
      title,
      workArrangement: workArrangement || 'Full Time',
      graduatingBatch: graduatingBatch || '2025/2026',
      compensation,
      deadline: deadline || 'Rolling application',
      postedOn: postedOn || 'Just now',
      cgpaCutoff: cgpaCutoff || 'Flexible',
      backlogsPolicy: backlogsPolicy || 'Case-by-case',
      departments: departments.length ? departments : ['All Departments'],
      stipend,
      internshipDetail,
      bondDetail,
      description,
      qualification,
    })

    event.currentTarget.reset()
    setComposerError(null)
    setIsComposerOpen(false)
  }

  return (
    <div className="jobs-board">
      <div className="jobs-board__shell">
        <header className="jobs-board__header">
          <div>
            <p className="jobs-board__eyebrow">TalentFlow workspace</p>
            <h1>Jobs board</h1>
            <p className="jobs-board__subtitle">
              {role === 'recruiter'
                ? 'Review requisitions, publish new openings, and keep candidates informed.'
                : 'Browse open roles and apply to positions that match your goals.'}
            </p>
          </div>
          <div className="jobs-board__actions">
            {role === 'candidate' && (
              <label className="jobs-board__toggle">
                <input
                  type="checkbox"
                  checked={showAppliedOnly}
                  onChange={(event) => setShowAppliedOnly(event.target.checked)}
                />
                <span>Show only applied roles</span>
              </label>
            )}
            {role === 'recruiter' && (
              <button
                type="button"
                className="jobs-board__cta"
                onClick={() => setIsComposerOpen(true)}
              >
                + Add job
              </button>
            )}
            <Link to="/profile" className="jobs-board__profile">
              Profile
            </Link>
            <button type="button" className="jobs-board__logout" onClick={logout}>
              Log out
            </button>
          </div>
        </header>

        <div className="jobs-board__filters">
          <div className="jobs-board__search">
            <label htmlFor="job-search" className="visually-hidden">
              Search jobs
            </label>
            <input
              id="job-search"
              type="search"
              placeholder="Search by title, company, or keywords"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="jobs-board__status">
            {(['all', 'open', 'archived'] satisfies StatusFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={
                  filter === statusFilter ? 'jobs-board__status-btn is-active' : 'jobs-board__status-btn'
                }
              >
                {filter === 'all' ? 'All roles' : filter === 'open' ? 'Open roles' : 'Archived'}
              </button>
            ))}
          </div>
        </div>

        <section className="jobs-board__list" aria-live="polite">
          {filteredJobs.length === 0 ? (
            <div className="jobs-board__empty">
              <h2>No roles match your filters</h2>
              <p>Try adjusting your search terms or reset the filters.</p>
            </div>
          ) : (
            visibleJobs.map((job) => {
              const isApplied = appliedJobIds.has(job.id)
              const isArchived = job.status === 'archived'
              return (
                <article key={job.id} className="job-card">
                  <header className="job-card__header">
                    <div className="job-card__identity">
                      <div className="job-card__avatar" aria-hidden>
                        {job.company.charAt(0)}
                      </div>
                      <div>
                        <p className="job-card__company">{job.company}</p>
                        <Link to={`/jobs/${job.id}`} className="job-card__title">
                          {job.title}
                        </Link>
                      </div>
                    </div>
                    <div className="job-card__status">
                      <span className={isArchived ? 'job-card__pill is-archived' : 'job-card__pill is-open'}>
                        {isArchived ? 'Archived' : 'Open'}
                      </span>
                      {role === 'candidate' && isApplied && (
                        <span className="job-card__pill is-applied">Applied</span>
                      )}
                    </div>
                  </header>

                  <div className="job-card__meta">
                    <span>{job.workArrangement}</span>
                    <span>{job.graduatingBatch}</span>
                    <span>{job.compensation}</span>
                  </div>

                  <dl className="job-card__details">
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

                  {(job.stipend || job.internshipDetail || job.bondDetail) && (
                    <div className="job-card__notes">
                      {job.stipend && <p><strong>Stipend:</strong> {job.stipend}</p>}
                      {job.internshipDetail && <p>{job.internshipDetail}</p>}
                      {job.bondDetail && <p>{job.bondDetail}</p>}
                    </div>
                  )}

                  <section className="job-card__body">
                    <h3>Job description</h3>
                    <p>{job.description}</p>
                    <h3>Qualification</h3>
                    <p>{job.qualification}</p>
                  </section>

                  <footer className="job-card__footer">
                    <Link to={`/jobs/${job.id}`}>View full details →</Link>
                    {role === 'candidate' ? (
                      <button
                        type="button"
                        className="job-card__apply"
                        disabled={isApplied || isArchived}
                        onClick={() => handleApply(job.id)}
                      >
                        {isApplied ? 'Already applied' : isArchived ? 'Unavailable' : 'Apply now'}
                      </button>
                    ) : (
                      <div className="job-card__recruiter-actions">
                        <Link to={`/jobs/${job.id}/builder`} className="job-card__manage">
                          Assessment builder
                        </Link>
                        <Link to={`/jobs/${job.id}/candidates`} className="job-card__manage">
                          Candidate workspace
                        </Link>
                        <button
                          type="button"
                          className="job-card__archive"
                          onClick={() => toggleArchive(job.id)}
                        >
                          {isArchived ? 'Unarchive role' : 'Archive role'}
                        </button>
                      </div>
                    )}
                  </footer>
                </article>
              )
            })
          )}
        </section>

        {totalPages > 1 && (
          <nav className="jobs-board__pagination" aria-label="Pagination">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <ul>
              {Array.from({ length: totalPages }, (_, index) => {
                const page = index + 1
                return (
                  <li key={page}>
                    <button
                      type="button"
                      className={page === currentPage ? 'is-active' : ''}
                      onClick={() => setCurrentPage(page)}
                      aria-current={page === currentPage ? 'page' : undefined}
                    >
                      {page}
                    </button>
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </nav>
        )}
      </div>

      {isComposerOpen && role === 'recruiter' && (
        <div className="jobs-board__composer" role="dialog" aria-modal="true">
          <div className="jobs-board__composer-panel">
            <header>
              <h2>Create a new job</h2>
              <p>Capture the essentials so candidates know if it&apos;s a match.</p>
            </header>
            <form className="jobs-board__composer-form" onSubmit={handleComposerSubmit}>
              <div className="jobs-board__composer-row">
                <label>
                  Company name*
                  <input name="company" placeholder="Acme Corp" required />
                </label>
                <label>
                  Role title*
                  <input name="title" placeholder="Senior Frontend Engineer" required />
                </label>
              </div>

              <div className="jobs-board__composer-row">
                <label>
                  Work arrangement
                  <input name="workArrangement" placeholder="Full Time · Hybrid" />
                </label>
                <label>
                  Graduating batch
                  <input name="graduatingBatch" placeholder="2026" />
                </label>
              </div>

              <div className="jobs-board__composer-row">
                <label>
                  Compensation package*
                  <input name="compensation" placeholder="CTC: 15 LPA + bonus" required />
                </label>
                <label>
                  Stipend / internship detail
                  <input name="stipend" placeholder="₹40,000 internship stipend" />
                </label>
              </div>

              <div className="jobs-board__composer-row">
                <label>
                  Deadline
                  <input name="deadline" placeholder="18 Oct 2025 · 18:00" />
                </label>
                <label>
                  Posted on
                  <input name="postedOn" placeholder="05 Oct 2025 · 09:15" />
                </label>
              </div>

              <div className="jobs-board__composer-row">
                <label>
                  CGPA requirement
                  <input name="cgpaCutoff" placeholder="6.5 CGPA" />
                </label>
                <label>
                  Backlog policy
                  <input name="backlogsPolicy" placeholder="No active backlogs" />
                </label>
              </div>

              <label>
                Eligible departments (comma separated)
                <input name="departments" placeholder="CSE, ECE, IT" />
              </label>

              <label>
                Internship or bond detail
                <input name="internshipDetail" placeholder="6 months internship + PPO" />
              </label>

              <label>
                Bond / Service contract detail
                <input name="bondDetail" placeholder="1 year service agreement" />
              </label>

              <label>
                Job description*
                <textarea
                  name="description"
                  placeholder="Outline responsibilities, tools, and team rituals."
                  required
                  rows={4}
                />
              </label>

              <label>
                Qualification*
                <textarea
                  name="qualification"
                  placeholder="List the skills, experiences, and traits that signal success."
                  required
                  rows={4}
                />
              </label>

              {composerError && <p className="jobs-board__composer-error">{composerError}</p>}

              <div className="jobs-board__composer-footer">
                <button type="button" onClick={() => setIsComposerOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="jobs-board__composer-submit">
                  Publish role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default JobsBoard
