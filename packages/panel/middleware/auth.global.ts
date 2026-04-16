import type { AuthSessionState } from '~/composables/auth-session'
import { refreshAuthSession, useAuthSessionState } from '~/composables/auth-session'

const LOGIN_PATH = '/login'

export default defineNuxtRouteMiddleware(async (to) => {
  const session = useAuthSessionState()
  const auth = await ensureAuthSession(session.value)
  const isLoginPage = to.path === LOGIN_PATH

  if (!auth.authenticated && !isLoginPage) {
    return navigateTo({
      path: LOGIN_PATH,
      query: to.fullPath && to.fullPath !== LOGIN_PATH
        ? { redirect: to.fullPath }
        : undefined,
    })
  }

  if (auth.authenticated && isLoginPage) {
    const target = typeof to.query.redirect === 'string' && to.query.redirect.startsWith('/')
      ? to.query.redirect
      : '/'

    return navigateTo(target)
  }
})

async function ensureAuthSession(session: AuthSessionState) {
  if (session.authenticated || session.requiresPasswordChange) {
    return session
  }

  return refreshAuthSession()
}
