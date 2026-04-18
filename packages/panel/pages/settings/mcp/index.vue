<template>
  <div class="flex h-full gap-6">
    <aside class="w-72 shrink-0">
      <UCard variant="subtle" class="flex h-full flex-col">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="m-0 text-sm font-semibold text-[var(--text-primary)]">
                MCP
              </h2>
              <p class="mt-1 text-xs text-[var(--text-secondary)]">
                管理外部工具服务器
              </p>
            </div>

            <div class="flex items-center gap-1">
              <UButton
                icon="i-heroicons-arrow-path-20-solid"
                size="xs"
                variant="ghost"
                color="neutral"
                aria-label="刷新"
                :loading="pending"
                @click="refresh"
              />
              <UButton
                icon="i-heroicons-plus-20-solid"
                size="xs"
                variant="ghost"
                color="neutral"
                aria-label="新增服务器"
                @click="openCreate"
              />
            </div>
          </div>
        </template>

        <div class="flex min-h-0 flex-1 flex-col gap-2">
          <div v-if="pending && !serverRows.length" class="space-y-2">
            <USkeleton class="h-14 w-full" />
            <USkeleton class="h-14 w-full" />
            <USkeleton class="h-14 w-full" />
          </div>

          <div v-else-if="serverRows.length" class="min-h-0 flex-1 space-y-1 overflow-y-auto">
            <UButton
              v-for="item in serverRows"
              :key="item.id"
              color="neutral"
              :variant="!isCreating && selectedId === item.id ? 'soft' : 'ghost'"
              class="w-full justify-start px-3 py-2"
              :ui="{
                base: 'group',
                leadingIcon: 'hidden',
                trailingIcon: 'hidden',
                label: 'flex-1 min-w-0'
              }"
              @click="selectServer(item.id)"
            >
              <span class="flex min-w-0 flex-1 items-start gap-2">
                <span
                  class="mt-1.5 size-2.5 shrink-0 rounded-full"
                  :class="item.connected ? 'bg-green-500' : 'bg-red-500'"
                />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium">{{ item.name }}</span>
                </span>
              </span>

              <template #trailing>
                <div class="flex items-center gap-2">
                  <UBadge
                    :label="String(item.toolCount)"
                    :color="item.connected ? 'success' : 'neutral'"
                    variant="subtle"
                  />
                  <USwitch
                    :model-value="item.enabled"
                    size="xs"
                    :disabled="Boolean(operatingId)"
                    @click.stop
                    @update:model-value="handleListEnabledChange(item, $event)"
                  />
                </div>
              </template>
            </UButton>
          </div>

          <UEmpty
            v-else
            icon="i-heroicons-server-stack-20-solid"
            title="暂无 MCP 服务器"
            description="点击右上角添加服务器。"
          />
        </div>
      </UCard>
    </aside>

    <div class="min-w-0 flex-1 overflow-y-auto">
      <div class="flex flex-col gap-4">
        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          icon="i-heroicons-x-circle-20-solid"
          title="MCP 加载失败"
          :description="error"
        />

        <UAlert
          v-if="deleteTarget"
          color="error"
          variant="subtle"
          icon="i-heroicons-exclamation-triangle-20-solid"
          title="确认删除 MCP 服务器"
          :description="`服务器「${deleteTarget.name}」删除后，已注册工具会立即移除。`"
          :actions="deleteConfirmActions"
          orientation="horizontal"
        />

        <UCard v-if="isCreating || selectedServer" variant="subtle">
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="flex min-w-0 flex-wrap items-center gap-2">
                  <h3 class="m-0 truncate text-xl font-bold text-[var(--text-primary)]">
                    {{ isCreating ? '新增 MCP 服务器' : selectedServer?.name }}
                  </h3>
                  <UBadge
                    :label="form.transport"
                    color="neutral"
                    variant="subtle"
                  />
                  <UBadge
                    v-if="selectedStatus"
                    :label="selectedStatus.connected ? '已连接' : '未连接'"
                    :color="selectedStatus.connected ? 'success' : 'error'"
                    variant="subtle"
                  />
                </div>
                <p v-if="!isCreating && selectedServer" class="mt-1 truncate text-xs text-[var(--text-secondary)]">
                  {{ getServerSummary(selectedServer) }}
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <UButton
                  v-if="!isCreating && selectedServer"
                  :label="operatingId === selectedServer.id ? '重连中' : '重连'"
                  color="neutral"
                  variant="outline"
                  :loading="operatingId === selectedServer.id"
                  :disabled="Boolean(operatingId) || !selectedServer.enabled"
                  @click="handleReconnect(selectedServer)"
                />
                <UButton
                  v-if="!isCreating && selectedServer"
                  label="删除"
                  color="error"
                  variant="outline"
                  :disabled="Boolean(operatingId)"
                  @click="deleteTarget = selectedServer"
                />
              </div>
            </div>
          </template>

          <div class="flex max-w-xl flex-col gap-4">
            <UAlert
              v-if="selectedStatus?.error"
              color="error"
              variant="subtle"
              title="连接异常"
              :description="selectedStatus.error"
            />

            <UFormField
              label="名称"
              name="name"
              description="用于工具名前缀，只允许字母、数字、下划线和连字符。"
              required
            >
              <UInput
                v-model="form.name"
                class="w-full"
                placeholder="filesystem"
                :disabled="saving"
              />
            </UFormField>

            <UFormField label="描述" name="description">
              <UInput
                v-model="form.description"
                class="w-full"
                placeholder="本地文件工具"
                :disabled="saving"
              />
            </UFormField>

            <UFormField label="连接类型" name="transport" required>
              <USelect
                v-model="form.transport"
                class="w-full"
                :items="transportOptions"
                :disabled="saving"
              />
            </UFormField>

            <template v-if="form.transport === 'stdio'">
              <UFormField label="命令" name="command" required>
                <UInput
                  v-model="form.command"
                  class="w-full font-mono"
                  placeholder="npx"
                  :disabled="saving"
                />
              </UFormField>

              <UFormField
                label="参数"
                name="args"
                description="每行一个参数。"
              >
                <UTextarea
                  v-model="argsText"
                  class="w-full font-mono"
                  :rows="5"
                  placeholder="-y&#10;@modelcontextprotocol/server-filesystem&#10;/home/user"
                  :disabled="saving"
                />
              </UFormField>

              <UFormField
                label="环境变量"
                name="env"
                description="JSON 对象，例如 { &quot;TOKEN&quot;: &quot;xxx&quot; }。"
              >
                <UTextarea
                  v-model="envText"
                  class="w-full font-mono"
                  :rows="5"
                  placeholder="{ }"
                  :disabled="saving"
                />
              </UFormField>
            </template>

            <UFormField
              v-else
              label="SSE URL"
              name="url"
              required
            >
              <UInput
                v-model="form.url"
                class="w-full font-mono"
                placeholder="http://localhost:3001/sse"
                :disabled="saving"
              />
            </UFormField>

            <UFormField label="启用" name="enabled">
              <div class="flex h-10 items-center">
                <USwitch v-model="form.enabled" :disabled="saving" />
              </div>
            </UFormField>

            <div class="flex flex-wrap items-center gap-2">
              <UButton
                label="保存"
                :loading="saving"
                :disabled="!canSave"
                @click="handleSave"
              />
              <UButton
                v-if="isCreating"
                label="取消"
                color="neutral"
                variant="outline"
                :disabled="saving"
                @click="cancelCreate"
              />
            </div>

            <div v-if="!isCreating" class="flex flex-col gap-2 border-t border-[var(--ui-border)] pt-4">
              <div class="flex items-center gap-2">
                <h4 class="m-0 text-sm font-semibold text-[var(--text-primary)]">
                  工具列表
                </h4>
                <UBadge
                  :label="String(selectedStatus?.toolCount ?? 0)"
                  color="primary"
                  variant="subtle"
                  size="lg"
                />
              </div>

              <div v-if="selectedStatus?.toolNames.length" class="flex flex-wrap gap-1.5">
                <UBadge
                  v-for="toolName in selectedStatus.toolNames"
                  :key="toolName"
                  :label="toolName"
                  color="neutral"
                  variant="outline"
                  class="font-mono"
                />
              </div>

              <UEmpty
                v-else
                icon="i-heroicons-wrench-screwdriver-20-solid"
                title="暂无工具"
                description="服务器连接成功后会在这里显示工具。"
              />
            </div>
          </div>
        </UCard>

        <div v-else class="flex h-full items-center justify-center py-16">
          <UEmpty
            icon="i-heroicons-server-stack-20-solid"
            title="选择一个 MCP 服务器"
            description="从左侧选择一个服务器查看和编辑配置。"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { McpServerEditorInput, McpServerProfile, McpTransport } from '@zakobot/shared'

