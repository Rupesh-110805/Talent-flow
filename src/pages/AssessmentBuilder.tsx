import { type ChangeEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import {
	Box,
	Flex,
	Heading,
	Text,
	Spinner,
	Button,
	Stack,
	FieldRoot,
	FieldLabel,
	Input,
	Textarea,
	Toaster,
	ToastRoot,
	ToastIndicator,
	ToastTitle,
	ToastDescription,
	ToastCloseTrigger,
	createToaster,
} from '@chakra-ui/react'
import AssessmentQuestionEditor from '../components/AssessmentQuestionEditor'
import AssessmentPreview from '../components/AssessmentPreview'
import { useAssessmentsStore } from '../store/useAssessmentsStore'
import { useShallow } from 'zustand/react/shallow'
import { useAuth } from '../context/AuthContext'

const SectionCard = ({ children }: { children: ReactNode }) => (
	<Box
		bg="white"
		borderRadius="24px"
		borderWidth="1px"
		borderColor="gray.200"
		boxShadow="0 20px 36px rgba(70,120,230,0.12)"
		p={{ base: 5, md: 6 }}
		width="100%"
	>
		{children}
	</Box>
)

const InlineDivider = () => <Box h="1px" bg="gray.100" borderRadius="full" />

const questionTypes = [
	{ label: 'Single choice', value: 'single_choice' },
	{ label: 'Multi choice', value: 'multi_choice' },
	{ label: 'Short text', value: 'short_text' },
	{ label: 'Long text', value: 'long_text' },
	{ label: 'Numeric', value: 'numeric' },
	{ label: 'File upload', value: 'file_upload' },
] as const

const AssessmentBuilder = () => {
	const { jobId } = useParams<{ jobId: string }>()
	const navigate = useNavigate()
	const { role } = useAuth()
	const toaster = useMemo(() => createToaster({ placement: 'top-end' }), [])
	const [questionTypeSelections, setQuestionTypeSelections] = useState<Record<string, (typeof questionTypes)[number]['value']>>({})

	const {
		assessment,
		selectedJobId,
		isLoading,
		error,
		isPersisting,
		initialize,
		updateMetadata,
		addSection,
		updateSection,
		removeSection,
		addQuestion,
		removeQuestion,
		duplicateQuestion,
		persist,
	} = useAssessmentsStore(
		useShallow((state) => ({
			assessment: state.assessment,
			selectedJobId: state.selectedJobId,
			isLoading: state.isLoading,
			error: state.error,
			isPersisting: state.isPersisting,
			initialize: state.initialize,
			updateMetadata: state.updateMetadata,
			addSection: state.addSection,
			updateSection: state.updateSection,
			removeSection: state.removeSection,
			addQuestion: state.addQuestion,
			removeQuestion: state.removeQuestion,
			duplicateQuestion: state.duplicateQuestion,
			persist: state.persist,
		})),
	)

	useEffect(() => {
		if (!jobId) return
		if (selectedJobId === jobId || isLoading) return
		void initialize(jobId)
	}, [initialize, isLoading, jobId, selectedJobId])

	useEffect(() => {
		if (!assessment) return
		setQuestionTypeSelections((current) => {
			const next = { ...current }
			for (const section of assessment.sections) {
				if (!next[section.id]) {
					next[section.id] = 'single_choice'
				}
			}
			return next
		})
	}, [assessment])

	const allQuestions = useMemo(
		() => assessment?.sections.flatMap((section) => section.questions) ?? [],
		[assessment],
	)

	if (!role) {
		return <Navigate to="/login" replace />
	}

	if (role !== 'recruiter') {
		return <Navigate to={`/jobs/${jobId ?? ''}`} replace />
	}

	if (!jobId) {
		return <Navigate to="/jobs" replace />
	}

	const handlePersist = async () => {
		try {
			await persist()
			toaster.create({
				title: 'Assessment saved',
				description: 'Your updates are live for candidates.',
				type: 'success',
			})
		} catch (saveError) {
			const message = saveError instanceof Error ? saveError.message : 'Failed to save assessment'
			toaster.create({
				title: 'Save failed',
				description: message,
				type: 'error',
			})
		}
	}

	const handleAddQuestion = (sectionId: string) => {
		const type = questionTypeSelections[sectionId] ?? 'single_choice'
		addQuestion(sectionId, { type })
	}

	const handleSectionField = (sectionId: string, field: 'title' | 'description' | 'timeLimitMinutes', value: string) => {
		if (field === 'timeLimitMinutes') {
			const parsed = value === '' ? null : Number(value)
			updateSection(sectionId, { timeLimitMinutes: Number.isNaN(parsed) ? null : parsed })
			return
		}
		if (field === 'description') {
			updateSection(sectionId, { description: value || undefined })
			return
		}
		updateSection(sectionId, { title: value })
	}

	return (
		<Box bg="gray.50" minH="100vh" py={{ base: 8, md: 12 }} px={{ base: 4, md: 10, xl: 16 }}>
			<Toaster toaster={toaster}>
				{(toast) => {
					const { title, description, ...toastProps } = toast
					return (
						<ToastRoot {...toastProps}>
							<ToastIndicator />
							<Stack gap={1} flex="1" minW={0}>
								{title ? <ToastTitle>{title}</ToastTitle> : null}
								{description ? <ToastDescription>{description}</ToastDescription> : null}
							</Stack>
							<ToastCloseTrigger />
						</ToastRoot>
					)
				}}
			</Toaster>
			<Stack gap={8} maxW="1200px" mx="auto">
				<Flex justify="space-between" align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={{ base: 5, md: 6 }}>
					<Stack gap={2} maxW="3xl">
						<Text color="purple.500" fontWeight="600" fontSize="0.9rem">
							Assessment Builder
						</Text>
						<Heading size="lg" color="gray.800">
							Craft the recruiter experience
						</Heading>
						<Text color="gray.600">
							Use the builder tools to curate sections, questions, and validation. The live preview stays in sync so you can confirm the candidate view.
						</Text>
					</Stack>
					<Stack direction={{ base: 'column', sm: 'row' }} w={{ base: 'full', md: 'auto' }} gap={3} align={{ base: 'stretch', sm: 'center' }}>
						<Button variant="ghost" onClick={() => navigate(-1)}>
							Back
						</Button>
						<Button colorScheme="purple" onClick={handlePersist} disabled={isPersisting}>
							{isPersisting ? 'Saving…' : 'Save changes'}
						</Button>
					</Stack>
				</Flex>

				{isLoading ? (
					<Flex align="center" justify="center" py={16}>
						<Spinner size="lg" color="purple.400" />
					</Flex>
				) : error ? (
					<Box
						borderWidth="1px"
						borderColor="red.200"
						bg="red.50"
						color="red.700"
						borderRadius="xl"
						px={{ base: 5, md: 6 }}
						py={{ base: 4, md: 5 }}
					>
						<Text fontWeight="600">We couldn&apos;t load the assessment.</Text>
						<Text mt={1}>{error}</Text>
					</Box>
				) : null}

				{assessment && !isLoading && (
				<Flex direction={{ base: 'column', xl: 'row' }} gap={{ base: 8, xl: 10 }} align="flex-start">
					<Flex direction="column" gap={6} flex="1" minW={0}>
						<SectionCard>
							<Flex direction="column" gap={4}>
								<Box>
									<FieldRoot gap={2}>
										<FieldLabel htmlFor="assessment-title">Assessment title</FieldLabel>
										<Input
											id="assessment-title"
											value={assessment.title ?? ''}
											onChange={(event: ChangeEvent<HTMLInputElement>) => updateMetadata({ title: event.target.value })}
										/>
									</FieldRoot>
								</Box>
								<Box>
									<FieldRoot gap={2}>
										<FieldLabel htmlFor="assessment-summary">Summary</FieldLabel>
										<Textarea
											id="assessment-summary"
											value={assessment.summary ?? ''}
											onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateMetadata({ summary: event.target.value })}
											minH="96px"
										/>
									</FieldRoot>
								</Box>
							</Flex>
						</SectionCard>

						<Flex direction="column" gap={6}>
							{assessment.sections.map((section) => {
								const sectionTitleId = `section-${section.id}-title`
								const sectionDescriptionId = `section-${section.id}-description`
								const sectionTimeLimitId = `section-${section.id}-time-limit`
								return (
								<SectionCard key={section.id}>
									<Flex direction="column" gap={5}>
										<Flex direction={{ base: 'column', md: 'row' }} gap={4} justify="space-between" align={{ base: 'stretch', md: 'center' }}>
											<Box flex="1">
												<FieldRoot gap={2}>
													<FieldLabel htmlFor={sectionTitleId}>Section title</FieldLabel>
													<Input
														id={sectionTitleId}
														value={section.title}
														onChange={(event: ChangeEvent<HTMLInputElement>) =>
															handleSectionField(section.id, 'title', event.target.value)
														}
													/>
												</FieldRoot>
											</Box>
											<Button
												variant="outline"
												colorScheme="red"
												onClick={() => removeSection(section.id)}
											>
												Remove section
											</Button>
										</Flex>
										<Box>
											<FieldRoot gap={2}>
												<FieldLabel htmlFor={sectionDescriptionId}>Description</FieldLabel>
												<Textarea
													id={sectionDescriptionId}
													value={section.description ?? ''}
													onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
														handleSectionField(section.id, 'description', event.target.value)
													}
													minH="80px"
												/>
											</FieldRoot>
										</Box>
										<Flex direction={{ base: 'column', md: 'row' }} gap={4}>
											<Box flex={{ base: '1', md: '0 0 240px' }}>
												<FieldRoot gap={2}>
													<FieldLabel htmlFor={sectionTimeLimitId}>Time limit (minutes)</FieldLabel>
													<Input
														id={sectionTimeLimitId}
														type="number"
														min={0}
														value={section.timeLimitMinutes ?? ''}
														onChange={(event: ChangeEvent<HTMLInputElement>) =>
															handleSectionField(section.id, 'timeLimitMinutes', event.target.value)
														}
													/>
												</FieldRoot>
											</Box>
										</Flex>
										<InlineDivider />
										<Flex direction="column" gap={5}>
											{section.questions.map((question, index) => (
												<AssessmentQuestionEditor
													key={question.id}
													question={question}
													index={index}
													availableConditions={allQuestions}
													onRemove={removeQuestion}
													onDuplicate={duplicateQuestion}
												/>
											))}
											<Flex direction={{ base: 'column', md: 'row' }} gap={3} align={{ base: 'stretch', md: 'center' }}>
												<Box flex="1">
													<Text fontWeight="600" fontSize="0.9rem" color="gray.700">
														Question type
													</Text>
													<Flex wrap="wrap" gap={2}>
														{questionTypes.map((type) => {
															const isActive = (questionTypeSelections[section.id] ?? 'single_choice') === type.value
															return (
																<Button
																	key={type.value}
																	variant={isActive ? 'solid' : 'outline'}
																	colorScheme={isActive ? 'purple' : undefined}
																	onClick={() =>
																		setQuestionTypeSelections((current) => ({
																			...current,
																			[section.id]: type.value,
																		}))
																	}
																>
																	{type.label}
																</Button>
															)
														})}
													</Flex>
												</Box>
												<Button variant="outline" onClick={() => handleAddQuestion(section.id)}>
													Add question
												</Button>
											</Flex>
										</Flex>
									</Flex>
								</SectionCard>
							)
						})}

							<Button
								variant="solid"
								colorScheme="purple"
								size="lg"
								onClick={() => addSection()}
							>
								Add new section
							</Button>
						</Flex>
					</Flex>

					<Box flex={{ base: 'unset', xl: '0 0 38%' }} position="sticky" top={{ base: 'auto', xl: '6rem' }} width="100%">
						<SectionCard>
							<Heading size="md" color="gray.800" mb={4}>
								Live preview
							</Heading>
							<AssessmentPreview />
						</SectionCard>
					</Box>
				</Flex>
			)}
		</Stack>
		</Box>
	)
}

export default AssessmentBuilder

