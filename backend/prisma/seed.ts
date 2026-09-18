import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_ENABLED_MODULES, toPrismaJson } from '../src/constants/modules';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password123!';
const SUPER_ADMIN_EMAIL = 'admin@storeledger.com';
const SUPER_ADMIN_PASSWORD = 'Admin123!';

const DEMO_EMAILS = [
  'owner@demokiryana.com',
  'manager@demokiryana.com',
  'cashier@demokiryana.com',
];

async function wipeTenant(tenantId: string) {
  await prisma.cashTransaction.deleteMany({ where: { tenantId } });
  await prisma.cashSession.deleteMany({ where: { tenantId } });
  await prisma.accountTransaction.deleteMany({ where: { tenantId } });
  await prisma.saleReturnItem.deleteMany({ where: { saleReturn: { tenantId } } });
  await prisma.saleReturn.deleteMany({ where: { tenantId } });
  await prisma.saleItem.deleteMany({ where: { sale: { tenantId } } });
  await prisma.sale.deleteMany({ where: { tenantId } });
  await prisma.heldSaleItem.deleteMany({ where: { heldSale: { tenantId } } });
  await prisma.heldSale.deleteMany({ where: { tenantId } });
  await prisma.purchaseReturnItem.deleteMany({ where: { purchaseReturn: { tenantId } } });
  await prisma.purchaseReturn.deleteMany({ where: { tenantId } });
  await prisma.purchaseItem.deleteMany({ where: { purchase: { tenantId } } });
  await prisma.purchase.deleteMany({ where: { tenantId } });
  await prisma.expense.deleteMany({ where: { tenantId } });
  await prisma.expenseCategory.deleteMany({ where: { tenantId } });
  await prisma.stockMovement.deleteMany({ where: { tenantId } });
  await prisma.product.deleteMany({ where: { tenantId } });
  await prisma.brand.deleteMany({ where: { tenantId } });
  await prisma.category.deleteMany({ where: { tenantId } });
  await prisma.unit.deleteMany({ where: { tenantId } });
  await prisma.customer.deleteMany({ where: { tenantId } });
  await prisma.supplier.deleteMany({ where: { tenantId } });
  await prisma.documentSequence.deleteMany({ where: { tenantId } });
  await prisma.passwordResetToken.deleteMany({ where: { tenantId } });
  await prisma.refreshToken.deleteMany({ where: { user: { tenantId } } });
  await prisma.user.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
}

async function ensureSuperAdmin(passwordHash: string) {
  await prisma.refreshToken.deleteMany({ where: { user: { email: SUPER_ADMIN_EMAIL } } });
  await prisma.passwordResetToken.deleteMany({ where: { user: { email: SUPER_ADMIN_EMAIL } } });
  await prisma.user.deleteMany({ where: { email: SUPER_ADMIN_EMAIL } });

  await prisma.user.create({
    data: {
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      fullName: 'Platform Admin',
      platformRole: 'PLATFORM_ADMIN',
      tenantId: null,
      storeRole: null,
    },
  });
}

