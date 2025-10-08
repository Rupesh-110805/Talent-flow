import { useEffect, useMemo } from 'react'
import type { ChangeEvent } from 'react'
import {
	Box,
	Button,
	Flex,
	Text,
	Stack,
	Input,
	Textarea,
	Checkbox,
	chakra,
	FieldRoot,
	FieldLabel,
	FieldHelperText,
	FieldErrorText,
} from '@chakra-ui/react'
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { nanoid } from 'nanoid'
import { useAssessmentsStore } from '../store/useAssessmentsStore'
import type { AssessmentQuestion, QuestionType, QuestionChoice } from '../utils/storage'

type AssessmentQuestionEditorProps = {
	question: AssessmentQuestion
	index: number
	availableConditions: AssessmentQuestion[]
	onRemove: (questionId: string) => void
	onDuplicate: (questionId: string) => void
}

type QuestionFormValues = {
	type: QuestionType
	label: string
	description?: string
	helperText?: string
	required: boolean
	choices: QuestionChoice[]
	validation: {
		minLength?: number
		maxLength?: number
		minValue?: number
		maxValue?: number
		maxFileSizeMb?: number
	}
	conditionalEnabled: boolean
	conditionalQuestionId?: string
	conditionalEquals?: string
}

const optionalNumber = z.preprocess((value) => {
	if (value === '' || value === null || value === undefined) return undefined
	const parsed = typeof value === 'string' ? Number(value) : (value as number)
	return Number.isNaN(parsed) ? undefined : parsed
}, z.number().finite().optional())

const choiceSchema = z.object({
	id: z.string(),
	label: z.string().min(1, 'Choice label is required'),
	value: z.string().min(1, 'Choice value is required'),
})

const questionSchema = z
	.object({
		type: z.enum(['single_choice', 'multi_choice', 'short_text', 'long_text', 'numeric', 'file_upload']),
		label: z.string().min(1, 'Label is required'),
		description: z.string().optional(),
		helperText: z.string().optional(),
		required: z.boolean(),
		choices: z.array(choiceSchema).default([]),
		validation: z
			.object({
				minLength: optionalNumber,
				maxLength: optionalNumber,
				minValue: optionalNumber,
				maxValue: optionalNumber,
				maxFileSizeMb: optionalNumber,
			})
			.default({}),
		conditionalEnabled: z.boolean(),
		conditionalQuestionId: z.string().optional(),
		conditionalEquals: z.string().optional(),
	})
	.superRefine((data, ctx) => {
		if ((data.type === 'single_choice' || data.type === 'multi_choice') && data.choices.length < 2) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['choices'],
				message: 'Add at least two choices',
			})
		}
		if (data.type === 'short_text' || data.type === 'long_text') {
			if (
				data.validation.minLength !== undefined &&
				data.validation.maxLength !== undefined &&
				data.validation.maxLength < data.validation.minLength
			) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['validation', 'maxLength'],
					message: 'Max length must be greater than or equal to min length',
				})
			}
		}
		if (data.type === 'numeric') {
			if (
				data.validation.minValue !== undefined &&
				data.validation.maxValue !== undefined &&
				data.validation.maxValue < data.validation.minValue
			) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['validation', 'maxValue'],
					message: 'Max value must be greater than or equal to min value',
				})
			}
		}
		if (data.conditionalEnabled) {
			if (!data.conditionalQuestionId) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['conditionalQuestionId'],
					message: 'Select a question to depend on',
				})
			}
			if (!data.conditionalEquals || data.conditionalEquals.trim().length === 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['conditionalEquals'],
					message: 'Provide a value to compare against',
				})
			}
		}
	})

const toFormValues = (question: AssessmentQuestion): QuestionFormValues => ({
	type: question.type,
	label: question.label,
	description: question.description ?? '',
	helperText: question.helperText ?? '',
	required: question.required,
	choices: question.choices ?? [],
	validation: {
		minLength: question.validation?.minLength,
		maxLength: question.validation?.maxLength,
		minValue: question.validation?.minValue,
		maxValue: question.validation?.maxValue,
		maxFileSizeMb: question.validation?.maxFileSizeMb,
	},
	conditionalEnabled: Boolean(question.conditionalLogic),
	conditionalQuestionId: question.conditionalLogic?.questionId,
	conditionalEquals:
		typeof question.conditionalLogic?.equals === 'string'
			? question.conditionalLogic?.equals
			: question.conditionalLogic?.equals?.join(', '),
})

