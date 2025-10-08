import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import type { CSSProperties } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge, Box, Button, Flex, Heading, Text, chakra } from '@chakra-ui/react'
import { candidateStages, type CandidateRecord, type CandidateStage, useCandidates } from '../context/CandidatesContext'
import { useJobs } from '../context/JobsContext'
import { useAuth } from '../context/AuthContext'

type StageFilter = 'all' | CandidateStage

const ROW_HEIGHT = 72
const OVERSCAN = 6
const PAGE_SIZE = 40

const MotionSection = motion.create(Box)
const MotionCard = motion.create(Box)
const StyledInput = chakra('input')
const StyledSelect = chakra('select')
const ListItemButton = chakra('button')
const AvatarCircle = chakra('div')
const AvatarImage = chakra('img')

const stageBadgeStyles: Record<CandidateStage, { bg: string; color: string }> = {
  applied: { bg: 'gray.100', color: 'gray.700' },
  screening: { bg: 'green.100', color: 'green.700' },
  assessment: { bg: 'cyan.100', color: 'cyan.700' },
  interview: { bg: 'orange.100', color: 'orange.700' },
  offer: { bg: 'purple.100', color: 'purple.700' },
  hired: { bg: 'blue.100', color: 'blue.700' },
}

const formatStage = (stage: CandidateStage) => stage.charAt(0).toUpperCase() + stage.slice(1)

const getInitial = (name: string) => {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed[0].toUpperCase() : '?'
}

const truncatedExperienceStyle: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}

type VirtualizedCandidateListProps = {
  items: CandidateRecord[]
  selectedId: string | null
  onSelect: (candidate: CandidateRecord) => void
}

