import type { McpServerEditorInput, McpServerProfile, McpServerStatus } from '@zakobot/shared'

export function useMcpServers() {
  const servers = ref<McpServerProfile[]>([])
  const status = ref<McpServerStatus[]>([])
  const pending = ref(false)
  const error = ref('')

  async function refresh() {
    pending.value = true
    error.value = ''

    try {
      const [serversResponse, statusResponse] = await Promise.all([
        $fetch<{ ok: true; data: McpServerProfile[] }>('/api/mcp/servers'),
        $fetch<{ ok: true; data: McpServerStatus[] }>('/api/mcp/status'),
      ])

      servers.value = serversResponse.data
      status.value = statusResponse.data
    }
    catch (err: any) {
      error.value = err?.data?.message ?? err?.message ?? 'MCP 服务加载失败'
    }
    finally {
      pending.value = false
    }
  }

  async function create(input: McpServerEditorInput) {
    const response = await $fetch<{ ok: true; data: McpServerProfile }>('/api/mcp/servers', {
      method: 'POST',
      body: input,
    })
    await refresh()
    return response.data
  }

  async function update(id: string, input: McpServerEditorInput) {
    const response = await $fetch<{ ok: true; data: McpServerProfile }>(`/api/mcp/servers/${id}`, {
      method: 'PUT',
      body: input,
    })
    await refresh()
    return response.data
  }

  async function remove(id: string) {
    const response = await $fetch<{ ok: true; data: McpServerProfile }>(`/api/mcp/servers/${id}`, {
      method: 'DELETE',
    })
    await refresh()
    return response.data
  }

  async function reconnect(id: string) {
    const response = await $fetch<{ ok: true; data: McpServerProfile }>(`/api/mcp/servers/${id}/reconnect`, {
      method: 'POST',
    })
    await refresh()
    return response.data
  }

  return {
    servers,
    status,
    pending,
    error,
    refresh,
    create,
    update,
    remove,
    reconnect,
  }
}
