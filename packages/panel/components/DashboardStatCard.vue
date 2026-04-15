<template>
  <div class="stat-card" :style="{ '--card-accent': color }">
    <div class="stat-card-icon" v-html="icon" />
    <div class="stat-card-body">
      <span class="stat-card-label">{{ label }}</span>
      <span class="stat-card-value">
        <span v-if="loading" class="stat-card-skeleton" />
        <template v-else>{{ value }}</template>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: string
  icon: string
  color: string
  loading?: boolean
}>()
</script>

<style scoped>
.stat-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid var(--card-border);
  transition: box-shadow 0.15s ease;
}

.stat-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.stat-card-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--card-accent) 15%, transparent);
  color: var(--card-accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.stat-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.stat-card-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.stat-card-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-card-skeleton {
  display: inline-block;
  width: 3rem;
  height: 1.4rem;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--card-border) 25%, transparent 50%, var(--card-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>