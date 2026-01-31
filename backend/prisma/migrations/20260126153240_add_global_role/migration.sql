/*
  Warnings:

  - You are about to drop the column `role` on the `membership` table. All the data in the column will be lost.
  - You are about to drop the column `isAdmin` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `membership` DROP COLUMN `role`,
    ADD COLUMN `clubRole` ENUM('MEMBER', 'ORGANIZER', 'HEAD') NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE `user` DROP COLUMN `isAdmin`,
    ADD COLUMN `globalRole` ENUM('ADMIN', 'STUDENT') NOT NULL DEFAULT 'STUDENT';
