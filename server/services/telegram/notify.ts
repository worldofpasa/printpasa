import { Bot } from 'grammy'

let _bot: Bot | null = null

function getBot(): Bot | null {
  const token = (useRuntimeConfig().telegramBotToken as string)?.trim()
  if (!token) return null
  if (!_bot) _bot = new Bot(token)
  return _bot
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  replyToMessageId?: number,
  messageThreadId?: number,
) {
  const bot = getBot()
  if (!bot) {
    console.warn('[telegram] NUXT_TELEGRAM_BOT_TOKEN not set; skipping send')
    return
  }
  await bot.api.sendMessage(chatId, text, {
    reply_parameters: replyToMessageId
      ? { message_id: replyToMessageId }
      : undefined,
    message_thread_id: messageThreadId,
  })
}

export function getTelegramTopics(): { ideaGeneration: number | undefined; designReview: number | undefined } {
  const config = useRuntimeConfig()
  const parseId = (v: unknown) => {
    const n = parseInt(String(v ?? ''), 10)
    return isNaN(n) ? undefined : n
  }
  return {
    ideaGeneration: parseId(config.telegramTopicIdeaGeneration),
    designReview: parseId(config.telegramTopicDesignReview),
  }
}