const VirtualizedCandidateList = ({ items, onSelect, selectedId }: VirtualizedCandidateListProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const topSpacerRef = useRef<HTMLDivElement | null>(null)
  const bottomSpacerRef = useRef<HTMLDivElement | null>(null)
  const [containerHeight, setContainerHeight] = useState(420)
  const [scrollTop, setScrollTop] = useState(0)

  useEffect(() => {
    const element = containerRef.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      setContainerHeight(element.clientHeight || 420)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN)
  const visibleItems = items.slice(startIndex, endIndex)

  useEffect(() => {
    if (topSpacerRef.current) {
      topSpacerRef.current.style.height = `${startIndex * ROW_HEIGHT}px`
    }
    if (bottomSpacerRef.current) {
      bottomSpacerRef.current.style.height = `${(items.length - endIndex) * ROW_HEIGHT}px`
    }
  }, [endIndex, items.length, startIndex])

  return (
    <Box
      ref={containerRef}
      role="list"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      borderWidth="1px"
      borderRadius="2xl"
      borderColor="gray.200"
      bg="white"
      boxShadow="0 30px 60px rgba(70, 120, 230, 0.12)"
      px={3}
      py={4}
      maxH="28rem"
      overflowY="auto"
    >
      <Box ref={topSpacerRef} aria-hidden />
      <Flex direction="column" gap={3}>
        {visibleItems.map((candidate) => {
          const isSelected = candidate.id === selectedId
          const stageStyles = stageBadgeStyles[candidate.stage]

          return (
            <ListItemButton
              key={candidate.id}
              type="button"
              role="listitem"
              display="flex"
              alignItems="center"
              gap={3}
              width="100%"
              padding="0.75rem 1rem"
              height={`${ROW_HEIGHT}px`}
              borderRadius="1.1rem"
              borderWidth="1px"
              borderColor={isSelected ? 'brand.300' : 'gray.200'}
              backgroundColor={isSelected ? 'brand.50' : 'white'}
              transition="transform 0.18s ease, box-shadow 0.18s ease"
              textAlign="left"
              _hover={{ transform: 'translateX(6px)', boxShadow: '0 18px 28px rgba(70,120,230,0.14)' }}
              onClick={() => onSelect(candidate)}
            >
              <AvatarCircle
                width="42px"
                height="42px"
                borderRadius="999px"
                backgroundColor="gray.100"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontWeight="600"
                color="gray.700"
                overflow="hidden"
                flexShrink={0}
              >
                {candidate.avatarUrl ? <AvatarImage src={candidate.avatarUrl} alt="" width="100%" height="100%" /> : getInitial(candidate.name)}
              </AvatarCircle>
              <Box flex="1" overflow="hidden">
                <Text fontWeight="600" fontSize="0.95rem" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
                  {candidate.name}
                </Text>
                <Text fontSize="0.75rem" color="gray.500" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
                  {candidate.email}
                </Text>
              </Box>
              <Badge bg={stageStyles.bg} color={stageStyles.color} borderRadius="999px" textTransform="capitalize" px={3} py={1} fontSize="0.7rem">
                {candidate.stage}
              </Badge>
            </ListItemButton>
          )
        })}
      </Flex>
      <Box ref={bottomSpacerRef} aria-hidden />
    </Box>
  )
}

type StageColumnProps = {
  stage: CandidateStage
  candidates: CandidateRecord[]
  totalCount: number
  onSelect: (candidate: CandidateRecord) => void
  selectedId: string | null
}

const StageColumn = ({ stage, candidates, totalCount, onSelect, selectedId }: StageColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage, data: { stage } })
  const stageStyles = stageBadgeStyles[stage]
  const hasMore = totalCount > candidates.length

  return (
    <MotionSection
      ref={setNodeRef}
      layout
      as="section"
      borderWidth="1px"
      borderRadius="2xl"
      borderColor={isOver ? 'brand.300' : 'gray.200'}
      backgroundColor="white"
      padding="1.25rem"
      boxShadow="0 24px 40px rgba(70,120,230,0.1)"
      flex="1"
      width="100%"
      minW="220px"
      maxH="26rem"
      display="flex"
      flexDirection="column"
      gap="0.75rem"
      transition={{ duration: 0.2 }}
    >
      <Flex justify="space-between" align="center" mb="1rem">
        <Text fontWeight="600" textTransform="capitalize" color="gray.700">
          {formatStage(stage)}
        </Text>
        <Badge bg={stageStyles.bg} color={stageStyles.color} borderRadius="999px" px={3} py={1}>
          {candidates.length}
        </Badge>
      </Flex>

      <Box flex="1" overflowY="auto" pr="0.25rem">
        {candidates.length === 0 ? (
          <Text fontSize="0.85rem" color="gray.500">
            No candidates on this page. Try another page from the paginator below.
          </Text>
        ) : (
          <Flex direction="column" gap={3}>
            <AnimatePresence>
              {candidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  onSelect={onSelect}
                  isSelected={candidate.id === selectedId}
                />
              ))}
            </AnimatePresence>
          </Flex>
        )}
      </Box>

      {hasMore && (
        <Text fontSize="0.75rem" color="gray.500">
          {totalCount - candidates.length} more candidate{totalCount - candidates.length === 1 ? '' : 's'} on other pages.
        </Text>
      )}
    </MotionSection>
  )
}

type CandidateCardProps = {
  candidate: CandidateRecord
  onSelect: (candidate: CandidateRecord) => void
  isSelected: boolean
}

