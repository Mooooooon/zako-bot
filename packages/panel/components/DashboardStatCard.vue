<template>
  <UCard variant="subtle" class="h-full">
    <div class="flex items-center gap-4">
      <div
        class="flex size-10 shrink-0 items-center justify-center rounded-lg text-lg"
        :style="{
          backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
          color
        }"
        v-html="icon"
      />
      <div class="flex min-w-0 flex-col gap-1">
        <span class="text-xs font-medium text-[var(--text-secondary)]">{{ label }}</span>
        <span class="text-2xl font-bold text-[var(--text-primary)]">
          <USkeleton v-if="loading" class="h-8 w-14" />
          <template v-else>{{ value }}</template>
        </span>
      </div>
    </div>
  </UCard>
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
