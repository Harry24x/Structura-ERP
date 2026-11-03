CREATE TABLE `studio_records` (
	`owner_id` text NOT NULL,
	`store` text NOT NULL,
	`record_id` text NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `store`, `record_id`)
);
--> statement-breakpoint
CREATE TABLE `studio_workspaces` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`last_operation` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
