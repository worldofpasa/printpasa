import type { H3Event } from 'h3'

export function badRequest(message: string) {
  return createError({ statusCode: 400, statusMessage: message })
}

export function notFound(resource: string) {
  return createError({ statusCode: 404, statusMessage: `${resource} not found` })
}

export function forbidden(message = 'Forbidden') {
  return createError({ statusCode: 403, statusMessage: message })
}

export function serverError(message: string) {
  return createError({ statusCode: 500, statusMessage: message })
}
