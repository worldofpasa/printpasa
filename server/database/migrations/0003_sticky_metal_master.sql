CREATE TABLE `providers` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`capabilities` text NOT NULL,
	`credential_source` text NOT NULL,
	`runtime_config_key` text,
	`user_settings_key` text,
	`env_var_name` text,
	`models` text,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`default_ai_provider` text DEFAULT 'gemini' NOT NULL,
	`default_image_provider` text DEFAULT 'krea' NOT NULL,
	`default_upscale_provider` text DEFAULT 'leonardo' NOT NULL,
	`default_background_removal_provider` text DEFAULT 'leonardo' NOT NULL,
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
	`provider_registry_config` text,
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
INSERT INTO `__new_user_settings`("id", "user_id", "default_ai_provider", "default_image_provider", "default_upscale_provider", "default_background_removal_provider", "default_fulfillment_provider", "gemini_api_key", "openai_api_key", "anthropic_api_key", "xai_api_key", "krea_api_key", "midjourney_api_key", "stable_diffusion_api_key", "fal_api_key", "nano_banana_api_key", "grok_imagine_api_key", "printify_api_key", "printify_shop_id", "printful_api_key", "provider_registry_config", "default_theme_count", "default_winner_count", "default_prompts_per_theme", "default_images_per_prompt", "max_product_variants", "created_at", "updated_at") SELECT "id", "user_id", "default_ai_provider", "default_image_provider", "default_upscale_provider", "default_background_removal_provider", "default_fulfillment_provider", "gemini_api_key", "openai_api_key", "anthropic_api_key", "xai_api_key", "krea_api_key", "midjourney_api_key", "stable_diffusion_api_key", "fal_api_key", "nano_banana_api_key", "grok_imagine_api_key", "printify_api_key", "printify_shop_id", "printful_api_key", "provider_registry_config", "default_theme_count", "default_winner_count", "default_prompts_per_theme", "default_images_per_prompt", "max_product_variants", "created_at", "updated_at" FROM `user_settings`;--> statement-breakpoint
DROP TABLE `user_settings`;--> statement-breakpoint
ALTER TABLE `__new_user_settings` RENAME TO `user_settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_user_id_unique` ON `user_settings` (`user_id`);