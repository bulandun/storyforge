CREATE TABLE `stories` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_key` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`updated_at` integer NOT NULL
);
