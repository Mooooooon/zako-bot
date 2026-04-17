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

    <UAlert
      v-if="deleteTarget"
      color="error"
      variant="subtle"
      icon="i-heroicons-exclamation-triangle-20-solid"
      title="确认删除角色"
      :description="`角色「${deleteTarget.name}」删除后不可恢复。`"
      :actions="deleteConfirmActions"
      orientation="horizontal"
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

const toast = useToast()
const { data, pending, error, refresh } = await useFetch<{ ok: true, data: RoleProfile[] }>('/api/roles')

const UAvatar = resolveComponent('UAvatar')
const UButton = resolveComponent('UButton')
const deletingId = ref('')
const deleteTarget = ref<RoleRow | null>(null)

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
      h('div', { class: 'flex flex-wrap justify-end gap-2' }, [
        h(UButton, {
          label: '编辑',
          color: 'neutral',
          variant: 'outline',
          to: `/roles/${row.original.id}`,
        }),
        h(UButton, {
          label: deletingId.value === row.original.id ? '删除中' : '删除',
          color: 'error',
          variant: 'outline',
          loading: deletingId.value === row.original.id,
          disabled: deletingId.value.length > 0,
          onClick: () => openDeleteConfirm(row.original),
        }),
      ]),
  },
]

const deleteConfirmActions = computed(() => [
  {
    label: '取消',
    color: 'neutral' as const,
    variant: 'outline' as const,
    disabled: deletingId.value.length > 0,
    onClick: closeDeleteConfirm,
  },
  {
    label: deleteTarget.value && deletingId.value === deleteTarget.value.id ? '删除中' : '确认删除',
    color: 'error' as const,
    loading: deleteTarget.value ? deletingId.value === deleteTarget.value.id : false,
    disabled: deletingId.value.length > 0,
    onClick: handleDelete,
  },
])

function openNewRole() {
  return navigateTo('/roles/new')
}

function openDeleteConfirm(role: RoleRow) {
  deleteTarget.value = role
}

function closeDeleteConfirm() {
  if (!deletingId.value) {
    deleteTarget.value = null
  }
}

async function handleDelete() {
  if (!deleteTarget.value) {
    return
  }

  const role = deleteTarget.value
  deletingId.value = role.id

  try {
    const deleted = await $fetch<{ ok: true, data: RoleProfile }>(`/api/roles/${role.id}`, {
      method: 'DELETE',
    })

    toast.add({ title: `已删除角色「${deleted.data.name}」`, color: 'success' })
    deleteTarget.value = null
    await refresh()
  }
  catch (error: any) {
    toast.add({
      title: error?.data?.message ?? error?.message ?? '删除角色失败',
      color: 'error',
    })
  }
  finally {
    deletingId.value = ''
  }
}
</script>
