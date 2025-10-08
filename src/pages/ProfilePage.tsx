import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './ProfilePage.css'

type CandidateProfile = {
  avatarUrl: string
  details: {
    fullName: string
    personalEmail: string
    phoneNumber: string
    degree: string
    dateOfBirth: string
    address: string
    country: string
    gender: string
  }
  education: {
    batch: string
    department: string
    registrationNumber: string
    rollNumber: string
    gapYear: string
    disabilityStatus: string
  }
  academic: {
    tenthPercent: string
    twelfthPercent: string
    cgpa: string
    activeBacklogs: string
  }
  documents: {
    aadharUrl: string
    panUrl: string
    tenthMarksheetUrl: string
    twelfthMarksheetUrl: string
    resumeUrl: string
  }
  platforms: PlatformLink[]
}

type PlatformLink = {
  id: string
  platform: string
  url: string
}

type RecruiterProfile = {
  fullName: {
    first: string
    middle: string
    last: string
  }
  avatarUrl: string
  jobTitle: string
  recruiterId: string
  phones: {
    office: string
    mobile: string
  }
  professionalEmail: string
  secondaryEmail: string
  location: string
  timeZone: string
  language: string
  emergencyContact: string
  alternateContact: string
  manager: string
  backupRecruiters: string
}

type ProfileShape = CandidateProfile | RecruiterProfile

type CandidateSection = 'details' | 'education' | 'academic' | 'documents'

const STORAGE_KEYS = {
  candidate: 'talentflow:candidate-profile',
  recruiter: 'talentflow:recruiter-profile',
} as const

const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const createPlatformId = () => {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }
  return `platform-${Math.random().toString(36).slice(2, 11)}`
}

const normalizeCandidateProfile = (input?: Partial<CandidateProfile>): CandidateProfile => {
  const academicInput = input?.academic ?? {}
  const { resumeUrl: legacyResume, ...restAcademic } = academicInput as Record<string, unknown>

  const normalizedDocuments = {
    ...defaultCandidateProfile.documents,
    ...(input?.documents ?? {}),
  }

  if (typeof legacyResume === 'string' && legacyResume.trim() && !normalizedDocuments.resumeUrl.trim()) {
    normalizedDocuments.resumeUrl = legacyResume
  }

  return {
    ...defaultCandidateProfile,
    ...input,
    avatarUrl: input?.avatarUrl?.trim() ? input.avatarUrl : defaultCandidateProfile.avatarUrl,
    details: {
      ...defaultCandidateProfile.details,
      ...(input?.details ?? {}),
    },
    education: {
      ...defaultCandidateProfile.education,
      ...(input?.education ?? {}),
    },
    academic: {
      ...defaultCandidateProfile.academic,
      ...(restAcademic as Partial<CandidateProfile['academic']>),
    },
    documents: normalizedDocuments,
    platforms:
      input?.platforms && input.platforms.length > 0
        ? input.platforms.map((entry) => ({
            id: entry.id ?? createPlatformId(),
            platform: entry.platform ?? '',
            url: entry.url ?? '',
          }))
        : defaultCandidateProfile.platforms,
  }
}

const normalizeRecruiterProfile = (input?: Partial<RecruiterProfile>): RecruiterProfile => {
  return {
    ...defaultRecruiterProfile,
    ...input,
    avatarUrl: input?.avatarUrl?.trim() ? input.avatarUrl : defaultRecruiterProfile.avatarUrl,
    fullName: {
      ...defaultRecruiterProfile.fullName,
      ...(input?.fullName ?? {}),
    },
    phones: {
      ...defaultRecruiterProfile.phones,
      ...(input?.phones ?? {}),
    },
  }
}

const getNormalizedProfile = (role: 'candidate' | 'recruiter', raw?: ProfileShape | null): ProfileShape => {
  if (role === 'candidate') {
    return normalizeCandidateProfile(raw as Partial<CandidateProfile> | undefined)
  }
  return normalizeRecruiterProfile(raw as Partial<RecruiterProfile> | undefined)
}

