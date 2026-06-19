CREATE TABLE `niches` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`source` text DEFAULT 'trend-extracted' NOT NULL,
	`trend_origin` text,
	`is_active` integer DEFAULT true NOT NULL,
	`last_used_at` integer,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `niches_slug_idx` ON `niches` (`slug`);--> statement-breakpoint
ALTER TABLE `projects` ADD `validation_snapshot` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `origin_source` text DEFAULT 'portal' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `origin_actor` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `origin_meta` text;