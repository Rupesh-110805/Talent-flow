import { memo } from 'react'
import { Box, Heading, Text, Flex, Skeleton, Stack } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAssessmentsStore } from '../store/useAssessmentsStore'
import { useShallow } from 'zustand/react/shallow'
import type { AssessmentQuestion } from '../utils/storage'

const MotionBox = motion.create(Box)

const TagPill = ({ label, colorScheme }: { label: string; colorScheme?: string }) => (
	<Box
		as="span"
		display="inline-flex"
		alignItems="center"
		justifyContent="center"
		px={3}
		py={1}
		bg={colorScheme ? `${colorScheme}.100` : 'gray.100'}
		color={colorScheme ? `${colorScheme}.700` : 'gray.600'}
		borderWidth="1px"
		borderColor={colorScheme ? `${colorScheme}.200` : 'gray.200'}
		borderRadius="999px"
		fontSize="0.75rem"
		fontWeight="600"
		textTransform="capitalize"
	>
		{label}
	</Box>
)

const QuestionBadgeRow = ({ question }: { question: AssessmentQuestion }) => (
	<Flex wrap="wrap" gap={2} mt={question.helperText ? 2 : 3}>
		{question.required ? <TagPill label="Required" colorScheme="purple" /> : null}
		<TagPill label={question.type.replace('_', ' ')} />
	</Flex>
)

const renderPreviewField = (question: AssessmentQuestion) => {
	switch (question.type) {
		case 'single_choice':
		case 'multi_choice':
			return (
				<Flex direction="column" gap={2}>
					{question.choices?.map((choice) => (
						<Flex
							key={choice.id}
							align="center"
							gap={2}
						>
							<Box
								borderWidth="2px"
								borderColor="gray.300"
								borderRadius={question.type === 'single_choice' ? '999px' : 'md'}
								height="16px"
								width="16px"
							/>
							<Text color="gray.600">{choice.label}</Text>
						</Flex>
					))}
				</Flex>
			)
		case 'short_text':
			return (
				<Box borderWidth="1px" borderColor="gray.200" borderRadius="xl" px={3} py={2} color="gray.500" bg="gray.50">
					Short answer input
				</Box>
			)
		case 'long_text':
			return (
				<Box borderWidth="1px" borderColor="gray.200" borderRadius="xl" px={3} py={4} color="gray.500" bg="gray.50">
					Long response area
				</Box>
			)
		case 'numeric':
			return (
				<Box borderWidth="1px" borderColor="gray.200" borderRadius="xl" px={3} py={2} color="gray.500" bg="gray.50">
					Numeric field
				</Box>
			)
		case 'file_upload':
			return (
				<Flex
					align="center"
					justify="space-between"
					borderWidth="1px"
					borderColor="gray.200"
					borderRadius="xl"
					px={3}
					py={2}
					bg="gray.50"
				>
					<Text color="gray.500">Upload file</Text>
					<TagPill label="Stub" colorScheme="purple" />
				</Flex>
			)
		default:
			return null
	}
}

const PreviewQuestion = ({ question }: { question: AssessmentQuestion }) => (
	<MotionBox
		key={question.id}
		layout
		borderWidth="1px"
		borderColor="gray.200"
		borderRadius="xl"
		bg="white"
		boxShadow="0 16px 32px rgba(70,120,230,0.12)"
		px={{ base: 4, md: 5 }}
		py={{ base: 4, md: 5 }}
		initial={{ opacity: 0, y: 12 }}
		animate={{ opacity: 1, y: 0 }}
		exit={{ opacity: 0, y: -12 }}
		transition={{ duration: 0.2, ease: 'easeOut' }}
	>
		<Stack gap={3}>
			<Stack gap={1}>
				<Text fontWeight="600" color="gray.800">
					{question.label}
				</Text>
				{question.helperText ? (
					<Text fontSize="sm" color="gray.500">
						{question.helperText}
					</Text>
				) : null}
				<QuestionBadgeRow question={question} />
			</Stack>
			{renderPreviewField(question)}
		</Stack>
	</MotionBox>
)

const EmptyPreviewState = () => (
	<Box
		borderWidth="2px"
		borderStyle="dashed"
		borderColor="gray.200"
		borderRadius="2xl"
		px={6}
		py={12}
		textAlign="center"
		bg="gray.50"
	>
		<Heading size="md" color="gray.600">
			Start crafting your assessment
		</Heading>
		<Text color="gray.500" mt={2}>
			Questions you add in the builder will appear here instantly.
		</Text>
	</Box>
)

const AssessmentPreview = memo(() => {
	const { assessment, isLoading } = useAssessmentsStore(
		useShallow((state) => ({
			assessment: state.assessment,
			isLoading: state.isLoading,
		})),
	)

	if (isLoading) {
		return (
			<Flex direction="column" gap={4}>
				<Skeleton height="40px" borderRadius="md" />
				<Skeleton height="240px" borderRadius="xl" />
				<Skeleton height="240px" borderRadius="xl" />
			</Flex>
		)
	}

	if (!assessment) {
		return <EmptyPreviewState />
	}

	return (
		<Stack gap={6}>
			<Stack gap={2}>
				<Heading size="md" color="gray.800">
					{assessment.title}
				</Heading>
				<Text color="gray.500">
					{assessment.summary}
				</Text>
				<Flex wrap="wrap" gap={2}>
					<TagPill label={assessment.difficulty} colorScheme="purple" />
					<TagPill label={`${assessment.durationMinutes} min`} colorScheme="blue" />
					{assessment.tags.map((tag) => (
						<TagPill key={tag} label={tag} />
					))}
				</Flex>
			</Stack>
			<AnimatePresence initial={false} mode="popLayout">
				{assessment.sections.map((section) => (
					<MotionBox
						key={section.id}
						layout
						bg="gray.50"
						borderRadius="2xl"
						borderWidth="1px"
						borderColor="gray.200"
						px={{ base: 4, md: 5 }}
						py={{ base: 5, md: 6 }}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						transition={{ duration: 0.25, ease: 'easeOut' }}
					>
						<Stack gap={4}>
							<Stack gap={1}>
								<Heading size="sm" color="gray.700">
									{section.title}
								</Heading>
								<Text color="gray.500">
									{section.description || 'No description provided.'}
								</Text>
								{section.timeLimitMinutes ? (
									<TagPill label={`${section.timeLimitMinutes} min section`} colorScheme="purple" />
								) : null}
							</Stack>
							<Box h="1px" bg="gray.200" borderRadius="full" />
							{section.questions.length === 0 ? (
								<Box
									borderWidth="1px"
									borderColor="gray.200"
									borderRadius="xl"
									px={{ base: 4, md: 6 }}
									py={{ base: 5, md: 6 }}
									textAlign="center"
									bg="white"
								>
									<Text color="gray.500">Add questions to preview them here.</Text>
								</Box>
							) : (
								<AnimatePresence initial={false} mode="popLayout">
									{section.questions.map((question) => (
										<PreviewQuestion key={question.id} question={question} />
									))}
								</AnimatePresence>
							)}
						</Stack>
					</MotionBox>
				))}
			</AnimatePresence>
		</Stack>
	)
})

AssessmentPreview.displayName = 'AssessmentPreview'

export default AssessmentPreview

