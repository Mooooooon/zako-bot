export interface AuthSessionState {
  authenticated: boolean
  requiresPasswordChange: boolean
}

function createAnonymousSession(): AuthSessionState {
  return {
    authenticated: false,
    requiresPasswordChange: false,
  }
}

export function useAuthSessionState() {
  return useState<AuthSessionState>('panel-auth-session', createAnonymousSession)
}

export async function refreshAuthSession() {
  const state = useAuthSessionState()
  const requestFetch = import.meta.server ? useRequestFetch() : $fetch

  try {
    const response = await requestFetch<{ ok: true, data: AuthSessionState }>('/api/auth/session')
    state.value = response.data
  }
  catch {
    state.value = createAnonymousSession()
  }

  return state.value
}
