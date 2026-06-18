/*
  Warnings:

  - A unique constraint covering the columns `[ecommerceRequestId]` on the table `ecom_store_stock_requests` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ecom_store_stock_requests" ADD COLUMN     "ecommerceRequestId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ecom_store_stock_requests_ecommerceRequestId_key" ON "ecom_store_stock_requests"("ecommerceRequestId");
