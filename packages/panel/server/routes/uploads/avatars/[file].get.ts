import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createError, defineEventHandler, getRouterParam, sendStream, setHeader } from 'h3'
import { getAvatarContentType, resolveAvatarFilePath } from '../../../utils/avatar-storage'

export default defineEventHandler(async (event) => {
  const fileName = getRouterParam(event, 'file')

  if (!fileName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Avatar file is required',
    })
  }

  const filePath = resolveAvatarFilePath(fileName)

  try {
    const metadata = await stat(filePath)

    setHeader(event, 'Content-Type', getAvatarContentType(fileName))
    setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
    setHeader(event, 'Content-Length', metadata.size)

    return sendStream(event, createReadStream(filePath))
  }
  catch (error: any) {
    if (error?.code === 'ENOENT') {
      throw createError({
        statusCode: 404,
        statusMessage: 'Avatar not found',
      })
    }

    throw error
  }
})