const CandidateCard = ({ candidate, onSelect, isSelected }: CandidateCardProps) => {
  const nodeRef = useRef<HTMLElement | null>(null)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: candidate.id,
    data: { stage: candidate.stage, jobId: candidate.jobId },
  })
  const stageStyles = stageBadgeStyles[candidate.stage]

  const combinedRef = useCallback(
    (element: HTMLElement | null) => {
      setNodeRef(element)
      nodeRef.current = element
    },
    [setNodeRef],
  )

  useEffect(() => {
    if (!nodeRef.current) return
    const nextTransform = transform ? CSS.Translate.toString(transform) ?? '' : ''
    nodeRef.current.style.transform = nextTransform
  }, [transform])

  return (
    <MotionCard
      ref={combinedRef}
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      borderWidth="1px"
      borderRadius="1.35rem"
      borderColor={isSelected ? 'brand.300' : 'gray.200'}
      backgroundColor={isSelected ? 'brand.50' : 'rgba(247,250,255,0.95)'}
      boxShadow={isDragging ? '0 26px 45px rgba(70,120,230,0.18)' : '0 18px 30px rgba(70,120,230,0.08)'}
      padding="1.25rem"
      cursor="grab"
      whileHover={{ translateY: -4 }}
      onClick={() => onSelect(candidate)}
      {...listeners}
      {...attributes}
    >
      <Flex direction="column" gap={3}>
        <Flex gap={3} align="flex-start">
          <AvatarCircle
            width="52px"
            height="52px"
            borderRadius="999px"
            backgroundColor="blue.100"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontWeight="600"
            color="blue.700"
            overflow="hidden"
            flexShrink={0}
          >
            {candidate.avatarUrl ? <AvatarImage src={candidate.avatarUrl} alt="" width="100%" height="100%" /> : getInitial(candidate.name)}
          </AvatarCircle>
          <Box flex="1" overflow="hidden">
            <Text fontWeight="600" fontSize="1rem" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
              {candidate.name}
            </Text>
            <Text fontSize="0.85rem" color="gray.500" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
              {candidate.email}
            </Text>
            <Badge bg={stageStyles.bg} color={stageStyles.color} borderRadius="999px" px={3} py={1} mt={2} textTransform="capitalize">
              {candidate.stage}
            </Badge>
          </Box>
        </Flex>

        <Text fontSize="0.9rem" color="gray.600" lineHeight="1.5" style={truncatedExperienceStyle}>
          {candidate.experience}
        </Text>

        <Flex justify="space-between" align="center" fontSize="0.85rem" color="gray.500">
          <Text>{candidate.location}</Text>
          <Link to={`/candidates/${candidate.id}`} onClick={(event) => event.stopPropagation()}>
            <Button size="sm" variant="ghost" colorScheme="brand">
              View profile
            </Button>
          </Link>
        </Flex>
      </Flex>
    </MotionCard>
  )
}

