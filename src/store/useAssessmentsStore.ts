import { create } from 'zustand'
import { nanoid } from 'nanoid'
import {
	assessmentsRepository,
	type AssessmentRecord,
	type AssessmentSection,
	type AssessmentQuestion,
	type AssessmentStatus,
	type QuestionType,
	type QuestionChoice,
	type QuestionValidationRules,
	type QuestionConditionalLogic,
} from '../utils/storage'

type CreateSectionInput = {
	title?: string
	description?: string
	timeLimitMinutes?: number | null
}

type CreateQuestionInput = {
	type?: QuestionType
	label?: string
	description?: string
	helperText?: string
	required?: boolean
	choices?: QuestionChoice[]
	validation?: Partial<QuestionValidationRules>
	conditionalLogic?: QuestionConditionalLogic | null
}

type AssessmentsStoreState = {
	selectedJobId: string | null
	assessment: AssessmentRecord | null
	isLoading: boolean
	isPersisting: boolean
	error: string | null
	initialize: (jobId: string) => Promise<void>
	refresh: () => Promise<void>
	updateMetadata: (updates: Partial<Pick<AssessmentRecord, 'title' | 'summary' | 'role' | 'difficulty' | 'durationMinutes' | 'tags' | 'status'>>) => void
	addSection: (payload?: CreateSectionInput) => void
	updateSection: (sectionId: string, updates: Partial<Omit<AssessmentSection, 'id' | 'assessmentId' | 'questions' | 'order'>>) => void
	removeSection: (sectionId: string) => void
	reorderSections: (sectionOrder: string[]) => void
	addQuestion: (sectionId: string, payload?: CreateQuestionInput) => void
	updateQuestion: (questionId: string, updates: Partial<Omit<AssessmentQuestion, 'id' | 'sectionId' | 'order'>>) => void
	updateQuestionValidation: (questionId: string, validation: Partial<QuestionValidationRules>) => void
	updateQuestionConditional: (questionId: string, conditional: QuestionConditionalLogic | null) => void
	setQuestionChoices: (questionId: string, choices: QuestionChoice[]) => void
	removeQuestion: (questionId: string) => void
	reorderQuestions: (sectionId: string, questionOrder: string[]) => void
	duplicateQuestion: (questionId: string) => void
	reset: () => void
	persist: () => Promise<void>
}

const normalizeSectionOrders = (sections: AssessmentSection[]) =>
	sections.map((section, index) => ({ ...section, order: index }))

const normalizeQuestionOrders = (questions: AssessmentQuestion[]) =>
	questions.map((question, index) => ({ ...question, order: index }))

const createPlaceholderChoice = (label: string): QuestionChoice => ({
	id: nanoid(),
	label,
	value: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
})

const defaultValidationForType = (type: QuestionType): QuestionValidationRules => {
	switch (type) {
		case 'short_text':
			return { minLength: 0, maxLength: 280 }
		case 'long_text':
			return { minLength: 0, maxLength: 1200 }
		case 'numeric':
			return { minValue: 0, maxValue: 100 }
		case 'file_upload':
			return { allowedFileTypes: ['application/pdf', 'image/png'], maxFileSizeMb: 10 }
		default:
			return {}
	}
}

const createDefaultQuestion = (sectionId: string, order: number, type: QuestionType): AssessmentQuestion => {
	const base: AssessmentQuestion = {
		id: nanoid(),
		sectionId,
		order,
		type,
		label: 'Untitled question',
		required: true,
		validation: defaultValidationForType(type),
		choices: undefined,
	}

	switch (type) {
		case 'single_choice':
			return {
				...base,
				description: 'Select one option that best fits.',
				helperText: 'Provide rationale in later sections if needed.',
				choices: [createPlaceholderChoice('Option A'), createPlaceholderChoice('Option B')],
			}
		case 'multi_choice':
			return {
				...base,
				description: 'Choose all answers that apply.',
				helperText: 'Multiple selections allowed.',
				choices: [
					createPlaceholderChoice('Option A'),
					createPlaceholderChoice('Option B'),
					createPlaceholderChoice('Option C'),
				],
			}
		case 'file_upload':
			return {
				...base,
				helperText: 'Upload supporting assets as a single file.',
			}
		default:
			return base
	}
}

