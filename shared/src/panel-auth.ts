import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, resolve } from 'path'

const AUTH_FILE_NAME = 'panel-auth.json'

export const DEFAULT_PANEL_PASSWORD = '123456'

export interface StoredPanelAuthState {
  passwordHash: string
  salt: string
  isDefaultPassword: boolean
  sessionToken: string
  updatedAt: string
}

export interface PanelPasswordChangeResult {
  sessionToken: string
}

export function ensurePanelAuthState(zakobotHome?: string): StoredPanelAuthState {
  const filePath = getPanelAuthFilePath(zakobotHome)

  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as Partial<StoredPanelAuthState>

    if (isStoredPanelAuthState(parsed)) {
      return parsed
    }
  }
  catch {
    // Fall back to the default credentials state below.
  }

  const defaultState = createPanelAuthState(DEFAULT_PANEL_PASSWORD, '')
  writePanelAuthState(defaultState, zakobotHome)
  return defaultState
}

export function loginPanelWithPassword(password: string, zakobotHome?: string) {
  const state = ensurePanelAuthState(zakobotHome)

  if (!verifyPanelPassword(password, state)) {
    return null
  }

  const nextState: StoredPanelAuthState = {
    ...state,
    sessionToken: createSessionToken(),
    updatedAt: new Date().toISOString(),
  }

  writePanelAuthState(nextState, zakobotHome)

  return {
    sessionToken: nextState.sessionToken,
    requiresPasswordChange: nextState.isDefaultPassword,
  }
}

export function changeStoredPanelPassword(
  currentPassword: string,
  nextPassword: string,
  zakobotHome?: string,
): PanelPasswordChangeResult | null {
  const state = ensurePanelAuthState(zakobotHome)

  if (!verifyPanelPassword(currentPassword, state)) {
    return null
  }

  return resetPanelPassword(nextPassword, zakobotHome)
}

export function resetPanelPassword(
  nextPassword: string,
  zakobotHome?: string,
): PanelPasswordChangeResult {
  const nextState = createPanelAuthState(nextPassword, createSessionToken())
  writePanelAuthState(nextState, zakobotHome)

  return {
    sessionToken: nextState.sessionToken,
  }
}

export function hasValidPanelSessionToken(
  token: string | undefined,
  sessionToken: string,
) {
  if (!token || !sessionToken) {
    return false
  }

  const left = Buffer.from(token)
  const right = Buffer.from(sessionToken)

  if (left.length !== right.length) {
    return false
  }

  return timingSafeEqual(left, right)
}

export function getPanelAuthFilePath(zakobotHome?: string) {
  const home = zakobotHome ?? process.env.ZAKOBOT_HOME ?? resolve(homedir(), '.zakobot')
  mkdirSync(home, { recursive: true })
  return resolve(home, AUTH_FILE_NAME)
}

function createPanelAuthState(password: string, sessionToken: string): StoredPanelAuthState {
  const salt = createSalt()

  return {
    passwordHash: hashPassword(password, salt),
    salt,
    isDefaultPassword: password === DEFAULT_PANEL_PASSWORD,
    sessionToken,
    updatedAt: new Date().toISOString(),
  }
}

function writePanelAuthState(state: StoredPanelAuthState, zakobotHome?: string) {
  const filePath = getPanelAuthFilePath(zakobotHome)
  mkdirSync(dirname(filePath), { recursive: true })

  const tempPath = `${filePath}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`
  writeFileSync(tempPath, JSON.stringify(state, null, 2), {
    encoding: 'utf8',
    mode: 0o600,
  })
  renameSync(tempPath, filePath)
}

function isStoredPanelAuthState(value: Partial<StoredPanelAuthState>): value is StoredPanelAuthState {
  return typeof value.passwordHash === 'string'
    && typeof value.salt === 'string'
    && typeof value.isDefaultPassword === 'boolean'
    && typeof value.sessionToken === 'string'
    && typeof value.updatedAt === 'string'
}

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString('hex')
}

function verifyPanelPassword(password: string, state: StoredPanelAuthState) {
  const expected = Buffer.from(state.passwordHash, 'hex')
  const actual = Buffer.from(hashPassword(password, state.salt), 'hex')

  if (expected.length !== actual.length) {
    return false
  }

  return timingSafeEqual(expected, actual)
}

function createSalt() {
  return randomBytes(16).toString('hex')
}

function createSessionToken() {
  return randomBytes(32).toString('hex')
}
