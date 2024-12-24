-- AlterTable
ALTER TABLE "User" ADD COLUMN     "devices" JSONB NOT NULL DEFAULT '[]';
