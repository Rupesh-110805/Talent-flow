import { http, HttpResponse, delay, type DefaultBodyType } from 'msw'
import {
	assessmentsRepository,
	type AssessmentRecord,
	type AssessmentSubmissionRecord,
	type AssessmentSubmissionAnswer,
} from '../utils/storage'

const API_BASE = '/api/assessments'

const readJson = async <T>(request: Request): Promise<T | undefined> => {
	try {
		return (await request.json()) as T
	} catch {
		return undefined
	}
}

const randomLatency = () => 200 + Math.random() * 1000
const shouldFail = () => Math.random() < 0.05 + Math.random() * 0.05

const withNetwork = async <T extends DefaultBodyType>(handler: () => Promise<HttpResponse<T>>) => {
	await delay(randomLatency())
	if (shouldFail()) {
		return HttpResponse.json({ message: 'Simulated network instability' }, { status: 503 })
	}
	return handler()
}

export const assessmentsHandlers = [
	http.get(`${API_BASE}/:jobId`, async ({ params }) =>
		withNetwork(async () => {
			await assessmentsRepository.initialize()
			const { jobId } = params as { jobId: string }
			const assessment =
				(await assessmentsRepository.getByJobId(jobId)) ?? (await assessmentsRepository.ensureForJob(jobId))
			return HttpResponse.json({ data: assessment })
		}),
	),

	http.put(`${API_BASE}/:jobId`, async ({ params, request }) =>
		withNetwork(async () => {
			const { jobId } = params as { jobId: string }
			const payload = await readJson<Partial<AssessmentRecord>>(request)
			if (!payload) {
				return HttpResponse.json({ message: 'Missing assessment payload' }, { status: 400 })
			}
			await assessmentsRepository.initialize()
			const baseline = await assessmentsRepository.ensureForJob(jobId)
			const updated: AssessmentRecord = {
				...baseline,
				...payload,
				jobId,
				sections: payload.sections ?? baseline.sections,
			}
			const saved = await assessmentsRepository.upsert(updated)
			return HttpResponse.json({ data: saved })
		}),
	),

	http.post(`${API_BASE}/:jobId/submit`, async ({ params, request }) =>
		withNetwork(async () => {
			const { jobId } = params as { jobId: string }
			const payload = await readJson<{
				candidateId: string
				candidateName: string
				answers: AssessmentSubmissionAnswer[]
				score?: number | null
				status?: AssessmentSubmissionRecord['status']
				submittedAt?: string
			}>(request)
			if (!payload) {
				return HttpResponse.json({ message: 'Missing submission payload' }, { status: 400 })
			}
			try {
				const submission = await assessmentsRepository.submissions.create({
					jobId,
					candidateId: payload.candidateId,
					candidateName: payload.candidateName,
					answers: payload.answers,
					score: payload.score,
					status: payload.status,
					submittedAt: payload.submittedAt,
				})
				return HttpResponse.json({ data: submission }, { status: 201 })
			} catch (error) {
				return HttpResponse.json(
					{ message: error instanceof Error ? error.message : 'Unable to record submission' },
					{ status: 404 },
				)
			}
		}),
	),
]

export type AssessmentsHandlers = typeof assessmentsHandlers
