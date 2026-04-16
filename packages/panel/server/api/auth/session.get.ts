import { getPanelAuthSession } from '../../utils/panel-auth'

export default defineEventHandler((event) => {
  return {
    ok: true,
    data: getPanelAuthSession(event),
  }
})
