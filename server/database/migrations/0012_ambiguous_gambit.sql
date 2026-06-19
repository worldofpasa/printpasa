CREATE TABLE `pipeline_job_events` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`step` text NOT NULL,
	`level` text NOT NULL,
	`message` text NOT NULL,
	`detail` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `pipeline_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pipeline_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`source` text DEFAULT 'telegram' NOT NULL,
	`source_meta` text,
	`idea_text` text NOT NULL,
	`project_name` text,
	`project_id` text,
	`project_slug` text,
	`current_step` text,
	`error_message` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer
);
