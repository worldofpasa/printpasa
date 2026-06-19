CREATE TABLE `superuser_secrets` (
	`id` text PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `user_settings` ADD `default_upscale_provider` text DEFAULT 'krea' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `default_background_removal_provider` text DEFAULT 'rembg' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `role` text DEFAULT 'user' NOT NULL;