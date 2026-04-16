CREATE TABLE `conversation_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`topic_id` text NOT NULL,
	`bot_instance_id` text NOT NULL,
	`platform` text NOT NULL,
	`role` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`message_type` text DEFAULT 'text' NOT NULL,
	`platform_message_id` text DEFAULT '' NOT NULL,
	`sender_id` text DEFAULT '' NOT NULL,
	`sender_name` text DEFAULT '' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`topic_id`) REFERENCES `conversation_topics`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bot_instance_id`) REFERENCES `bot_instances`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `conversation_messages_topic_created_at_idx` ON `conversation_messages` (`topic_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `conversation_topics` (
	`id` text PRIMARY KEY NOT NULL,
	`bot_instance_id` text NOT NULL,
	`platform` text NOT NULL,
	`scope_key` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`source_type` text DEFAULT '' NOT NULL,
	`source_id` text DEFAULT '' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`bot_instance_id`) REFERENCES `bot_instances`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `conversation_topics_active_scope_idx` ON `conversation_topics` (`bot_instance_id`,`platform`,`scope_key`,`status`);