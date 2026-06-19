-- Switch users defaulted to Leonardo (broken bg-removal endpoint, generative
-- upscaler that destroys transparency) over to Photoroom for both capabilities.
-- New rows pick up the new defaults via the schema change in
-- server/database/schema/settings.ts.
UPDATE `user_settings`
  SET `default_background_removal_provider` = 'photoroom'
  WHERE `default_background_removal_provider` = 'leonardo';--> statement-breakpoint
UPDATE `user_settings`
  SET `default_upscale_provider` = 'photoroom'
  WHERE `default_upscale_provider` = 'leonardo';
