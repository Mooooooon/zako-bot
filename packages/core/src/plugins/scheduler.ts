import cron from 'node-cron'

export class SchedulerService {
  private tasks = new Map<string, cron.ScheduledTask[]>()

  register(pluginName: string, cronExpr: string, fn: () => void | Promise<void>) {
    const task = cron.schedule(cronExpr, fn)
    const existing = this.tasks.get(pluginName) ?? []
    existing.push(task)
    this.tasks.set(pluginName, existing)
  }

  unregisterAll(pluginName: string) {
    const tasks = this.tasks.get(pluginName) ?? []
    tasks.forEach((t) => t.stop())
    this.tasks.delete(pluginName)
  }
}
