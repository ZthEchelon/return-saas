-- DropForeignKey
ALTER TABLE "BillOccurrence" DROP CONSTRAINT "BillOccurrence_billId_fkey";

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "renewalAt",
DROP COLUMN "renewalCadence";

-- AlterTable
ALTER TABLE "EmailConnection" DROP COLUMN "scopes";

-- DropTable
DROP TABLE "EmailMessage";

-- DropTable
DROP TABLE "BillOccurrence";

-- DropTable
DROP TABLE "DigestSendLog";

-- DropTable
DROP TABLE "DigestRun";

-- DropEnum
DROP TYPE "BillOccurrenceStatus";