type McpServerListItem = McpServerProfile & {
  connected: boolean
  toolCount: number
  error?: string
}

const toast = useToast()
const {
  servers,
  status,
  pending,
  error,
  refresh,
  create,
  update,
  remove,
  reconnect,
} = useMcpServers()

const selectedId = ref<string | null>(null)
const isCreating = ref(false)
const saving = ref(false)
const operatingId = ref('')
const deleteTarget = ref<McpServerProfile | null>(null)
const argsText = ref('')
const envText = ref('{}')
const form = reactive<McpServerEditorInput>(createEmptyForm())

const transportOptions: Array<{ label: string; value: McpTransport }> = [
  { label: 'stdio', value: 'stdio' },
  { label: 'sse', value: 'sse' },
]

const statusById = computed(() =>
  new Map(status.value.map(item => [item.id, item] as const)),
)

const selectedServer = computed(() =>
  selectedId.value ? servers.value.find(server => server.id === selectedId.value) ?? null : null,
)

const selectedStatus = computed(() =>
  selectedServer.value ? statusById.value.get(selectedServer.value.id) ?? null : null,
)

const serverRows = computed<McpServerListItem[]>(() => servers.value.map(server => ({
  ...server,
  connected: statusById.value.get(server.id)?.connected ?? false,
  toolCount: statusById.value.get(server.id)?.toolCount ?? 0,
  error: statusById.value.get(server.id)?.error,
})))

