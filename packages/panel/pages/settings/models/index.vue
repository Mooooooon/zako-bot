<template>
  <div class="flex h-full gap-6">
    <aside class="w-72 shrink-0">
      <UCard variant="subtle" class="flex h-full flex-col">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="m-0 text-sm font-semibold text-[var(--text-primary)]">
                模型设置
              </h2>
              <p class="mt-1 text-xs text-[var(--text-secondary)]">
                管理接口平台与模型列表
              </p>
            </div>
            <UButton
              icon="i-heroicons-plus-20-solid"
              size="xs"
              variant="ghost"
              color="neutral"
              aria-label="添加平台"
              @click="showAddModal = true"
            />
          </div>
        </template>

        <div class="flex min-h-0 flex-1 flex-col gap-2">
          <div v-if="platforms.length" class="min-h-0 flex-1 space-y-1 overflow-y-auto">
            <UButton
              v-for="p in platforms"
              :key="p.id"
              color="neutral"
              :variant="selectedId === p.id ? 'soft' : 'ghost'"
              class="w-full justify-start px-3 py-2"
              :ui="{
                base: 'group',
                leadingIcon: 'hidden',
                trailingIcon: 'hidden',
                label: 'flex-1 min-w-0'
              }"
              @click="selectedId = p.id"
            >
              <span class="flex min-w-0 flex-1 items-center gap-2">
                <span class="truncate text-sm">{{ p.name }}</span>
                <UBadge
                  :label="getFormatLabel(p.format)"
                  color="neutral"
                  variant="subtle"
                />
              </span>

              <template #trailing>
                <UButton
                  icon="i-heroicons-trash-20-solid"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  class="opacity-0 transition-opacity group-hover:opacity-100"
                  :aria-label="`删除 ${p.name}`"
                  @click.stop="handleRemove(p.id, p.name)"
                />
              </template>
            </UButton>
          </div>

          <UEmpty
            v-else
            icon="i-heroicons-server-stack-20-solid"
            title="暂无平台"
            description="点击右上角添加一个模型平台。"
          />
        </div>
      </UCard>
    </aside>

    <div class="min-w-0 flex-1 overflow-y-auto">
      <UCard v-if="selectedPlatform" variant="subtle">
        <template #header>
          <div class="flex items-center gap-3">
            <h3 class="m-0 text-xl font-bold text-[var(--text-primary)]">
              {{ selectedPlatform.name }}
            </h3>
            <UBadge
              :label="getFormatLabel(selectedPlatform.format)"
              color="neutral"
              variant="subtle"
            />
          </div>
        </template>

        <div class="flex max-w-xl flex-col gap-4">
          <UFormField label="接口地址" name="baseUrl">
            <UInput v-model="editBaseUrl" class="w-full" placeholder="https://api.example.com/v1" />
          </UFormField>

          <UFormField label="接口密钥" name="apiKey">
            <UInput v-model="editApiKey" :type="showApiKey ? 'text' : 'password'" placeholder="sk-...">
              <template #trailing>
                <UButton
                  :icon="showApiKey ? 'i-heroicons-eye-slash-20-solid' : 'i-heroicons-eye-20-solid'"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  class="mr-1"
                  :aria-label="showApiKey ? '隐藏接口密钥' : '显示接口密钥'"
                  @click="showApiKey = !showApiKey"
                />
              </template>
            </UInput>
          </UFormField>

          <div class="flex flex-wrap items-center gap-2">
            <UButton
              label="拉取模型列表"
              :loading="fetchingModels"
              :disabled="!editBaseUrl || !editApiKey"
              @click="handleFetchModels"
            />
            <UButton
              label="保存"
              color="neutral"
              variant="outline"
              @click="handleSave"
            />
          </div>

          <UAlert
            v-if="fetchError"
            color="error"
            variant="subtle"
            icon="i-heroicons-x-circle-20-solid"
            title="拉取模型列表失败"
            :description="fetchError"
          />

          <div v-if="selectedPlatform.models.length" class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <h4 class="m-0 text-sm font-semibold text-[var(--text-primary)]">
                可用模型
              </h4>
              <UBadge
                :label="String(selectedPlatform.models.length)"
                color="neutral"
                variant="subtle"
                size="lg"
              />
            </div>

            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="m in selectedPlatform.models"
                :key="m"
                :label="m"
                color="neutral"
                variant="outline"
                size="xl"
                class="font-mono"
              />
            </div>
          </div>

          <UEmpty
            v-else
            icon="i-heroicons-circle-stack-20-solid"
            title="暂无模型列表"
            description="保存配置后获取一次模型列表。"
          />
        </div>
      </UCard>

      <div v-else class="flex h-full items-center justify-center">
        <UEmpty
          icon="i-heroicons-cpu-chip-20-solid"
          title="选择一个平台"
          description="从左侧选择一个平台查看和编辑配置。"
        />
      </div>
    </div>

    <UModal v-model:open="showAddModal" title="添加平台">
      <template #body>
        <div class="space-y-4">
          <UFormField label="平台名称" name="name">
            <UInput
              v-model="newPlatformName"
              class="w-full"
              placeholder="如：深度求索、硅基流动"
              @keydown.enter="handleAddPlatform"
            />
          </UFormField>
          <UFormField label="接入格式" name="format">
            <USelect v-model="newPlatformFormat" class="w-full" :items="formatOptions" />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="取消" color="neutral" variant="outline" @click="showAddModal = false" />
          <UButton label="确定" :disabled="!newPlatformName.trim()" @click="handleAddPlatform" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { useModelPlatforms } from '~/composables/modelPlatforms'
