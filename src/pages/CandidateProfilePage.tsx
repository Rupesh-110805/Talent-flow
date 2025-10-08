import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useCandidates } from '../context/CandidatesContext'
import { useJobs } from '../context/JobsContext'
import { useAuth } from '../context/AuthContext'
import './CandidateProfilePage.css'

const timelineDate = (isoDate: string) => format(new Date(isoDate), 'dd MMM yyyy · HH:mm')

const CandidateProfilePage = () => {
  const { candidateId } = useParams()
  const navigate = useNavigate()
  const { role } = useAuth()
  const { getCandidateById, addCandidateNote, mentionSuggestions } = useCandidates()
  const { jobs } = useJobs()

  if (!role) {
    return <Navigate to="/login" replace />
  }

  if (role !== 'recruiter') {
    return <Navigate to="/jobs" replace />
  }

  const candidate = candidateId ? getCandidateById(candidateId) : null

  if (!candidate) {
    return (
      <div className="candidate-profile candidate-profile--empty">
        <div className="candidate-profile__shell">
          <h1>Candidate not found</h1>
          <p>The profile may have been removed or the link is outdated.</p>
          <button type="button" onClick={() => navigate('/jobs')}>
            Back to jobs board
          </button>
        </div>
      </div>
    )
  }

  const job = useMemo(() => jobs.find((entry) => entry.id === candidate.jobId), [candidate.jobId, jobs])

  const [noteContent, setNoteContent] = useState('')
  const [selectedMentions, setSelectedMentions] = useState<string[]>([])
  const [noteError, setNoteError] = useState<string | null>(null)

  const handleAddMention = (mention: string) => {
    setSelectedMentions((prev) => {
      if (prev.includes(mention)) return prev
      return [...prev, mention]
    })
    setNoteContent((prev) => `${prev} ${mention}`.trim())
  }

  const handleSubmitNote = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!noteContent.trim()) {
      setNoteError('Add a note before saving.')
      return
    }
    addCandidateNote(candidate.jobId, candidate.id, {
      content: noteContent.trim(),
      author: 'You',
      mentions: selectedMentions,
    })
    setNoteContent('')
    setSelectedMentions([])
    setNoteError(null)
  }

  return (
    <div className="candidate-profile">
      <div className="candidate-profile__shell">
        <header className="candidate-profile__header">
          <button type="button" onClick={() => navigate(-1)} className="candidate-profile__back">
            ← Back
          </button>
          <div className="candidate-profile__identity">
            <div className="candidate-profile__avatar" aria-hidden>
              {candidate.avatarUrl ? <img src={candidate.avatarUrl} alt="" /> : candidate.name.charAt(0)}
            </div>
            <div>
              <h1>{candidate.name}</h1>
              <p>{candidate.headline}</p>
              <p>{candidate.location}</p>
              <p>{candidate.email}</p>
            </div>
          </div>
          <aside className="candidate-profile__meta">
            <span className={`candidate-profile__stage stage-${candidate.stage}`}>
              {candidate.stage}
            </span>
            {job && (
              <Link to={`/jobs/${job.id}/candidates`} className="candidate-profile__job-link">
                View all candidates
              </Link>
            )}
          </aside>
        </header>

        <section className="candidate-profile__grid">
          <article className="candidate-profile__timeline">
            <h2>Recruiting timeline</h2>
            <ol>
              {candidate.timeline
                .slice()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((entry) => (
                  <li key={entry.id}>
                    <div>
                      <span>{timelineDate(entry.date)}</span>
                      <strong>{entry.stage}</strong>
                    </div>
                    <p>{entry.summary}</p>
                  </li>
                ))}
            </ol>
          </article>

          <aside className="candidate-profile__notes">
            <h2>Notes & handoffs</h2>
            <form onSubmit={handleSubmitNote} className="candidate-profile__note-form">
              <label htmlFor="candidate-note">Add a note</label>
              <textarea
                id="candidate-note"
                placeholder="Summarize the latest touchpoint and @mention collaborators"
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
              />
              {noteError && <p className="candidate-profile__note-error">{noteError}</p>}
              <div className="candidate-profile__mentions">
                <span>Mentions:</span>
                <div>
                  {mentionSuggestions.map((mention) => (
                    <button
                      key={mention}
                      type="button"
                      className={selectedMentions.includes(mention) ? 'is-active' : ''}
                      onClick={() => handleAddMention(mention)}
                    >
                      {mention}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit">Save note</button>
            </form>
            <div className="candidate-profile__note-feed">
              {candidate.notes.map((note) => (
                <article key={note.id}>
                  <header>
                    <p>{note.author}</p>
                    <span>{timelineDate(note.createdAt)}</span>
                  </header>
                  <p>{note.content}</p>
                  {note.mentions.length > 0 && (
                    <ul>
                      {note.mentions.map((mention) => (
                        <li key={mention}>{mention}</li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}

export default CandidateProfilePage