const deleteConfirmActions = computed(() => [
  {
    label: '取消',
    color: 'neutral' as const,
    variant: 'outline' as const,
    disabled: Boolean(operatingId.value),
    onClick: () => {
      if (!operatingId.value) deleteTarget.value = null
    },
  },
  {
    label: operatingId.value === deleteTarget.value?.id ? '删除中' : '确认删除',
    color: 'error' as const,
    loading: operatingId.value === deleteTarget.value?.id,
    disabled: Boolean(operatingId.value),
    onClick: handleDelete,
  },
])

const canSave = computed(() => {
  if (!form.name.trim()) return false
  if (!/^[a-zA-Z0-9_-]+$/.test(form.name.trim())) return false
  if (form.transport === 'stdio') return Boolean(form.command.trim())
  return Boolean(form.url.trim())
})

let refreshTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  void refresh()
  refreshTimer = setInterval(() => {
    void refresh()
  }, 5000)
})

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

watch(servers, (items) => {
  if (isCreating.value) return

  if (!items.length) {
    selectedId.value = null
    return
  }

  if (!selectedId.value || !items.some(item => item.id === selectedId.value)) {
    selectedId.value = items[0]?.id ?? null
  }
}, { immediate: true })

watch(selectedId, () => {
  if (!isCreating.value) syncFormFromSelection()
})

watch(isCreating, (creating) => {
  if (creating) {
    setForm(createEmptyForm())
    return
  }

  syncFormFromSelection()
})

function createEmptyForm(): McpServerEditorInput {
  return {
    name: '',
    description: '',
    transport: 'stdio',
    command: 'npx',
    args: [],
    env: {},
    url: '',
    enabled: true,
  }
}

function toEditorInput(server: McpServerProfile): McpServerEditorInput {
  return {
    name: server.name,
    description: server.description,
    transport: server.transport,
    command: server.command,
    args: [...server.args],
    env: { ...server.env },
    url: server.url,
    enabled: server.enabled,
  }
}

function setForm(value: McpServerEditorInput) {
  form.name = value.name
  form.description = value.description
  form.transport = value.transport
  form.command = value.command
  form.args = [...value.args]
  form.env = { ...value.env }
  form.url = value.url
  form.enabled = value.enabled
  argsText.value = value.args.join('\n')
  envText.value = JSON.stringify(value.env, null, 2)
}

