import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import JobsBoard from './pages/JobsBoard'
import JobDetail from './pages/JobDetail'
import ProfilePage from './pages/ProfilePage'
import JobCandidates from './pages/JobCandidates'
import CandidateProfilePage from './pages/CandidateProfilePage'
import AssessmentBuilder from './pages/AssessmentBuilder'
import AssessmentSubmit from './pages/AssessmentSubmit'

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/jobs" element={<JobsBoard />} />
  <Route path="/jobs/:jobId/builder" element={<AssessmentBuilder />} />
      <Route path="/jobs/:jobId" element={<JobDetail />} />
      <Route path="/jobs/:jobId/candidates" element={<JobCandidates />} />
  <Route path="/apply/:jobId" element={<AssessmentSubmit />} />
      <Route path="/candidates/:candidateId" element={<CandidateProfilePage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
