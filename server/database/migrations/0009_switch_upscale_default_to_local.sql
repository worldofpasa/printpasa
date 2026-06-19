-- Switch default upscale from Photoroom to the local sharp-based upscaler.
-- Photoroom's ai.fast mode 500s on mostly-transparent inputs (typical for
-- bg-removed t-shirt designs). The local lanczos3 resample preserves alpha
-- perfectly and never fails, at the cost of no ML detail enhancement — an
-- acceptable trade for small print areas at 300 DPI.
UPDATE `user_settings`
  SET `default_upscale_provider` = 'local'
  WHERE `default_upscale_provider` IN ('photoroom', 'leonardo');
