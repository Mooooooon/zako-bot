<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-6">
        <header class="flex flex-wrap items-start justify-between gap-3">
          <div class="space-y-1">
            <h1 class="m-0 text-2xl font-bold text-[var(--text-primary)]">
              MCP
            </h1>
            <p class="m-0 text-sm text-[var(--text-secondary)]">
              管理外部工具服务器连接。
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton
              label="刷新"
              color="neutral"
              variant="outline"
              :loading="pending"
              @click="refresh"
            />
            <UButton
              label="新增服务器"
              icon="i-heroicons-plus-20-solid"
              @click="openCreate"
            />
          </div>
        </header>

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

    <UCard variant="subtle">
      <div v-if="pending && !servers.length" class="space-y-3">
        <USkeleton class="h-12 w-full" />
        <USkeleton class="h-12 w-full" />
        <USkeleton class="h-12 w-full" />
      </div>

      <UTable
        v-else-if="serverRows.length"
        :data="serverRows"
        :columns="columns"
      />

      <div v-else class="flex flex-col items-center gap-4 py-10">
        <UEmpty
          icon="i-heroicons-server-stack-20-solid"
          title="暂无 MCP 服务器"
          description="添加服务器后，角色可以启用它提供的工具。"
        />
        <UButton
          label="添加第一个服务器"
          icon="i-heroicons-plus-20-solid"
          @click="openCreate"
        />
      </div>
    </UCard>

    <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <UCard
        v-for="item in status"
        :key="item.id"
        variant="subtle"
      >
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <h2 class="m-0 truncate text-sm font-semibold text-[var(--text-primary)]">
                {{ item.name }}
              </h2>
              <p class="m-0 text-xs text-[var(--text-secondary)]">
                {{ item.connected ? '已连接' : '未连接' }}
              </p>
            </div>
            <UBadge
              :label="`${item.toolCount} 个工具`"
              :color="item.connected ? 'success' : 'neutral'"
              variant="subtle"
            />
          </div>

          <UAlert
            v-if="item.error"
            color="error"
            variant="subtle"
            :description="item.error"
          />

          <div v-if="item.toolNames.length" class="flex flex-wrap gap-1.5">
            <UBadge
              v-for="toolName in item.toolNames"
              :key="toolName"
              :label="toolName"
              color="neutral"
              variant="outline"
              class="font-mono"
            />
          </div>
        </div>
      </UCard>
    </section>

    <UModal v-model:open="showEditor" :title="editingId ? '编辑 MCP 服务器' : '新增 MCP 服务器'">
      <template #body>
        <div class="space-y-4">
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
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            label="取消"
            color="neutral"
            variant="outline"
            :disabled="saving"
            @click="showEditor = false"
          />
          <UButton
            label="保存"
            :loading="saving"
            :disabled="!canSave"
            @click="handleSave"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { McpServerEditorInput, McpServerProfile, McpTransport } from '@zakobot/shared'

type McpServerRow = McpServerProfile & {
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

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const USwitch = resolveComponent('USwitch')

const showEditor = ref(false)
const editingId = ref('')
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

const serverRows = computed<McpServerRow[]>(() => servers.value.map(server => ({
  ...server,
  connected: statusById.value.get(server.id)?.connected ?? false,
  toolCount: statusById.value.get(server.id)?.toolCount ?? 0,
  error: statusById.value.get(server.id)?.error,
})))

const columns: TableColumn<McpServerRow>[] = [
  {
    accessorKey: 'name',
    header: '服务器',
    cell: ({ row }) =>
      h('div', { class: 'flex min-w-0 items-start gap-3' }, [
        h('span', {
          class: [
            'mt-1.5 size-2.5 shrink-0 rounded-full',
            row.original.connected ? 'bg-green-500' : 'bg-red-500',
          ].join(' '),
        }),
        h('div', { class: 'min-w-0' }, [
          h('div', { class: 'truncate font-semibold text-[var(--text-primary)]' }, row.original.name),
          h('div', { class: 'truncate text-xs text-[var(--text-secondary)]' }, row.original.description || row.original.url || row.original.command),
          row.original.error
            ? h('div', { class: 'mt-1 max-w-[24rem] truncate text-xs text-red-500' }, row.original.error)
            : null,
        ]),
      ]),
  },
  {
    accessorKey: 'transport',
    header: '类型',
    cell: ({ row }) =>
      h(UBadge, {
        label: row.original.transport,
        color: 'neutral',
        variant: 'subtle',
      }),
  },
  {
    accessorKey: 'toolCount',
    header: '工具',
    cell: ({ row }) => `${row.original.toolCount}`,
  },
  {
    accessorKey: 'enabled',
    header: '启用',
    cell: ({ row }) =>
      h(USwitch, {
        modelValue: row.original.enabled,
        disabled: Boolean(operatingId.value),
        'onUpdate:modelValue': (value: boolean) => toggleEnabled(row.original, value),
      }),
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
          disabled: Boolean(operatingId.value),
          onClick: () => openEdit(row.original),
        }),
        h(UButton, {
          label: operatingId.value === row.original.id ? '重连中' : '重连',
          color: 'neutral',
          variant: 'outline',
          loading: operatingId.value === row.original.id,
          disabled: Boolean(operatingId.value) || !row.original.enabled,
          onClick: () => handleReconnect(row.original),
        }),
        h(UButton, {
          label: '删除',
          color: 'error',
          variant: 'outline',
          disabled: Boolean(operatingId.value),
          onClick: () => { deleteTarget.value = row.original },
        }),
      ]),
  },
]

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

function openCreate() {
  editingId.value = ''
  setForm(createEmptyForm())
  showEditor.value = true
}

function openEdit(server: McpServerProfile) {
  editingId.value = server.id
  setForm(toEditorInput(server))
  showEditor.value = true
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
    const saved = editingId.value
      ? await update(editingId.value, payload)
      : await create(payload)

    toast.add({ title: `已保存 MCP 服务器「${saved.name}」`, color: 'success' })
    showEditor.value = false
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
