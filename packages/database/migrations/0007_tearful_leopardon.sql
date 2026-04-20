CREATE TABLE `skills` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`version` text DEFAULT '1.0.0' NOT NULL,
	`source_type` text NOT NULL,
	`entry_file` text DEFAULT 'SKILL.md' NOT NULL,
	`package_dir` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`required_tools` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skills_slug_unique` ON `skills` (`slug`);--> statement-breakpoint
ALTER TABLE `roles` ADD `enabled_skills` text DEFAULT '[]' NOT NULL;