const sanitizeQuestion = (values: QuestionFormValues): Partial<AssessmentQuestion> => {
	const validation = {
		minLength: values.validation.minLength,
		maxLength: values.validation.maxLength,
		minValue: values.validation.minValue,
		maxValue: values.validation.maxValue,
		maxFileSizeMb: values.validation.maxFileSizeMb,
	}

	const conditionalLogic = values.conditionalEnabled && values.conditionalQuestionId && values.conditionalEquals
		? {
			questionId: values.conditionalQuestionId,
			equals: values.conditionalEquals,
		}
		: undefined

	const trimmedChoices = values.choices.map((choice) => ({
		...choice,
		label: choice.label.trim(),
		value: choice.value.trim(),
	}))

	return {
		type: values.type,
		label: values.label.trim(),
		description: values.description?.trim() || undefined,
		helperText: values.helperText?.trim() || undefined,
		required: values.required,
		validation,
		choices:
			values.type === 'single_choice' || values.type === 'multi_choice'
				? trimmedChoices
				: undefined,
		conditionalLogic,
	}
}

const AssessmentQuestionEditor = ({ question, index, availableConditions, onRemove, onDuplicate }: AssessmentQuestionEditorProps) => {
	const updateQuestion = useAssessmentsStore((state) => state.updateQuestion)

	const defaultValues = useMemo(() => toFormValues(question), [question])

	const {
		control,
		register,
		reset,
		formState: { errors },
	} = useForm<QuestionFormValues>({
		resolver: zodResolver(questionSchema),
		mode: 'onChange',
		defaultValues,
	})

	const { fields, append, remove } = useFieldArray({ control, name: 'choices' })
	const watchedValues = useWatch({ control })

	useEffect(() => {
		reset(defaultValues)
	}, [defaultValues, reset])

	useEffect(() => {
		const result = questionSchema.safeParse(watchedValues)
		if (!result.success) return
		const serializedCurrent = JSON.stringify(toFormValues(question))
		const serializedNext = JSON.stringify(result.data)
		if (serializedCurrent !== serializedNext) {
			const sanitized = sanitizeQuestion(result.data)
			updateQuestion(question.id, sanitized)
		}
	}, [watchedValues, question, updateQuestion])

	const handleAddChoice = () => {
		append({ id: nanoid(), label: 'New choice', value: `option-${fields.length + 1}` })
	}

	const handleTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
		const newType = event.target.value as QuestionType
		reset({
			...toFormValues({ ...question, type: newType }),
			type: newType,
		})
	}

	const dependentOptions = useMemo(
		() => availableConditions.filter((candidate) => candidate.id !== question.id),
		[availableConditions, question.id],
	)

	const choicesVisible = watchedValues?.type === 'single_choice' || watchedValues?.type === 'multi_choice'
	const showLengthControls = watchedValues?.type === 'short_text' || watchedValues?.type === 'long_text'
	const showNumericControls = watchedValues?.type === 'numeric'
	const showFileControls = watchedValues?.type === 'file_upload'
	const typeSelectId = `question-type-${question.id}`
	const typeLabelId = `${typeSelectId}-label`
	const labelId = `label-${question.id}`
	const descriptionId = `description-${question.id}`
	const helperId = `helper-${question.id}`
	const maxFileSizeId = `max-file-${question.id}`
	const conditionalSelectId = `conditional-select-${question.id}`
	const conditionalSelectLabelId = `${conditionalSelectId}-label`
	const conditionalEqualsId = `conditional-equals-${question.id}`

	return (
		<Box
			borderRadius="18px"
			borderWidth="1px"
			borderColor="gray.200"
			boxShadow="0 16px 32px rgba(70,120,230,0.12)"
			bg="white"
			p={{ base: 5, md: 6 }}
			position="relative"
		>
			<Flex justify="space-between" align={{ base: 'flex-start', sm: 'center' }} mb={5} flexWrap="wrap" gap={3}>
				<Text fontWeight="700" fontSize="1rem" color="gray.800">
					Question {index + 1}
				</Text>
				<Flex gap={2}>
					<Button size="sm" variant="outline" onClick={() => onDuplicate(question.id)}>
						Duplicate
					</Button>
					<Button size="sm" variant="outline" colorScheme="red" onClick={() => onRemove(question.id)}>
						Remove
					</Button>
				</Flex>
			</Flex>

			<Stack gap={5}>
				<FieldRoot gap={2}>
					<FieldLabel id={typeLabelId} htmlFor={typeSelectId}>Question type</FieldLabel>
					<chakra.select
						id={typeSelectId}
						aria-labelledby={typeLabelId}
						value={watchedValues?.type ?? 'single_choice'}
						onChange={handleTypeChange}
						borderWidth="1px"
						borderColor="gray.200"
						borderRadius="xl"
						bg="white"
						px={3}
						py={2}
						fontSize="0.95rem"
					>
						<option value="single_choice">Single choice</option>
						<option value="multi_choice">Multi choice</option>
						<option value="short_text">Short text</option>
						<option value="long_text">Long text</option>
						<option value="numeric">Numeric</option>
						<option value="file_upload">File upload</option>
					</chakra.select>
				</FieldRoot>

				<FieldRoot required invalid={Boolean(errors.label?.message)} gap={2}>
					<FieldLabel htmlFor={labelId}>Label</FieldLabel>
					<Input id={labelId} placeholder="Question label" {...register('label')} />
					{errors.label?.message ? <FieldErrorText>{errors.label.message}</FieldErrorText> : null}
				</FieldRoot>

				<FieldRoot gap={2}>
					<FieldLabel htmlFor={descriptionId}>Description</FieldLabel>
					<Textarea id={descriptionId} placeholder="Optional description" minH="80px" {...register('description')} />
				</FieldRoot>

				<FieldRoot gap={2}>
					<FieldLabel htmlFor={helperId}>Helper text</FieldLabel>
					<Textarea id={helperId} placeholder="Guidance shown to candidates" minH="72px" {...register('helperText')} />
				</FieldRoot>

				<Controller
					name="required"
					control={control}
					render={({ field }) => (
						<FieldRoot gap={1}>
							<Checkbox.Root
								checked={Boolean(field.value)}
								onCheckedChange={({ checked }) => field.onChange(Boolean(checked))}
							>
								<Checkbox.HiddenInput ref={field.ref} name={field.name} onBlur={field.onBlur} />
								<Checkbox.Control />
								<Checkbox.Label fontWeight="600">Required answer</Checkbox.Label>
							</Checkbox.Root>
							<FieldHelperText>Require candidates to answer before continuing.</FieldHelperText>
						</FieldRoot>
					)}
				/>

				{choicesVisible ? (
					<FieldRoot gap={3} invalid={Boolean(errors.choices?.message)}>
						<Flex justify="space-between" align="center">
							<FieldLabel>Choices</FieldLabel>
							<Button size="sm" variant="outline" onClick={handleAddChoice}>
								Add choice
							</Button>
						</Flex>
						<Stack gap={3}>
							{fields.map((field, idx) => (
								<Flex key={field.id} gap={2} direction={{ base: 'column', md: 'row' }} align={{ base: 'stretch', md: 'center' }}>
									<Input
										flex="1"
										placeholder={`Choice ${idx + 1} label`}
										{...register(`choices.${idx}.label` as const)}
									/>
									<Input
										flex="1"
										placeholder="Value"
										{...register(`choices.${idx}.value` as const)}
									/>
									<Button size="sm" variant="ghost" colorScheme="red" onClick={() => remove(idx)}>
										Remove
									</Button>
								</Flex>
							))}
						</Stack>
						<FieldHelperText>Display choices in the order they appear here.</FieldHelperText>
						{errors.choices?.message ? <FieldErrorText>{errors.choices.message}</FieldErrorText> : null}
					</FieldRoot>
				) : null}

				{showLengthControls ? (
					<Stack gap={3} direction={{ base: 'column', md: 'row' }}>
						<FieldRoot flex="1" gap={2}>
							<FieldLabel htmlFor={`${question.id}-min-length`}>Min length</FieldLabel>
							<Input id={`${question.id}-min-length`} type="number" min={0} {...register('validation.minLength')} />
						</FieldRoot>
						<FieldRoot flex="1" gap={2} invalid={Boolean(errors.validation?.maxLength?.message)}>
							<FieldLabel htmlFor={`${question.id}-max-length`}>Max length</FieldLabel>
							<Input id={`${question.id}-max-length`} type="number" min={0} {...register('validation.maxLength')} />
							{errors.validation?.maxLength?.message ? (
								<FieldErrorText>{errors.validation.maxLength.message}</FieldErrorText>
							) : null}
						</FieldRoot>
					</Stack>
				) : null}

				{showNumericControls ? (
					<Stack gap={3} direction={{ base: 'column', md: 'row' }}>
						<FieldRoot flex="1" gap={2}>
							<FieldLabel htmlFor={`${question.id}-min-value`}>Min value</FieldLabel>
							<Input id={`${question.id}-min-value`} type="number" {...register('validation.minValue')} />
						</FieldRoot>
						<FieldRoot flex="1" gap={2} invalid={Boolean(errors.validation?.maxValue?.message)}>
							<FieldLabel htmlFor={`${question.id}-max-value`}>Max value</FieldLabel>
							<Input id={`${question.id}-max-value`} type="number" {...register('validation.maxValue')} />
							{errors.validation?.maxValue?.message ? (
								<FieldErrorText>{errors.validation.maxValue.message}</FieldErrorText>
							) : null}
						</FieldRoot>
					</Stack>
				) : null}

				{showFileControls ? (
					<FieldRoot gap={2}>
						<FieldLabel htmlFor={maxFileSizeId}>Max file size (MB)</FieldLabel>
						<Input id={maxFileSizeId} type="number" min={1} {...register('validation.maxFileSizeMb')} />
						<FieldHelperText>Leave empty to use the default 10 MB limit.</FieldHelperText>
					</FieldRoot>
				) : null}

				<Controller
					name="conditionalEnabled"
					control={control}
					render={({ field }) => (
						<FieldRoot gap={1}>
							<Checkbox.Root
								checked={Boolean(field.value)}
								onCheckedChange={({ checked }) => field.onChange(Boolean(checked))}
							>
								<Checkbox.HiddenInput ref={field.ref} name={field.name} onBlur={field.onBlur} />
								<Checkbox.Control />
								<Checkbox.Label fontWeight="600">Conditional logic</Checkbox.Label>
							</Checkbox.Root>
							<FieldHelperText>Only show this question when previous answers match.</FieldHelperText>
						</FieldRoot>
					)}
				/>

				{watchedValues?.conditionalEnabled ? (
					<Stack gap={3}>
						<Controller
							name="conditionalQuestionId"
							control={control}
							render={({ field }) => (
								<FieldRoot gap={2} invalid={Boolean(errors.conditionalQuestionId?.message)}>
									<FieldLabel id={conditionalSelectLabelId} htmlFor={conditionalSelectId}>Show when question</FieldLabel>
									<chakra.select
										id={conditionalSelectId}
										aria-labelledby={conditionalSelectLabelId}
										ref={field.ref}
										value={field.value ?? ''}
										onBlur={field.onBlur}
										onChange={(event) => field.onChange(event.target.value || undefined)}
										borderWidth="1px"
										borderColor="gray.200"
										borderRadius="xl"
										px={3}
										py={2}
										fontSize="0.95rem"
									>
										{dependentOptions.length === 0 ? (
											<option value="" disabled>
												No eligible questions
											</option>
										) : (
											<>
												<option value="">Select question</option>
												{dependentOptions.map((candidate) => (
													<option key={candidate.id} value={candidate.id}>
														{candidate.label}
													</option>
												))}
											</>
										)}
									</chakra.select>
									{errors.conditionalQuestionId?.message ? (
										<FieldErrorText>{errors.conditionalQuestionId.message}</FieldErrorText>
									) : null}
								</FieldRoot>
							)}
						/>
						<FieldRoot gap={2} invalid={Boolean(errors.conditionalEquals?.message)}>
							<FieldLabel htmlFor={conditionalEqualsId}>Equals</FieldLabel>
							<Input id={conditionalEqualsId} placeholder="Value to match" {...register('conditionalEquals')} />
							{errors.conditionalEquals?.message ? (
								<FieldErrorText>{errors.conditionalEquals.message}</FieldErrorText>
							) : null}
						</FieldRoot>
					</Stack>
				) : null}
			</Stack>
		</Box>
	)
}

export default AssessmentQuestionEditor

