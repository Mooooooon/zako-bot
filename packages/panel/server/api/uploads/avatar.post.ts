import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { createError, defineEventHandler, readMultipartFormData, setResponseStatus } from 'h3'
import { createAvatarUrl, ensureAvatarUploadDir, resolveAvatarFilePath } from '../../utils/avatar-storage'

const MAX_AVATAR_SIZE = 5 * 1024 * 1024

const extensionsByType: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file' && part.filename)

  if (!file?.type || !(file.type in extensionsByType)) {
    throw createError({
      statusCode: 400,
      message: '请上传 PNG、JPG 或 WEBP 图片',
    })
  }

  const buffer = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data)

  if (!buffer.length) {
    throw createError({
      statusCode: 400,
      message: '头像文件不能为空',
    })
  }

  if (buffer.length > MAX_AVATAR_SIZE) {
    throw createError({
      statusCode: 400,
      message: '头像文件不能超过 5MB',
    })
  }

  await ensureAvatarUploadDir()

  const fileName = `${randomUUID()}${extensionsByType[file.type]}`
  await writeFile(resolveAvatarFilePath(fileName), buffer)

  setResponseStatus(event, 201)

  return {
    ok: true,
    data: {
      url: createAvatarUrl(fileName),
    },
  }
})
