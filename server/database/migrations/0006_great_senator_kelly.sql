CREATE TABLE `image_variations` (
	`id` text PRIMARY KEY NOT NULL,
	`image_id` text NOT NULL,
	`parent_variation_id` text,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`format` text DEFAULT 'png' NOT NULL,
	`mime_type` text DEFAULT 'image/png' NOT NULL,
	`width` integer,
	`height` integer,
	`file_size` integer,
	`s3_key` text,
	`url` text NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`image_id`) REFERENCES `generated_images`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `image_variations_image_id_idx` ON `image_variations` (`image_id`);
