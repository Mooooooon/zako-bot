import { clearPanelAuthCookie } from '../../utils/panel-auth'

export default defineEventHandler((event) => {
  clearPanelAuthCookie(event)

  return {
    ok: true,
    data: {
      authenticated: false,
      requiresPasswordChange: false,
    },
  }
})
