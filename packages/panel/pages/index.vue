<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-8">
    <header class="flex flex-col gap-1">
      <h1 class="m-0 text-2xl font-bold text-[var(--text-primary)]">
        控制台
      </h1>
      <p class="m-0 text-sm text-[var(--text-secondary)]">
        ZakoBot 运行概览
      </p>
    </header>

    <UAlert
      v-if="statusError"
      color="warning"
      variant="subtle"
      icon="i-heroicons-exclamation-triangle-20-solid"
      title="状态信息加载失败"
      :description="statusError.message"
    />

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

    <UCard variant="subtle">
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="m-0 text-lg font-semibold text-[var(--text-primary)]">
              插件
            </h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">
              当前已加载插件概览
            </p>
          </div>
          <UBadge
            v-if="pluginRows.length"
            :label="`已加载 ${pluginRows.length} 个`"
            color="neutral"
            variant="subtle"
          />
        </div>
      </template>

      <div v-if="pluginsPending" class="space-y-3">
        <USkeleton class="h-10 w-full" />
        <USkeleton class="h-10 w-full" />
        <USkeleton class="h-10 w-full" />
      </div>

      <UAlert
        v-else-if="pluginsError"
        color="error"
        variant="subtle"
        icon="i-heroicons-x-circle-20-solid"
        title="插件加载失败"
        :description="pluginsError.message"
      />

      <UTable
        v-else-if="pluginRows.length"
        :data="pluginRows"
        :columns="pluginColumns"
        class="flex-1"
      />

      <UEmpty
        v-else
        icon="i-heroicons-puzzle-piece-20-solid"
        title="暂无已加载插件"
        description="当前还没有已加载的插件。"
      />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

type PluginRow = {
  name: string
  version: string
  description: string
  enabled: boolean
}

const { data: status, pending: statusPending, error: statusError } = await useFetch('/api/status')
const { data: plugins, pending: pluginsPending, error: pluginsError } = await useFetch('/api/plugins')

const UBadge = resolveComponent('UBadge')

const pluginRows = computed<PluginRow[]>(() => plugins.value?.data ?? [])

const pluginColumns: TableColumn<PluginRow>[] = [
  {
    accessorKey: 'name',
    header: '名称',
    cell: ({ row }) => h('span', { class: 'font-semibold text-[var(--text-primary)]' }, row.original.name),
  },
  {
    accessorKey: 'version',
    header: '版本',
  },
  {
    accessorKey: 'description',
    header: '说明',
    cell: ({ row }) => h('span', { class: 'block max-w-xl truncate text-[var(--text-secondary)]' }, row.original.description || '-'),
  },
  {
    accessorKey: 'enabled',
    header: '状态',
    cell: ({ row }) =>
      h(UBadge, {
        label: row.original.enabled ? '已启用' : '已停用',
        color: row.original.enabled ? 'success' : 'neutral',
        variant: 'subtle',
      }),
  },
]

const stats = computed(() => {
  if (statusError.value || !status.value?.data) {
    return [
      { label: '在线机器人', value: '--', icon: '&#9881;', color: 'var(--accent)' },
      { label: '机器人总数', value: '--', icon: '&#9733;', color: '#f59e0b' },
      { label: '已加载插件', value: '--', icon: '&#10038;', color: '#10b981' },
      { label: '运行时长', value: '--', icon: '&#9201;', color: '#6366f1' },
    ]
  }

  const s = status.value.data

  return [
    { label: '在线机器人', value: String(s.botsOnline), icon: '&#9881;', color: 'var(--accent)' },
    { label: '机器人总数', value: String(s.botsTotal), icon: '&#9733;', color: '#f59e0b' },
    { label: '已加载插件', value: String(s.pluginsLoaded), icon: '&#10038;', color: '#10b981' },
    { label: '运行时长', value: formatUptime(s.uptime), icon: '&#9201;', color: '#6366f1' },
  ]
})

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)

  return h > 0 ? `${h} 小时 ${m} 分钟` : `${m} 分钟`
}
</script>
