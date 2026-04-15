<template>
  <div class="flex" style="height: calc(100vh - 4rem)">
    <aside class="w-50 shrink-0 border-r border-[var(--sidebar-border)] p-4">
      <div class="text-xl font-bold text-[var(--text-primary)] px-3 mb-4">设置</div>
      <nav class="space-y-0.5">
        <NuxtLink
          v-for="item in settingItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-primary)] transition-colors no-underline"
          active-class="!bg-[var(--sidebar-active)] !text-[var(--accent)] font-semibold"
        >
          <span class="text-lg w-5 inline-flex items-center justify-center" v-html="item.icon" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>
    </aside>
    <div class="flex-1 overflow-y-auto p-6">
      <NuxtPage />
    </div>
  </div>
</template>

<script setup lang="ts">
const settingItems = [
  { to: '/settings/models', label: '模型设置', icon: '&#129302;' },
]
</script>