const JobCandidates = () => {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { role } = useAuth()
  const { jobs } = useJobs()
  const { getCandidatesForJob, updateCandidateStage } = useCandidates()

  const job = useMemo(() => jobs.find((entry) => entry.id === jobId), [jobId, jobs])

  const [searchTerm, setSearchTerm] = useState('')
  const [stageFilter, setStageFilter] = useState<StageFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRecord | null>(null)
  const handleSelectCandidate = useCallback((candidate: CandidateRecord) => {
    setSelectedCandidate(candidate)
  }, [])

  useEffect(() => {
    if (!jobId) return
    const list = getCandidatesForJob(jobId)
    setSelectedCandidate((prev) => {
      if (prev && list.some((candidate) => candidate.id === prev.id)) {
        return prev
      }
      return list[0] ?? null
    })
  }, [getCandidatesForJob, jobId])

  const baseCandidates = useMemo(() => {
    if (!jobId) return []
    return getCandidatesForJob(jobId)
  }, [getCandidatesForJob, jobId])

  useEffect(() => {
    if (!selectedCandidate) return
    const latest = baseCandidates.find((candidate) => candidate.id === selectedCandidate.id)
    if (latest && latest !== selectedCandidate) {
      setSelectedCandidate(latest)
    }
  }, [baseCandidates, selectedCandidate])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, stageFilter])

  const filteredList = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase()
    return baseCandidates.filter((candidate) => {
      const matchesStage = stageFilter === 'all' ? true : candidate.stage === stageFilter
      if (!matchesStage) return false
      if (!normalizedQuery) return true
      return (
        candidate.name.toLowerCase().includes(normalizedQuery) ||
        candidate.email.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [baseCandidates, searchTerm, stageFilter])

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredList.slice(start, start + PAGE_SIZE)
  }, [currentPage, filteredList])

  const listStart = filteredList.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const listEnd = Math.min(filteredList.length, currentPage * PAGE_SIZE)

  useEffect(() => {
    if (paginatedList.length === 0) {
      setSelectedCandidate(null)
      return
    }
    setSelectedCandidate((prev) => {
      if (prev && paginatedList.some((candidate) => candidate.id === prev.id)) {
        return prev
      }
      return paginatedList[0]
    })
  }, [paginatedList])

  const paginatedStageBuckets = useMemo(() => {
    const buckets: Record<CandidateStage, CandidateRecord[]> = {
      applied: [],
      screening: [],
      assessment: [],
      interview: [],
      offer: [],
      hired: [],
    }
    for (const candidate of paginatedList) {
      buckets[candidate.stage].push(candidate)
    }
    return buckets
  }, [paginatedList])

  const overallStageBuckets = useMemo(() => {
    const buckets: Record<CandidateStage, CandidateRecord[]> = {
      applied: [],
      screening: [],
      assessment: [],
      interview: [],
      offer: [],
      hired: [],
    }
    for (const candidate of baseCandidates) {
      buckets[candidate.stage].push(candidate)
    }
    return buckets
  }, [baseCandidates])

  const searchPageNumbers = useMemo(() => {
    const query = searchTerm.trim()
    if (!query) return []
    const pages = new Set<number>()
    filteredList.forEach((_, index) => {
      pages.add(Math.floor(index / PAGE_SIZE) + 1)
    })
    return Array.from(pages).sort((a, b) => a - b)
  }, [filteredList, searchTerm])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!jobId) return
      const candidateId = event.active.id.toString()
      const nextStage = event.over?.data?.current?.stage as CandidateStage | undefined
      if (!nextStage) return
      updateCandidateStage(jobId, candidateId, nextStage)
      setSelectedCandidate((prev) => {
        if (!prev || prev.id !== candidateId) {
          return prev
        }
        return { ...prev, stage: nextStage }
      })
    },
    [jobId, updateCandidateStage],
  )

  if (!role) {
    return <Navigate to="/login" replace />
  }

  if (role !== 'recruiter') {
    return <Navigate to="/jobs" replace />
  }

  if (!job) {
    return (
      <Flex
        minH="100vh"
        bgGradient="linear(160deg, #f8fafc 0%, #e2e8ff 45%, #ffffff 100%)"
        align="center"
        justify="center"
        px={4}
      >
        <Box
          borderWidth="1px"
          borderRadius="2xl"
          padding={{ base: '2rem', md: '3rem' }}
          backgroundColor="white"
          boxShadow="0 32px 54px rgba(15,23,42,0.18)"
          maxW="28rem"
          textAlign="center"
        >
          <Heading size="lg" mb={3}>
            That requisition does not exist.
          </Heading>
          <Text color="gray.600" mb={6}>
            The job might have been archived or removed from the workspace.
          </Text>
          <Button colorScheme="brand" onClick={() => navigate('/jobs')}>
            Back to jobs board
          </Button>
        </Box>
      </Flex>
    )
        {searchTerm.trim() && searchPageNumbers.length > 0 && (
          <Flex
            direction={{ base: 'column', md: 'row' }}
            align={{ base: 'flex-start', md: 'center' }}
            justify="space-between"
            gap={3}
            fontSize="0.85rem"
            color="gray.500"
            mb={4}
          >
            <Text>Search results appear across these pages:</Text>
            <Flex gap={2} wrap="wrap">
              {searchPageNumbers.map((page) => (
                <Button
                  key={page}
                  size="xs"
                  variant={page === currentPage ? 'solid' : 'outline'}
                  colorScheme="brand"
                  onClick={() => setCurrentPage(page)}
                >
                  Page {page}
                </Button>
              ))}
            </Flex>
          </Flex>
        )}

  }

  return (
    <Box bgGradient="linear(165deg, #f8fafc 0%, #e5edff 45%, #ffffff 100%)" py={{ base: 6, md: 12 }}>
      <Box
        maxW="7xl"
        mx="auto"
        px={{ base: 4, md: 8 }}
        py={{ base: 6, md: 10 }}
        borderRadius="3xl"
        backgroundColor="rgba(255,255,255,0.95)"
        borderWidth="1px"
        borderColor="rgba(99,102,241,0.15)"
        boxShadow="0 40px 80px rgba(70,120,230,0.15)"
      >
        <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" gap={6} mb={8}>
          <Flex direction="column" gap={4}>
            <Button
              variant="ghost"
              size="sm"
              alignSelf="flex-start"
              colorScheme="brand"
              onClick={() => navigate(-1)}
            >
              ← Back
            </Button>
            <Box>
              <Heading size="lg" mb={2}>
                {job.title}
              </Heading>
              <Text color="gray.600">
                {job.company} · {job.workArrangement}
              </Text>
            </Box>
          </Flex>

          <Flex gap={5} align="center">
            <Box textAlign="right">
              <Text fontSize="2.5rem" fontWeight="700" color="brand.600" lineHeight="1">
                {baseCandidates.length}
              </Text>
              <Text fontSize="0.85rem" color="gray.500">
                Total candidates
              </Text>
            </Box>
            <Box width="1px" height="60px" backgroundColor="rgba(99,102,241,0.3)" />
            <Box textAlign="right">
              <Text fontSize="2.5rem" fontWeight="700" color="brand.600" lineHeight="1">
                {overallStageBuckets.interview.length}
              </Text>
              <Text fontSize="0.85rem" color="gray.500">
                In interviews
              </Text>
            </Box>
            <Link to={`/jobs/${job.id}`}>
              <Button variant="outline" colorScheme="brand" borderRadius="999px">
                View job posting
              </Button>
            </Link>
          </Flex>
        </Flex>

        <Flex direction={{ base: 'column', md: 'row' }} gap={3} mb={4} align={{ base: 'stretch', md: 'center' }}>
          <StyledInput
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name or email"
            padding="0.85rem 1.4rem"
            borderRadius="999px"
            borderWidth="1px"
            borderColor="rgba(148,163,184,0.35)"
            backgroundColor="white"
          />
          <StyledSelect
            value={stageFilter}
            aria-label="Filter candidates by stage"
            padding="0.85rem 1.2rem"
            borderRadius="999px"
            borderWidth="1px"
            borderColor="rgba(148,163,184,0.35)"
            backgroundColor="white"
            maxW={{ base: '100%', md: '220px' }}
            onChange={(event) => setStageFilter(event.target.value as StageFilter)}
          >
            <option value="all">All stages</option>
            {candidateStages.map((stage) => (
              <option key={stage} value={stage}>
                {formatStage(stage)}
              </option>
            ))}
          </StyledSelect>
        </Flex>

        <Flex
          direction={{ base: 'column', md: 'row' }}
          justify="space-between"
          align={{ base: 'flex-start', md: 'center' }}
          gap={3}
          fontSize="0.9rem"
          color="gray.500"
          mb={6}
        >
          <Text>
            Showing {listStart}-{listEnd} of {filteredList.length} candidates
          </Text>
          <Flex gap={2}>
            <Button
              variant="outline"
              colorScheme="brand"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            >
              Previous
            </Button>
            <Button size="sm" disabled>
              Page {currentPage} / {totalPages}
            </Button>
            <Button
              variant="outline"
              colorScheme="brand"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            >
              Next
            </Button>
          </Flex>
        </Flex>

        <Flex direction={{ base: 'column', xl: 'row' }} gap={6} align="stretch">
          <Box flex={{ base: 'none', xl: '0 0 320px' }}>
            <VirtualizedCandidateList
              items={paginatedList}
              onSelect={handleSelectCandidate}
              selectedId={selectedCandidate?.id ?? null}
            />
          </Box>

          <Box flex="1">
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <Flex direction={{ base: 'column', lg: 'row' }} gap={4} wrap="wrap" align="stretch">
                {candidateStages.map((stage) => (
                  <StageColumn
                    key={stage}
                    stage={stage}
                    candidates={paginatedStageBuckets[stage]}
                    totalCount={overallStageBuckets[stage].length}
                    onSelect={handleSelectCandidate}
                    selectedId={selectedCandidate?.id ?? null}
                  />
                ))}
              </Flex>
            </DndContext>
          </Box>
        </Flex>
      </Box>
    </Box>
  )
}

export default JobCandidates
