-- Fix shop name column to match application code
ALTER TABLE shops RENAME COLUMN shop_name TO name;