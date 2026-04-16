<template>
  <div class="max-w-3xl">
    <UCard variant="subtle">
      <template #header>
        <div>
          <h2 class="m-0 text-xl font-bold text-[var(--text-primary)]">
            搜索设置
          </h2>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">
            配置模型调用网页搜索时使用的渠道。
          </p>
        </div>
      </template>

      <div class="flex flex-col gap-6">
        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          icon="i-heroicons-x-circle-20-solid"
          title="搜索设置加载失败"
          :description="error.message"
        />

        <USkeleton v-else-if="pending" class="h-64 w-full" />

        <template v-else>
          <section class="space-y-4">
            <h3 class="m-0 text-sm font-semibold text-[var(--text-primary)]">
              通用设置
            </h3>

            <UFormField
              label="搜索渠道"
              name="provider"
              description="Tavily 更适合 AI 搜索；Google 网页搜索无需密钥，但可能受到页面结构和访问限制影响。"
            >
              <USelect
                v-model="form.provider"
                class="w-full"
                :items="providerOptions"
                :disabled="saving"
              />
            </UFormField>
          </section>

          <section class="space-y-4">
            <h3 class="m-0 text-sm font-semibold text-[var(--text-primary)]">
              Tavily 设置
            </h3>

            <UFormField
              label="API Key"
              name="tavilyApiKey"
              description="选择 Tavily 渠道时需要填写。"
            >
              <UInput
                v-model="form.tavilyApiKey"
                class="w-full"
                :type="showTavilyApiKey ? 'text' : 'password'"
                placeholder="tvly-..."
                :disabled="saving"
              >
                <template #trailing>
                  <UButton
                    :icon="showTavilyApiKey ? 'i-heroicons-eye-slash-20-solid' : 'i-heroicons-eye-20-solid'"
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    class="mr-1"
                    :aria-label="showTavilyApiKey ? '隐藏 Tavily API Key' : '显示 Tavily API Key'"
                    @click="showTavilyApiKey = !showTavilyApiKey"
                  />
                </template>
              </UInput>
            </UFormField>
          </section>

          <div class="flex justify-end">
            <UButton
              label="保存"
              :loading="saving"
              :disabled="!canSave"
              @click="handleSave"
            />
          </div>
        </template>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { SearchProvider, SearchSettings } from '@zakobot/shared'

const toast = useToast()

const providerOptions: Array<{ label: string, value: SearchProvider }> = [
  { label: 'Tavily API', value: 'tavily' },
  { label: 'Google 网页搜索', value: 'google_web' },
]

const { data, pending, error, refresh } = await useFetch<{ ok: true, data: SearchSettings }>('/api/settings/search')

const form = reactive<SearchSettings>({
  provider: 'google_web',
  tavilyApiKey: '',
})
const saving = ref(false)
const showTavilyApiKey = ref(false)

watch(
  () => data.value?.data,
  (settings) => {
    if (!settings) {
      return
    }

    form.provider = settings.provider
    form.tavilyApiKey = settings.tavilyApiKey
  },
  { immediate: true },
)

const canSave = computed(() =>
  form.provider !== 'tavily' || form.tavilyApiKey.trim().length > 0,
)

async function handleSave() {
  if (!canSave.value) {
    return
  }

  saving.value = true

  try {
    const updated = await $fetch<{ ok: true, data: SearchSettings }>('/api/settings/search', {
      method: 'PUT',
      body: {
        provider: form.provider,
        tavilyApiKey: form.tavilyApiKey.trim(),
      },
    })

    data.value = updated
    toast.add({ title: '已保存搜索设置', color: 'success' })
    await refresh()
  }
  catch (error: any) {
    toast.add({
      title: error?.data?.statusMessage ?? error?.message ?? '保存搜索设置失败',
      color: 'error',
    })
  }
  finally {
    saving.value = false
  }
}
</script>
