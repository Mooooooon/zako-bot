import {
  changePanelPassword,
  getPanelAuthSession,
  setPanelAuthCookie,
} from '../../utils/panel-auth'

export default defineEventHandler(async (event) => {
  const session = getPanelAuthSession(event)

  if (!session.authenticated) {
    throw createError({
      statusCode: 401,
      statusMessage: '请先登录',
    })
  }

  const body = await readBody<{
    currentPassword?: string
    nextPassword?: string
    confirmPassword?: string
  }>(event)

  const currentPassword = body.currentPassword ?? ''
  const nextPassword = body.nextPassword ?? ''
  const confirmPassword = body.confirmPassword ?? ''

  if (currentPassword.length === 0 || nextPassword.length === 0 || confirmPassword.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: '请完整填写当前密码和新密码',
    })
  }

  if (nextPassword.length < 6) {
    throw createError({
      statusCode: 400,
      statusMessage: '新密码至少需要 6 位',
    })
  }

  if (nextPassword !== confirmPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: '两次输入的新密码不一致',
    })
  }

  const result = changePanelPassword(currentPassword, nextPassword)

  if (!result) {
    throw createError({
      statusCode: 401,
      statusMessage: '当前密码不正确',
    })
  }

  setPanelAuthCookie(event, result.sessionToken)

  return {
    ok: true,
    data: {
      authenticated: true,
      requiresPasswordChange: nextPassword === '123456',
    },
  }
})
