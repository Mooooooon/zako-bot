<template>
  <div class="mx-auto flex max-w-3xl items-center justify-center py-16">
    <UEmpty
      icon="i-heroicons-sparkles-20-solid"
      :title="title"
      description="即将开放。"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
</script>
