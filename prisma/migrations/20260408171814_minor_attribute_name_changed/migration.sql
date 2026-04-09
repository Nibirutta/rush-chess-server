/*
  Warnings:

  - You are about to drop the column `FenHistory` on the `GameState` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GameState" DROP COLUMN "FenHistory",
ADD COLUMN     "fenHistory" TEXT[];
