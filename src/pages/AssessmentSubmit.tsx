// src/pages/AssessmentSubmit.tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  FieldErrorText,
  FieldHelperText,
  FieldLabel,
  FieldRoot,
  Flex,
  Heading,
  Input,
  RadioGroup,
  Separator,
  Spinner,
  Stack,
  Text,
  Textarea,
  ToastCloseTrigger,
  ToastDescription,
  ToastIndicator,
  ToastRoot,
  ToastTitle,
  Toaster,
  createToaster,
} from '@chakra-ui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { nanoid } from 'nanoid'
import type { AssessmentQuestion, AssessmentRecord, QuestionChoice } from '../utils/storage'
import { assessmentsRepository } from '../utils/storage'

const MotionBox = motion.create(Box)

const questionDefaultValue = (question: AssessmentQuestion) => {
  switch (question.type) {
    case 'multi_choice':
      return [] as string[]
    case 'numeric':
      return ''
    case 'file_upload':
      return null
    default:
      return ''
  }
}

const isQuestionVisible = (question: AssessmentQuestion, values: SubmissionFormValues) => {
  if (!question.conditionalLogic) return true
  const targetValue = values[question.conditionalLogic.questionId]
  if (targetValue === undefined || targetValue === null) return false
  const equals = question.conditionalLogic.equals
  if (Array.isArray(equals)) {
    return Array.isArray(targetValue)
      ? (targetValue as string[]).some((value) => equals.includes(value))
      : equals.includes(targetValue as string)
  }
  return Array.isArray(targetValue)
    ? (targetValue as string[]).includes(equals)
    : targetValue === equals
}

const ensureArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string')
  }
  return []
}

const trimString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const isChoiceValid = (choices: QuestionChoice[] | undefined, value: string) =>
  !choices || choices.some((choice) => choice.value === value)

const areChoicesValid = (choices: QuestionChoice[] | undefined, values: string[]) => {
  if (!choices) return true
  const allowed = new Set(choices.map((choice) => choice.value))
  return values.every((value) => allowed.has(value))
}

type SubmissionFormValues = {
  candidateName: string
  candidateEmail?: string
  [key: string]: string | string[] | number | File | null | undefined
}

const buildSubmissionSchema = (questions: AssessmentQuestion[]) => {
  const shape: Record<string, z.ZodTypeAny> = {
    candidateName: z.string().min(1, 'Please share your name'),
    candidateEmail: z.string().email('Enter a valid email address').optional().or(z.literal('')),
  }

  for (const question of questions) {
    switch (question.type) {
      case 'single_choice': {
        shape[question.id] = z.union([z.string(), z.literal(''), z.undefined()])
        break
      }
      case 'multi_choice': {
        shape[question.id] = z.union([z.array(z.string()), z.undefined()])
        break
      }
      case 'numeric': {
        shape[question.id] = z.union([z.number(), z.string(), z.undefined()])
        break
      }
      case 'file_upload': {
        shape[question.id] = z.union([z.instanceof(File), z.null(), z.undefined()])
        break
      }
      default: {
        shape[question.id] = z.union([z.string(), z.undefined()])
      }
    }
  }

  return z.object(shape).superRefine((values, ctx) => {
    const typedValues = values as SubmissionFormValues
    for (const question of questions) {
      if (!isQuestionVisible(question, typedValues)) continue

      const helperPath = [question.id]
      const rawValue = typedValues[question.id]

      switch (question.type) {
        case 'single_choice': {
          const stringValue = typeof rawValue === 'string' ? rawValue : ''
          if (question.required && !stringValue) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: helperPath,
              message: 'Select an option',
            })
          }
          if (stringValue && !isChoiceValid(question.choices, stringValue)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: helperPath,
              message: 'Choose a valid option',
            })
          }
          break
        }
        case 'multi_choice': {
          const valuesArray = ensureArray(rawValue)
          if (question.required && valuesArray.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: helperPath,
              message: 'Pick at least one option',
            })
          }
          if (!areChoicesValid(question.choices, valuesArray)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: helperPath,
              message: 'Choose valid options',
            })
          }
          break
        }
        case 'numeric': {
          if (rawValue === '' || rawValue === undefined || rawValue === null) {
            if (question.required) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: helperPath,
                message: 'Enter a number',
              })
            }
            break
          }

          const number = typeof rawValue === 'number' ? rawValue : Number(rawValue)
          if (Number.isNaN(number)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: helperPath,
              message: 'Enter a valid number',
            })
            break
          }

          const { minValue, maxValue } = question.validation ?? {}
          if (minValue !== undefined && number < minValue) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: helperPath,
              message: `Value must be ${minValue} or greater`,
            })
          }
          if (maxValue !== undefined && number > maxValue) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: helperPath,
              message: `Value must be ${maxValue} or less`,
            })
          }
          break
        }
        case 'file_upload': {
          const file = rawValue instanceof File ? rawValue : null
          if (question.required && !file) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: helperPath,
              message: 'Upload is required for this step',
            })
          }
          if (file) {
            const { allowedFileTypes, maxFileSizeMb } = question.validation ?? {}
            if (allowedFileTypes && !allowedFileTypes.includes(file.type)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: helperPath,
                message: 'Select one of the accepted file types',
              })
            }
            if (maxFileSizeMb !== undefined) {
              const sizeMb = file.size / (1024 * 1024)
              if (sizeMb > maxFileSizeMb) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  path: helperPath,
                  message: `File must be under ${maxFileSizeMb} MB`,
                })
              }
            }
          }
          break
        }
        default: {
          const textValue = trimString(rawValue)
          if (question.required && !textValue) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: helperPath,
              message: 'This field is required',
            })
          }
          const maxLength = question.validation?.maxLength
          if (maxLength !== undefined && textValue.length > maxLength) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: helperPath,
              message: `Keep your answer under ${maxLength} characters`,
            })
          }
        }
      }
    }
  })
}

