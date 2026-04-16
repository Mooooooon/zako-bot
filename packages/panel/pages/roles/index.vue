<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="space-y-1">
        <h1 class="m-0 text-2xl font-bold text-[var(--text-primary)]">
          角色
        </h1>
        <p class="m-0 text-sm text-[var(--text-secondary)]">
          管理角色头像、名称和提示词。
        </p>
      </div>

      <UButton
        icon="i-heroicons-plus-20-solid"
        label="新建角色"
        type="button"
        @click="openNewRole"
      />
    </header>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-heroicons-x-circle-20-solid"
      title="角色列表加载失败"
      :description="error.message"
    />

    <UCard variant="subtle">
      <div v-if="pending" class="space-y-3">
        <USkeleton class="h-12 w-full" />
        <USkeleton class="h-12 w-full" />
        <USkeleton class="h-12 w-full" />
      </div>

      <UTable
        v-else-if="roleRows.length"
        :data="roleRows"
        :columns="columns"
      />

      <div v-else class="flex flex-col items-center gap-4 py-10">
        <UEmpty
          icon="i-heroicons-user-circle-20-solid"
          title="暂无角色"
          description="先创建一个角色，再为机器人绑定。"
        />
        <UButton
          icon="i-heroicons-plus-20-solid"
          label="创建第一个角色"
          type="button"
          @click="openNewRole"
        />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { RoleProfile } from '@zakobot/shared'

type RoleRow = {
  id: string
  avatar: string
  name: string
  systemPrompt: string
}

const { data, pending, error } = await useFetch<{ ok: true, data: RoleProfile[] }>('/api/roles')

const UAvatar = resolveComponent('UAvatar')
const UButton = resolveComponent('UButton')

const roleRows = computed<RoleRow[]>(() => (data.value?.data ?? []).map(role => ({
  id: role.id,
  avatar: role.avatar,
  name: role.name,
  systemPrompt: role.systemPrompt,
})))

const columns: TableColumn<RoleRow>[] = [
  {
    accessorKey: 'name',
    header: '角色',
    cell: ({ row }) =>
      h('div', { class: 'flex items-center gap-3' }, [
        h(UAvatar, {
          src: row.original.avatar || undefined,
          alt: row.original.name,
          class: 'rounded-md',
          ui: {
            root: 'rounded-md overflow-hidden',
            image: 'h-full w-full object-cover',
          },
        }),
        h('div', { class: 'min-w-0' }, [
          h('div', { class: 'truncate font-semibold text-[var(--text-primary)]' }, row.original.name),
        ]),
      ]),
  },
  {
    accessorKey: 'systemPrompt',
    header: '提示词',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'block max-w-[16rem] truncate text-[var(--text-secondary)] md:max-w-[24rem] xl:max-w-[32rem]' },
        row.original.systemPrompt,
      ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) =>
      h(UButton, {
        label: '编辑',
        color: 'neutral',
        variant: 'outline',
        to: `/roles/${row.original.id}`,
      }),
  },
]

function openNewRole() {
  return navigateTo('/roles/new')
}
</script>
