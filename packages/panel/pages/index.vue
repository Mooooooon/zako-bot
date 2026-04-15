<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <h1>Dashboard</h1>
      <p class="dashboard-subtitle">ZakoBot overview</p>
    </header>

    <section class="dashboard-stats">
      <DashboardStatCard
        v-for="stat in stats"
        :key="stat.label"
        :label="stat.label"
        :value="stat.value"
        :icon="stat.icon"
        :color="stat.color"
        :loading="statusPending"
      />
    </section>

    <section class="dashboard-section">
      <h2>Plugins</h2>
      <div v-if="pluginsPending" class="loading-placeholder">Loading plugins&hellip;</div>
      <div v-else-if="pluginsError" class="error-placeholder">Unable to load plugins</div>
      <table v-else-if="plugins?.data?.length" class="plugin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Version</th>
            <th>Description</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in plugins.data" :key="p.name">
            <td class="plugin-name">{{ p.name }}</td>
            <td>{{ p.version }}</td>
            <td>{{ p.description }}</td>
            <td>
              <span class="badge" :class="p.enabled ? 'badge--green' : 'badge--gray'">
                {{ p.enabled ? 'Enabled' : 'Disabled' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-placeholder">No plugins loaded.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
const { data: status, pending: statusPending, error: statusError } = await useFetch('/api/status')
const { data: plugins, pending: pluginsPending, error: pluginsError } = await useFetch('/api/plugins')

const stats = computed(() => {
  if (statusError.value || !status.value?.data) {
    return [
      { label: 'Bots Online', value: '--', icon: '&#9881;', color: 'var(--accent)' },
      { label: 'Total Bots', value: '--', icon: '&#9733;', color: '#f59e0b' },
      { label: 'Plugins', value: '--', icon: '&#10038;', color: '#10b981' },
      { label: 'Uptime', value: '--', icon: '&#9201;', color: '#6366f1' },
    ]
  }
  const s = status.value.data
  return [
    { label: 'Bots Online', value: String(s.botsOnline), icon: '&#9881;', color: 'var(--accent)' },
    { label: 'Total Bots', value: String(s.botsTotal), icon: '&#9733;', color: '#f59e0b' },
    { label: 'Plugins', value: String(s.pluginsLoaded), icon: '&#10038;', color: '#10b981' },
    { label: 'Uptime', value: formatUptime(s.uptime), icon: '&#9201;', color: '#6366f1' },
  ]
})

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
</script>

<style scoped>
.dashboard {
  max-width: 960px;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.dashboard-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.dashboard-subtitle {
  margin: 0.25rem 0 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.dashboard-section h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1rem;
  color: var(--text-primary);
}

.loading-placeholder,
.empty-placeholder {
  color: var(--text-secondary);
  font-size: 0.9rem;
  padding: 1rem;
  text-align: center;
  background: var(--card-bg);
  border-radius: 8px;
}

.error-placeholder {
  color: var(--color-red);
  font-size: 0.9rem;
  padding: 1rem;
  text-align: center;
  background: var(--card-bg);
  border-radius: 8px;
  border: 1px solid var(--color-red);
}

.plugin-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--card-bg);
  border-radius: 8px;
  overflow: hidden;
}

.plugin-table th {
  text-align: left;
  padding: 0.75rem 1rem;
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--sidebar-border);
}

.plugin-table td {
  padding: 0.6rem 1rem;
  font-size: 0.875rem;
  color: var(--text-primary);
  border-bottom: 1px solid var(--sidebar-border);
}

.plugin-name {
  font-weight: 600;
}

.badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge--green {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.badge--gray {
  background: rgba(107, 114, 128, 0.15);
  color: #6b7280;
}
</style>