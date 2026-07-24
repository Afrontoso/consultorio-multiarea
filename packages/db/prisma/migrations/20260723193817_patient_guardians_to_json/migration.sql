/*
  Warnings:

  - You are about to drop the column `guardianName` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `guardianPhone` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `guardianRelationship` on the `Patient` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Patient" DROP COLUMN "guardianName",
DROP COLUMN "guardianPhone",
DROP COLUMN "guardianRelationship",
ADD COLUMN     "guardians" JSONB;
