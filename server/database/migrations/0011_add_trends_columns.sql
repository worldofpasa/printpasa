ALTER TABLE `user_settings` ADD `default_trends_provider` text DEFAULT 'google-trends' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `trending_topics_snapshot` text;
