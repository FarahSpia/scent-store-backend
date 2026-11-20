/*
  Warnings:

  - Made the column `rate` on table `Comment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Comment" ALTER COLUMN "rate" SET NOT NULL,
ALTER COLUMN "like" SET DEFAULT 0,
ALTER COLUMN "dislike" SET DEFAULT 0;
