/*
  Warnings:

  - The primary key for the `LikeComment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `LikeComment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LikeComment" DROP CONSTRAINT "LikeComment_pkey",
DROP COLUMN "id",
ALTER COLUMN "commentId" SET DATA TYPE TEXT,
ADD CONSTRAINT "LikeComment_pkey" PRIMARY KEY ("userId", "commentId");

-- AddForeignKey
ALTER TABLE "LikeComment" ADD CONSTRAINT "LikeComment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
