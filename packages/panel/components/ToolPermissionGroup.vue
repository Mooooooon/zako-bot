<template>
  <UCollapsible :unmount-on-hide="false" class="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]">
    <template #default="{ open }">
      <UButton
        color="neutral"
        variant="ghost"
        class="w-full justify-start rounded-lg px-3 py-3"
        :ui="{ label: 'min-w-0 flex-1' }"
      >
        <template #leading>
          <UIcon
            name="i-heroicons-chevron-right-20-solid"
            class="size-4 shrink-0 text-[var(--text-secondary)] transition-transform duration-200"
            :class="open ? 'rotate-90' : ''"
          />
        </template>

        <span class="flex min-w-0 items-center gap-2">
          <span class="truncate text-sm font-semibold text-[var(--text-primary)]">
            {{ title }}
          </span>
          <UBadge
            :label="status.label"
            :color="status.color"
            variant="subtle"
            size="sm"
          />
        </span>

        <template #trailing>
          <span class="text-xs tabular-nums text-[var(--text-secondary)]">
            {{ enabledCount }}/{{ items.length }}
          </span>
        </template>
      </UButton>
    </template>

    <template #content>
      <div class="border-t border-[var(--card-border)] p-4">
        <div v-if="items.length" class="mb-3 flex justify-end">
          <UButton
            :label="toggleLabel"
            color="neutral"
            variant="outline"
            size="xs"
            type="button"
            :disabled="disabled || selectableItems.length === 0"
            @click="toggleAll"
          />
        </div>

        <p v-if="note" class="m-0 mb-3 text-xs text-[var(--text-secondary)]">
          {{ note }}
        </p>

        <p v-if="error" class="m-0 mb-3 text-xs text-red-500">
          {{ error }}
        </p>

        <div v-if="items.length" class="space-y-3">
          <UCheckbox
            v-for="item in items"
            :key="item.value"
            :model-value="isItemEnabled(item.value)"
            :disabled="disabled || item.disabled"
            :ui="{ root: 'items-start', label: 'min-w-0', description: 'min-w-0' }"
            @update:model-value="setItemEnabledFromModel(item.value, $event)"
          >
            <template #label>
              <span class="flex min-w-0 items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]">
                <span class="truncate">{{ item.label }}</span>
                <UBadge
                  v-if="item.sensitive"
                  label="敏感"
                  color="warning"
                  variant="subtle"
                  size="sm"
                />
              </span>
            </template>

            <template v-if="item.description || item.detail" #description>
              <span class="block min-w-0">
                <span v-if="item.description" class="block text-sm text-[var(--text-secondary)]">
                  {{ item.description }}
                </span>
                <span v-if="item.detail" class="block break-all font-mono text-xs text-[var(--text-secondary)]">
                  {{ item.detail }}
                </span>
              </span>
            </template>
          </UCheckbox>
        </div>

        <p v-else class="m-0 text-sm text-[var(--text-secondary)]">
          {{ emptyText }}
        </p>
      </div>
    </template>
  </UCollapsible>
</template>

<script setup lang="ts">
interface ToolPermissionItem {
  value: string
  label: string
  description?: string
  detail?: string
  sensitive?: boolean
  disabled?: boolean
}

type GroupStatusColor = 'success' | 'warning' | 'neutral'

const props = withDefaults(defineProps<{
  title: string
  description?: string
  note?: string
  error?: string
  emptyText?: string
  items: ToolPermissionItem[]
  modelValue: string[]
  disabled?: boolean
}>(), {
  description: '',
  note: '',
  error: '',
  emptyText: '暂无可用工具。',
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const enabledSet = computed(() => new Set(props.modelValue))
const selectableItems = computed(() => props.items.filter(item => !item.disabled))
const enabledCount = computed(() => props.items.filter(item => enabledSet.value.has(item.value)).length)
const selectableEnabledCount = computed(() => selectableItems.value.filter(item => enabledSet.value.has(item.value)).length)
const allSelectableEnabled = computed(() =>
  selectableItems.value.length > 0
  && selectableEnabledCount.value === selectableItems.value.length,
)

const status = computed<{ label: string; color: GroupStatusColor }>(() => {
  if (props.items.length > 0 && enabledCount.value === props.items.length) {
    return { label: '开启', color: 'success' }
  }

  if (enabledCount.value > 0) {
    return { label: '部分开启', color: 'warning' }
  }

  return { label: '关闭', color: 'neutral' }
})

const toggleLabel = computed(() => allSelectableEnabled.value ? '全部关闭' : '全部开启')

function isItemEnabled(value: string) {
  return enabledSet.value.has(value)
}

function setItemEnabled(value: string, enabled: boolean) {
  const next = new Set(props.modelValue)

  if (enabled) {
    next.add(value)
  }
  else {
    next.delete(value)
  }

  emit('update:modelValue', [...next])
}

function setItemEnabledFromModel(value: string, modelValue: boolean | 'indeterminate') {
  setItemEnabled(value, modelValue === true)
}

function toggleAll() {
  const next = new Set(props.modelValue)

  if (allSelectableEnabled.value) {
    for (const item of selectableItems.value) {
      next.delete(item.value)
    }
  }
  else {
    for (const item of selectableItems.value) {
      next.add(item.value)
    }
  }

  emit('update:modelValue', [...next])
}
</script>
