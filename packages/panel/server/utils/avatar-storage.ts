import { extname, resolve } from 'node:path'
import { mkdir } from 'node:fs/promises'
import { createError } from 'h3'

const avatarUploadDir = resolve(process.cwd(), '.data', 'uploads', 'avatars')
const avatarFilePattern = /^[0-9a-f-]+\.(png|jpe?g|webp)$/i

export async function ensureAvatarUploadDir() {
  await mkdir(avatarUploadDir, { recursive: true })
}

export function createAvatarUrl(fileName: string) {
  return `/uploads/avatars/${fileName}`
}

export function resolveAvatarFilePath(fileName: string) {
  const safeFileName = assertAvatarFileName(fileName)
  return resolve(avatarUploadDir, safeFileName)
}

export function getAvatarContentType(fileName: string) {
  switch (extname(fileName).toLowerCase()) {
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.webp':
      return 'image/webp'
    default:
      return 'application/octet-stream'
  }
}

function assertAvatarFileName(fileName: string) {
  if (!avatarFilePattern.test(fileName)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid avatar file name',
    })
  }

  return fileName
}
