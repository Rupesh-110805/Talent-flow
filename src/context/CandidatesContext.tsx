import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { faker } from '@faker-js/faker'
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

const generateTimeline = (stage: CandidateStage): CandidateTimelineEntry[] => {
  const appliedDate = faker.date.recent({ days: 40 })
  const timeline: CandidateTimelineEntry[] = [
    {
      id: nanoid(),
      date: appliedDate.toISOString(),
      stage: 'applied',
      summary: 'Application received through campus portal.',
    },
  ]

  const stageIndex = candidateStages.indexOf(stage)
  let currentDate = appliedDate
  for (let index = 1; index <= stageIndex; index += 1) {
    currentDate = faker.date.soon({ days: 4, refDate: currentDate })
    timeline.push({
      id: nanoid(),
      date: currentDate.toISOString(),
      stage: candidateStages[index],
      summary: faker.helpers.arrayElement([
        'Advanced after recruiter screen.',
        'Panel interview scheduled with hiring manager.',
        'Completed technical assessment with solid feedback.',
      ]),
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
    return {
      id: nanoid(),
      jobId,
      name: faker.person.fullName(),
      email: faker.internet.email(),
      headline: faker.person.jobTitle(),
      location: `${faker.location.city()}, ${faker.location.countryCode()}`,
      avatarUrl: faker.image.avatarGitHub(),
      experience: faker.lorem.sentence({ min: 6, max: 12 }),
      stage,
      appliedAt: faker.date.recent({ days: 45 }).toISOString(),
      timeline: generateTimeline(stage),
      notes: [
        {
          id: nanoid(),
          author: faker.person.firstName(),
          content: faker.lorem.sentence({ min: 8, max: 16 }),
          createdAt: faker.date.recent({ days: 8 }).toISOString(),
          mentions: faker.helpers.arrayElements(mentionSuggestions, { min: 0, max: 2 }),
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
