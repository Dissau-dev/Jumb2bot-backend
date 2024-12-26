/*
  Warnings:

  - You are about to drop the column `devices` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "devices",
ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "deviceModel" TEXT;