import type { ApiFormat } from '~/composables/modelPlatforms'

const { platforms, addPlatform, updatePlatform, removePlatform, fetchModels } = useModelPlatforms()
const toast = useToast()

const selectedId = ref<string | null>(null)
const selectedPlatform = computed(() => platforms.value.find(p => p.id === selectedId.value) ?? null)

const editBaseUrl = ref('')
const editApiKey = ref('')
const showApiKey = ref(false)

watch(selectedPlatform, (p) => {
  if (p) {
    editBaseUrl.value = p.baseUrl
    editApiKey.value = p.apiKey
  }
  else {
    editBaseUrl.value = ''
    editApiKey.value = ''
    showApiKey.value = false
  }
}, { immediate: true })

watch(platforms, (items) => {
  if (!items.length) {
    selectedId.value = null
    return
  }

  if (!selectedId.value || !items.some(item => item.id === selectedId.value)) {
    selectedId.value = items[0]?.id ?? null
  }
}, { immediate: true })

const showAddModal = ref(false)
const newPlatformName = ref('')
const newPlatformFormat = ref<ApiFormat>('openai')
const formatOptions = [{ label: 'OpenAI 兼容格式', value: 'openai' }]

function getFormatLabel(format: ApiFormat) {
  switch (format) {
    case 'openai':
      return 'OpenAI 兼容'
    default:
      return format
  }
}

function handleAddPlatform() {
  const name = newPlatformName.value.trim()
  if (!name) return

  const platform = addPlatform(name, newPlatformFormat.value)
  selectedId.value = platform.id
  newPlatformName.value = ''
  showAddModal.value = false
  toast.add({ title: `已添加平台「${name}」`, color: 'success' })
}

function handleSave() {
  if (!selectedId.value) return

  updatePlatform(selectedId.value, {
    baseUrl: editBaseUrl.value.trim(),
    apiKey: editApiKey.value.trim(),
  })
  toast.add({ title: '已保存', color: 'success' })
}

function handleRemove(id: string, name: string) {
  removePlatform(id)
  if (selectedId.value === id) selectedId.value = null
  toast.add({ title: `已删除「${name}」` })
}

const fetchingModels = ref(false)
const fetchError = ref('')

async function handleFetchModels() {
  if (!selectedId.value) return

  handleSave()
  fetchingModels.value = true
  fetchError.value = ''

  try {
    await fetchModels(selectedId.value)
    toast.add({ title: `已获取 ${selectedPlatform.value?.models.length ?? 0} 个模型`, color: 'success' })
  }
  catch (e: any) {
    fetchError.value = e?.message ?? '拉取模型列表失败'
    toast.add({ title: fetchError.value, color: 'error' })
  }
  finally {
    fetchingModels.value = false
  }
}
</script>
