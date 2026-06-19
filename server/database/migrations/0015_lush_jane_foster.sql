CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`target` text,
	`metadata` text,
	`project_id` text,
	`stage` text,
	`run_id` text,
	`pipeline_job_id` text,
	`schedule_id` text,
	`level` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`pipeline_job_id`) REFERENCES `pipeline_jobs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_project_id_idx` ON `audit_logs` (`project_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_stage_idx` ON `audit_logs` (`stage`);--> statement-breakpoint
CREATE INDEX `audit_logs_run_id_idx` ON `audit_logs` (`run_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_action_idx` ON `audit_logs` (`action`);