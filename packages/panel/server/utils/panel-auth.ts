import type { H3Event } from 'h3'
import { deleteCookie, getCookie, setCookie } from 'h3'
import {
  changeStoredPanelPassword,
  ensurePanelAuthState,
  hasValidPanelSessionToken,
  loginPanelWithPassword,
} from '@zakobot/shared/panel-auth'

const AUTH_COOKIE_NAME = 'zakobot_panel_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 30

export interface PanelAuthSession {
  authenticated: boolean
  requiresPasswordChange: boolean
}

interface PasswordChangeResult {
  sessionToken: string
}

export function getPanelAuthSession(event: H3Event): PanelAuthSession {
  const state = ensurePanelAuthState()
  const token = getCookie(event, AUTH_COOKIE_NAME)

  return {
    authenticated: hasValidPanelSessionToken(token, state.sessionToken),
    requiresPasswordChange: state.isDefaultPassword,
  }
}

export function loginWithPassword(password: string) {
  return loginPanelWithPassword(password)
}

export function logoutSession(event: H3Event) {
  clearPanelAuthCookie(event)
}

export function changePanelPassword(currentPassword: string, nextPassword: string): PasswordChangeResult | null {
  return changeStoredPanelPassword(currentPassword, nextPassword)
}

export function setPanelAuthCookie(event: H3Event, sessionToken: string) {
  setCookie(event, AUTH_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
  })
}

export function clearPanelAuthCookie(event: H3Event) {
  deleteCookie(event, AUTH_COOKIE_NAME, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}
