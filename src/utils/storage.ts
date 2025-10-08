import Dexie, { type Table } from 'dexie'
import { nanoid } from 'nanoid'

export type AssessmentStatus = 'draft' | 'published' | 'archived'

export type QuestionType =
	| 'single_choice'
	| 'multi_choice'
	| 'short_text'
	| 'long_text'
	| 'numeric'
	| 'file_upload'

export type QuestionChoice = {
	id: string
	label: string
	value: string
}

export type QuestionValidationRules = {
	minLength?: number
	maxLength?: number
	minValue?: number
	maxValue?: number
	allowedFileTypes?: string[]
	maxFileSizeMb?: number
}

export type QuestionConditionalLogic = {
	questionId: string
	equals: string | string[]
}

export type AssessmentQuestion = {
	id: string
	sectionId: string
	order: number
	type: QuestionType
	label: string
	description?: string
	helperText?: string
	required: boolean
	validation: QuestionValidationRules
	conditionalLogic?: QuestionConditionalLogic
	choices?: QuestionChoice[]
}

export type AssessmentSection = {
	id: string
	assessmentId: string
	order: number
	title: string
	description?: string
	timeLimitMinutes?: number | null
	questions: AssessmentQuestion[]
}

export type AssessmentRecord = {
	id: string
	jobId: string
	title: string
	summary: string
	role: string
	difficulty: 'easy' | 'medium' | 'hard'
	durationMinutes: number
	status: AssessmentStatus
	tags: string[]
	createdAt: string
	updatedAt: string
	sections: AssessmentSection[]
}

export type AssessmentSubmissionAnswer = {
	questionId: string
	response: string | string[] | number | null
	uploadedFileName?: string | null
	score?: number | null
	feedback?: string | null
}

export type AssessmentSubmissionRecord = {
	id?: number
	assessmentId: string
	jobId: string
	candidateId: string
	candidateName: string
	submittedAt: string
	score: number | null
	status: 'in_progress' | 'completed' | 'graded'
	answers: AssessmentSubmissionAnswer[]
}

class TalentflowDatabase extends Dexie {
	public assessments!: Table<AssessmentRecord, string>
	public submissions!: Table<AssessmentSubmissionRecord, number>

	constructor() {
		super('talentflow-assessments')
		this.version(1).stores({
			assessments: 'id',
			submissions: '++id, assessmentId, candidateId',
		})
		this.version(2)
			.stores({
				assessments: 'jobId',
				submissions: '++id, jobId, candidateId',
			})
			.upgrade(async (transaction) => {
				const assessmentsTable = transaction.table<AssessmentRecord>('assessments')
				const existingAssessments = await assessmentsTable.toArray()
				for (const record of existingAssessments) {
					if (!record.jobId) {
						record.jobId = record.id
					}
					record.sections = record.sections.map((section) => ({
						...section,
						assessmentId: record.jobId,
					}))
					await assessmentsTable.put(record, record.jobId)
				}

				const submissionsTable = transaction.table<AssessmentSubmissionRecord>('submissions')
				const existingSubmissions = await submissionsTable.toArray()
				for (const submission of existingSubmissions) {
					if (!submission.jobId) {
						submission.jobId = submission.assessmentId
					}
					await submissionsTable.put(submission)
				}
			})
	}
}

const hasIndexedDb = typeof indexedDB !== 'undefined'

let dbInstance: TalentflowDatabase | null = null

const getDatabase = () => {
	if (dbInstance) return dbInstance
	if (!hasIndexedDb) return null
	dbInstance = new TalentflowDatabase()
	return dbInstance
}

export const db = getDatabase()

const ensureDatabase = () => {
	const database = getDatabase()
	if (!database) {
		throw new Error('IndexedDB is not available in this environment.')
	}
	return database
}

const createChoice = (label: string): QuestionChoice => ({
	id: nanoid(),
	label,
	value: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
})

