ALTER TABLE `user_settings` ADD `rapidapi_key` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `serpapi_key` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `use_trademark_api` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `use_brand_risk_api` integer DEFAULT false NOT NULL;