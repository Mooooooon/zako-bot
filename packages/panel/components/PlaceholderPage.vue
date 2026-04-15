<template>
  <div class="placeholder-page">
    <h1>{{ title }}</h1>
    <p>Coming soon.</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<style scoped>
.placeholder-page {
  max-width: 960px;
}

.placeholder-page h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: var(--text-primary);
}

.placeholder-page p {
  color: var(--text-secondary);
  font-size: 0.9rem;
}
</style>