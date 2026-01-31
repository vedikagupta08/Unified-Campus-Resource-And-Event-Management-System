-- AlterTable
ALTER TABLE `Event` ADD COLUMN `participationFee` INTEGER NULL,
    ADD COLUMN `teamSizeMin` INTEGER NULL,
    ADD COLUMN `teamSizeMax` INTEGER NULL,
    ADD COLUMN `category` VARCHAR(191) NULL,
    ADD COLUMN `eligibilityTags` VARCHAR(191) NULL,
    ADD COLUMN `registrationDeadline` DATETIME(3) NULL;