const defaultCandidateProfile: CandidateProfile = {
  avatarUrl:
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=60',
  details: {
    fullName: 'NIDADAVOLU Sri Sai Rupesh',
    personalEmail: 'mymail110805@gmail.com',
    phoneNumber: '7386367987',
    degree: 'B.Tech',
    dateOfBirth: '2005-08-11',
    address: 'Flat no:- G-3, Sri Sai Durga Residency, Telecom Nagar Road, Near RTO Office, Guntur',
    country: 'India',
    gender: 'Male',
  },
  education: {
    batch: '2026',
    department: 'Computer Science and Engineering',
    registrationNumber: '22U10493',
    rollNumber: '22CS8123',
    gapYear: '0',
    disabilityStatus: 'No',
  },
  academic: {
    tenthPercent: '92.33',
    twelfthPercent: '94.9',
    cgpa: '7.44',
    activeBacklogs: 'No',
  },
  documents: {
    aadharUrl:
      'https://drive.google.com/file/d/1gHRs7eDmmcTU5UKg_R3KaSsdzBfKLIq4/view?usp=drive_link',
    panUrl:
      'https://drive.google.com/file/d/1V06x6uG2YAzjEWYcaSBL2ACGsMVT7nmH/view?usp=drive_link',
    tenthMarksheetUrl:
      'https://drive.google.com/file/d/1MpB2O4j5ZQlusl8MYe8cnd569tIBxV9v/view?usp=drive_link',
    twelfthMarksheetUrl:
      'https://drive.google.com/file/d/1HPZfGGB015O_jUhkjVbJJI8m9gFjud95/view?usp=drive_link',
    resumeUrl:
      'https://drive.google.com/file/d/16-EF4OUXmlQwor6wTlU6UU8l5XsF2KPL/view?usp=sharing',
  },
  platforms: [
    { id: 'github', platform: 'GitHub', url: 'https://github.com/username' },
  ],
}

const defaultRecruiterProfile: RecruiterProfile = {
  fullName: {
    first: 'Alex',
    middle: 'J.',
    last: 'Morgan',
  },
  avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=240&q=60',
  jobTitle: 'Senior Technical Recruiter · L5',
  recruiterId: 'RC-2048',
  phones: {
    office: '+1 (555) 210-4490',
    mobile: '+1 (555) 989-2210',
  },
  professionalEmail: 'alex.morgan@talentflow.io',
  secondaryEmail: 'talentflow-recruit@protonmail.com',
  location: 'India · Hyderabad Delivery Center',
  timeZone: 'IST (UTC +05:30)',
  language: 'English',
  emergencyContact: 'Jordan Smith · +1 (555) 509-8800',
  alternateContact: 'Priya Verma · priya@talentflow.io',
  manager: 'Morgan Lee · Director of Recruiting',
  backupRecruiters:
    'New grad engineering · Priya Verma | Data roles · Jordan Smith | GTM hires · Christian Bale',
}

type CandidateFieldMeta = {
  label: string
  key: keyof CandidateProfile['details']
  locked?: boolean
  type?: 'text' | 'date'
}

const detailMeta: CandidateFieldMeta[] = [
  { label: 'Name', key: 'fullName' },
  { label: 'Personal Email', key: 'personalEmail' },
  { label: 'Phone Number', key: 'phoneNumber' },
  { label: 'Degree*', key: 'degree', locked: true },
  { label: 'Date of Birth (yyyy-mm-dd)', key: 'dateOfBirth', type: 'date' },
  { label: 'Address', key: 'address' },
  { label: 'Country', key: 'country' },
  { label: 'Gender*', key: 'gender', locked: true },
]

