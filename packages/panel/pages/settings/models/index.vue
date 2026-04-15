<template>
  <div class="flex h-full">
    <aside class="w-56 shrink-0 border-r border-[var(--sidebar-border)] flex flex-col">
      <div class="flex items-center justify-between px-4 min-h-12 border-b border-[var(--sidebar-border)]">
        <h2 class="text-sm font-semibold text-[var(--text-primary)] m-0">模型设置</h2>
        <UButton icon="i-heroicons-plus-20-solid" size="xs" variant="ghost" @click="showAddModal = true" />
      </div>
      <div class="flex-1 overflow-y-auto p-2 space-y-0.5">
        <button
          v-for="p in platforms"
          :key="p.id"
          class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors cursor-pointer group"
          :class="selectedId === p.id
            ? 'bg-[var(--sidebar-active)] text-[var(--accent)] font-semibold'
            : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-primary)]'"
          @click="selectedId = p.id"
        >
          <span class="flex-1 truncate">{{ p.name }}</span>
          <span class="text-[0.65rem] px-1.5 py-0.5 rounded uppercase tracking-wide"
                :class="selectedId === p.id
                  ? 'bg-indigo-500/15 text-[var(--accent)]'
                  : 'bg-[var(--sidebar-hover)] text-[var(--text-secondary)]'"
          >{{ p.format }}</span>
          <UButton icon="i-heroicons-x-mark-20-solid" size="xs" variant="ghost"
                   class="opacity-0 group-hover:opacity-100 transition-opacity"
                   @click.stop="handleRemove(p.id, p.name)" />
        </button>
        <div v-if="platforms.length === 0" class="text-center text-[var(--text-secondary)] text-xs py-8">
          暂无平台，点击右上角添加
        </div>
      </div>
    </aside>
    <div class="flex-1 overflow-y-auto p-6">
      <template v-if="selectedPlatform">
        <div class="flex items-center gap-3 mb-6">
          <h3 class="text-xl font-bold text-[var(--text-primary)] m-0">{{ selectedPlatform.name }}</h3>
          <span class="text-xs px-2 py-0.5 rounded bg-[var(--sidebar-hover)] text-[var(--text-secondary)] uppercase">{{ selectedPlatform.format }}</span>
        </div>
        <div class="flex flex-col gap-4 max-w-md">
          <UFormField label="API 地址" name="baseUrl">
            <UInput v-model="editBaseUrl" class="w-full" placeholder="https://api.example.com/v1" />
          </UFormField>
          <UFormField label="API 密钥" name="apiKey">
            <UInput v-model="editApiKey" :type="showApiKey ? 'text' : 'password'" placeholder="sk-...">
              <template #trailing>
                <UButton :icon="showApiKey ? 'i-heroicons-eye-slash-20-solid' : 'i-heroicons-eye-20-solid'" size="xs" variant="ghost"
                         class="mr-1" @click="showApiKey = !showApiKey" />
              </template>
            </UInput>
          </UFormField>
          <div class="flex items-center gap-2">
            <UButton label="获取模型列表" :loading="fetchingModels" :disabled="!editBaseUrl || !editApiKey"
                     @click="handleFetchModels" />
            <UButton label="保存" variant="outline" @click="handleSave" />
          </div>
          <div v-if="fetchError" class="text-sm text-[var(--color-red)] bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
            {{ fetchError }}
          </div>
          <div v-if="selectedPlatform.models.length > 0" class="mt-2">
            <h4 class="text-sm font-semibold text-[var(--text-primary)] mb-2">可用模型（{{ selectedPlatform.models.length }}）</h4>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="m in selectedPlatform.models" :key="m"
                    class="text-xs font-mono px-2 py-0.5 rounded bg-[var(--sidebar-hover)] text-[var(--text-secondary)]">{{ m }}</span>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="flex items-center justify-center h-full text-[var(--text-secondary)] text-sm">
        选择一个平台查看配置
      </div>
    </div>

    <UModal v-model:open="showAddModal" title="添加平台">
      <template #body>
        <div class="space-y-4">
          <UFormField label="平台名称" name="name">
            <UInput v-model="newPlatformName" class="w-full" placeholder="如：深度求索、硅基流动" @keydown.enter="handleAddPlatform" />
          </UFormField>
          <UFormField label="接口格式" name="format">
            <USelect v-model="newPlatformFormat" class="w-full" :items="formatOptions" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton label="取消" variant="outline" @click="showAddModal = false" />
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
})

const showAddModal = ref(false)
const newPlatformName = ref('')
const newPlatformFormat = ref<ApiFormat>('openai')
const formatOptions = [{ label: 'OpenAI 格式', value: 'openai' }]

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
    fetchError.value = e?.message ?? '获取模型列表失败'
    toast.add({ title: fetchError.value, color: 'error' })
  }
  finally {
    fetchingModels.value = false
  }
}
</script>