async function main() {
  console.log('Seeding General Store SaaS demo client...');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const superAdminHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);
  await ensureSuperAdmin(superAdminHash);

  await prisma.refreshToken.deleteMany({ where: { user: { email: { in: DEMO_EMAILS } } } });
  await prisma.passwordResetToken.deleteMany({ where: { user: { email: { in: DEMO_EMAILS } } } });

  const existingUsers = await prisma.user.findMany({
    where: { email: { in: DEMO_EMAILS } },
    select: { tenantId: true },
  });
  const tenantIds: string[] = Array.from(
    new Set(
      existingUsers
        .map((u: { tenantId: string | null }) => u.tenantId)
        .filter((id: string | null): id is string => typeof id === 'string' && id.length > 0)
    )
  );

  for (const tenantId of tenantIds) {
    await wipeTenant(tenantId);
  }
  await prisma.user.deleteMany({ where: { email: { in: DEMO_EMAILS } } });

  // Also wipe any leftover tenant named like the demo client
  const leftover = await prisma.tenant.findMany({
    where: { OR: [{ name: 'Demo Kiryana Store' }, { businessName: 'Mehssi General Store' }] },
  });
  for (const t of leftover) {
    await wipeTenant(t.id);
  }

  // Dummy SaaS client / tenant (like restaurant demo client)
  const tenantData = {
    name: 'Demo Kiryana Store',
    businessName: 'Mehssi General Store',
    phone: '+92-300-1234567',
    email: 'owner@demokiryana.com',
    address: 'Shop 12, Main Bazaar, Lahore',
    currency: 'PKR',
    currencySymbol: 'Rs',
    taxEnabled: false,
    taxRate: 0,
    onboardingComplete: true,
    invoicePrefix: 'INV',
    purchasePrefix: 'PUR',
    receiptFooter: 'Thank you for shopping with us!',
    lowStockThreshold: 5,
    allowNegativeStock: false,
    isActive: true,
    enabledModules: toPrismaJson(DEFAULT_ENABLED_MODULES),
  };
  const tenant = await prisma.tenant.create({ data: tenantData });

  const [owner, manager, cashier] = await Promise.all([
    prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'owner@demokiryana.com',
        passwordHash,
        fullName: 'Demo Owner',
        phone: '+92-300-1111111',
        storeRole: 'OWNER',
      },
    }),
    prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'manager@demokiryana.com',
        passwordHash,
        fullName: 'Demo Manager',
        phone: '+92-300-2222222',
        storeRole: 'MANAGER',
      },
    }),
    prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'cashier@demokiryana.com',
        passwordHash,
        fullName: 'Demo Cashier',
        phone: '+92-300-3333333',
        storeRole: 'CASHIER',
      },
    }),
  ]);

  const unitDefs: Array<{ name: string; abbreviation: string }> = [
    { name: 'Piece', abbreviation: 'pc' },
    { name: 'Pack', abbreviation: 'pack' },
    { name: 'Box', abbreviation: 'box' },
    { name: 'Bottle', abbreviation: 'btl' },
    { name: 'Carton', abbreviation: 'ctn' },
    { name: 'Kg', abbreviation: 'kg' },
    { name: 'Gram', abbreviation: 'g' },
    { name: 'Liter', abbreviation: 'L' },
    { name: 'Dozen', abbreviation: 'doz' },
  ];

  const units = await Promise.all(
    unitDefs.map((u: { name: string; abbreviation: string }) =>
      prisma.unit.create({ data: { tenantId: tenant.id, ...u } })
    )
  );

  const unit = (abbr: string) => {
    const found = units.find((u: { id: string; abbreviation: string }) => u.abbreviation === abbr);
    if (!found) throw new Error(`Unit ${abbr} missing`);
    return found.id;
  };

  const categoryDefs = [
    { name: 'Grocery', description: 'Daily grocery staples' },
    { name: 'Beverages', description: 'Soft drinks and juices' },
    { name: 'Dairy', description: 'Milk and dairy products' },
    { name: 'Snacks', description: 'Chips, namkeen, and snacks' },
    { name: 'Biscuits', description: 'Biscuits and cookies' },
    { name: 'Cleaning', description: 'Home cleaning supplies' },
    { name: 'Personal Care', description: 'Soap, shampoo, hygiene' },
    { name: 'Frozen', description: 'Frozen and cold items' },
    { name: 'Spices', description: 'Masala and spices' },
  ];

  const categories = await Promise.all(
    categoryDefs.map((c) => prisma.category.create({ data: { tenantId: tenant.id, ...c } }))
  );

  const cat = (name: string) => {
    const found = categories.find((c) => c.name === name);
    if (!found) throw new Error(`Category ${name} missing`);
    return found.id;
  };

  type SeedProduct = {
    name: string;
    sku: string;
    barcode: string;
    category: string;
    unit: string;
    purchasePrice: number;
    salePrice: number;
    stock: number;
    min: number;
    brand: string | null;
    flavor: string | null;
    size: string | null;
  };

  const productsData: SeedProduct[] = [
    // Grocery
    { name: 'Sugar', sku: 'GR-SUG-01', barcode: '8901001001001', category: 'Grocery', unit: 'kg', purchasePrice: 140, salePrice: 160, stock: 50, min: 10, brand: 'Local', flavor: null, size: '1kg' },
    { name: 'Rice Basmati', sku: 'GR-RIC-01', barcode: '8901001001002', category: 'Grocery', unit: 'kg', purchasePrice: 220, salePrice: 260, stock: 40, min: 8, brand: 'Super Kernel', flavor: null, size: '1kg' },
    { name: 'Cooking Oil', sku: 'GR-OIL-01', barcode: '8901001001003', category: 'Grocery', unit: 'L', purchasePrice: 520, salePrice: 580, stock: 25, min: 5, brand: 'Dalda', flavor: null, size: '1L' },
    { name: 'Flour (Atta)', sku: 'GR-ATT-01', barcode: '8901001001004', category: 'Grocery', unit: 'pack', purchasePrice: 1100, salePrice: 1250, stock: 18, min: 4, brand: 'Sunny', flavor: null, size: '10kg' },
    { name: 'Red Beans', sku: 'GR-BEAN-01', barcode: '8901001001005', category: 'Grocery', unit: 'kg', purchasePrice: 280, salePrice: 320, stock: 20, min: 5, brand: null, flavor: null, size: '1kg' },
    // Dairy
    { name: 'Olpers Full Cream', sku: 'DY-MLK-01', barcode: '8901001002001', category: 'Dairy', unit: 'L', purchasePrice: 180, salePrice: 210, stock: 30, min: 12, brand: 'Olpers', flavor: 'Full Cream', size: '1L' },
    { name: 'Olpers Low Fat', sku: 'DY-MLK-02', barcode: '8901001002005', category: 'Dairy', unit: 'L', purchasePrice: 175, salePrice: 205, stock: 22, min: 10, brand: 'Olpers', flavor: 'Low Fat', size: '1L' },
    { name: 'Tea Whitener', sku: 'DY-TW-01', barcode: '8901001002002', category: 'Dairy', unit: 'pack', purchasePrice: 90, salePrice: 110, stock: 60, min: 15, brand: 'Everyday', flavor: null, size: '200g' },
    { name: 'Yogurt', sku: 'DY-YOG-01', barcode: '8901001002003', category: 'Dairy', unit: 'pc', purchasePrice: 70, salePrice: 90, stock: 24, min: 8, brand: 'Nestle', flavor: null, size: '400g' },
    { name: 'Butter', sku: 'DY-BUT-01', barcode: '8901001002004', category: 'Dairy', unit: 'pc', purchasePrice: 220, salePrice: 260, stock: 15, min: 5, brand: 'Nurpur', flavor: null, size: '200g' },
    // Beverages
    { name: 'Coca-Cola Regular', sku: 'BV-COL-01', barcode: '8901001003001', category: 'Beverages', unit: 'btl', purchasePrice: 140, salePrice: 170, stock: 36, min: 10, brand: 'Coca-Cola', flavor: 'Regular', size: '1.5L' },
    { name: 'Coca-Cola Zero', sku: 'BV-COL-02', barcode: '8901001003005', category: 'Beverages', unit: 'btl', purchasePrice: 70, salePrice: 90, stock: 40, min: 12, brand: 'Coca-Cola', flavor: 'Zero', size: '500ml' },
    { name: 'Mineral Water', sku: 'BV-WAT-01', barcode: '8901001003002', category: 'Beverages', unit: 'btl', purchasePrice: 50, salePrice: 70, stock: 48, min: 12, brand: 'Nestle', flavor: null, size: '1.5L' },
    { name: 'Mango Juice', sku: 'BV-JUI-01', barcode: '8901001003003', category: 'Beverages', unit: 'btl', purchasePrice: 160, salePrice: 190, stock: 20, min: 6, brand: 'Shezan', flavor: 'Mango', size: '1L' },
    { name: 'Energy Drink', sku: 'BV-ENR-01', barcode: '8901001003004', category: 'Beverages', unit: 'btl', purchasePrice: 100, salePrice: 130, stock: 28, min: 8, brand: 'Red Bull', flavor: null, size: '250ml' },
    // Snacks
    { name: "Lay's Classic Salted", sku: 'SN-CHP-01', barcode: '8901001004001', category: 'Snacks', unit: 'pack', purchasePrice: 40, salePrice: 50, stock: 80, min: 20, brand: "Lay's", flavor: 'Classic Salted', size: '50g' },
    { name: "Lay's BBQ", sku: 'SN-CHP-02', barcode: '8901001004004', category: 'Snacks', unit: 'pack', purchasePrice: 40, salePrice: 50, stock: 70, min: 20, brand: "Lay's", flavor: 'BBQ', size: '50g' },
    { name: "Lay's Classic", sku: 'SN-CHP-03', barcode: '8901001004005', category: 'Snacks', unit: 'pack', purchasePrice: 70, salePrice: 90, stock: 45, min: 12, brand: "Lay's", flavor: 'Classic', size: '100g' },
    { name: 'Namkeen Mix', sku: 'SN-NAM-01', barcode: '8901001004002', category: 'Snacks', unit: 'pack', purchasePrice: 55, salePrice: 70, stock: 35, min: 10, brand: 'Kurkure', flavor: 'Masala', size: '60g' },
    { name: 'Popcorn Pack', sku: 'SN-POP-01', barcode: '8901001004003', category: 'Snacks', unit: 'pack', purchasePrice: 30, salePrice: 45, stock: 40, min: 10, brand: null, flavor: null, size: '50g' },
    // Biscuits
    { name: 'Biscuits Pack', sku: 'BI-BIS-01', barcode: '8901001005001', category: 'Biscuits', unit: 'pack', purchasePrice: 55, salePrice: 70, stock: 45, min: 10, brand: 'Sooper', flavor: null, size: '3-pack' },
    { name: 'Chocolate Cookies', sku: 'BI-CKY-01', barcode: '8901001005002', category: 'Biscuits', unit: 'pack', purchasePrice: 80, salePrice: 100, stock: 30, min: 8, brand: 'Ore', flavor: 'Chocolate', size: '133g' },
    { name: 'Rusk Pack', sku: 'BI-RSK-01', barcode: '8901001005003', category: 'Biscuits', unit: 'pack', purchasePrice: 120, salePrice: 150, stock: 22, min: 6, brand: 'Bake Parlor', flavor: null, size: '300g' },
    // Cleaning
    { name: 'Dish Wash Liquid', sku: 'CL-DSH-01', barcode: '8901001006001', category: 'Cleaning', unit: 'btl', purchasePrice: 180, salePrice: 220, stock: 16, min: 4, brand: 'Vim', flavor: 'Lemon', size: '500ml' },
    { name: 'Laundry Soap', sku: 'CL-SOAP-01', barcode: '8901001006002', category: 'Cleaning', unit: 'pc', purchasePrice: 60, salePrice: 80, stock: 40, min: 10, brand: 'Surf Excel', flavor: null, size: '130g' },
    { name: 'Floor Cleaner', sku: 'CL-FLR-01', barcode: '8901001006003', category: 'Cleaning', unit: 'btl', purchasePrice: 220, salePrice: 270, stock: 12, min: 3, brand: 'Dettol', flavor: null, size: '1L' },
    // Personal Care
    { name: 'Hand Soap', sku: 'PC-SOAP-01', barcode: '8901001007001', category: 'Personal Care', unit: 'pc', purchasePrice: 70, salePrice: 95, stock: 30, min: 8, brand: 'Lifebuoy', flavor: null, size: '100g' },
    { name: 'Shampoo', sku: 'PC-SHP-01', barcode: '8901001007002', category: 'Personal Care', unit: 'btl', purchasePrice: 250, salePrice: 310, stock: 14, min: 4, brand: 'Head & Shoulders', flavor: null, size: '200ml' },
    { name: 'Toothpaste', sku: 'PC-TP-01', barcode: '8901001007003', category: 'Personal Care', unit: 'pc', purchasePrice: 140, salePrice: 180, stock: 20, min: 5, brand: 'Colgate', flavor: null, size: '100g' },
    // Frozen
    { name: 'Frozen Paratha', sku: 'FZ-PAR-01', barcode: '8901001008001', category: 'Frozen', unit: 'pack', purchasePrice: 280, salePrice: 340, stock: 10, min: 3, brand: 'K&Ns', flavor: null, size: '10pcs' },
    { name: 'Ice Cream Cup', sku: 'FZ-ICE-01', barcode: '8901001008002', category: 'Frozen', unit: 'pc', purchasePrice: 80, salePrice: 110, stock: 25, min: 8, brand: 'Walls', flavor: 'Vanilla', size: '100ml' },
    // Spices
    { name: 'Red Chilli Powder', sku: 'SP-CHI-01', barcode: '8901001009001', category: 'Spices', unit: 'pack', purchasePrice: 90, salePrice: 120, stock: 20, min: 5, brand: 'National', flavor: null, size: '100g' },
    { name: 'Turmeric Powder', sku: 'SP-HAL-01', barcode: '8901001009002', category: 'Spices', unit: 'pack', purchasePrice: 70, salePrice: 95, stock: 18, min: 5, brand: 'Shan', flavor: null, size: '100g' },
    { name: 'Garam Masala', sku: 'SP-GAR-01', barcode: '8901001009003', category: 'Spices', unit: 'pack', purchasePrice: 110, salePrice: 140, stock: 15, min: 4, brand: 'Shan', flavor: null, size: '50g' },
  ];

  const brandNames = Array.from(
    new Set(
      productsData
        .map((p) => p.brand)
        .filter((name): name is string => typeof name === 'string' && name.length > 0)
    )
  );

  const brands = await Promise.all(
    brandNames.map((name) =>
      prisma.brand.create({
        data: {
          tenantId: tenant.id,
          name,
          isActive: true,
          createdBy: owner.id,
          updatedBy: owner.id,
        },
      })
    )
  );

  const brandIdByName = new Map(brands.map((b) => [b.name, b.id]));

  for (const p of productsData) {
    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        categoryId: cat(p.category),
        unitId: unit(p.unit),
        brandId: p.brand ? brandIdByName.get(p.brand) ?? null : null,
        flavor: p.flavor,
        size: p.size,
        purchasePrice: p.purchasePrice,
        salePrice: p.salePrice,
        avgCost: p.purchasePrice,
        currentStock: p.stock,
        minimumStock: p.min,
        isActive: true,
        createdBy: owner.id,
        updatedBy: owner.id,
      },
    });

    await prisma.stockMovement.create({
      data: {
        tenantId: tenant.id,
        productId: product.id,
        type: 'OPENING',
        quantity: p.stock,
        unitCost: p.purchasePrice,
        balanceAfter: p.stock,
        reason: 'Seed opening stock',
        createdBy: owner.id,
      },
    });
  }

  await prisma.customer.createMany({
    data: [
      {
        tenantId: tenant.id,
        name: 'Walk-in Customer',
        openingBalance: 0,
        currentBalance: 0,
        createdBy: owner.id,
      },
      {
        tenantId: tenant.id,
        name: 'Ahmed Khan',
        phone: '+92-301-5551111',
        address: 'Gulberg, Lahore',
        openingBalance: 500,
        currentBalance: 500,
        createdBy: owner.id,
      },
      {
        tenantId: tenant.id,
        name: 'Fatima Bibi',
        phone: '+92-302-5552222',
        openingBalance: 0,
        currentBalance: 0,
        createdBy: owner.id,
      },
      {
        tenantId: tenant.id,
        name: 'Usman Ali',
        phone: '+92-303-5553333',
        openingBalance: 1500,
        currentBalance: 1500,
        createdBy: owner.id,
      },
    ],
  });

  await prisma.supplier.createMany({
    data: [
      {
        tenantId: tenant.id,
        name: 'Al-Noor Distributors',
        phone: '+92-42-1112222',
        address: 'Wholesale Market, Lahore',
        openingBalance: 0,
        currentBalance: 0,
        createdBy: owner.id,
      },
      {
        tenantId: tenant.id,
        name: 'City Wholesale',
        phone: '+92-42-3334444',
        openingBalance: 2000,
        currentBalance: 2000,
        createdBy: owner.id,
      },
      {
        tenantId: tenant.id,
        name: 'ABC Traders',
        phone: '+92-42-5556666',
        openingBalance: 5000,
        currentBalance: 5000,
        createdBy: owner.id,
      },
    ],
  });

  await prisma.expenseCategory.createMany({
    data: ['Rent', 'Electricity', 'Salary', 'Transport', 'Internet', 'Maintenance', 'Other'].map(
      (name) => ({ tenantId: tenant.id, name })
    ),
  });

  await prisma.documentSequence.createMany({
    data: [
      { tenantId: tenant.id, docType: 'INVOICE', prefix: 'INV', nextNumber: 1 },
      { tenantId: tenant.id, docType: 'PURCHASE', prefix: 'PUR', nextNumber: 1 },
      { tenantId: tenant.id, docType: 'PURCHASE_RETURN', prefix: 'PRT', nextNumber: 1 },
      { tenantId: tenant.id, docType: 'SALE_RETURN', prefix: 'SRT', nextNumber: 1 },
    ],
  });

  // Opening cash session for today
  const today = new Date();
  const sessionDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  await prisma.cashSession.create({
    data: {
      tenantId: tenant.id,
      sessionDate,
      openingCash: 5000,
      cashIn: 0,
      cashOut: 0,
      expectedCash: 5000,
      createdBy: owner.id,
    },
  });

  console.log('\nSeed complete.');
  console.log('────────────────────────────────────');
  console.log('Dummy client / tenant:');
  console.log(`  Name:     ${tenant.name}`);
  console.log(`  Business: ${tenant.businessName}`);
  console.log(`  Id:       ${tenant.id}`);
  console.log('────────────────────────────────────');
  console.log(`Categories: ${categories.length}`);
  console.log(`Brands:     ${brands.length}`);
  console.log(`Products:   ${productsData.length}`);
  console.log(`Units:      ${units.length}`);
  console.log('────────────────────────────────────');
  console.log(`Users (password: ${DEMO_PASSWORD}):`);
  console.log(`  OWNER   ${owner.email}`);
  console.log(`  MANAGER ${manager.email}`);
  console.log(`  CASHIER ${cashier.email}`);
  console.log('────────────────────────────────────');
  console.log('Platform admin (super admin):');
  console.log(`  Email:    ${SUPER_ADMIN_EMAIL}`);
  console.log(`  Password: ${SUPER_ADMIN_PASSWORD}`);
  console.log('  Login at /login → opens /admin/tenants');
  console.log('────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
