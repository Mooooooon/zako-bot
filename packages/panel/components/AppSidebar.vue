<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <span class="sidebar-logo">Z</span>
      <transition name="fade">
        <span v-if="!collapsed" class="sidebar-brand">ZakoBot</span>
      </transition>
      <button class="sidebar-toggle" @click="$emit('toggle')" :title="collapsed ? 'Expand' : 'Collapse'">
        <span class="toggle-icon" :class="{ rotated: collapsed }">&#x276E;</span>
      </button>
    </div>
    <nav class="sidebar-nav">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="sidebar-link"
        active-class="sidebar-link--active"
      >
        <span class="sidebar-link-icon" v-html="item.icon" />
        <transition name="fade">
          <span v-if="!collapsed" class="sidebar-link-label">{{ item.label }}</span>
        </transition>
      </NuxtLink>
    </nav>
    <div class="sidebar-footer">
      <NuxtLink to="/settings" class="sidebar-link" active-class="sidebar-link--active">
        <span class="sidebar-link-icon">&#9881;</span>
        <transition name="fade">
          <span v-if="!collapsed" class="sidebar-link-label">设置</span>
        </transition>
      </NuxtLink>
    </div>
  </aside>
</template>

<script setup lang="ts">
defineProps<{ collapsed: boolean }>()
defineEmits<{ toggle: [] }>()

const navItems = [
  { to: '/', label: 'Dashboard', icon: '&#9632;' },
  { to: '/roles', label: 'Roles', icon: '&#9786;' },
  { to: '/bots', label: 'Bots', icon: '&#9881;' },
  { to: '/plugins', label: 'Plugins', icon: '&#10038;' },
]
</script>

<style scoped>
.sidebar {
  width: 240px;
  min-height: 100vh;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  display: flex;
  flex-direction: column;
  transition: width 0.25s ease;
  overflow: hidden;
  position: sticky;
  top: 0;
  align-self: flex-start;
  height: 100vh;
}

.sidebar.collapsed {
  width: 64px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-bottom: 1px solid var(--sidebar-border);
  min-height: 60px;
}

.sidebar-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
}

.sidebar-brand {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--text-primary);
  white-space: nowrap;
}

.sidebar-toggle {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-icon {
  display: inline-block;
  transition: transform 0.25s ease;
  font-size: 0.75rem;
}

.toggle-icon.rotated {
  transform: rotate(180deg);
}

.sidebar-nav {
  flex: 1;
  padding: 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 0.9rem;
  transition:
    background 0.15s ease,
    color 0.15s ease;
  white-space: nowrap;
}

.sidebar-link:hover {
  background: var(--sidebar-hover);
  color: var(--text-primary);
}

.sidebar-link--active {
  background: var(--sidebar-active);
  color: var(--accent);
  font-weight: 600;
}

.sidebar-link-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  flex-shrink: 0;
  font-size: 1rem;
}

.sidebar-link-label {
  overflow: hidden;
}

.sidebar-footer {
  padding: 0.5rem 0.5rem 0.75rem;
  border-top: 1px solid var(--sidebar-border);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>