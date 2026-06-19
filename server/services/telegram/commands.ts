import { useDB, schema } from '~~/server/database'
import { eq } from 'drizzle-orm'
import { parseIdeaCommand, projectNameFromIdea } from './parse-idea'
import { sendTelegramMessage } from './notify'
import { schedulePipelineJob } from '../pipeline/run-job'
import { runAutomatedResearch } from '../pipeline/brainstorm'
import { formatScheduleTriggerCompleteMessage } from './run-notify'
import type { TelegramSourceMeta } from '../pipeline/types'
import { startWorkflowRun } from '../workflow-run-audit'

export async function handleIdeaCommand(opts: {
  chatId: number
  messageId: number
  messageThreadId?: number
  text: string
  fromUsername?: string
  fromUserId?: number
}) {
  const parsed = parseIdeaCommand(opts.text)
  if (!parsed) return false

  if (!parsed.ideaText) {
    await sendTelegramMessage(
      opts.chatId,
      'Usage: /idea your product idea\nExample: /idea ultimate packing list - diaper bag',
      opts.messageId,
    )
    return true
  }

  const db = useDB()
  const jobId = crypto.randomUUID()
  const projectName = projectNameFromIdea(parsed.ideaText)
  const runId = startWorkflowRun('telegram')
  const sourceMeta: TelegramSourceMeta = {
    chatId: opts.chatId,
    messageId: opts.messageId,
    replyToMessageId: opts.messageId,
    fromUser: opts.fromUsername,
    fromUserId: opts.fromUserId,
    messageThreadId: opts.messageThreadId,
    rawText: opts.text,
    runId,
  }

  await db.insert(schema.pipelineJobs).values({
    id: jobId,
    status: 'pending',
    source: 'telegram',
    sourceMeta: JSON.stringify(sourceMeta),
    ideaText: parsed.ideaText,
    projectName,
    currentStep: 'pending',
  })

  await sendTelegramMessage(
    opts.chatId,
    `Pipeline started: "${projectName}"…\nJob: ${jobId}`,
    opts.messageId,
  )

  schedulePipelineJob(jobId)
  return true
}

function parseScheduleAdd(argString: string): { name: string; interval: string; niche: string } | null {
  const regex = /^(?:"([^"]+)"|([^\s"]+))\s+(hourly|daily|weekly)(?:\s+([^\s]+))?$/i
  const match = argString.match(regex)
  if (!match) return null
  const name = match[1] || match[2]
  const interval = match[3].toLowerCase()
  const niche = match[4] || 'holiday'
  return { name, interval, niche }
}