const createDefaultValues = (questions: AssessmentQuestion[]): SubmissionFormValues => {
  const defaults: SubmissionFormValues = {
    candidateName: '',
    candidateEmail: '',
  }
  for (const question of questions) {
    defaults[question.id] = questionDefaultValue(question)
  }
  return defaults
}

const isEqualValue = (current: unknown, expected: unknown) => {
  if (Array.isArray(current) && Array.isArray(expected)) {
    if (current.length !== expected.length) return false
    return current.every((value, index) => value === expected[index])
  }
  return current === expected
}

const AssessmentSubmit = () => {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const toaster = useMemo(() => createToaster({ placement: 'top-end' }), [])
  const [assessment, setAssessment] = useState<AssessmentRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAssessment = useCallback(async () => {
    if (!jobId) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/assessments/${jobId}`)
      if (!response.ok) {
        throw new Error('Unable to load assessment')
      }
      const payload = (await response.json()) as { data: AssessmentRecord }
      setAssessment(payload.data)
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Failed to load assessment'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    void loadAssessment()
  }, [loadAssessment])

  const orderedSections = useMemo(() => {
    if (!assessment) return []
    return [...assessment.sections].sort((a, b) => a.order - b.order)
  }, [assessment])

  const orderedQuestions = useMemo(() => {
    return orderedSections.flatMap((section) => [...section.questions].sort((a, b) => a.order - b.order))
  }, [orderedSections])

  const formSchema = useMemo(() => buildSubmissionSchema(orderedQuestions), [orderedQuestions])

  const defaultValues = useMemo(() => createDefaultValues(orderedQuestions), [orderedQuestions])

  const form = useForm<SubmissionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onSubmit',
  })

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  const watchedValues = form.watch()

  useEffect(() => {
    for (const question of orderedQuestions) {
      const expectedDefault = questionDefaultValue(question)
      const currentValue = watchedValues[question.id]
      const visible = isQuestionVisible(question, watchedValues as SubmissionFormValues)
      if (!visible && !isEqualValue(currentValue, expectedDefault)) {
        form.setValue(question.id, expectedDefault, { shouldDirty: false, shouldValidate: false })
      }
    }
  }, [orderedQuestions, watchedValues, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!assessment || !jobId) return
    const visibleQuestions = orderedQuestions.filter((question) => isQuestionVisible(question, values))
    const candidateName = trimString(values.candidateName)
    const candidateEmail = trimString(values.candidateEmail)
    const candidateId = nanoid()

    const answers = visibleQuestions.map((question) => {
      const rawValue = values[question.id]
      switch (question.type) {
        case 'single_choice':
          return {
            questionId: question.id,
            response: typeof rawValue === 'string' ? rawValue : '',
          }
        case 'multi_choice':
          return {
            questionId: question.id,
            response: ensureArray(rawValue),
          }
        case 'numeric':
          return {
            questionId: question.id,
            response: typeof rawValue === 'number' && !Number.isNaN(rawValue) ? rawValue : null,
          }
        case 'file_upload': {
          const file = rawValue instanceof File ? rawValue : null
          return {
            questionId: question.id,
            response: file ? file.name : null,
            uploadedFileName: file ? file.name : null,
          }
        }
        default:
          return {
            questionId: question.id,
            response: trimString(rawValue),
          }
      }
    })

    try {
      await assessmentsRepository.submissions.create({
        jobId,
        candidateId,
        candidateName,
        answers,
      })
    } catch (localError) {
      console.error(localError)
    }

    try {
      const response = await fetch(`/api/assessments/${jobId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          candidateName,
          answers,
          status: 'completed',
          submittedAt: new Date().toISOString(),
          candidateEmail: candidateEmail || undefined,
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ message: 'Failed to submit assessment' }))
        throw new Error('message' in payload ? (payload as { message: string }).message : 'Failed to submit assessment')
      }
      toaster.create({
        title: 'Submission received',
        description: 'Thanks for sharing your responses.',
        type: 'success',
      })
      form.reset(createDefaultValues(orderedQuestions))
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : 'Unable to submit assessment'
      toaster.create({
        title: 'Submission failed',
        description: message,
        type: 'error',
      })
    }
  })

  if (!jobId) {
    return (
      <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center" px={4}>
        <Stack gap={3} textAlign="center">
          <Heading size="md">Missing job reference</Heading>
          <Text color="gray.600">Select a role to access its assessment.</Text>
          <Button alignSelf="center" onClick={() => navigate('/jobs')}>
            View open roles
          </Button>
        </Stack>
      </Box>
    )
  }

  return (
    <Box bg="gray.50" minH="100vh" py={{ base: 10, md: 16 }} px={{ base: 4, md: 12 }}>
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
      <Stack gap={8} maxW="960px" mx="auto">
        <Stack gap={3}>
          <Button variant="ghost" w="fit-content" onClick={() => navigate(-1)}>
            ← Back
          </Button>
          <Heading size="lg" color="gray.800">
            {assessment?.title ?? 'Assessment'}
          </Heading>
          <Text color="gray.600" maxW="3xl">
            Preview the prompts below and submit your answers when you&apos;re ready. Your progress isn&apos;t saved, so complete the form in one sitting.
          </Text>
        </Stack>

        {isLoading ? (
          <Flex align="center" justify="center" py={16}>
            <Spinner size="lg" color="purple.400" />
          </Flex>
        ) : error ? (
          <Stack gap={4} align="center" bg="red.50" borderRadius="xl" borderWidth="1px" borderColor="red.200" p={8}>
            <Text fontWeight="600" color="red.700">
              {error}
            </Text>
            <Button onClick={() => loadAssessment()}>Try again</Button>
          </Stack>
        ) : assessment ? (
          <Box as="form" onSubmit={handleSubmit}>
            <Stack gap={8}>
              <Box
                bg="white"
                borderRadius="24px"
                borderWidth="1px"
                borderColor="gray.200"
                boxShadow="0 20px 36px rgba(70,120,230,0.12)"
                p={{ base: 5, md: 6 }}
              >
                <Heading size="md" color="gray.800">
                  Candidate details
                </Heading>
                <Text color="gray.600" mt={1} mb={6}>
                  Helps us match your submission to the right application.
                </Text>
                <Stack gap={5}>
                  <FieldRoot required invalid={Boolean(form.formState.errors.candidateName)} gap={2}>
                    <FieldLabel>Full name</FieldLabel>
                    <Input placeholder="Your full name" {...form.register('candidateName')} />
                    {form.formState.errors.candidateName?.message ? (
                      <FieldErrorText>{form.formState.errors.candidateName?.message as string}</FieldErrorText>
                    ) : null}
                  </FieldRoot>
                  <FieldRoot invalid={Boolean(form.formState.errors.candidateEmail)} gap={2}>
                    <FieldLabel>Email (optional)</FieldLabel>
                    <Input type="email" placeholder="you@example.com" {...form.register('candidateEmail')} />
                    <FieldHelperText>We&apos;ll only use this to share updates about your application.</FieldHelperText>
                    {form.formState.errors.candidateEmail?.message ? (
                      <FieldErrorText>{form.formState.errors.candidateEmail?.message as string}</FieldErrorText>
                    ) : null}
                  </FieldRoot>
                </Stack>
              </Box>

              {orderedSections.map((section) => {
                const sectionQuestions = section.questions.filter((question) =>
                  isQuestionVisible(question, watchedValues as SubmissionFormValues),
                )
                if (sectionQuestions.length === 0) {
                  return null
                }
                return (
                  <Box
                    key={section.id}
                    bg="white"
                    borderRadius="24px"
                    borderWidth="1px"
                    borderColor="gray.200"
                    boxShadow="0 20px 36px rgba(70,120,230,0.12)"
                    p={{ base: 5, md: 6 }}
                  >
                    <Stack gap={4}>
                      <Box>
                        <Text fontSize="sm" textTransform="uppercase" color="purple.500" fontWeight="600">
                          Section {section.order + 1}
                        </Text>
                        <Heading size="md" color="gray.800" mt={1}>
                          {section.title}
                        </Heading>
                        {section.description ? (
                          <Text color="gray.600" mt={2}>
                            {section.description}
                          </Text>
                        ) : null}
                      </Box>
                      <Separator borderColor="gray.100" />
                      <AnimatePresence initial={false}>
                        {sectionQuestions.map((question) => {
                          const error = form.formState.errors[question.id]
                          const errorMessage = (error as { message?: string } | undefined)?.message
                          return (
                            <MotionBox
                              key={question.id}
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Stack gap={3}>
                                <FieldRoot required={question.required} invalid={Boolean(error)} gap={2}>
                                  <FieldLabel>{question.label}</FieldLabel>
                                  {question.description ? <Text color="gray.600">{question.description}</Text> : null}

                                  {question.type === 'single_choice' && question.choices ? (
                                    <Controller
                                      name={question.id}
                                      control={form.control}
                                      render={({ field }) => {
                                        const currentValue = typeof field.value === 'string' ? field.value : ''
                                        return (
                                          <RadioGroup.Root
                                            value={currentValue}
                                            onValueChange={({ value }) => field.onChange(value ?? '')}
                                            name={field.name}
                                          >
                                            <Stack gap={2}>
                                              {question.choices?.map((choice) => (
                                                <RadioGroup.Item key={choice.id} value={choice.value}>
                                                  <RadioGroup.ItemControl />
                                                  <RadioGroup.ItemText>{choice.label}</RadioGroup.ItemText>
                                                </RadioGroup.Item>
                                              ))}
                                            </Stack>
                                          </RadioGroup.Root>
                                        )
                                      }}
                                    />
                                  ) : null}

                                  {question.type === 'multi_choice' && question.choices ? (
                                    <Controller
                                      name={question.id}
                                      control={form.control}
                                      render={({ field }) => {
                                        const currentValues = Array.isArray(field.value) ? field.value : []
                                        return (
                                          <CheckboxGroup value={currentValues} onValueChange={field.onChange} name={field.name}>
                                            <Stack gap={2}>
                                              {question.choices?.map((choice) => (
                                                <Checkbox.Root key={choice.id} value={choice.value}>
                                                  <Checkbox.Control />
                                                  <Checkbox.Label>{choice.label}</Checkbox.Label>
                                                </Checkbox.Root>
                                              ))}
                                            </Stack>
                                          </CheckboxGroup>
                                        )
                                      }}
                                    />
                                  ) : null}

                                  {question.type === 'short_text' ? (
                                    <Input placeholder="Type your response" {...form.register(question.id)} />
                                  ) : null}

                                  {question.type === 'long_text' ? (
                                    <Textarea placeholder="Share your response" minH="150px" {...form.register(question.id)} />
                                  ) : null}

                                  {question.type === 'numeric' ? (
                                    <Controller
                                      name={question.id}
                                      control={form.control}
                                      render={({ field }) => {
                                        const numericValue =
                                          typeof field.value === 'number' || typeof field.value === 'string'
                                            ? field.value
                                            : ''
                                        return (
                                          <Input
                                            type="number"
                                            value={numericValue ?? ''}
                                            onChange={(event) => {
                                              const next = event.target.value
                                              field.onChange(next === '' ? '' : Number(next))
                                            }}
                                          />
                                        )
                                      }}
                                    />
                                  ) : null}

                                  {question.type === 'file_upload' ? (
                                    <Controller
                                      name={question.id}
                                      control={form.control}
                                      render={({ field }) => (
                                        <Stack gap={2}>
                                          <Input
                                            type="file"
                                            accept={question.validation?.allowedFileTypes?.join(',')}
                                            onChange={(event) => {
                                              const file = event.target.files?.[0] ?? null
                                              field.onChange(file)
                                            }}
                                          />
                                          {field.value instanceof File ? (
                                            <Text color="gray.600">Uploaded: {field.value.name}</Text>
                                          ) : (
                                            <Text color="gray.500" fontSize="sm">
                                              Attach a file that supports your response. Uploads aren&apos;t sent anywhere—this is a lightweight preview.
                                            </Text>
                                          )}
                                        </Stack>
                                      )}
                                    />
                                  ) : null}

                                  {question.helperText ? <FieldHelperText>{question.helperText}</FieldHelperText> : null}
                                  {errorMessage ? <FieldErrorText>{errorMessage}</FieldErrorText> : null}
                                </FieldRoot>
                              </Stack>
                            </MotionBox>
                          )
                        })}
                      </AnimatePresence>
                    </Stack>
                  </Box>
                )
              })}

              <Flex justify="flex-end" gap={3}>
                <Button variant="outline" onClick={() => form.reset(createDefaultValues(orderedQuestions))}>
                  Clear form
                </Button>
                <Button type="submit" colorScheme="purple" loading={form.formState.isSubmitting}>
                  Submit assessment
                </Button>
              </Flex>
            </Stack>
          </Box>
        ) : null}
      </Stack>
    </Box>
  )
}

export default AssessmentSubmit
