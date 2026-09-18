-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "StoreRole" AS ENUM ('OWNER', 'MANAGER', 'CASHIER');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('OPENING', 'PURCHASE', 'SALE', 'PURCHASE_RETURN', 'SALE_RETURN', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED', 'PARTIALLY_RETURNED', 'RETURNED');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('HELD', 'COMPLETED', 'PARTIAL', 'CANCELLED', 'PARTIALLY_RETURNED', 'RETURNED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'ONLINE', 'CREDIT', 'MIXED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "AccountPartyType" AS ENUM ('CUSTOMER', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "AccountTxnType" AS ENUM ('OPENING', 'SALE', 'SALE_RETURN', 'PURCHASE', 'PURCHASE_RETURN', 'PAYMENT', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CashTxnType" AS ENUM ('OPENING', 'SALE', 'CUSTOMER_PAYMENT', 'EXPENSE', 'SUPPLIER_PAYMENT', 'REFUND', 'ADJUSTMENT', 'CLOSING');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "business_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "logo_url" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "currency_symbol" TEXT NOT NULL DEFAULT 'Rs',
    "tax_enabled" BOOLEAN NOT NULL DEFAULT false,
    "tax_rate" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "invoice_prefix" TEXT NOT NULL DEFAULT 'INV',
    "purchase_prefix" TEXT NOT NULL DEFAULT 'PUR',
    "receipt_footer" TEXT,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
    "allow_negative_stock" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "platform_role" "PlatformRole" NOT NULL DEFAULT 'USER',
    "store_role" "StoreRole",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "base_unit_id" TEXT,
    "conversion_factor" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "barcode" TEXT,
    "category_id" TEXT,
    "brand" TEXT,
    "unit_id" TEXT,
    "purchase_price" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "sale_price" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "avg_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "minimum_stock" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "current_stock" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "description" TEXT,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "balance_after" DECIMAL(18,4) NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "opening_balance" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "current_balance" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "opening_balance" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "current_balance" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "invoice_number" TEXT NOT NULL,
    "purchase_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "remaining_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "payment_method" "PaymentMethod",
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" TEXT NOT NULL,
    "purchase_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(18,4) NOT NULL,
    "returned_qty" DECIMAL(18,4) NOT NULL DEFAULT 0,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_returns" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "purchase_id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "return_number" TEXT NOT NULL,
    "return_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_return_items" (
    "id" TEXT NOT NULL,
    "purchase_return_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "line_total" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "purchase_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "invoice_number" TEXT NOT NULL,
    "sale_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "remaining_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "change_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
    "total_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "profit_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "cashier_id" TEXT,
    "notes" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "unit_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(18,4) NOT NULL,
    "line_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "line_profit" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "returned_qty" DECIMAL(18,4) NOT NULL DEFAULT 0,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_returns" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "return_number" TEXT NOT NULL,
    "return_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "refund_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_return_items" (
    "id" TEXT NOT NULL,
    "sale_return_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "unit_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "sale_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "held_sales" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "reference_name" TEXT,
    "discount_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "held_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "held_sale_items" (
    "id" TEXT NOT NULL,
    "held_sale_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "discount" DECIMAL(18,4) NOT NULL DEFAULT 0,

    CONSTRAINT "held_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "category_id" TEXT,
    "amount" DECIMAL(18,4) NOT NULL,
    "expense_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "description" TEXT,
    "is_voided" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "party_type" "AccountPartyType" NOT NULL,
    "party_id" TEXT NOT NULL,
    "type" "AccountTxnType" NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "balance_after" DECIMAL(18,4) NOT NULL,
    "payment_method" "PaymentMethod",
    "reference_type" TEXT,
    "reference_id" TEXT,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "session_date" DATE NOT NULL,
    "opening_cash" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "cash_in" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "cash_out" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "expected_cash" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "actual_cash" DECIMAL(18,4),
    "difference" DECIMAL(18,4),
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "closed_at" TIMESTAMP(3),
    "closed_by" TEXT,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cash_session_id" TEXT,
    "type" "CashTxnType" NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "direction" TEXT NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_sequences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "doc_type" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "next_number" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_hash_idx" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "categories_tenant_id_is_active_idx" ON "categories"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "categories_tenant_id_name_key" ON "categories"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "units_tenant_id_idx" ON "units"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "units_tenant_id_name_key" ON "units"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "products_tenant_id_name_idx" ON "products"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "products_tenant_id_is_active_idx" ON "products"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "products_tenant_id_category_id_idx" ON "products"("tenant_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_sku_key" ON "products"("tenant_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_barcode_key" ON "products"("tenant_id", "barcode");

-- CreateIndex
CREATE INDEX "stock_movements_tenant_id_product_id_created_at_idx" ON "stock_movements"("tenant_id", "product_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_movements_tenant_id_type_created_at_idx" ON "stock_movements"("tenant_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "stock_movements_tenant_id_reference_type_reference_id_idx" ON "stock_movements"("tenant_id", "reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "suppliers_tenant_id_name_idx" ON "suppliers"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "suppliers_tenant_id_is_active_idx" ON "suppliers"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "customers_tenant_id_name_idx" ON "customers"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "customers_tenant_id_phone_idx" ON "customers"("tenant_id", "phone");

-- CreateIndex
CREATE INDEX "customers_tenant_id_is_active_idx" ON "customers"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "purchases_tenant_id_purchase_date_idx" ON "purchases"("tenant_id", "purchase_date");

-- CreateIndex
CREATE INDEX "purchases_tenant_id_status_idx" ON "purchases"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "purchases_tenant_id_supplier_id_idx" ON "purchases"("tenant_id", "supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_tenant_id_invoice_number_key" ON "purchases"("tenant_id", "invoice_number");

-- CreateIndex
CREATE INDEX "purchase_items_purchase_id_idx" ON "purchase_items"("purchase_id");

-- CreateIndex
CREATE INDEX "purchase_items_product_id_idx" ON "purchase_items"("product_id");

-- CreateIndex
CREATE INDEX "purchase_returns_tenant_id_return_date_idx" ON "purchase_returns"("tenant_id", "return_date");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_returns_tenant_id_return_number_key" ON "purchase_returns"("tenant_id", "return_number");

-- CreateIndex
CREATE INDEX "purchase_return_items_purchase_return_id_idx" ON "purchase_return_items"("purchase_return_id");

-- CreateIndex
CREATE INDEX "sales_tenant_id_sale_date_idx" ON "sales"("tenant_id", "sale_date");

-- CreateIndex
CREATE INDEX "sales_tenant_id_status_idx" ON "sales"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sales_tenant_id_customer_id_idx" ON "sales"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "sales_tenant_id_cashier_id_idx" ON "sales"("tenant_id", "cashier_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_tenant_id_invoice_number_key" ON "sales"("tenant_id", "invoice_number");

-- CreateIndex
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items"("sale_id");

-- CreateIndex
CREATE INDEX "sale_items_product_id_idx" ON "sale_items"("product_id");

-- CreateIndex
CREATE INDEX "sale_returns_tenant_id_return_date_idx" ON "sale_returns"("tenant_id", "return_date");

-- CreateIndex
CREATE UNIQUE INDEX "sale_returns_tenant_id_return_number_key" ON "sale_returns"("tenant_id", "return_number");

-- CreateIndex
CREATE INDEX "sale_return_items_sale_return_id_idx" ON "sale_return_items"("sale_return_id");

-- CreateIndex
CREATE INDEX "held_sales_tenant_id_created_at_idx" ON "held_sales"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "held_sale_items_held_sale_id_idx" ON "held_sale_items"("held_sale_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_tenant_id_name_key" ON "expense_categories"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "expenses_tenant_id_expense_date_idx" ON "expenses"("tenant_id", "expense_date");

-- CreateIndex
CREATE INDEX "expenses_tenant_id_category_id_idx" ON "expenses"("tenant_id", "category_id");

-- CreateIndex
CREATE INDEX "account_transactions_tenant_id_party_type_party_id_created__idx" ON "account_transactions"("tenant_id", "party_type", "party_id", "created_at");

-- CreateIndex
CREATE INDEX "account_transactions_tenant_id_type_created_at_idx" ON "account_transactions"("tenant_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "cash_sessions_tenant_id_session_date_idx" ON "cash_sessions"("tenant_id", "session_date");

-- CreateIndex
CREATE UNIQUE INDEX "cash_sessions_tenant_id_session_date_key" ON "cash_sessions"("tenant_id", "session_date");

-- CreateIndex
CREATE INDEX "cash_transactions_tenant_id_created_at_idx" ON "cash_transactions"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "cash_transactions_cash_session_id_idx" ON "cash_transactions"("cash_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_sequences_tenant_id_doc_type_key" ON "document_sequences"("tenant_id", "doc_type");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_base_unit_id_fkey" FOREIGN KEY ("base_unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_purchase_return_id_fkey" FOREIGN KEY ("purchase_return_id") REFERENCES "purchase_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_sale_return_id_fkey" FOREIGN KEY ("sale_return_id") REFERENCES "sale_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "held_sales" ADD CONSTRAINT "held_sales_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "held_sales" ADD CONSTRAINT "held_sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "held_sale_items" ADD CONSTRAINT "held_sale_items_held_sale_id_fkey" FOREIGN KEY ("held_sale_id") REFERENCES "held_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "held_sale_items" ADD CONSTRAINT "held_sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transactions" ADD CONSTRAINT "account_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_cash_session_id_fkey" FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
