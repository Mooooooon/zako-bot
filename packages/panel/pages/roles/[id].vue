<template>
  <div class="space-y-4">
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-heroicons-x-circle-20-solid"
      title="角色加载失败"
      :description="error.message"
    />

    <USkeleton v-else-if="pending" class="h-[32rem] w-full" />

    <RoleEditorForm
      v-else-if="role"
      title="编辑角色"
      description="修改头像、名称、提示词和工具权限。"
      submit-label="保存修改"
      :initial-value="form"
      :pending="saving || deleting"
      @submit="handleSubmit"
    >
      <template #actions-left>
        <UButton
          label="删除角色"
          color="error"
          variant="outline"
          type="button"
          :loading="deleting"
          :disabled="saving || deleting"
          @click="handleDelete"
        />
      </template>
    </RoleEditorForm>
  </div>
</template>

<script setup lang="ts">
import type { RoleEditorInput, RoleProfile } from '@zakobot/shared'

const route = useRoute()
const toast = useToast()
const roleId = computed(() => String(route.params.id))

const { data, pending, error, refresh } = await useFetch<{ ok: true, data: RoleProfile }>(
  () => `/api/roles/${roleId.value}`,
)

const saving = ref(false)
const deleting = ref(false)

const role = computed(() => data.value?.data ?? null)
const form = computed<RoleEditorInput>(() => ({
  avatar: role.value?.avatar ?? '',
  name: role.value?.name ?? '',
  systemPrompt: role.value?.systemPrompt ?? '',
  enabledTools: role.value?.enabledTools ?? [],
}))

async function handleSubmit(payload: RoleEditorInput) {
  saving.value = true

  try {
    const updated = await $fetch<{ ok: true, data: RoleProfile }>(`/api/roles/${roleId.value}`, {
      method: 'PUT',
      body: payload,
    })

    data.value = updated
    toast.add({ title: `已保存角色「${updated.data.name}」`, color: 'success' })
    await refresh()
  }
  catch (error: any) {
    toast.add({
      title: error?.data?.statusMessage ?? error?.message ?? '保存角色失败',
      color: 'error',
    })
  }
  finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!role.value || (import.meta.client && !window.confirm(`确认删除角色「${role.value.name}」？此操作不可恢复。`))) {
    return
  }

  deleting.value = true

  try {
    const deleted = await $fetch<{ ok: true, data: RoleProfile }>(`/api/roles/${roleId.value}`, {
      method: 'DELETE',
    })

    toast.add({ title: `已删除角色「${deleted.data.name}」`, color: 'success' })
    await navigateTo('/roles')
  }
  catch (error: any) {
    toast.add({
      title: error?.data?.statusMessage ?? error?.message ?? '删除角色失败',
      color: 'error',
    })
  }
  finally {
    deleting.value = false
  }
}
</script>
