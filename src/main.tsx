import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ChakraProvider } from '@chakra-ui/react'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { JobsProvider } from './context/JobsContext.tsx'
import { CandidatesProvider } from './context/CandidatesContext.tsx'
import system from './theme.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
  <ChakraProvider value={system}>
      <AuthProvider>
        <JobsProvider>
          <CandidatesProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </CandidatesProvider>
        </JobsProvider>
      </AuthProvider>
    </ChakraProvider>
  </StrictMode>,
)
