/*
  Warnings:

  - Added the required column `type` to the `Token` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('ACCESS', 'SESSION', 'RESET');

-- AlterTable
ALTER TABLE "Token" ADD COLUMN     "type" "TokenType" NOT NULL;
