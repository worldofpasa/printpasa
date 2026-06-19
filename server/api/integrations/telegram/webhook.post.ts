import { parseAllowedChatIds } from '~~/server/services/pipeline/config'
import { handleIdeaCommand, handleScheduleCommand } from '~~/server/services/telegram/commands'

interface TelegramUpdate {
  message?: {
    message_id: number
    message_thread_id?: number
    chat: { id: number; type: string }
    text?: string
    from?: { id?: number; username?: string; first_name?: string }
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const expectedSecret = (config.telegramWebhookSecret as string)?.trim()
  if (expectedSecret) {
    const provided = getHeader(event, 'x-telegram-bot-api-secret-token')
    if (provided !== expectedSecret) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid webhook secret' })
    }
  }

  const update = await readBody<TelegramUpdate>(event)
  const message = update?.message
  if (!message?.text) {
    return { ok: true }
  }

  const chatId = message.chat.id
  const allowed = parseAllowedChatIds(config.telegramAllowedChatIds)
  if (allowed.size > 0 && !allowed.has(String(chatId))) {
    return { ok: true, ignored: 'chat not allowed' }
  }

  const text = message.text.trim()
  const lowerText = text.toLowerCase()
  if (lowerText.startsWith('/idea')) {
    await handleIdeaCommand({
      chatId,
      messageId: message.message_id,
      messageThreadId: message.message_thread_id,
      text,
      fromUsername: message.from?.username ?? message.from?.first_name,
      fromUserId: message.from?.id,
    })
  } else if (lowerText.startsWith('/schedule')) {
    await handleScheduleCommand({
      chatId,
      messageId: message.message_id,
      messageThreadId: message.message_thread_id,
      text,
      fromUsername: message.from?.username ?? message.from?.first_name,
      fromUserId: message.from?.id,
    })
  }

  return { ok: true }
})

