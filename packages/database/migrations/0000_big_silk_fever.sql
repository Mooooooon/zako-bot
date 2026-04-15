CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`system_prompt` text DEFAULT '' NOT NULL,
	`llm_provider` text NOT NULL,
	`llm_model` text NOT NULL,
	`llm_api_key` text NOT NULL,
	`llm_base_url` text,
	`enabled_tools` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bot_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`platform` text NOT NULL,
	`token` text NOT NULL,
	`role_id` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `plugins` (
	`name` text PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
