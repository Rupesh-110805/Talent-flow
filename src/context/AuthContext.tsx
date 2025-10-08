import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'talentflow:role'

type UserRole = 'candidate' | 'recruiter' | null

type AuthContextValue = {
  role: UserRole
  login: (role: Exclude<UserRole, null>) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<UserRole>(() => {
    if (typeof window === 'undefined') return null
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'candidate' || stored === 'recruiter' ? stored : null
  })

  const login = useCallback((nextRole: Exclude<UserRole, null>) => {
    setRole(nextRole)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextRole)
    }
  }, [])

  const logout = useCallback(() => {
    setRole(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      role,
      login,
      logout,
    }),
    [login, logout, role],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export type { UserRole }
