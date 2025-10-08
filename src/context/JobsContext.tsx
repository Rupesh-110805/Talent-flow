import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { nanoid } from 'nanoid'

export type Job = {
  id: string
  company: string
  title: string
  workArrangement: string
  graduatingBatch: string
  compensation: string
  deadline: string
  postedOn: string
  cgpaCutoff: string
  backlogsPolicy: string
  departments: string[]
  stipend?: string
  internshipDetail?: string
  bondDetail?: string
  description: string
  qualification: string
  status: 'open' | 'archived'
}

type NewJobInput = {
  company: string
  title: string
  workArrangement: string
  graduatingBatch: string
  compensation: string
  deadline: string
  postedOn: string
  cgpaCutoff: string
  backlogsPolicy: string
  departments: string[]
  stipend?: string
  internshipDetail?: string
  bondDetail?: string
  description: string
  qualification: string
}

type JobsContextValue = {
  jobs: Job[]
  appliedJobIds: Set<string>
  addJob: (job: NewJobInput) => void
  applyToJob: (jobId: string) => void
  toggleArchive: (jobId: string) => void
}

const initialJobs: Job[] = [
  {
    id: 'job-idfc-001',
    company: 'IDFC First Bank',
    title: 'Application Engineer',
    workArrangement: '6 Months + Full Time',
    graduatingBatch: '2026',
    compensation: 'CTC: 14 LPA Fixed + 2 lakh joining bonus + 15% variable',
    deadline: '26 Sept 2025 · 14:00',
    postedOn: '23 Sept 2025 · 14:48',
    cgpaCutoff: '6 CGPA',
    backlogsPolicy: 'Active backlogs not allowed',
    departments: ['CSE'],
    stipend: '₹40,000 during internship',
    internshipDetail: '6 months mandatory internship + FTE',
    bondDetail:
      'If the employee leaves before one year, they must repay ₹1 lakh towards training.',
    description:
      'Collaborate with product teams to build customer-first digital banking journeys. Drive secure, resilient, and scalable application experiences.',
    qualification:
      'Proficiency in JavaScript/TypeScript, React, and REST APIs. Solid understanding of data structures, system design fundamentals, and databases.',
    status: 'open',
  },
  {
    id: 'job-zen-002',
    company: 'ZenRecruit',
    title: 'Frontend Engineer - Hiring Tools',
    workArrangement: 'Full Time · Remote Friendly',
    graduatingBatch: '2025/2026',
    compensation: 'CTC: 18 LPA + ESOPs',
    deadline: '14 Oct 2025 · 18:00',
    postedOn: '29 Sept 2025 · 10:15',
    cgpaCutoff: '7 CGPA',
    backlogsPolicy: 'No active backlogs; one history allowed',
    departments: ['CSE', 'IT', 'ECE'],
    description:
      'Own the candidate evaluation UI suite for our talent marketplace. Work closely with designers to ship accessible, performant workflows.',
    qualification:
      'Strong React fundamentals, state management patterns, and component testing. Experience with design systems is a plus.',
    status: 'open',
  },
  {
    id: 'job-core-003',
    company: 'CoreQuest Labs',
    title: 'Associate Product Analyst',
    workArrangement: '6 Months Internship + PPO',
    graduatingBatch: '2026',
    compensation: 'Stipend: ₹35,000 · PPO 12 LPA',
    deadline: '08 Oct 2025 · 09:00',
    postedOn: '22 Sept 2025 · 17:30',
    cgpaCutoff: '7.5 CGPA',
    backlogsPolicy: 'Active backlogs not allowed',
    departments: ['CSE', 'EEE', 'ME'],
    description:
      'Analyse product usage data, synthesise insights, and partner with engineering to iterate on experiments.',
    qualification:
      'Analytical mindset with SQL, Python, and storytelling skills. Comfortable presenting to stakeholders.',
    status: 'open',
  },
  {
    id: 'job-sky-004',
    company: 'Skyline Systems',
    title: 'Site Reliability Engineer (Graduate)',
    workArrangement: 'Full Time · Hybrid (Bengaluru)',
    graduatingBatch: '2025/2026',
    compensation: 'CTC: 19 LPA + quarterly performance bonus',
    deadline: '11 Oct 2025 · 21:00',
    postedOn: '28 Sept 2025 · 11:42',
    cgpaCutoff: '7 CGPA',
    backlogsPolicy: 'No active backlogs · up to 2 history allowed',
    departments: ['CSE', 'IT', 'ECE'],
    description:
      'Automate infrastructure resilience, monitor production health, and collaborate with product squads to drive reliability across services.',
    qualification:
      'Comfortable with Linux internals, networking basics, and scripting (Python/Golang). Prior exposure to observability stacks is a plus.',
    status: 'open',
  },
  {
    id: 'job-nimbus-005',
    company: 'Nimbus Analytics',
    title: 'Data Science Intern',
    workArrangement: '3 Months Internship + PPO track',
    graduatingBatch: '2026',
    compensation: 'Stipend: ₹30,000 · PPO upto 14 LPA',
    deadline: '19 Oct 2025 · 16:30',
    postedOn: '01 Oct 2025 · 13:05',
    cgpaCutoff: '7.2 CGPA',
    backlogsPolicy: 'No active backlogs',
    departments: ['CSE', 'AIML', 'ECE'],
    description:
      'Work with senior scientists to prototype predictive models for supply-chain optimisation and experiment with feature engineering pipelines.',
    qualification:
      'Hands-on ML project experience with Python, pandas, and scikit-learn. Familiarity with feature stores or MLOps tooling is advantageous.',
    status: 'open',
  },
  {
    id: 'job-lumos-006',
    company: 'Lumos Mobility',
    title: 'Embedded Software Engineer',
    workArrangement: 'Full Time · Onsite',
    graduatingBatch: '2025/2026',
    compensation: 'CTC: 16 LPA + onsite allowance',
    deadline: '06 Oct 2025 · 12:00',
    postedOn: '18 Sept 2025 · 15:20',
    cgpaCutoff: '7.5 CGPA',
    backlogsPolicy: 'No active backlogs',
    departments: ['ECE', 'EEE', 'Mechatronics'],
    description:
      'Design and validate firmware for next-gen electric mobility controllers. Partner with hardware teams to deploy OTA-ready builds.',
    qualification:
      'Strong C/C++, RTOS familiarity, and debugging skills using oscilloscopes or JTAG tools. Automotive protocols knowledge is a plus.',
    status: 'open',
  },
  {
    id: 'job-harbor-007',
    company: 'Harbor Fintech',
    title: 'Backend Engineer - Risk Platform',
    workArrangement: 'Full Time · Remote (India)',
    graduatingBatch: '2024/2025',
    compensation: 'CTC: 20 LPA + 5% ESOP pool',
    deadline: '15 Oct 2025 · 23:59',
    postedOn: '30 Sept 2025 · 09:30',
    cgpaCutoff: '6.5 CGPA',
    backlogsPolicy: 'Up to 1 active backlog allowed (clear before joining)',
    departments: ['CSE', 'IT'],
    description:
      'Build streaming data pipelines to detect fraud signals in real-time. Work with product and compliance teams to launch risk controls quickly.',
    qualification:
      'Experience with Node.js or Go, event-driven architectures, and SQL/NoSQL databases. Exposure to Kafka/Pulsar preferred.',
    status: 'open',
  },
  {
    id: 'job-orbit-008',
    company: 'Orbit Studios',
    title: 'Technical Artist (Games)',
    workArrangement: '6 Months Internship + PPO',
    graduatingBatch: '2026',
    compensation: 'Stipend: ₹28,000 · PPO 10 LPA',
    deadline: '25 Sept 2025 · 17:45',
    postedOn: '12 Sept 2025 · 10:00',
    cgpaCutoff: '6 CGPA',
    backlogsPolicy: 'Active backlogs not allowed',
    departments: ['CSE', 'Design', 'Animation'],
    description:
      'Prototype shader effects, optimise game assets, and partner with designers to deliver cinematic in-game experiences.',
    qualification:
      'Portfolio demonstrating Unity/Unreal work, scripting in C#/Blueprints, and understanding of rendering fundamentals.',
    status: 'archived',
  },
  {
    id: 'job-aurora-009',
    company: 'Aurora Healthtech',
    title: 'Full Stack Engineer',
    workArrangement: 'Full Time · Remote Friendly',
    graduatingBatch: '2025/2026',
    compensation: 'CTC: 17 LPA + wellness stipend',
    deadline: '20 Oct 2025 · 19:00',
    postedOn: '03 Oct 2025 · 08:55',
    cgpaCutoff: '7 CGPA',
    backlogsPolicy: 'No active backlogs',
    departments: ['CSE', 'IT'],
    description:
      'Ship patient-facing portals and clinician dashboards with a focus on accessibility and zero-downtime releases.',
    qualification:
      'Comfortable with React, Node.js, relational databases, and automated testing. Healthcare or compliance exposure is a bonus.',
    status: 'open',
  },
  {
    id: 'job-helix-010',
    company: 'Helix Robotics',
    title: 'Robotics Software Intern',
    workArrangement: '5 Months Internship',
    graduatingBatch: '2026',
    compensation: 'Stipend: ₹32,000',
    deadline: '09 Oct 2025 · 13:30',
    postedOn: '21 Sept 2025 · 12:10',
    cgpaCutoff: '7.8 CGPA',
    backlogsPolicy: 'No active backlogs',
    departments: ['CSE', 'ECE', 'Robotics'],
    description:
      'Implement perception algorithms, integrate sensor fusion pipelines, and run field tests on autonomous warehouse robots.',
    qualification:
      'Strong Python/C++ fundamentals, ROS familiarity, and exposure to computer vision libraries such as OpenCV or PCL.',
    status: 'open',
  },
]

const JobsContext = createContext<JobsContextValue | undefined>(undefined)

export const JobsProvider = ({ children }: { children: ReactNode }) => {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set())

  const addJob = useCallback((job: NewJobInput) => {
    setJobs((prev) => [
      {
        id: nanoid(),
        status: 'open',
        ...job,
      },
      ...prev,
    ])
  }, [])

  const applyToJob = useCallback((jobId: string) => {
    setAppliedJobIds((prev) => {
      const next = new Set(prev)
      next.add(jobId)
      return next
    })
  }, [])

  const toggleArchive = useCallback((jobId: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              status: job.status === 'open' ? 'archived' : 'open',
            }
          : job,
      ),
    )
  }, [])

  const value = useMemo<JobsContextValue>(
    () => ({ jobs, appliedJobIds, addJob, applyToJob, toggleArchive }),
    [addJob, appliedJobIds, applyToJob, jobs, toggleArchive],
  )

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useJobs = () => {
  const context = useContext(JobsContext)
  if (!context) {
    throw new Error('useJobs must be used within a JobsProvider')
  }
  return context
}
