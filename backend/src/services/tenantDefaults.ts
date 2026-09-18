import type { Prisma } from '@prisma/client';

type TxClient = Prisma.TransactionClient;

const DEFAULT_UNITS = [
  { name: 'Piece', abbreviation: 'pc', conversionFactor: 1 },
  { name: 'Kilogram', abbreviation: 'kg', conversionFactor: 1 },
  { name: 'Gram', abbreviation: 'g', conversionFactor: 0.001 },
  { name: 'Liter', abbreviation: 'L', conversionFactor: 1 },
  { name: 'Milliliter', abbreviation: 'ml', conversionFactor: 0.001 },
  { name: 'Packet', abbreviation: 'pkt', conversionFactor: 1 },
  { name: 'Dozen', abbreviation: 'dz', conversionFactor: 12 },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  'Rent',
  'Utilities',
  'Salaries',
  'Transport',
  'Miscellaneous',
];

export async function seedTenantDefaults(
  tx: TxClient,
  tenantId: string,
  prefixes?: { invoicePrefix?: string; purchasePrefix?: string }
) {
  await tx.unit.createMany({
    data: DEFAULT_UNITS.map((u) => ({
      tenantId,
      name: u.name,
      abbreviation: u.abbreviation,
      conversionFactor: u.conversionFactor,
    })),
    skipDuplicates: true,
  });

  await tx.expenseCategory.createMany({
    data: DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ tenantId, name })),
    skipDuplicates: true,
  });

  await tx.documentSequence.createMany({
    data: [
      {
        tenantId,
        docType: 'INVOICE',
        prefix: prefixes?.invoicePrefix ?? 'INV',
        nextNumber: 1,
      },
      {
        tenantId,
        docType: 'PURCHASE',
        prefix: prefixes?.purchasePrefix ?? 'PUR',
        nextNumber: 1,
      },
      {
        tenantId,
        docType: 'PURCHASE_RETURN',
        prefix: 'PRT',
        nextNumber: 1,
      },
      {
        tenantId,
        docType: 'SALE_RETURN',
        prefix: 'SRT',
        nextNumber: 1,
      },
    ],
    skipDuplicates: true,
  });
}
