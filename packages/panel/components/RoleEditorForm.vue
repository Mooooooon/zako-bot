<template>
  <UCard variant="subtle">
    <template #header>
      <div class="flex flex-col gap-1">
        <h1 class="m-0 text-2xl font-bold text-[var(--text-primary)]">
          {{ title }}
        </h1>
        <p v-if="description" class="m-0 text-sm text-[var(--text-secondary)]">
          {{ description }}
        </p>
      </div>
    </template>

    <form class="flex max-w-3xl flex-col gap-6" @submit.prevent="handleSubmit">
      <div class="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div class="flex self-start flex-col items-center gap-3 px-6 py-2">
          <UAvatar
            :src="state.avatar.trim() || undefined"
            :alt="state.name || '角色头像'"
            :ui="squareAvatarUi"
            class="size-28"
          />

          <UButton
            v-if="state.avatar.trim()"
            label="清除头像"
            type="button"
            color="neutral"
            variant="ghost"
            :disabled="pending || avatarUploadPending"
            @click="clearAvatar"
          />
        </div>

        <div class="space-y-4">
          <UFormField
            label="上传头像"
            name="avatarUpload"
            description="支持 PNG、JPG、WEBP，上传时默认居中裁成方形。"
          >
            <div class="space-y-3">
              <UFileUpload
                v-model="avatarUploadFile"
                accept="image/png,image/jpeg,image/webp"
                :disabled="pending || avatarUploadPending"
                :interactive="!(pending || avatarUploadPending)"
                :preview="false"
                :multiple="false"
                label="点击或拖拽上传头像"
                description="上传完成后会自动填入头像地址。"
                highlight
              >
                <template #actions="{ open }">
                  <UButton
                    :label="avatarUploadPending ? '正在上传' : state.avatar ? '重新选择' : '选择图片'"
                    type="button"
                    color="neutral"
                    variant="outline"
                    :loading="avatarUploadPending"
                    :disabled="pending || avatarUploadPending"
                    @click.stop.prevent="open()"
                  />
                </template>
              </UFileUpload>

              <UAlert
                v-if="avatarUploadError"
                color="error"
                variant="subtle"
                icon="i-heroicons-x-circle-20-solid"
                :description="avatarUploadError"
              />
            </div>
          </UFormField>

          <UFormField
            label="头像地址"
            name="avatar"
            description="上传后会自动填充，也可以直接粘贴外部图片地址；留空时使用默认头像。"
          >
            <UInput
              v-model="state.avatar"
              class="w-full"
              :disabled="pending || avatarUploadPending"
              placeholder="/uploads/avatars/xxxx.png 或 https://example.com/avatar.png"
            />
          </UFormField>

          <UFormField label="名称" name="name" required>
            <UInput
              v-model="state.name"
              class="w-full"
              :disabled="pending"
              placeholder="如：客服助理、翻译姬"
            />
          </UFormField>
        </div>
      </div>

      <UFormField label="提示词" name="systemPrompt" required>
        <UTextarea
          v-model="state.systemPrompt"
          class="w-full"
          :disabled="pending"
          :rows="16"
          placeholder="定义角色的性格、目标、说话方式和约束。"
        />
      </UFormField>

      <UFormField
        label="工具权限"
        name="enabledTools"
        description="允许模型在需要时调用外部能力。标记「敏感」的工具建议在通用设置中开启工具调用安全确认。"
      >
        <div class="space-y-5">
          <div v-for="group in toolGroups" :key="group.label">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              {{ group.label }}
            </p>
            <div class="space-y-3">
              <label
                v-for="tool in group.tools"
                :key="tool.value"
                class="flex items-start gap-3"
              >
                <input
                  v-model="state.enabledTools"
                  class="mt-1 size-4 accent-[var(--ui-primary)]"
                  type="checkbox"
                  :value="tool.value"
                  :disabled="pending"
                >
                <span class="min-w-0">
                  <span class="flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]">
                    {{ tool.label }}
                    <span
                      v-if="tool.sensitive"
                      class="rounded bg-orange-100 px-1 py-0.5 text-[10px] font-semibold uppercase text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
                    >敏感</span>
                  </span>
                  <span class="block text-sm text-[var(--text-secondary)]">
                    {{ tool.description }}
                  </span>
                </span>
              </label>
            </div>
          </div>
        </div>
      </UFormField>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <div v-if="$slots['actions-left']" class="flex flex-wrap gap-2">
          <slot name="actions-left" />
        </div>

        <div class="ml-auto flex flex-wrap justify-end gap-2">
          <UButton
            label="返回列表"
            color="neutral"
            variant="outline"
            to="/roles"
          />
          <UButton
            :label="submitLabel"
            type="submit"
            :loading="pending"
            :disabled="!canSubmit || avatarUploadPending"
          />
        </div>
      </div>
    </form>
  </UCard>
</template>

