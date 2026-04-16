<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="space-y-1">
        <h1 class="m-0 text-2xl font-bold text-[var(--text-primary)]">
          机器人
        </h1>
        <p class="m-0 text-sm text-[var(--text-secondary)]">
          管理机器人连接配置、角色绑定和启用状态。
        </p>
      </div>

      <UButton
        icon="i-heroicons-plus-20-solid"
        label="新建机器人"
        type="button"
        @click="openNewBot"
      />
    </header>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-heroicons-x-circle-20-solid"
      title="机器人列表加载失败"
      :description="error.message"
    />

    <UCard variant="subtle">
      <div v-if="pending" class="space-y-3">
        <USkeleton class="h-12 w-full" />
        <USkeleton class="h-12 w-full" />
        <USkeleton class="h-12 w-full" />
      </div>

      <UTable
        v-else-if="botRows.length"
        :data="botRows"
        :columns="columns"
      />

      <div v-else class="flex flex-col items-center gap-4 py-10">
        <UEmpty
          icon="i-heroicons-command-line-20-solid"
          title="暂无机器人"
          description="创建一个机器人后，就可以把角色和模型接起来。"
        />
        <UButton
          icon="i-heroicons-plus-20-solid"
          label="创建第一个机器人"
          type="button"
          @click="openNewBot"
        />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { BotListItem, BotProfile } from '@zakobot/shared'

type BotRow = {
  id: string
  name: string
  platform: string
  roleName: string
  modelLabel: string
  scopeLabel: string
  enabled: boolean
}

const toast = useToast()
const { data, pending, error, refresh } = await useFetch<{ ok: true, data: BotListItem[] }>('/api/bots')

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const deletingId = ref('')

const botRows = computed<BotRow[]>(() => (data.value?.data ?? []).map(bot => ({
  id: bot.id,
  name: bot.name,
  platform: bot.platform === 'discord' ? 'Discord' : bot.platform,
  roleName: bot.roleName,
  modelLabel: `${bot.llmPlatformName}-${bot.llmModel}`,
  scopeLabel: `${bot.discordUserId} / ${bot.discordGuildId}`,
  enabled: bot.enabled,
})))

const columns: TableColumn<BotRow>[] = [
  {
    accessorKey: 'name',
    header: '机器人',
  },
  {
    accessorKey: 'platform',
    header: '频道',
  },
  {
    accessorKey: 'roleName',
    header: '角色',
  },
  {
    accessorKey: 'modelLabel',
    header: '模型',
    cell: ({ row }) =>
      h('span', { class: 'font-mono text-xs text-[var(--text-secondary)] md:text-sm' }, row.original.modelLabel),
  },
  {
    accessorKey: 'scopeLabel',
    header: '用户 / 服务器',
    cell: ({ row }) =>
      h('span', { class: 'font-mono text-xs text-[var(--text-secondary)] md:text-sm' }, row.original.scopeLabel),
  },
  {
    accessorKey: 'enabled',
    header: '状态',
    cell: ({ row }) =>
      h(UBadge, {
        label: row.original.enabled ? '已启用' : '已关闭',
        color: row.original.enabled ? 'success' : 'neutral',
        variant: 'subtle',
      }),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) =>
      h('div', { class: 'flex flex-wrap justify-end gap-2' }, [
        h(UButton, {
          label: '编辑',
          color: 'neutral',
          variant: 'outline',
          to: `/bots/${row.original.id}`,
        }),
        h(UButton, {
          label: deletingId.value === row.original.id ? '删除中' : '删除',
          color: 'error',
          variant: 'outline',
          loading: deletingId.value === row.original.id,
          disabled: deletingId.value.length > 0,
          onClick: () => handleDelete(row.original),
        }),
      ]),
  },
]

function openNewBot() {
  return navigateTo('/bots/new')
}

async function handleDelete(bot: BotRow) {
  if (import.meta.client && !window.confirm(`确认删除机器人「${bot.name}」？此操作不可恢复。`)) {
    return
  }

  deletingId.value = bot.id

  try {
    const deleted = await $fetch<{ ok: true, data: BotProfile }>(`/api/bots/${bot.id}`, {
      method: 'DELETE',
    })

    toast.add({ title: `已删除机器人「${deleted.data.name}」`, color: 'success' })
    await refresh()
  }
  catch (error: any) {
    toast.add({
      title: error?.data?.statusMessage ?? error?.message ?? '删除机器人失败',
      color: 'error',
    })
  }
  finally {
    deletingId.value = ''
  }
}
</script>
