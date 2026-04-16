<template>
  <USidebar
    class="border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]"
    :open="!collapsed"
    collapsible="icon"
    rail
    :ui="{
      container: 'h-screen',
      inner: 'bg-[var(--sidebar-bg)] divide-[var(--sidebar-border)]',
      header: 'px-3 py-4 min-h-0',
      body: 'px-2 py-3',
      footer: 'flex-col items-stretch px-2 pb-3 pt-2'
    }"
    @update:open="emit('update:collapsed', !$event)"
  >
    <template #title="{ state }">
      <span class="flex min-w-0 items-center gap-2">
        <span
          class="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--accent)] text-sm font-bold text-white"
        >
          Z
        </span>
        <span
          v-if="state !== 'collapsed'"
          class="truncate text-base font-bold text-[var(--text-primary)]"
        >
          ZakoBot
        </span>
      </span>
    </template>

    <template #actions>
      <UButton
        icon="i-heroicons-chevron-left-20-solid"
        color="neutral"
        variant="ghost"
        size="xs"
        aria-label="收起侧边栏"
        @click="emit('update:collapsed', true)"
      />
    </template>

    <template #rail="{ state }">
      <div
        v-if="state === 'collapsed'"
        class="absolute top-4 right-0 z-20 hidden translate-x-1/2 lg:flex"
      >
        <UButton
          icon="i-heroicons-chevron-right-20-solid"
          color="neutral"
          variant="outline"
          size="xs"
          square
          class="mt-1"
          aria-label="展开侧边栏"
          @click="emit('update:collapsed', false)"
        />
      </div>
    </template>

    <template #default="{ state }">
      <UNavigationMenu
        :key="state"
        :items="mainItems"
        color="neutral"
        orientation="vertical"
        :collapsed="state === 'collapsed'"
        tooltip
        class="w-full"
        :ui="{
          link: 'min-h-10 rounded-md px-3 text-sm',
          linkLeadingIcon: 'size-4',
          linkLabel: 'truncate'
        }"
      />
    </template>

    <template #footer="{ state }">
      <div class="flex flex-col gap-2">
        <UNavigationMenu
          :key="`footer-${state}`"
          :items="footerItems"
          color="neutral"
          orientation="vertical"
          :collapsed="state === 'collapsed'"
          tooltip
          class="w-full"
          :ui="{
            link: 'min-h-10 rounded-md px-3 text-sm',
            linkLeadingIcon: 'size-4',
            linkLabel: 'truncate'
          }"
        />

        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-arrow-left-on-rectangle-20-solid"
          :label="state === 'collapsed' ? undefined : '退出登录'"
          :square="state === 'collapsed'"
          :class="state === 'collapsed' ? 'self-center' : 'w-full'"
          class="min-h-10 justify-start rounded-md px-3 text-sm"
          :loading="loggingOut"
          @click="handleLogout"
        />
      </div>
    </template>
  </USidebar>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const props = defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  'update:collapsed': [value: boolean]
}>()

const route = useRoute()
const { collapsed } = toRefs(props)
const session = useAuthSessionState()
const loggingOut = ref(false)

const mainItems = computed<NavigationMenuItem[]>(() => [
  {
    label: '控制台',
    icon: 'i-heroicons-home-20-solid',
    to: '/',
    active: route.path === '/',
  },
  {
    label: '角色',
    icon: 'i-heroicons-user-group-20-solid',
    to: '/roles',
    active: route.path.startsWith('/roles'),
  },
  {
    label: '机器人',
    icon: 'i-heroicons-command-line-20-solid',
    to: '/bots',
    active: route.path.startsWith('/bots'),
  },
  {
    label: '聊天',
    icon: 'i-heroicons-chat-bubble-left-right-20-solid',
    to: '/chat',
    active: route.path.startsWith('/chat'),
  },
  {
    label: '插件',
    icon: 'i-heroicons-cube-20-solid',
    to: '/plugins',
    active: route.path.startsWith('/plugins'),
  },
])

const footerItems = computed<NavigationMenuItem[]>(() => [
  {
    label: '设置',
    icon: 'i-heroicons-cog-6-tooth-20-solid',
    to: '/settings',
    active: route.path.startsWith('/settings'),
  },
])

async function handleLogout() {
  if (loggingOut.value) {
    return
  }

  loggingOut.value = true

  try {
    const response = await $fetch<{ ok: true, data: typeof session.value }>('/api/auth/logout', {
      method: 'POST',
    })

    session.value = response.data
    await navigateTo('/login')
  }
  finally {
    loggingOut.value = false
  }
}
</script>
