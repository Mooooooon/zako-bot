<template>
  <div class="app-shell">
    <AppSidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />
    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const sidebarCollapsed = ref(false)
</script>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
}

.app-main {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}
</style>