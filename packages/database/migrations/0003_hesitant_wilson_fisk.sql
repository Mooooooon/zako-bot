ALTER TABLE `bot_instances` ADD `llm_provider` text DEFAULT 'openai' NOT NULL;--> statement-breakpoint
ALTER TABLE `bot_instances` ADD `llm_platform_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `bot_instances` ADD `llm_model` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `bot_instances` ADD `llm_api_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `bot_instances` ADD `llm_base_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `bot_instances` ADD `discord_user_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `bot_instances` ADD `discord_guild_id` text DEFAULT '' NOT NULL;