<script setup lang="ts">
import type { BuiltinTool, RoleEditorInput } from '@zakobot/shared'

const props = defineProps<{
  title: string
  description?: string
  submitLabel: string
  initialValue: RoleEditorInput
  pending?: boolean
}>()

const emit = defineEmits<{
  submit: [value: RoleEditorInput]
}>()

const state = reactive<RoleEditorInput>({
  avatar: '',
  name: '',
  systemPrompt: '',
  enabledTools: [],
})

interface ToolGroup {
  label: string
  tools: Array<{ value: BuiltinTool; label: string; description: string; sensitive?: boolean }>
}

const toolGroups: ToolGroup[] = [
  {
    label: '网络',
    tools: [
      { value: 'web_search', label: '网页搜索', description: '通过搜索引擎获取公开网页结果。' },
      { value: 'web_browse', label: '网页浏览', description: '读取公开网页正文，用于摘要和引用。' },
    ],
  },
  {
    label: '系统（敏感）',
    tools: [
      { value: 'shell_exec', label: 'Shell 执行', description: '在服务器上执行 Shell 命令，返回 stdout/stderr/退出码。', sensitive: true },
      { value: 'file_read', label: '文件读取', description: '读取文件内容，附带行号，支持分页。' },
      { value: 'file_write', label: '文件写入', description: '创建或覆盖写入文件，父目录不存在时自动创建。', sensitive: true },
      { value: 'file_edit', label: '文件编辑', description: '精确字符串替换，要求目标字符串在文件中唯一出现。', sensitive: true },
      { value: 'file_list', label: '目录列表', description: '列出目录中的文件和子目录，支持递归。' },
    ],
  },
]

const avatarUploadFile = ref<File | null>(null)
const avatarUploadPending = ref(false)
const avatarUploadError = ref('')

const squareAvatarUi = {
  root: 'rounded-md overflow-hidden bg-default',
  image: 'h-full w-full object-cover',
}

watch(
  () => props.initialValue,
  (value) => {
    state.avatar = value.avatar
    state.name = value.name
    state.systemPrompt = value.systemPrompt
    state.enabledTools = [...value.enabledTools]
    avatarUploadFile.value = null
    avatarUploadError.value = ''
  },
  { immediate: true, deep: true },
)

watch(avatarUploadFile, (file) => {
  if (!file) {
    return
  }

  void uploadAvatar(file)
})

watch(() => state.avatar, () => {
  if (state.avatar.trim()) {
    avatarUploadError.value = ''
  }
})

const canSubmit = computed(() =>
  state.name.trim().length > 0
  && state.systemPrompt.trim().length > 0,
)

function clearAvatar() {
  state.avatar = ''
  avatarUploadError.value = ''
}

function handleSubmit() {
  if (!canSubmit.value) {
    return
  }

  emit('submit', {
    avatar: state.avatar.trim(),
    name: state.name.trim(),
    systemPrompt: state.systemPrompt.trim(),
    enabledTools: [...state.enabledTools],
  })
}

async function uploadAvatar(file: File) {
  if (!import.meta.client) {
    return
  }

  avatarUploadPending.value = true
  avatarUploadError.value = ''

  try {
    const croppedFile = await cropAvatarToSquare(file)
    const formData = new FormData()
    formData.append('file', croppedFile, croppedFile.name)

    const response = await $fetch<{ ok: true, data: { url: string } }>('/api/uploads/avatar', {
      method: 'POST',
      body: formData,
    })

    state.avatar = response.data.url
  }
  catch (error: any) {
    avatarUploadError.value = error?.data?.message ?? error?.message ?? '头像上传失败'
  }
  finally {
    avatarUploadPending.value = false
    avatarUploadFile.value = null
  }
}

async function cropAvatarToSquare(file: File) {
  const imageUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(imageUrl)
    const sourceWidth = image.naturalWidth || image.width
    const sourceHeight = image.naturalHeight || image.height
    const sourceSize = Math.min(sourceWidth, sourceHeight)
    const offsetX = (sourceWidth - sourceSize) / 2
    const offsetY = (sourceHeight - sourceSize) / 2
    const canvas = document.createElement('canvas')
    const targetSize = 512

    canvas.width = targetSize
    canvas.height = targetSize

    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('当前环境不支持头像裁剪')
    }

    context.drawImage(
      image,
      offsetX,
      offsetY,
      sourceSize,
      sourceSize,
      0,
      0,
      targetSize,
      targetSize,
    )

    const blob = await canvasToBlob(canvas, 'image/png')
    return new File([blob], `${getFileBaseName(file.name)}.png`, {
      type: 'image/png',
      lastModified: Date.now(),
    })
  }
  finally {
    URL.revokeObjectURL(imageUrl)
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('头像图片读取失败'))
    image.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('头像裁剪失败'))
        return
      }

      resolve(blob)
    }, type)
  })
}

function getFileBaseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').trim() || 'avatar'
}
</script>