const ProfilePage = () => {
  const { role } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [profile, setProfile] = useState<ProfileShape | null>(null)
  const [draft, setDraft] = useState<ProfileShape | null>(null)

  useEffect(() => {
    if (!role) return
    const key = STORAGE_KEYS[role]
    if (typeof window === 'undefined') return
    let nextProfile: ProfileShape | null = null
    const stored = window.localStorage.getItem(key)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ProfileShape
        nextProfile = getNormalizedProfile(role, parsed)
      } catch (err) {
        console.warn('Failed to parse stored profile', err)
      }
    }

    if (!nextProfile) {
      nextProfile = getNormalizedProfile(role)
    }

    const snapshot = deepClone(nextProfile)
    setProfile(snapshot)
    setDraft(deepClone(snapshot))
  }, [role])

  useEffect(() => {
    if (!role || !profile || typeof window === 'undefined') return
    const key = STORAGE_KEYS[role]
    window.localStorage.setItem(key, JSON.stringify(profile))
  }, [profile, role])

  const candidateDraft = useMemo(() => (role === 'candidate' ? (draft as CandidateProfile | null) : null), [draft, role])
  const recruiterDraft = useMemo(() => (role === 'recruiter' ? (draft as RecruiterProfile | null) : null), [draft, role])

  if (!role) {
    return <Navigate to="/login" replace />
  }

  if (!draft || !profile) {
    return (
      <div className="profile-page profile-page--loading">
        <div className="profile-page__shell">
          <p>Loading profile…</p>
        </div>
      </div>
    )
  }

  const handleCandidateChange = (section: CandidateSection, field: string, value: string) => {
    setDraft((prev) => {
      if (!prev || role !== 'candidate') return prev
      return {
        ...prev,
        [section]: {
          ...(prev as CandidateProfile)[section],
          [field]: value,
        },
      }
    })
  }

  const handlePlatformChange = (id: string, field: keyof PlatformLink, value: string) => {
    if (role !== 'candidate') return
    setDraft((prev) => {
      if (!prev) return prev
      const current = (prev as CandidateProfile).platforms
      const updated = current.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
      return {
        ...(prev as CandidateProfile),
        platforms: updated,
      }
    })
  }

  const addPlatform = () => {
    if (role !== 'candidate') return
    setDraft((prev) => {
      if (!prev) return prev
      const current = (prev as CandidateProfile).platforms
      if (current.length >= 5) return prev
      const next: PlatformLink = {
        id: createPlatformId(),
        platform: '',
        url: '',
      }
      return {
        ...(prev as CandidateProfile),
        platforms: [...current, next],
      }
    })
  }

  const removePlatform = (id: string) => {
    if (role !== 'candidate') return
    setDraft((prev) => {
      if (!prev) return prev
      const filtered = (prev as CandidateProfile).platforms.filter((entry) => entry.id !== id)
      return {
        ...(prev as CandidateProfile),
        platforms: filtered,
      }
    })
  }

  const handleCandidateAvatarChange = (value: string) => {
    if (role !== 'candidate') return
    setDraft((prev) => {
      if (!prev) return prev
      return {
        ...(prev as CandidateProfile),
        avatarUrl: value,
      }
    })
  }

  const handleRecruiterChange = (field: keyof RecruiterProfile, value: string) => {
    setDraft((prev) => {
      if (!prev || role !== 'recruiter') return prev
      if (field === 'fullName') {
        return prev
      }
      if (field === 'phones') {
        return prev
      }
      return {
        ...(prev as RecruiterProfile),
        [field]: value,
      }
    })
  }

  const handleRecruiterNestedChange = (field: 'fullName' | 'phones', key: string, value: string) => {
    setDraft((prev) => {
      if (!prev || role !== 'recruiter') return prev
      return {
        ...(prev as RecruiterProfile),
        [field]: {
          ...(prev as RecruiterProfile)[field],
          [key]: value,
        },
      }
    })
  }

  const handleCancel = () => {
    setDraft(deepClone(profile))
    setIsEditing(false)
    setError(null)
  }

  const handleSave = () => {
    if (!draft) return
    if (role === 'candidate') {
      const candidate = draft as CandidateProfile
      const hasGithub = candidate.platforms.some((link) =>
        link.platform.toLowerCase().includes('github') && link.url.trim() !== '',
      )
      if (!hasGithub) {
        setError('Please provide a GitHub profile link (marked with *).')
        return
      }
    }
    const nextProfile = deepClone(draft)
    setProfile(nextProfile)
    setDraft(deepClone(nextProfile))
    setIsEditing(false)
    setError(null)
  }

  return (
    <div className="profile-page">
      <div className="profile-page__shell">
        <header className="profile-page__header">
          <div>
            <p className="profile-page__eyebrow">Account</p>
            <h1>Profile</h1>
          </div>
          <div className="profile-page__header-actions">
            <Link to="/jobs" className="profile-page__link">
              ← Back to jobs board
            </Link>
            {!isEditing ? (
              <button type="button" className="profile-page__edit" onClick={() => setIsEditing(true)}>
                Edit
              </button>
            ) : (
              <div className="profile-page__edit-actions">
                <button type="button" onClick={handleCancel}>
                  Cancel
                </button>
                <button type="button" className="is-primary" onClick={handleSave}>
                  Save changes
                </button>
              </div>
            )}
          </div>
        </header>

        {error && <div className="profile-page__error">{error}</div>}

        {role === 'candidate' && candidateDraft && (
          <CandidateProfileView
            profile={candidateDraft}
            isEditing={isEditing}
            onChange={handleCandidateChange}
            onPlatformChange={handlePlatformChange}
            onAddPlatform={addPlatform}
            onRemovePlatform={removePlatform}
            onAvatarChange={handleCandidateAvatarChange}
          />
        )}

        {role === 'recruiter' && recruiterDraft && (
          <RecruiterProfileView
            profile={recruiterDraft}
            isEditing={isEditing}
            onChange={handleRecruiterChange}
            onNestedChange={handleRecruiterNestedChange}
          />
        )}
      </div>
    </div>
  )
}

