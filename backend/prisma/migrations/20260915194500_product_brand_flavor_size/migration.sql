-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "products" DROP COLUMN IF EXISTS "brand",
ADD COLUMN IF NOT EXISTS "brand_id" TEXT,
ADD COLUMN IF NOT EXISTS "flavor" TEXT,
ADD COLUMN IF NOT EXISTS "size" TEXT;

-- CreateIndex
CREATE INDEX "brands_tenant_id_is_active_idx" ON "brands"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "brands_tenant_id_name_key" ON "brands"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "products_tenant_id_brand_id_idx" ON "products"("tenant_id", "brand_id");

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
