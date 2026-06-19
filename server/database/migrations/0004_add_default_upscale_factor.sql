ALTER TABLE `generated_images` ADD `bg_removed_url` text;--> statement-breakpoint
ALTER TABLE `generated_images` ADD `bg_removal_status` text;--> statement-breakpoint
ALTER TABLE `generated_images` ADD `bg_removal_error` text;--> statement-breakpoint
ALTER TABLE `generated_images` ADD `upscaled_url` text;--> statement-breakpoint
ALTER TABLE `generated_images` ADD `upscale_status` text;--> statement-breakpoint
ALTER TABLE `generated_images` ADD `upscale_error` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `leonardo_api_key` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `photoroom_api_key` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `replicate_api_token` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `default_upscale_factor` integer DEFAULT 2 NOT NULL;