export async function handleScheduleCommand(opts: {
  chatId: number
  messageId: number
  text: string
  fromUsername?: string
}) {
  const parts = opts.text.trim().split(/\s+/)
  const command = parts[0].toLowerCase()

  if (command === '/schedules') {
    const db = useDB()
    const list = await db.query.pipelineSchedules.findMany()
    if (list.length === 0) {
      await sendTelegramMessage(opts.chatId, 'No schedules configured.', opts.messageId)
      return true
    }
    let response = '📋 Pipeline Schedules:\n\n'
    for (const s of list) {
      const status = s.enabled ? '🟢' : '🔴'
      const lastRun = s.lastRunAt ? new Date(s.lastRunAt).toISOString().replace('T', ' ').substring(0, 19) : 'Never'
      const nextRun = s.nextRunAt ? new Date(s.nextRunAt).toISOString().replace('T', ' ').substring(0, 19) : 'Never'
      response += `[${status}] ID: ${s.id}\n`
      response += `- Name: ${s.name}\n`
      response += `- Interval: ${s.interval}\n`
      response += `- Niche: ${s.niche || 'holiday'}\n`
      response += `- Source: ${s.source || 'reddit'}\n`
      response += `- Last Run: ${lastRun}\n`
      response += `- Next Run: ${nextRun}\n\n`
    }
    await sendTelegramMessage(opts.chatId, response.trim(), opts.messageId)
    return true
  }

  if (command === '/schedule_enable') {
    const id = parts[1]?.trim()
    if (!id) {
      await sendTelegramMessage(opts.chatId, 'Usage: /schedule_enable <id>', opts.messageId)
      return true
    }
    const db = useDB()
    const [updated] = await db
      .update(schema.pipelineSchedules)
      .set({ enabled: true, updatedAt: new Date() })
      .where(eq(schema.pipelineSchedules.id, id))
      .returning()

    if (updated) {
      await sendTelegramMessage(opts.chatId, `🟢 Schedule "${updated.name}" (${updated.id}) has been enabled.`, opts.messageId)
    } else {
      await sendTelegramMessage(opts.chatId, `❌ Schedule with ID "${id}" not found.`, opts.messageId)
    }
    return true
  }

  if (command === '/schedule_disable') {
    const id = parts[1]?.trim()
    if (!id) {
      await sendTelegramMessage(opts.chatId, 'Usage: /schedule_disable <id>', opts.messageId)
      return true
    }
    const db = useDB()
    const [updated] = await db
      .update(schema.pipelineSchedules)
      .set({ enabled: false, updatedAt: new Date() })
      .where(eq(schema.pipelineSchedules.id, id))
      .returning()

    if (updated) {
      await sendTelegramMessage(opts.chatId, `🔴 Schedule "${updated.name}" (${updated.id}) has been disabled.`, opts.messageId)
    } else {
      await sendTelegramMessage(opts.chatId, `❌ Schedule with ID "${id}" not found.`, opts.messageId)
    }
    return true
  }

  if (command === '/schedule_trigger') {
    const id = parts[1]?.trim()
    if (!id) {
      await sendTelegramMessage(opts.chatId, 'Usage: /schedule_trigger <id>', opts.messageId)
      return true
    }
    const db = useDB()
    const sched = await db.query.pipelineSchedules.findFirst({
      where: eq(schema.pipelineSchedules.id, id),
    })
    if (!sched) {
      await sendTelegramMessage(opts.chatId, `❌ Schedule with ID "${id}" not found.`, opts.messageId)
      return true
    }

    await sendTelegramMessage(opts.chatId, `⚡️ Triggering schedule "${sched.name}" (${sched.id}) now...`, opts.messageId)
    
    const now = new Date()
    await db
      .update(schema.pipelineSchedules)
      .set({
        lastRunAt: now,
        updatedAt: now,
      })
      .where(eq(schema.pipelineSchedules.id, id))

    void runAutomatedResearch(id).then((result) => {
      const message = formatScheduleTriggerCompleteMessage({
        scheduleName: result.scheduleName,
        discoveryMode: result.discoveryMode,
        seeds: result.seeds,
        runId: result.runId,
      })
      sendTelegramMessage(
        opts.chatId,
        `✅ ${message}`,
        opts.messageId,
      ).catch((e) => console.error('[telegram] notify run success failed', e))
    }).catch((err) => {
      sendTelegramMessage(
        opts.chatId,
        `❌ Schedule "${sched.name}" failed: ${err?.message ?? err}`
      ).catch((e) => console.error('[telegram] notify run failure failed', e))
    })

    return true
  }

  if (command === '/schedule_add') {
    const argString = opts.text.substring('/schedule_add'.length).trim()
    const parsed = parseScheduleAdd(argString)
    if (!parsed) {
      await sendTelegramMessage(
        opts.chatId,
        'Usage: /schedule_add "Schedule Name" <hourly|daily|weekly> [niche]\nExample: /schedule_add "Gaming Trends" daily gaming',
        opts.messageId,
      )
      return true
    }

    const db = useDB()
    const scheduleId = crypto.randomUUID()
    const now = new Date()

    let nextRunAt: Date
    if (parsed.interval === 'hourly') {
      nextRunAt = new Date(now.getTime() + 60 * 60 * 1000)
    } else if (parsed.interval === 'daily') {
      nextRunAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    } else {
      nextRunAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    }

    await db.insert(schema.pipelineSchedules).values({
      id: scheduleId,
      name: parsed.name,
      interval: parsed.interval as 'hourly' | 'daily' | 'weekly',
      niche: parsed.niche,
      source: 'reddit',
      enabled: true,
      nextRunAt,
      createdAt: now,
      updatedAt: now,
    })

    await sendTelegramMessage(
      opts.chatId,
      `✅ Created schedule "${parsed.name}" with ID: \`${scheduleId}\`\nInterval: ${parsed.interval}\nNiche: ${parsed.niche}\nNext run: ${nextRunAt.toISOString().replace('T', ' ').substring(0, 19)}`,
      opts.messageId,
    )
    return true
  }

  if (command === '/schedule_remove') {
    const id = parts[1]?.trim()
    if (!id) {
      await sendTelegramMessage(opts.chatId, 'Usage: /schedule_remove <id>', opts.messageId)
      return true
    }
    const db = useDB()
    const [deleted] = await db
      .delete(schema.pipelineSchedules)
      .where(eq(schema.pipelineSchedules.id, id))
      .returning()

    if (deleted) {
      await sendTelegramMessage(opts.chatId, `✅ Schedule "${deleted.name}" (${deleted.id}) has been removed.`, opts.messageId)
    } else {
      await sendTelegramMessage(opts.chatId, `❌ Schedule with ID "${id}" not found.`, opts.messageId)
    }
    return true
  }

  if (command === '/schedule') {
    await sendTelegramMessage(
      opts.chatId,
      `📋 Pipeline Schedules Commands:\n\n` +
        `• /schedules - List all schedules\n` +
        `• /schedule_enable <id> - Enable a schedule\n` +
        `• /schedule_disable <id> - Disable a schedule\n` +
        `• /schedule_trigger <id> - Trigger a schedule immediately\n` +
        `• /schedule_add "Name" <hourly|daily|weekly> [niche] - Add a custom schedule\n` +
        `• /schedule_remove <id> - Remove a schedule`,
      opts.messageId,
    )
    return true
  }

  return false
}

