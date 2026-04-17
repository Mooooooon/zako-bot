<template>
  <div class="flex h-full gap-6">
    <aside class="w-72 shrink-0">
      <UCard variant="subtle" class="flex h-full flex-col">
        <template #header>
          <div>
            <h2 class="m-0 text-sm font-semibold text-[var(--text-primary)]">
              密码设置
            </h2>
            <p class="mt-1 text-xs text-[var(--text-secondary)]">
              修改面板登录密码
            </p>
          </div>
        </template>

        <div class="space-y-3 text-sm text-[var(--text-secondary)]">
          <UAlert
            v-if="session.requiresPasswordChange"
            color="warning"
            variant="subtle"
            icon="i-heroicons-exclamation-triangle-20-solid"
            title="仍在使用默认密码"
            description="为了避免面板被直接访问，建议先修改默认密码。"
          />

          <p class="leading-6">
            初次安装后的默认密码是 <span class="font-mono text-[var(--text-primary)]">123456</span>。
          </p>
          <p class="leading-6">
            新密码至少 6 位，修改后会保持当前登录状态。
          </p>
        </div>
      </UCard>
    </aside>

    <div class="min-w-0 flex-1 overflow-y-auto">
      <UCard variant="subtle">
        <template #header>
          <div>
            <h3 class="m-0 text-xl font-bold text-[var(--text-primary)]">
              修改密码
            </h3>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">
              更新后将立即用于下次登录。
            </p>
          </div>
        </template>

        <div class="flex max-w-xl flex-col gap-6">
          <UAlert
            v-if="errorMessage"
            color="error"
            variant="subtle"
            icon="i-heroicons-x-circle-20-solid"
            title="保存失败"
            :description="errorMessage"
          />

          <UForm :state="form" class="space-y-4" @submit="handleSave">
            <UFormField label="当前密码" name="currentPassword">
              <UInput
                v-model="form.currentPassword"
                class="w-full"
                :type="showCurrentPassword ? 'text' : 'password'"
                placeholder="请输入当前密码"
              >
                <template #trailing>
                  <UButton
                    :icon="showCurrentPassword ? 'i-heroicons-eye-slash-20-solid' : 'i-heroicons-eye-20-solid'"
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    class="mr-1"
                    :aria-label="showCurrentPassword ? '隐藏当前密码' : '显示当前密码'"
                    @click="showCurrentPassword = !showCurrentPassword"
                  />
                </template>
              </UInput>
            </UFormField>

            <UFormField label="新密码" name="nextPassword" description="至少 6 位。">
              <UInput
                v-model="form.nextPassword"
                class="w-full"
                :type="showNextPassword ? 'text' : 'password'"
                placeholder="请输入新密码"
              >
                <template #trailing>
                  <UButton
                    :icon="showNextPassword ? 'i-heroicons-eye-slash-20-solid' : 'i-heroicons-eye-20-solid'"
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    class="mr-1"
                    :aria-label="showNextPassword ? '隐藏新密码' : '显示新密码'"
                    @click="showNextPassword = !showNextPassword"
                  />
                </template>
              </UInput>
            </UFormField>

            <UFormField label="确认新密码" name="confirmPassword">
              <UInput
                v-model="form.confirmPassword"
                class="w-full"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="请再次输入新密码"
              >
                <template #trailing>
                  <UButton
                    :icon="showConfirmPassword ? 'i-heroicons-eye-slash-20-solid' : 'i-heroicons-eye-20-solid'"
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    class="mr-1"
                    :aria-label="showConfirmPassword ? '隐藏确认密码' : '显示确认密码'"
                    @click="showConfirmPassword = !showConfirmPassword"
                  />
                </template>
              </UInput>
            </UFormField>

            <div class="flex justify-end">
              <UButton
                type="submit"
                :loading="saving"
                :disabled="!canSave"
              >
                保存新密码
              </UButton>
            </div>
          </UForm>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { useAuthSessionState } from '~/composables/auth-session'

const toast = useToast()
const session = useAuthSessionState()

const form = reactive({
  currentPassword: '',
  nextPassword: '',
  confirmPassword: '',
})

const saving = ref(false)
const errorMessage = ref('')
const showCurrentPassword = ref(false)
const showNextPassword = ref(false)
const showConfirmPassword = ref(false)

const canSave = computed(() =>
  form.currentPassword.length > 0
  && form.nextPassword.length >= 6
  && form.confirmPassword.length >= 6,
)

async function handleSave(_event: FormSubmitEvent<typeof form>) {
  if (!canSave.value || saving.value) {
    return
  }

  saving.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ ok: true, data: typeof session.value }>('/api/auth/password', {
      method: 'PUT',
      body: {
        currentPassword: form.currentPassword,
        nextPassword: form.nextPassword,
        confirmPassword: form.confirmPassword,
      },
    })

    session.value = response.data
    form.currentPassword = ''
    form.nextPassword = ''
    form.confirmPassword = ''

    toast.add({
      title: session.value.requiresPasswordChange ? '默认密码仍未变更' : '密码已更新',
      color: session.value.requiresPasswordChange ? 'warning' : 'success',
    })
  }
  catch (error: any) {
    errorMessage.value = error?.data?.message ?? error?.message ?? '保存失败'
  }
  finally {
    saving.value = false
  }
}
</script>
