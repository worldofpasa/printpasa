CREATE TABLE `generated_images` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt_id` text NOT NULL,
	`image_url` text NOT NULL,
	`thumbnail_url` text,
	`image_provider` text NOT NULL,
	`width` integer,
	`height` integer,
	`dpi` integer DEFAULT 300,
	`file_size` integer,
	`mime_type` text DEFAULT 'image/png' NOT NULL,
	`title` text,
	`description` text,
	`generation_status` text DEFAULT 'pending' NOT NULL,
	`provider_job_id` text,
	`error_message` text,
	`is_selected` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`generation_batch` text,
	`s3_key_generated` text,
	`s3_key_bg_removed` text,
	`s3_key_upscaled` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`prompt_id`) REFERENCES `image_prompts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `image_prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`theme_id` text NOT NULL,
	`prompt_text` text NOT NULL,
	`original_prompt_text` text NOT NULL,
	`style` text,
	`background_color_hex` text,
	`background_color_name` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_selected` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`generation_batch` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`theme_id`) REFERENCES `themes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`image_id` text NOT NULL,
	`sku` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`tags` text,
	`fulfillment_provider` text NOT NULL,
	`external_product_id` text,
	`print_provider_id` text,
	`blueprint_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` integer,
	`error_message` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`image_id`) REFERENCES `generated_images`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_sku_unique` ON `products` (`sku`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text DEFAULT '' NOT NULL,
	`description` text,
	`current_stage` text DEFAULT 'gather-idea' NOT NULL,
	`trend_source` text,
	`niche` text,
	`custom_niche` text,
	`theme_count` integer DEFAULT 10,
	`ai_provider` text,
	`image_provider` text,
	`fulfillment_provider` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_slug_idx` ON `projects` (`user_id`,`slug`);--> statement-breakpoint
CREATE TABLE `themes` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text DEFAULT '' NOT NULL,
	`description` text,
	`target_demographic` text,
	`context_notes` text,
	`trend_score` real,
	`is_validated` integer DEFAULT false NOT NULL,
	`validation_notes` text,
	`patent_safe` integer,
	`copyright_safe` integer,
	`trademark_safe` integer,
	`is_winner` integer DEFAULT false NOT NULL,
	`is_selected` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`generation_batch` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`default_ai_provider` text DEFAULT 'gemini' NOT NULL,
	`default_image_provider` text DEFAULT 'krea' NOT NULL,
	`default_fulfillment_provider` text DEFAULT 'printify' NOT NULL,
	`gemini_api_key` text,
	`openai_api_key` text,
	`anthropic_api_key` text,
	`xai_api_key` text,
	`krea_api_key` text,
	`midjourney_api_key` text,
	`stable_diffusion_api_key` text,
	`fal_api_key` text,
	`nano_banana_api_key` text,
	`grok_imagine_api_key` text,
	`printify_api_key` text,
	`printify_shop_id` text,
	`printful_api_key` text,
	`default_theme_count` integer DEFAULT 10 NOT NULL,
	`default_winner_count` integer DEFAULT 5 NOT NULL,
	`default_prompts_per_theme` integer DEFAULT 5 NOT NULL,
	`default_images_per_prompt` integer DEFAULT 1 NOT NULL,
	`max_product_variants` integer DEFAULT 5 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_user_id_unique` ON `user_settings` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`google_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`avatar_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_id_unique` ON `users` (`google_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);