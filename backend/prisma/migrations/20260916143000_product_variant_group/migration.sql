-- AlterTable
ALTER TABLE "products" ADD COLUMN "variant_group_id" TEXT;

-- CreateIndex
CREATE INDEX "products_tenant_id_variant_group_id_idx" ON "products"("tenant_id", "variant_group_id");
