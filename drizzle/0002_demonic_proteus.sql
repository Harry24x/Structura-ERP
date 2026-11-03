ALTER TABLE `studio_grants` ADD `recipient_role` text DEFAULT 'employee' NOT NULL;--> statement-breakpoint
ALTER TABLE `studio_grants` ADD `scope` text DEFAULT 'part' NOT NULL;