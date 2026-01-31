-- Event: submittedAt for SLA display
ALTER TABLE `Event` ADD COLUMN `submittedAt` DATETIME(3) NULL;

-- Resource: soft delete (active)
ALTER TABLE `Resource` ADD COLUMN `active` BOOLEAN NOT NULL DEFAULT true;

-- Notification: category and readAt
ALTER TABLE `Notification` ADD COLUMN `category` VARCHAR(191) NULL;
ALTER TABLE `Notification` ADD COLUMN `readAt` DATETIME(3) NULL;
