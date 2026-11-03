CREATE TABLE `studio_grant_events` (
	`id` text PRIMARY KEY NOT NULL,
	`grant_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `studio_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`document_id` text NOT NULL,
	`part_id` text NOT NULL,
	`email` text NOT NULL,
	`user_id` text,
	`owner_name` text NOT NULL,
	`created_at` text NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE INDEX `studio_grants_recipient` ON `studio_grants` (`email`,`user_id`);--> statement-breakpoint
CREATE INDEX `studio_grants_owner` ON `studio_grants` (`owner_id`);