export const useAssessmentsStore = create<AssessmentsStoreState>((set, get) => ({
	selectedJobId: null,
	assessment: null,
	isLoading: false,
	isPersisting: false,
	error: null,

	initialize: async (jobId: string) => {
		set({ isLoading: true, error: null })
		try {
			await assessmentsRepository.initialize()
			const assessment = await assessmentsRepository.ensureForJob(jobId)
			set({ selectedJobId: jobId, assessment, isLoading: false })
		} catch (error) {
			set({
				isLoading: false,
				error: error instanceof Error ? error.message : 'Failed to load assessment',
			})
		}
	},

	refresh: async () => {
		const jobId = get().selectedJobId
		if (!jobId) return
		set({ isLoading: true, error: null })
		try {
			const assessment = await assessmentsRepository.getByJobId(jobId)
			set({ assessment: assessment ?? null, isLoading: false })
		} catch (error) {
			set({
				isLoading: false,
				error: error instanceof Error ? error.message : 'Failed to refresh assessment',
			})
		}
	},

	updateMetadata: (updates) => {
		set((state) => {
			const assessment = state.assessment
			if (!assessment) return state
			return {
				...state,
				assessment: {
					...assessment,
					...updates,
				},
			}
		})
	},

	addSection: (payload = {}) => {
		set((state) => {
			const assessment = state.assessment
			if (!assessment) return state
			const section: AssessmentSection = {
				id: nanoid(),
				assessmentId: assessment.jobId,
				order: assessment.sections.length,
				title: payload.title ?? `Section ${assessment.sections.length + 1}`,
				description: payload.description ?? '',
				timeLimitMinutes: payload.timeLimitMinutes ?? null,
				questions: [],
			}
			return {
				...state,
				assessment: {
					...assessment,
					sections: [...assessment.sections, section],
				},
			}
		})
	},

	updateSection: (sectionId, updates) => {
		set((state) => {
			const assessment = state.assessment
			if (!assessment) return state
			const sections = assessment.sections.map((section) =>
				section.id === sectionId ? { ...section, ...updates } : section,
			)
			return {
				...state,
				assessment: {
					...assessment,
					sections,
				},
			}
		})
	},

	removeSection: (sectionId) => {
		set((state) => {
			const assessment = state.assessment
			if (!assessment) return state
			const filtered = assessment.sections.filter((section) => section.id !== sectionId)
			return {
				...state,
				assessment: {
					...assessment,
					sections: normalizeSectionOrders(filtered),
				},
			}
		})
	},

	reorderSections: (sectionOrder) => {
		set((state) => {
			const assessment = state.assessment
			if (!assessment) return state
			const sectionsById = new Map(assessment.sections.map((section) => [section.id, section] as const))
			const ordered = sectionOrder
				.map((sectionId) => sectionsById.get(sectionId))
				.filter((section): section is AssessmentSection => Boolean(section))
			const remaining = assessment.sections.filter((section) => !sectionOrder.includes(section.id))
			const merged = [...ordered, ...remaining]
			return {
				...state,
				assessment: {
					...assessment,
					sections: normalizeSectionOrders(merged),
				},
			}
		})
	},

	addQuestion: (sectionId, payload = {}) => {
		set((state) => {
			const assessment = state.assessment
			if (!assessment) return state
			const sections = assessment.sections.map((section) => {
				if (section.id !== sectionId) return section
				const type = payload.type ?? 'short_text'
				const baseQuestion = createDefaultQuestion(section.id, section.questions.length, type)
				const question: AssessmentQuestion = {
					...baseQuestion,
					label: payload.label ?? baseQuestion.label,
					description: payload.description ?? baseQuestion.description,
					helperText: payload.helperText ?? baseQuestion.helperText,
					required: payload.required ?? baseQuestion.required,
					validation: {
						...baseQuestion.validation,
						...(payload.validation ?? {}),
					},
					conditionalLogic: payload.conditionalLogic ?? baseQuestion.conditionalLogic,
					choices: payload.choices ?? baseQuestion.choices,
				}
				return {
					...section,
					questions: [...section.questions, question],
				}
			})
			return {
				...state,
				assessment: {
					...assessment,
					sections,
				},
			}
		})
	},

	updateQuestion: (questionId, updates) => {
		set((state) => {
			const assessment = state.assessment
			if (!assessment) return state
			const sections = assessment.sections.map((section) => {
				const index = section.questions.findIndex((question) => question.id === questionId)
				if (index === -1) return section
				const questions = section.questions.slice()
				questions[index] = { ...questions[index], ...updates }
				return {
					...section,
					questions,
				}
			})
			return {
				...state,
				assessment: {
					...assessment,
					sections,
				},
			}
		})
	},

	updateQuestionValidation: (questionId, validation) => {
		set((state) => {
			const assessment = state.assessment
			if (!assessment) return state
			const sections = assessment.sections.map((section) => {
				const index = section.questions.findIndex((question) => question.id === questionId)
				if (index === -1) return section
				const questions = section.questions.slice()
				const current = questions[index]
				questions[index] = {
					...current,
					validation: {
						...current.validation,
						...validation,
					},
				}
				return {
					...section,
					questions,
				}
			})
			return {
				...state,
				assessment: {
					...assessment,
					sections,
				},
			}
		})
	},

	updateQuestionConditional: (questionId, conditional) => {
		set((state) => {
			const assessment = state.assessment
			if (!assessment) return state
			const sections = assessment.sections.map((section) => {
				const index = section.questions.findIndex((question) => question.id === questionId)
				if (index === -1) return section
				const questions = section.questions.slice()
				questions[index] = {
					...questions[index],
					conditionalLogic: conditional ?? undefined,
				}
				return {
					...section,
					questions,
				}
			})
			return {
				...state,
				assessment: {
					...assessment,
					sections,
				},
			}
		})
	},

	setQuestionChoices: (questionId, choices) => {
		set((state) => {
			const assessment = state.assessment
			if (!assessment) return state
			const sections = assessment.sections.map((section) => {
				const index = section.questions.findIndex((question) => question.id === questionId)
				if (index === -1) return section
				const questions = section.questions.slice()
				questions[index] = {
					...questions[index],
					choices,
				}
				return {
					...section,
					questions,
				}
			})
			return {
				...state,
				assessment: {
					...assessment,
					sections,
				},
			}
		})
	},

	removeQuestion: (questionId) => {
		set((state) => {
			const assessment = state.assessment
			if (!assessment) return state
			const sections = assessment.sections.map((section) => {
				if (!section.questions.some((question) => question.id === questionId)) {
					return section
				}
				const filtered = section.questions.filter((question) => question.id !== questionId)
				return {
					...section,
					questions: normalizeQuestionOrders(filtered),
				}
			})
			return {
				...state,
				assessment: {
					...assessment,
					sections,
				},
			}
		})
	},

	reorderQuestions: (sectionId, questionOrder) => {
		set((state) => {
			const assessment = state.assessment
			if (!assessment) return state
			const sections = assessment.sections.map((section) => {
				if (section.id !== sectionId) return section
				const questionsById = new Map(section.questions.map((question) => [question.id, question] as const))
				const ordered = questionOrder
					.map((questionId) => questionsById.get(questionId))
					.filter((question): question is AssessmentQuestion => Boolean(question))
				const remaining = section.questions.filter((question) => !questionOrder.includes(question.id))
				const merged = [...ordered, ...remaining]
				return {
					...section,
					questions: normalizeQuestionOrders(merged),
				}
			})
			return {
				...state,
				assessment: {
					...assessment,
					sections,
				},
			}
		})
	},

	duplicateQuestion: (questionId) => {
		set((state) => {
			const assessment = state.assessment
			if (!assessment) return state
			const sections = assessment.sections.map((section) => {
				const index = section.questions.findIndex((question) => question.id === questionId)
				if (index === -1) return section
				const question = section.questions[index]
				const cloned: AssessmentQuestion = {
					...question,
					id: nanoid(),
					order: section.questions.length,
					choices: question.choices?.map((choice) => ({
						...choice,
						id: nanoid(),
					})),
				}
				return {
					...section,
					questions: [...section.questions, cloned],
				}
			})
			return {
				...state,
				assessment: {
					...assessment,
					sections,
				},
			}
		})
	},

	reset: () => {
		set({ selectedJobId: null, assessment: null })
	},

	persist: async () => {
		const assessment = get().assessment
		if (!assessment) return
		set({ isPersisting: true, error: null })
		try {
			const response = await fetch(`/api/assessments/${assessment.jobId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(assessment),
			})
			if (!response.ok) {
				const message = await response
					.json()
					.catch(() => ({ message: 'Failed to save assessment' }))
				throw new Error(typeof message === 'object' && message && 'message' in message ? (message as { message?: string }).message ?? 'Failed to save assessment' : 'Failed to save assessment')
			}
			const payload = (await response.json()) as { data: AssessmentRecord }
			set({ assessment: payload.data, isPersisting: false })
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to save assessment'
			set({
				isPersisting: false,
				error: message,
			})
			throw new Error(message)
		}
	},
}))

export type {
	AssessmentRecord,
	AssessmentSection,
	AssessmentQuestion,
	AssessmentStatus,
	QuestionType,
}

