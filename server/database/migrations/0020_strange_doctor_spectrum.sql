CREATE TABLE `catalog_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_blueprint_id` text NOT NULL,
	`category` text NOT NULL,
	`display_name` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`provider_blueprint_id`) REFERENCES `provider_blueprints`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `provider_blueprints` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`blueprint_id` text NOT NULL,
	`title` text NOT NULL,
	`brand_name` text,
	`description` text,
	`image_url` text,
	`base_price` integer,
	`preview_image_url` text,
	`all_images` text,
	`is_bestseller` integer DEFAULT false NOT NULL,
	`synced_at` integer NOT NULL
);
