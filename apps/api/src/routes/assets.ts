import type { FastifyPluginAsync } from 'fastify'
import { put } from '@vercel/blob'
import sharp from 'sharp'
import { requireAuth } from '../plugins/auth.js'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB raw upload limit
const MAX_OUTPUT_WIDTH = 1200 // px — images wider than this are downscaled
const WEBP_QUALITY = 80

const assetRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /assets/upload
   * Accepts a multipart/form-data file field named "file".
   * Compresses the image to WebP (max 1200 px wide, quality 80) via sharp,
   * uploads to Vercel Blob, and returns the public URL.
   */
  fastify.post('/assets/upload', { preHandler: requireAuth }, async (request, reply) => {
    if (!process.env['BLOB_READ_WRITE_TOKEN']) {
      return reply.status(503).send({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'File storage is not configured on this server.',
      })
    }

    let fileData: Awaited<ReturnType<typeof request.file>>
    try {
      fileData = await request.file({ limits: { fileSize: MAX_FILE_SIZE } })
    } catch {
      return reply.status(413).send({
        statusCode: 413,
        error: 'Payload Too Large',
        message: `File exceeds the ${MAX_FILE_SIZE / (1024 * 1024)} MB limit.`,
      })
    }

    if (!fileData) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'No file was provided. Send a multipart/form-data request with a "file" field.',
      })
    }

    if (!ALLOWED_MIME_TYPES.includes(fileData.mimetype)) {
      fileData.file.resume() // drain stream to avoid memory leaks
      return reply.status(415).send({
        statusCode: 415,
        error: 'Unsupported Media Type',
        message: 'Only JPEG, PNG, WebP, and GIF images are accepted.',
      })
    }

    // 1. Buffer the raw incoming bytes (5 MB limit already enforced by busboy)
    const chunks: Buffer[] = []
    for await (const chunk of fileData.file) {
      chunks.push(chunk as Buffer)
    }
    const rawBuffer = Buffer.concat(chunks)

    // 2. Compress via sharp → WebP, max 1200 px wide, 80% quality
    let webpBuffer: Buffer
    try {
      webpBuffer = await sharp(rawBuffer)
        .resize({ width: MAX_OUTPUT_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer()
    } catch (err) {
      fastify.log.error(err, 'sharp image processing failed')
      return reply.status(422).send({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: 'The uploaded file could not be processed as an image.',
      })
    }

    // 3. Store only the optimised WebP — discard raw buffer
    const pathname = `registry-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`

    try {
      const blob = await put(pathname, webpBuffer, {
        access: 'public',
        contentType: 'image/webp',
      })
      return reply.status(200).send({ imageUrl: blob.url })
    } catch (err) {
      fastify.log.error(err, 'Vercel Blob upload failed')
      return reply.status(502).send({
        statusCode: 502,
        error: 'Upload Failed',
        message: 'Could not store the file. Please try again.',
      })
    }
  })
}

export default assetRoutes
