export type PipelineJobStatus = 'pending' | 'running' | 'completed' | 'failed'

export type PipelineEventLevel = 'success' | 'warning' | 'error'

export type PipelineStep =
  | 'create_project'
  | 'fetch_trends'
  | 'gather_idea'
  | 'select_themes'
  | 'stage_validator'
  | 'validate'
  | 'select_winners'
  | 'stage_prompts'
  | 'prompts'
  | 'stage_images'
  | 'images_generate'
  | 'select_images'
  | 'stage_handoff'
  | 'complete'

export interface TelegramSourceMeta {
  chatId: number
  messageId: number
  replyToMessageId?: number
  fromUser?: string
  fromUserId?: number
  messageThreadId?: number
  rawText?: string
  runId?: string
  scheduleId?: string
  discoveryMode?: string
}

export interface PipelineNotifyTarget {
  chatId: number
  replyToMessageId?: number
}
