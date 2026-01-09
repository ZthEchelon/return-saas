-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REFUND_OVERDUE';

-- AlterTable
ALTER TABLE "EmailTransaction" ADD COLUMN     "parserError" TEXT;
