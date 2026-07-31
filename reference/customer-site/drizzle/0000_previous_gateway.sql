CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`accepted_by` text,
	`accepted_at` integer
);
