<template>
  <div class="flex h-full gap-6">
    <aside class="w-72 shrink-0">
      <UCard variant="subtle" class="flex h-full flex-col">
        <template #header>
          <div>
            <h2 class="m-0 text-sm font-semibold text-[var(--text-primary)]">
              通用设置
            </h2>
            <p class="mt-1 text-xs text-[var(--text-secondary)]">
              全局行为配置
            </p>
          </div>
        </template>

        <div class="flex min-h-0 flex-1 flex-col gap-2">
          <UButton
            v-for="item in sections"
            :key="item.value"
            color="neutral"
            :variant="activeSection === item.value ? 'soft' : 'ghost'"
            class="w-full justify-start px-3 py-2"
            :icon="item.icon"
            :label="item.label"
            @click="activeSection = item.value"
          />
        </div>
      </UCard>
    </aside>

    <div class="min-w-0 flex-1 overflow-y-auto">
      <UCard variant="subtle">
        <template #header>
          <div>
            <h3 class="m-0 text-xl font-bold text-[var(--text-primary)]">
              {{ activeSectionMeta.label }}
            </h3>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">
              {{ activeSectionMeta.description }}
            </p>
          </div>
        </template>

        <div class="flex max-w-xl flex-col gap-6">
          <UAlert
            v-if="error"
            color="error"
            variant="subtle"
            icon="i-heroicons-x-circle-20-solid"
            title="通用设置加载失败"
            :description="error.message"
          />

          <USkeleton v-else-if="pending" class="h-40 w-full" />

          <template v-else>
            <section v-if="activeSection === 'agent'" class="space-y-4">
              <UFormField
                label="工具调用轮次上限"
                name="maxToolCallRounds"
                description="单次对话中 LLM 最多连续调用工具的轮数。超过此限制后将强制输出最终回答。范围：1 – 32。"
              >
                <UInput
                  v-model.number="form.maxToolCallRounds"
                  class="w-full"
                  type="number"
                  min="1"
                  max="32"
                  step="1"
                  :disabled="saving"
                />
              </UFormField>
            </section>

            <section v-else class="space-y-4">
              <UFormField
                label="需要 @ 触发"
                name="requireMention"
                description="开启后机器人仅在被 @ 提及时才响应消息；关闭后将回复所有频道消息。"
              >
                <div class="flex h-10 items-center">
                  <USwitch v-model="form.requireMention" :disabled="saving" />
                </div>
              </UFormField>

              <UFormField
                label="子区模式"
                name="threadMode"
                description="开启后机器人将为每条频道消息自动创建子区并在其中回复，用户的消息将作为子区标题。"
              >
                <div class="flex h-10 items-center">
                  <USwitch v-model="form.threadMode" :disabled="saving" />
                </div>
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
  </div>
</template>

<script setup lang="ts">
import type { GeneralSettings } from '@zakobot/shared'

type GeneralSection = 'agent' | 'discord'

const toast = useToast()

const sections: Array<{
  label: string
  value: GeneralSection
  icon: string
  description: string
}> = [
  {
    label: 'AI 代理',
    value: 'agent',
    icon: 'i-heroicons-cpu-chip-20-solid',
    description: '配置 LLM 工具调用行为。',
  },
  {
    label: 'Discord',
    value: 'discord',
    icon: 'i-heroicons-chat-bubble-left-ellipsis-20-solid',
    description: '配置 Discord 消息触发规则。',
  },
]

const { data, pending, error, refresh } = await useFetch<{ ok: true, data: GeneralSettings }>('/api/settings/general')

const activeSection = ref<GeneralSection>('agent')
const activeSectionMeta = computed(() =>
  sections.find(item => item.value === activeSection.value) ?? sections[0],
)

const form = reactive<GeneralSettings>({
  maxToolCallRounds: 8,
  requireMention: true,
  threadMode: false,
})
const saving = ref(false)

watch(
  () => data.value?.data,
  (settings) => {
    if (!settings) return
    form.maxToolCallRounds = settings.maxToolCallRounds
    form.requireMention = settings.requireMention
    form.threadMode = settings.threadMode
  },
  { immediate: true },
)

const canSave = computed(() =>
  Number.isInteger(Number(form.maxToolCallRounds))
  && Number(form.maxToolCallRounds) >= 1
  && Number(form.maxToolCallRounds) <= 32,
)

async function handleSave() {
  if (!canSave.value) return

  saving.value = true

  try {
    const updated = await $fetch<{ ok: true, data: GeneralSettings }>('/api/settings/general', {
      method: 'PUT',
      body: {
        maxToolCallRounds: Number(form.maxToolCallRounds),
        requireMention: form.requireMention,
        threadMode: form.threadMode,
      },
    })

    data.value = updated
    toast.add({ title: '已保存通用设置', color: 'success' })
    await refresh()
  }
  catch (err: any) {
    toast.add({
      title: err?.data?.statusMessage ?? err?.message ?? '保存通用设置失败',
      color: 'error',
    })
  }
  finally {
    saving.value = false
  }
}
</script>
