import { getRequestURL } from 'h3'
import { getPanelAuthSession } from '../utils/panel-auth'

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const path = url.pathname

  if (!path.startsWith('/api/')) {
    return
  }

  if (path.startsWith('/api/auth/')) {
    return
  }

  const session = getPanelAuthSession(event)

  if (!session.authenticated) {
    throw createError({
      statusCode: 401,
      statusMessage: '请先登录',
    })
  }
})
