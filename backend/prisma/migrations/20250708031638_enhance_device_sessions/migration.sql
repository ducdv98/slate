/*
  Warnings:

  - A unique constraint covering the columns `[user_id,device_token]` on the table `device_sessions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ip_address` to the `device_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "device_sessions" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "device_name" TEXT,
ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "ip_address" TEXT NOT NULL,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "user_agent" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "device_sessions_user_id_device_token_key" ON "device_sessions"("user_id", "device_token");