const createDefaultSections = (jobId: string) => {
	const introSectionId = nanoid()
	const practicalSectionId = nanoid()

	const introSection: AssessmentSection = {
		id: introSectionId,
		assessmentId: jobId,
		order: 0,
		title: 'Foundations',
		description: 'Baseline knowledge and collaboration style.',
		timeLimitMinutes: 30,
		questions: [
			{
				id: nanoid(),
				sectionId: introSectionId,
				order: 0,
				type: 'single_choice',
				label: 'Which front-end framework do you prefer for rapid prototyping?',
				helperText: 'Pick the option that reflects your typical choice.',
				required: true,
				validation: {},
				choices: [createChoice('React'), createChoice('Preact'), createChoice('Vue'), createChoice('Svelte')],
			},
			{
				id: nanoid(),
				sectionId: introSectionId,
				order: 1,
				type: 'short_text',
				label: 'Describe your approach to ensuring accessibility in UI features.',
				helperText: 'Mention tooling or checklists you rely on.',
				required: true,
				validation: {
					minLength: 32,
					maxLength: 480,
				},
			},
		],
	}

	const practicalSection: AssessmentSection = {
		id: practicalSectionId,
		assessmentId: jobId,
		order: 1,
		title: 'Practical Scenarios',
		description: 'Realistic problems to understand decision making.',
		timeLimitMinutes: 60,
		questions: [
			{
				id: nanoid(),
				sectionId: practicalSectionId,
				order: 0,
				type: 'multi_choice',
				label: 'Select the performance issues you would investigate first when a React view feels sluggish.',
				helperText: 'Pick all that commonly affect you.',
				required: true,
				validation: {},
				choices: [
					createChoice('Reconciliation bottlenecks'),
					createChoice('Large bundle size'),
					createChoice('Missing memoization'),
					createChoice('Inefficient selector logic'),
				],
			},
			{
				id: nanoid(),
				sectionId: practicalSectionId,
				order: 1,
				type: 'numeric',
				label: 'What maximum FID (First Input Delay) do you target for production apps? (ms)',
				required: true,
				validation: {
					minValue: 0,
					maxValue: 500,
				},
			},
			{
				id: nanoid(),
				sectionId: practicalSectionId,
				order: 2,
				type: 'long_text',
				label: 'Share a time when you balanced developer experience with runtime performance.',
				helperText: 'Include metrics or before/after comparisons if available.',
				required: false,
				validation: {
					minLength: 64,
					maxLength: 1200,
				},
				conditionalLogic: {
					questionId: introSection.questions[0].id,
					equals: introSection.questions[0].choices?.[0]?.value ?? 'react',
				},
			},
			{
				id: nanoid(),
				sectionId: practicalSectionId,
				order: 3,
				type: 'file_upload',
				label: 'Upload an architecture diagram from a recent project.',
				helperText: 'PDF or PNG preferred.',
				required: false,
				validation: {
					allowedFileTypes: ['application/pdf', 'image/png'],
					maxFileSizeMb: 15,
				},
			},
		],
	}

	return [introSection, practicalSection]
}

const seedAssessments = (): AssessmentRecord[] => {
	const now = new Date()
	const iso = (date: Date) => date.toISOString()

	const seeds = [
		{
			jobId: 'job-fullstack-lead',
			title: 'Full-stack Systems Design',
			summary: 'Evaluate architectural thinking, communication, and execution trade-offs.',
			role: 'Lead Full-stack Engineer',
			difficulty: 'hard' as const,
			durationMinutes: 120,
			tags: ['architecture', 'react', 'node', 'systems'],
			status: 'draft' as AssessmentStatus,
		},
		{
			jobId: 'job-data-platform',
			title: 'Data Platform Fundamentals',
			summary: 'Measure familiarity with streaming pipelines and data quality controls.',
			role: 'Senior Data Engineer',
			difficulty: 'medium' as const,
			durationMinutes: 95,
			tags: ['etl', 'python', 'observability'],
			status: 'published' as AssessmentStatus,
		},
	]

	return seeds.map((seed, index) => {
		const sections = createDefaultSections(seed.jobId)
		if (seed.jobId === 'job-data-platform') {
			sections[0].questions[0] = {
				...sections[0].questions[0],
				label: 'Pick the workflow orchestrator you reach for most often.',
				choices: [
					createChoice('Airflow'),
					createChoice('Dagster'),
					createChoice('Prefect'),
					createChoice('Custom orchestrator'),
				],
			}
			sections[0].questions[1] = {
				...sections[0].questions[1],
				label: 'How do you handle schema evolution in streaming sinks?',
			}
			sections[1].questions[0] = {
				...sections[1].questions[0],
				label: 'Select the monitoring primitives you implement for pipelines.',
				choices: [
					createChoice('Data freshness alerts'),
					createChoice('Row-level validation'),
					createChoice('Circuit breakers on sinks'),
					createChoice('Tracing for batch stages'),
				],
			}
			sections[1].questions[1] = {
				...sections[1].questions[1],
				label: 'Maximum acceptable end-to-end latency (minutes)',
				validation: { minValue: 1, maxValue: 180 },
			}
			sections[1].questions[3] = {
				...sections[1].questions[3],
				label: 'Upload one anonymized data contract template.',
				validation: {
					allowedFileTypes: [
						'application/pdf',
						'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
					],
					maxFileSizeMb: 10,
				},
			}
		}

		const createdAt = new Date(now.getTime() - (index + 1) * 1000 * 60 * 60 * 24 * 7)
		const updatedAt = new Date(now.getTime() - index * 1000 * 60 * 60 * 24 * 2)

		return {
			id: nanoid(),
			jobId: seed.jobId,
			title: seed.title,
			summary: seed.summary,
			role: seed.role,
			difficulty: seed.difficulty,
			durationMinutes: seed.durationMinutes,
			status: seed.status,
			tags: seed.tags,
			createdAt: iso(createdAt),
			updatedAt: iso(updatedAt),
			sections,
		}
	})
}