type CandidateProfileViewProps = {
  profile: CandidateProfile
  isEditing: boolean
  onChange: (section: CandidateSection, field: string, value: string) => void
  onPlatformChange: (id: string, field: keyof PlatformLink, value: string) => void
  onAddPlatform: () => void
  onRemovePlatform: (id: string) => void
  onAvatarChange: (value: string) => void
}

const CandidateProfileView = ({
  profile,
  isEditing,
  onChange,
  onPlatformChange,
  onAddPlatform,
  onRemovePlatform,
  onAvatarChange,
}: CandidateProfileViewProps) => {
  const renderDetailInput = (meta: CandidateFieldMeta, index: number) => {
    const value = profile.details[meta.key]
    const disabled = !isEditing || meta.locked
    return (
      <label key={meta.key} className="profile-card__input">
        {meta.label}
        <input
          type={meta.type === 'date' ? 'date' : 'text'}
          value={value}
          onChange={(event) => onChange('details', meta.key, event.target.value)}
          disabled={disabled}
        />
        {meta.locked && <span className="profile-card__hint">You are not allowed to update this field.</span>}
        {index === 0 && <span className="profile-card__hint">Ensure this matches your official documents.</span>}
      </label>
    )
  }

  return (
    <div className="profile-grid">
      <section className="profile-card">
        <header className="profile-card__identity">
          <ProfileAvatar name={profile.details.fullName} imageUrl={profile.avatarUrl} size="lg" />
          <div>
            <h2>Profile overview</h2>
            <p className="profile-card__subtitle">Keep your contact information current and professional.</p>
          </div>
        </header>
        <div className="profile-card__grid profile-card__grid--two">
          {detailMeta.map((meta, index) => renderDetailInput(meta, index))}
        </div>
        <label className="profile-card__input">
          Profile photo URL
          <input
            type="url"
            value={profile.avatarUrl}
            placeholder="https://"
            onChange={(event) => onAvatarChange(event.target.value)}
            disabled={!isEditing}
          />
        </label>
      </section>

      <section className="profile-card">
        <header>
          <h2>Education</h2>
        </header>
        <div className="profile-card__grid profile-card__grid--two">
          {([
            ['Batch', 'batch'],
            ['Department*', 'department', true],
            ['Registration Number', 'registrationNumber'],
            ['Roll Number', 'rollNumber', true],
            ['Gap Year', 'gapYear'],
            ['Are you a person with disability?*', 'disabilityStatus', true],
          ] as const).map(([label, key, locked]) => (
            <label key={key} className="profile-card__input">
              {label}
              <input
                type="text"
                value={profile.education[key]}
                onChange={(event) => onChange('education', key, event.target.value)}
                disabled={!isEditing || locked}
              />
              {locked && <span className="profile-card__hint">You are not allowed to update this field.</span>}
            </label>
          ))}
        </div>
      </section>

      <section className="profile-card">
        <header>
          <h2>Academic Performance</h2>
        </header>
        <div className="profile-card__grid profile-card__grid--two">
          {([
            ['10th Percentage', 'tenthPercent'],
            ['12th Percentage', 'twelfthPercent'],
            ['CGPA', 'cgpa', true],
            ['Number of Active Backlogs', 'activeBacklogs', true],
          ] as const).map(([label, key, locked]) => (
            <label key={key} className="profile-card__input">
              {label}
              <input
                type="text"
                value={profile.academic[key]}
                onChange={(event) => onChange('academic', key, event.target.value)}
                disabled={!isEditing || locked}
              />
              {locked && <span className="profile-card__hint">Only administration will update this field.</span>}
            </label>
          ))}
        </div>
      </section>

      <section className="profile-card">
        <header>
          <h2>Documents</h2>
          <p className="profile-card__note">Please share Google Drive links to PDF files with view access enabled.</p>
        </header>
        <div className="profile-card__grid">
          {([
            ['Aadhar Card', 'aadharUrl'],
            ['Pan Card', 'panUrl'],
            ['10th Marksheet', 'tenthMarksheetUrl'],
            ['12th Marksheet', 'twelfthMarksheetUrl'],
            ['Latest Resume', 'resumeUrl'],
          ] as const).map(([label, key]) => (
            <div key={key} className="profile-card__document">
              <label className="profile-card__input">
                {label}
                <input
                  type="url"
                  value={profile.documents[key]}
                  onChange={(event) => onChange('documents', key, event.target.value)}
                  disabled={!isEditing}
                />
              </label>
              <button
                type="button"
                className="profile-card__preview"
                disabled={!profile.documents[key].trim()}
              >
                Show Preview
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="profile-card">
        <header>
          <h2>Portfolio & Coding Platforms</h2>
          <p className="profile-card__subtitle">
            Add up to five profiles. GitHub (<span className="profile-card__required">*</span>) is mandatory.
          </p>
        </header>
        <div className="profile-card__platforms">
          {profile.platforms.map((link, index) => (
            <div key={link.id} className="profile-card__platform-row">
              <label className="profile-card__input profile-card__input--compact">
                Platform {index === 0 && <span className="profile-card__required">*</span>}
                <input
                  type="text"
                  value={link.platform}
                  placeholder="e.g., GitHub"
                  onChange={(event) => onPlatformChange(link.id, 'platform', event.target.value)}
                  disabled={!isEditing}
                />
              </label>
              <label className="profile-card__input profile-card__input--compact">
                URL
                <input
                  type="url"
                  value={link.url}
                  placeholder="https://"
                  onChange={(event) => onPlatformChange(link.id, 'url', event.target.value)}
                  disabled={!isEditing}
                />
              </label>
              {isEditing && profile.platforms.length > 1 && (
                <button type="button" className="profile-card__remove" onClick={() => onRemovePlatform(link.id)}>
                  Remove
                </button>
              )}
            </div>
          ))}
          {isEditing && profile.platforms.length < 5 && (
            <button type="button" className="profile-card__add" onClick={onAddPlatform}>
              + Add platform
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

type RecruiterProfileViewProps = {
  profile: RecruiterProfile
  isEditing: boolean
  onChange: (field: keyof RecruiterProfile, value: string) => void
  onNestedChange: (field: 'fullName' | 'phones', key: string, value: string) => void
}

const RecruiterProfileView = ({ profile, isEditing, onChange, onNestedChange }: RecruiterProfileViewProps) => {
  return (
    <div className="profile-grid">
      <section className="profile-card">
        <header className="profile-card__identity">
          <ProfileAvatar
            name={[profile.fullName.first, profile.fullName.middle, profile.fullName.last].filter(Boolean).join(' ')}
            imageUrl={profile.avatarUrl}
            size="lg"
          />
          <div>
            <h2>Contact & Identity</h2>
            <p className="profile-card__subtitle">Share how teammates and candidates can identify you.</p>
          </div>
        </header>
        <div className="profile-card__grid profile-card__grid--three">
          <label className="profile-card__input">
            First Name
            <input
              type="text"
              value={profile.fullName.first}
              onChange={(event) => onNestedChange('fullName', 'first', event.target.value)}
              disabled={!isEditing}
            />
          </label>
          <label className="profile-card__input">
            Middle Name
            <input
              type="text"
              value={profile.fullName.middle}
              onChange={(event) => onNestedChange('fullName', 'middle', event.target.value)}
              disabled={!isEditing}
            />
          </label>
          <label className="profile-card__input">
            Last Name
            <input
              type="text"
              value={profile.fullName.last}
              onChange={(event) => onNestedChange('fullName', 'last', event.target.value)}
              disabled={!isEditing}
            />
          </label>
        </div>
        <label className="profile-card__input">
          Professional Headshot URL
          <input
            type="url"
            value={profile.avatarUrl}
            onChange={(event) => onChange('avatarUrl', event.target.value)}
            disabled={!isEditing}
          />
        </label>
        <label className="profile-card__input">
          Job Title and Level
          <input
            type="text"
            value={profile.jobTitle}
            onChange={(event) => onChange('jobTitle', event.target.value)}
            disabled={!isEditing}
          />
        </label>
        <label className="profile-card__input">
          Employee / Recruiter ID
          <input
            type="text"
            value={profile.recruiterId}
            onChange={(event) => onChange('recruiterId', event.target.value)}
            disabled={!isEditing}
          />
        </label>
      </section>

      <section className="profile-card">
        <header>
          <h2>Communication</h2>
        </header>
        <div className="profile-card__grid profile-card__grid--two">
          <label className="profile-card__input">
            Office Phone
            <input
              type="tel"
              value={profile.phones.office}
              onChange={(event) => onNestedChange('phones', 'office', event.target.value)}
              disabled={!isEditing}
            />
          </label>
          <label className="profile-card__input">
            Mobile Phone
            <input
              type="tel"
              value={profile.phones.mobile}
              onChange={(event) => onNestedChange('phones', 'mobile', event.target.value)}
              disabled={!isEditing}
            />
          </label>
        </div>
        <label className="profile-card__input">
          Professional Email Address
          <input
            type="email"
            value={profile.professionalEmail}
            onChange={(event) => onChange('professionalEmail', event.target.value)}
            disabled={!isEditing}
          />
        </label>
        <label className="profile-card__input">
          Secondary Contact Email
          <input
            type="email"
            value={profile.secondaryEmail}
            onChange={(event) => onChange('secondaryEmail', event.target.value)}
            disabled={!isEditing}
          />
        </label>
      </section>

      <section className="profile-card">
        <header>
          <h2>Regional Preferences</h2>
        </header>
        <div className="profile-card__grid profile-card__grid--three">
          <label className="profile-card__input">
            Location / Office Address
            <input
              type="text"
              value={profile.location}
              onChange={(event) => onChange('location', event.target.value)}
              disabled={!isEditing}
            />
          </label>
          <label className="profile-card__input">
            Time Zone
            <input
              type="text"
              value={profile.timeZone}
              onChange={(event) => onChange('timeZone', event.target.value)}
              disabled={!isEditing}
            />
          </label>
          <label className="profile-card__input">
            Preferred Language
            <input
              type="text"
              value={profile.language}
              onChange={(event) => onChange('language', event.target.value)}
              disabled={!isEditing}
            />
          </label>
        </div>
      </section>

      <section className="profile-card">
        <header>
          <h2>Emergency & Coverage</h2>
        </header>
        <div className="profile-card__grid profile-card__grid--two">
          <label className="profile-card__input">
            Emergency / Backup Contact
            <textarea
              value={profile.emergencyContact}
              onChange={(event) => onChange('emergencyContact', event.target.value)}
              disabled={!isEditing}
            />
          </label>
          <label className="profile-card__input">
            Alternate Contact Person
            <textarea
              value={profile.alternateContact}
              onChange={(event) => onChange('alternateContact', event.target.value)}
              disabled={!isEditing}
            />
          </label>
        </div>
        <label className="profile-card__input">
          Manager / Supervisor Details
          <textarea
            value={profile.manager}
            onChange={(event) => onChange('manager', event.target.value)}
            disabled={!isEditing}
          />
        </label>
        <label className="profile-card__input">
          Backup Recruiter Assignments
          <textarea
            value={profile.backupRecruiters}
            onChange={(event) => onChange('backupRecruiters', event.target.value)}
            disabled={!isEditing}
          />
        </label>
      </section>
    </div>
  )
}

export default ProfilePage

type ProfileAvatarProps = {
  name: string
  imageUrl?: string
  size?: 'lg' | 'md'
}

const getInitial = (name: string) => {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed.charAt(0).toUpperCase()
}

const ProfileAvatar = ({ name, imageUrl, size = 'md' }: ProfileAvatarProps) => {
  return (
    <div className={`profile-avatar profile-avatar--${size}`} aria-hidden>
      {imageUrl ? <img src={imageUrl} alt="" /> : <span>{getInitial(name)}</span>}
    </div>
  )
}
