import { loginWithPassword, setPanelAuthCookie } from '../../utils/panel-auth'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ password?: string }>(event)
  const password = body.password ?? ''

  if (password.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: '请输入密码',
    })
  }

  const result = loginWithPassword(password)

  if (!result) {
    throw createError({
      statusCode: 401,
      statusMessage: '密码错误',
    })
  }

  setPanelAuthCookie(event, result.sessionToken)

  return {
    ok: true,
    data: {
      authenticated: true,
      requiresPasswordChange: result.requiresPasswordChange,
    },
  }
})
