DROP INDEX "audit_logs_created_at_idx";--> statement-breakpoint
DROP INDEX "audit_logs_project_id_idx";--> statement-breakpoint
DROP INDEX "audit_logs_stage_idx";--> statement-breakpoint
DROP INDEX "audit_logs_run_id_idx";--> statement-breakpoint
DROP INDEX "audit_logs_action_idx";--> statement-breakpoint
DROP INDEX "image_variations_image_id_idx";--> statement-breakpoint
DROP INDEX "products_sku_unique";--> statement-breakpoint
DROP INDEX "user_slug_idx";--> statement-breakpoint
DROP INDEX "user_settings_user_id_unique";--> statement-breakpoint
DROP INDEX "users_google_id_unique";--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
ALTER TABLE `user_settings` ALTER COLUMN "default_image_provider" TO "default_image_provider" text NOT NULL DEFAULT 'fal';--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_project_id_idx` ON `audit_logs` (`project_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_stage_idx` ON `audit_logs` (`stage`);--> statement-breakpoint
CREATE INDEX `audit_logs_run_id_idx` ON `audit_logs` (`run_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `image_variations_image_id_idx` ON `image_variations` (`image_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_sku_unique` ON `products` (`sku`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_slug_idx` ON `projects` (`user_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_user_id_unique` ON `user_settings` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_id_unique` ON `users` (`google_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `user_settings` ADD `searchapi_key` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `serper_api_key` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `default_search_provider` text;--> statement-breakpoint
ALTER TABLE `image_prompts` ADD `design_lane` text;--> statement-breakpoint
ALTER TABLE `image_prompts` ADD `slogan_text` text;--> statement-breakpoint
ALTER TABLE `image_prompts` ADD `recommended_model` text;