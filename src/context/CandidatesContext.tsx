import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { nanoid } from 'nanoid'
import { useJobs } from './JobsContext'

const STORAGE_KEY = 'talentflow:candidates-store'

export const candidateStages = [
  'applied',
  'screening',
  'assessment',
  'interview',
  'offer',
  'hired',
] as const

export type CandidateStage = (typeof candidateStages)[number]

type CandidateTimelineEntry = {
  id: string
  date: string
  stage: CandidateStage
  summary: string
}

type CandidateNote = {
  id: string
  author: string
  content: string
  createdAt: string
  mentions: string[]
}

export type CandidateRecord = {
  id: string
  jobId: string
  name: string
  email: string
  headline: string
  location: string
  avatarUrl: string
  experience: string
  stage: CandidateStage
  appliedAt: string
  timeline: CandidateTimelineEntry[]
  notes: CandidateNote[]
}

type CandidateStore = Record<string, CandidateRecord[]>

type CandidatesContextValue = {
  getCandidatesForJob: (jobId: string) => CandidateRecord[]
  getCandidateById: (candidateId: string) => CandidateRecord | null
  updateCandidateStage: (jobId: string, candidateId: string, stage: CandidateStage) => void
  addCandidateNote: (jobId: string, candidateId: string, note: { content: string; author: string; mentions: string[] }) => void
  mentionSuggestions: string[]
}

const CandidatesContext = createContext<CandidatesContextValue | undefined>(undefined)

const mentionSuggestions = ['@AlexMorgan', '@PriyaVerma', '@JordanSmith', '@ChristianBale', '@RecruitmentOps', '@HiringManager']

const stageSummaries: Record<CandidateStage, string[]> = {
  applied: ['Application received through campus portal.', 'Applied via employee referral.'],
  screening: ['Advanced after recruiter screen.', 'Initial screening completed with positive feedback.'],
  assessment: ['Completed technical assessment with solid feedback.', 'Assessment reviewed by hiring panel.'],
  interview: ['Panel interview scheduled with hiring manager.', 'Interview feedback pending review.'],
  offer: ['Offer package drafted for candidate.', 'Negotiation meeting scheduled.'],
  hired: ['Candidate accepted offer and signed paperwork.', 'Onboarding scheduled for next week.'],
}

const jobTitles = [
  'Frontend Engineer',
  'Backend Engineer',
  'Product Designer',
  'Product Manager',
  'DevOps Specialist',
  'Data Analyst',
  'QA Automation Engineer',
  'Customer Success Lead',
]

const candidateNames = [
  'Aditi Sharma',
  'Noah Fernandez',
  'Liam Porter',
  'Saanvi Patel',
  'Evelyn Brooks',
  'Mateo Alvarez',
  'Chloe Nguyen',
  'Rohan Iyer',
  'Grace Thompson',
  'Oliver Chen',
  'Priya Kapoor',
  'Samuel Reed',
]

const locations = [
  'San Francisco, US',
  'Toronto, CA',
  'Berlin, DE',
  'Bangalore, IN',
  'Sydney, AU',
  'Singapore, SG',
  'London, UK',
  'Remote',
]

const experienceHighlights = [
  '5+ years leading cross-functional product squads.',
  'Specializes in building accessible design systems.',
  'Scaled event-driven microservices handling millions of requests daily.',
  'Championed test automation resulting in 30% faster releases.',
  'Architected cloud infrastructure with zero-downtime deployments.',
  'Mentored junior engineers across globally distributed teams.',
  'Improved conversion funnels through data-informed experimentation.',
]

const noteSnippets = [
  'Strong portfolio with clear metrics-driven outcomes.',
  'Great culture fit; highlighted collaborative mindset.',
  'Asked insightful questions about roadmap and growth.',
  'Needs follow-up on compensation expectations.',
  'Prefers hybrid work model with occasional travel.',
]

const authorNames = ['Alex', 'Priya', 'Jordan', 'Morgan', 'Taylor', 'Chris']

const pickOne = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]

const pickSome = <T,>(items: readonly T[], { min = 0, max = items.length }: { min?: number; max?: number } = {}): T[] => {
  const target = Math.floor(Math.random() * (max - min + 1)) + min
  if (target <= 0) return []

  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const rand = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[rand]] = [shuffled[rand], shuffled[index]]
  }

  return shuffled.slice(0, target)
}

const randomRecentDate = (days: number): Date => {
  const now = new Date()
  const past = new Date(now)
  past.setDate(now.getDate() - days)
  const timestamp = past.getTime() + Math.random() * (now.getTime() - past.getTime())
  return new Date(timestamp)
}

const randomSoonDate = (days: number, refDate: Date): Date => {
  const next = new Date(refDate)
  const increment = Math.floor(Math.random() * (days + 1)) + 1
  next.setDate(next.getDate() + increment)
  return next
}

const toEmail = (name: string): string => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/(^\.|\.$)/g, '')
  return `${slug || 'candidate'}@example.com`
}

