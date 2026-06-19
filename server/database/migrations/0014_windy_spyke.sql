CREATE TABLE `workflow_run_events` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`source` text NOT NULL,
	`project_id` text,
	`pipeline_job_id` text,
	`schedule_id` text,
	`phase` text NOT NULL,
	`level` text NOT NULL,
	`message` text NOT NULL,
	`detail` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`pipeline_job_id`) REFERENCES `pipeline_jobs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `pipeline_schedules` ADD `discovery_mode` text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE `pipeline_schedules` ADD `max_jobs_per_run` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `research_snapshot` text;