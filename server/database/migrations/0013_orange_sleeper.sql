CREATE TABLE `pipeline_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`interval` text DEFAULT 'daily' NOT NULL,
	`cron_expression` text,
	`niche` text DEFAULT 'holiday',
	`source` text DEFAULT 'reddit',
	`enabled` integer DEFAULT true NOT NULL,
	`last_run_at` integer,
	`next_run_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
