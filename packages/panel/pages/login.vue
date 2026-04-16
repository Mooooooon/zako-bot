<template>
  <div class="flex min-h-screen items-center justify-center px-6 py-10">
    <div class="w-full max-w-md">
      <UCard variant="subtle">
        <template #header>
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <span
                class="flex size-10 items-center justify-center rounded-md bg-[var(--accent)] text-base font-bold text-white"
              >
                Z
              </span>
              <div>
                <h1 class="text-xl font-bold text-[var(--text-primary)]">
                  登录 ZakoBot Panel
                </h1>
                <p class="text-sm text-[var(--text-secondary)]">
                  安装后的初始密码是 123456。
                </p>
              </div>
            </div>
          </div>
        </template>

        <div class="space-y-5">
          <UAlert
            v-if="errorMessage"
            color="error"
            variant="subtle"
            icon="i-heroicons-x-circle-20-solid"
            title="登录失败"
            :description="errorMessage"
          />

          <UForm :state="form" class="space-y-4" @submit="handleLogin">
            <UFormField label="密码" name="password">
              <UInput
                v-model="form.password"
                class="w-full"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入面板密码"
                autofocus
              >
                <template #trailing>
                  <UButton
                    :icon="showPassword ? 'i-heroicons-eye-slash-20-solid' : 'i-heroicons-eye-20-solid'"
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    class="mr-1"
                    :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </UInput>
            </UFormField>

            <UButton
              type="submit"
              block
              :loading="submitting"
              :disabled="form.password.length === 0"
            >
              登录
            </UButton>
          </UForm>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { useAuthSessionState } from '~/composables/auth-session'

definePageMeta({
  layout: 'auth',
})

const route = useRoute()
const session = useAuthSessionState()

const form = reactive({
  password: '',
})

const submitting = ref(false)
const showPassword = ref(false)
const errorMessage = ref('')

async function handleLogin(_event: FormSubmitEvent<typeof form>) {
  if (submitting.value) {
    return
  }

  submitting.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ ok: true, data: typeof session.value }>('/api/auth/login', {
      method: 'POST',
      body: {
        password: form.password,
      },
    })

    session.value = response.data

    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : '/'

    await navigateTo(redirect)
  }
  catch (error: any) {
    errorMessage.value = error?.data?.statusMessage ?? error?.message ?? '登录失败'
  }
  finally {
    submitting.value = false
  }
}
</script>