function syncFormFromSelection() {
  if (selectedServer.value) {
    setForm(toEditorInput(selectedServer.value))
    return
  }

  setForm(createEmptyForm())
}

function selectServer(id: string) {
  isCreating.value = false
  selectedId.value = id
  deleteTarget.value = null
}

function openCreate() {
  selectedId.value = null
  isCreating.value = true
  deleteTarget.value = null
}

function cancelCreate() {
  isCreating.value = false
  selectedId.value = servers.value[0]?.id ?? null
}

function getServerSummary(server: Pick<McpServerProfile, 'description' | 'transport' | 'command' | 'url'>) {
  if (server.description) return server.description
  if (server.transport === 'stdio') return server.command || 'stdio'
  return server.url || 'sse'
}

function handleListEnabledChange(server: McpServerProfile, value: boolean | 'indeterminate') {
  void toggleEnabled(server, value === true)
}

function buildPayload(): McpServerEditorInput | null {
  let env: Record<string, string> = {}

  if (envText.value.trim()) {
    try {
      const parsed = JSON.parse(envText.value) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('环境变量必须是 JSON 对象')
      }
      env = Object.fromEntries(
        Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
      )
    }
    catch (err: any) {
      toast.add({ title: err?.message ?? '环境变量 JSON 无效', color: 'error' })
      return null
    }
  }

  return {
    name: form.name.trim(),
    description: form.description.trim(),
    transport: form.transport,
    command: form.command.trim(),
    args: argsText.value.split('\n').map(item => item.trim()).filter(Boolean),
    env,
    url: form.url.trim(),
    enabled: form.enabled,
  }
}

async function handleSave() {
  if (!canSave.value) return

  const payload = buildPayload()
  if (!payload) return

  saving.value = true

  try {
    const saved = isCreating.value
      ? await create(payload)
      : selectedId.value
        ? await update(selectedId.value, payload)
        : null

    if (!saved) return

    selectedId.value = saved.id
    isCreating.value = false
    setForm(toEditorInput(saved))
    toast.add({ title: `已保存 MCP 服务器「${saved.name}」`, color: 'success' })
  }
  catch (err: any) {
    toast.add({
      title: err?.data?.message ?? err?.message ?? '保存 MCP 服务器失败',
      color: 'error',
    })
  }
  finally {
    saving.value = false
  }
}

async function toggleEnabled(server: McpServerProfile, enabled: boolean) {
  operatingId.value = server.id

  try {
    const payload = toEditorInput(server)
    payload.enabled = enabled
    await update(server.id, payload)

    if (server.id === selectedId.value && !isCreating.value) {
      form.enabled = enabled
    }

    toast.add({ title: enabled ? `已启用「${server.name}」` : `已关闭「${server.name}」`, color: 'success' })
  }
  catch (err: any) {
    toast.add({
      title: err?.data?.message ?? err?.message ?? '更新启用状态失败',
      color: 'error',
    })
  }
  finally {
    operatingId.value = ''
  }
}

async function handleReconnect(server: McpServerProfile) {
  operatingId.value = server.id

  try {
    await reconnect(server.id)
    toast.add({ title: `已重连「${server.name}」`, color: 'success' })
  }
  catch (err: any) {
    toast.add({
      title: err?.data?.message ?? err?.message ?? '重连失败',
      color: 'error',
    })
    await refresh()
  }
  finally {
    operatingId.value = ''
  }
}

async function handleDelete() {
  if (!deleteTarget.value) return

  const target = deleteTarget.value
  operatingId.value = target.id

  try {
    await remove(target.id)
    toast.add({ title: `已删除「${target.name}」`, color: 'success' })
    deleteTarget.value = null
    if (selectedId.value === target.id) {
      selectedId.value = servers.value[0]?.id ?? null
      isCreating.value = false
    }
  }
  catch (err: any) {
    toast.add({
      title: err?.data?.message ?? err?.message ?? '删除 MCP 服务器失败',
      color: 'error',
    })
  }
  finally {
    operatingId.value = ''
  }
}
</script>