const seedSubmissions = (assessments: AssessmentRecord[]): AssessmentSubmissionRecord[] => {
	const submissions: AssessmentSubmissionRecord[] = []
	for (const assessment of assessments) {
		submissions.push({
			jobId: assessment.jobId,
			assessmentId: assessment.id,
			candidateId: nanoid(),
			candidateName: 'Jordan Singh',
			submittedAt: new Date().toISOString(),
			score: 87,
			status: 'graded',
			answers: assessment.sections.flatMap((section) =>
				section.questions.map((question) => ({
					questionId: question.id,
					response:
						question.type === 'numeric'
							? 150
							: question.type === 'multi_choice'
								? question.choices?.slice(0, 2).map((choice) => choice.value) ?? []
								: 'Provided detailed response',
					score: 10,
					feedback: 'Well-considered answer with actionable insights.',
				})),
			),
		})
	}
	return submissions
}

let isSeeded = false

export const initializeAssessmentsStorage = async () => {
	if (isSeeded) return
	const database = ensureDatabase()
	const existing = await database.assessments.count()
	if (existing > 0) {
		isSeeded = true
		return
	}
	const assessments = seedAssessments()
	const submissions = seedSubmissions(assessments)
	await database.transaction('rw', database.assessments, database.submissions, async () => {
		for (const assessment of assessments) {
			await database.assessments.put(assessment, assessment.jobId)
		}
		for (const submission of submissions) {
			await database.submissions.add(submission)
		}
	})
	isSeeded = true
}

export const listAssessments = async () => {
	await initializeAssessmentsStorage()
	const database = ensureDatabase()
	return database.assessments.toArray()
}

export const getAssessmentByJobId = async (jobId: string) => {
	await initializeAssessmentsStorage()
	const database = ensureDatabase()
	return database.assessments.get(jobId) ?? null
}

const timestamped = (assessment: AssessmentRecord): AssessmentRecord => ({
	...assessment,
	updatedAt: new Date().toISOString(),
})

export const upsertAssessment = async (assessment: AssessmentRecord) => {
	await initializeAssessmentsStorage()
	const database = ensureDatabase()
	const record = timestamped(assessment)
	record.sections = record.sections.map((section, sectionIndex) => ({
		...section,
		assessmentId: record.jobId,
		order: sectionIndex,
		questions: section.questions.map((question, questionIndex) => ({
			...question,
			sectionId: section.id,
			order: questionIndex,
		})),
	}))
	await database.assessments.put(record, record.jobId)
	return record
}

export const ensureAssessmentForJob = async (jobId: string) => {
	const existing = await getAssessmentByJobId(jobId)
	if (existing) return existing
	const now = new Date().toISOString()
	const sections = createDefaultSections(jobId)
	const assessment: AssessmentRecord = {
		id: nanoid(),
		jobId,
		title: 'Untitled assessment',
		summary: '',
		role: 'Generalist',
		difficulty: 'medium',
		durationMinutes: 60,
		status: 'draft',
		tags: [],
		createdAt: now,
		updatedAt: now,
		sections,
	}
	await upsertAssessment(assessment)
	return assessment
}

export const deleteAssessmentByJobId = async (jobId: string) => {
	await initializeAssessmentsStorage()
	const database = ensureDatabase()
	await database.transaction('rw', database.assessments, database.submissions, async () => {
		await database.assessments.delete(jobId)
		await database.submissions.where('jobId').equals(jobId).delete()
	})
}

export const listSubmissionsByJobId = async (jobId: string) => {
	await initializeAssessmentsStorage()
	const database = ensureDatabase()
	const entries = await database.submissions.where('jobId').equals(jobId).sortBy('submittedAt')
	return entries.reverse()
}

type CreateSubmissionInput = {
	jobId: string
	candidateId: string
	candidateName: string
	answers: AssessmentSubmissionAnswer[]
	score?: number | null
	status?: AssessmentSubmissionRecord['status']
	submittedAt?: string
}

export const createSubmission = async (input: CreateSubmissionInput) => {
	await initializeAssessmentsStorage()
	const database = ensureDatabase()
	const assessment = await database.assessments.get(input.jobId)
	if (!assessment) {
		throw new Error('Assessment not found for job')
	}
	const submission: AssessmentSubmissionRecord = {
		jobId: input.jobId,
		assessmentId: assessment.id,
		candidateId: input.candidateId,
		candidateName: input.candidateName,
		submittedAt: input.submittedAt ?? new Date().toISOString(),
		score: input.score ?? null,
		status: input.status ?? 'completed',
		answers: input.answers,
	}
	const id = await database.submissions.add(submission)
	return { ...submission, id }
}

export const assessmentsRepository = {
	initialize: initializeAssessmentsStorage,
	list: listAssessments,
	getByJobId: getAssessmentByJobId,
	ensureForJob: ensureAssessmentForJob,
	upsert: upsertAssessment,
	persist: upsertAssessment, 
	removeByJobId: deleteAssessmentByJobId,
	submissions: {
		listByJob: listSubmissionsByJobId,
		create: createSubmission,
	},
}