const avatarForName = (name: string): string => {
  const normalized = name.trim() || 'candidate'
  const seed = normalized.replace(/\s+/g, '_')
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}`
}

const generateTimeline = (stage: CandidateStage): CandidateTimelineEntry[] => {
  const appliedDate = randomRecentDate(40)
  const timeline: CandidateTimelineEntry[] = [
    {
      id: nanoid(),
      date: appliedDate.toISOString(),
      stage: 'applied',
      summary: pickOne(stageSummaries.applied),
    },
  ]

  const stageIndex = candidateStages.indexOf(stage)
  let currentDate = appliedDate
  for (let index = 1; index <= stageIndex; index += 1) {
    currentDate = randomSoonDate(4, currentDate)
    timeline.push({
      id: nanoid(),
      date: currentDate.toISOString(),
      stage: candidateStages[index],
      summary: pickOne(stageSummaries[candidateStages[index]]),
    })
  }

  return timeline
}

const seedCandidatesForJob = (jobId: string, count: number): CandidateRecord[] => {
  const stageWeights: Array<[CandidateStage, number]> = [
    ['applied', 0.35],
    ['screening', 0.22],
    ['assessment', 0.16],
    ['interview', 0.15],
    ['offer', 0.07],
    ['hired', 0.05],
  ]

  const weightedStage = (): CandidateStage => {
    const roll = Math.random()
    let cumulative = 0
    for (const [stage, weight] of stageWeights) {
      cumulative += weight
      if (roll <= cumulative) {
        return stage
      }
    }
    return 'applied'
  }

  return Array.from({ length: count }, () => {
    const stage = weightedStage()
    const name = pickOne(candidateNames)
    return {
      id: nanoid(),
      jobId,
      name,
      email: toEmail(name),
      headline: pickOne(jobTitles),
      location: pickOne(locations),
      avatarUrl: avatarForName(name),
      experience: pickOne(experienceHighlights),
      stage,
      appliedAt: randomRecentDate(45).toISOString(),
      timeline: generateTimeline(stage),
      notes: [
        {
          id: nanoid(),
          author: pickOne(authorNames),
          content: pickOne(noteSnippets),
          createdAt: randomRecentDate(8).toISOString(),
          mentions: pickSome(mentionSuggestions, { min: 0, max: 2 }),
        },
      ],
    }
  })
}

const loadInitialStore = (jobIds: string[]): CandidateStore => {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CandidateStore
        return parsed
      } catch (error) {
        console.warn('Failed to parse candidate store, seeding new data.', error)
      }
    }
  }

  const seededEntries = jobIds.reduce<CandidateStore>((accumulator, jobId) => {
    accumulator[jobId] = seedCandidatesForJob(jobId, 120)
    return accumulator
  }, {})

  return seededEntries
}

export const CandidatesProvider = ({ children }: { children: ReactNode }) => {
  const { jobs } = useJobs()
  const jobIds = useMemo(() => jobs.map((job) => job.id), [jobs])
  const [store, setStore] = useState<CandidateStore>(() => loadInitialStore(jobIds))

  useEffect(() => {
    setStore((prev) => {
      let hasChanges = false
      const next = { ...prev }
      for (const jobId of jobIds) {
        if (!next[jobId]) {
          next[jobId] = seedCandidatesForJob(jobId, 40)
          hasChanges = true
        }
      }
      return hasChanges ? next : prev
    })
  }, [jobIds])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  }, [store])

  const getCandidatesForJob = useCallback(
    (jobId: string) => {
      const list = store[jobId]
      if (!list) return []
      return list.slice().sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
    },
    [store],
  )

  const getCandidateById = useCallback(
    (candidateId: string) => {
      for (const candidates of Object.values(store)) {
        const match = candidates.find((candidate) => candidate.id === candidateId)
        if (match) {
          return match
        }
      }
      return null
    },
    [store],
  )

  const updateCandidateStage = useCallback(
    (jobId: string, candidateId: string, stage: CandidateStage) => {
      setStore((prev) => {
        const existing = prev[jobId]
        if (!existing) return prev
        const idx = existing.findIndex((item) => item.id === candidateId)
        if (idx === -1) return prev
        const candidate = existing[idx]
        if (candidate.stage === stage) return prev

        const updatedCandidate: CandidateRecord = {
          ...candidate,
          stage,
          timeline: [
            ...candidate.timeline,
            {
              id: nanoid(),
              date: new Date().toISOString(),
              stage,
              summary: `Moved to ${stage} stage by recruiter.`,
            },
          ],
        }

        const nextList = [...existing]
        nextList[idx] = updatedCandidate
        return { ...prev, [jobId]: nextList }
      })
    },
    [],
  )

  const addCandidateNote = useCallback(
    (jobId: string, candidateId: string, note: { content: string; author: string; mentions: string[] }) => {
      setStore((prev) => {
        const existing = prev[jobId]
        if (!existing) return prev
        const idx = existing.findIndex((item) => item.id === candidateId)
        if (idx === -1) return prev
        const candidate = existing[idx]
        const newNote: CandidateNote = {
          id: nanoid(),
          author: note.author,
          content: note.content,
          createdAt: new Date().toISOString(),
          mentions: note.mentions,
        }
        const updatedCandidate: CandidateRecord = {
          ...candidate,
          notes: [newNote, ...candidate.notes],
        }
        const nextList = [...existing]
        nextList[idx] = updatedCandidate
        return { ...prev, [jobId]: nextList }
      })
    },
    [],
  )

  const value = useMemo<CandidatesContextValue>(
    () => ({
      getCandidatesForJob,
      getCandidateById,
      updateCandidateStage,
      addCandidateNote,
      mentionSuggestions,
    }),
    [addCandidateNote, getCandidateById, getCandidatesForJob, updateCandidateStage],
  )

  return <CandidatesContext.Provider value={value}>{children}</CandidatesContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCandidates = () => {
  const context = useContext(CandidatesContext)
  if (!context) {
    throw new Error('useCandidates must be used within a CandidatesProvider')
  }
  return context
}
