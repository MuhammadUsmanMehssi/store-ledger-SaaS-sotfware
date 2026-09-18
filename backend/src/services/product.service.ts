import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '../config/prisma';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { toNumber } from '../utils/money';
import { applyStockChange } from './stock.service';
import type {
  ProductCreateInput,
  ProductUpdateInput,
  ProductVariantsCreateInput,
} from '../validators/product.validators';

type ProductRecord = {
  id: string;
  tenantId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  categoryId: string | null;
  brandId: string | null;
  flavor: string | null;
  size: string | null;
  unitId: string | null;
  purchasePrice: unknown;
  salePrice: unknown;
  avgCost: unknown;
  minimumStock: unknown;
  currentStock: unknown;
  description: string | null;
  imageUrl: string | null;
  variantGroupId?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  category?: { id: string; name: string } | null;
  brand?: { id: string; name: string } | null;
  unit?: { id: string; name: string; abbreviation: string } | null;
};

function serializeProduct(product: ProductRecord) {
  return {
    id: product.id,
    tenantId: product.tenantId,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    categoryId: product.categoryId,
    brandId: product.brandId,
    brand: product.brand?.name ?? null,
    brandRef: product.brand ?? null,
    flavor: product.flavor,
    size: product.size,
    unitId: product.unitId,
    purchasePrice: toNumber(product.purchasePrice as string),
    salePrice: toNumber(product.salePrice as string),
    avgCost: toNumber(product.avgCost as string),
    minimumStock: toNumber(product.minimumStock as string),
    currentStock: toNumber(product.currentStock as string),
    description: product.description,
    imageUrl: product.imageUrl,
    variantGroupId: (product as ProductRecord & { variantGroupId?: string | null }).variantGroupId ?? null,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    deletedAt: product.deletedAt,
    category: product.category ?? undefined,
    unit: product.unit ?? undefined,
  };
}

const productInclude = {
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
  unit: { select: { id: true, name: true, abbreviation: true } },
} as const;

async function assertBrand(tenantId: string, brandId: string | null | undefined) {
  if (!brandId) return;
  const brand = await prisma.brand.findFirst({ where: { id: brandId, tenantId, isActive: true } });
  if (!brand) throw new BadRequestError('Brand not found');
}

export async function listProducts(
  tenantId: string,
  query: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    brandId?: string;
    isActive?: boolean;
    lowStock?: boolean;
  }
) {
  const { page, limit, search, skip, take } = parsePagination(query);

  const where: Prisma.ProductWhereInput = {
    tenantId,
    deletedAt: null,
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.brandId ? { brandId: query.brandId } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } },
            { flavor: { contains: search, mode: 'insensitive' } },
            { size: { contains: search, mode: 'insensitive' } },
            { brand: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  let items: ProductRecord[];
  let total: number;

  if (query.lowStock) {
    const all = await prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: [{ category: { name: 'asc' } }, { brand: { name: 'asc' } }, { name: 'asc' }],
    });
    const low = all.filter((p) => toNumber(p.currentStock) <= toNumber(p.minimumStock));
    total = low.length;
    items = low.slice(skip, skip + take);
  } else {
    [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: [{ category: { name: 'asc' } }, { brand: { name: 'asc' } }, { name: 'asc' }],
        skip,
        take,
      }),
    ]);
  }

  return {
    items: items.map(serializeProduct),
    pagination: buildPaginationMeta(page, limit, total),
  };
}

export async function getProduct(tenantId: string, id: string) {
  const product = await prisma.product.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: productInclude,
  });
  if (!product) throw new NotFoundError('Product not found');
  return serializeProduct(product);
}

export async function getByBarcode(tenantId: string, barcode: string) {
  const product = await prisma.product.findFirst({
    where: { tenantId, barcode, deletedAt: null },
    include: productInclude,
  });
  if (!product) throw new NotFoundError('Product not found for barcode');
  return serializeProduct(product);
}

type AfterPersistHook = () => Promise<void>;

export async function createProduct(
  tenantId: string,
  userId: string,
  input: ProductCreateInput,
  afterPersist?: AfterPersistHook
) {
  if (input.categoryId) {
    const cat = await prisma.category.findFirst({ where: { id: input.categoryId, tenantId } });
    if (!cat) throw new BadRequestError('Category not found');
  }
  if (input.unitId) {
    const unit = await prisma.unit.findFirst({ where: { id: input.unitId, tenantId } });
    if (!unit) throw new BadRequestError('Unit not found');
  }
  await assertBrand(tenantId, input.brandId);

  const openingStock = input.currentStock ?? 0;
  const purchasePrice = input.purchasePrice ?? 0;

  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          tenantId,
          name: input.name,
          sku: input.sku || null,
          barcode: input.barcode || null,
          categoryId: input.categoryId || null,
          brandId: input.brandId || null,
          flavor: input.flavor || null,
          size: input.size || null,
          unitId: input.unitId || null,
          purchasePrice,
          salePrice: input.salePrice,
          avgCost: purchasePrice,
          minimumStock: input.minimumStock ?? 0,
          currentStock: 0,
          description: input.description || null,
          imageUrl: input.imageUrl || null,
          isActive: input.isActive ?? true,
          createdBy: userId,
          updatedBy: userId,
        },
        include: productInclude,
      });

      if (openingStock > 0) {
        await applyStockChange(tx, {
          tenantId,
          productId: created.id,
          quantityDelta: openingStock,
          type: 'OPENING',
          unitCost: purchasePrice,
          reason: 'Opening stock',
          createdBy: userId,
        });
      }

      if (afterPersist) {
        await afterPersist();
      }

      return tx.product.findUniqueOrThrow({
        where: { id: created.id },
        include: productInclude,
      });
    });

    return serializeProduct(product);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') {
      throw new ConflictError('SKU or barcode already exists for this store');
    }
    throw err;
  }
}

export async function updateProduct(
  tenantId: string,
  userId: string,
  id: string,
  input: ProductUpdateInput,
  afterPersist?: AfterPersistHook
) {
  await getProduct(tenantId, id);

  if (input.categoryId) {
    const cat = await prisma.category.findFirst({ where: { id: input.categoryId, tenantId } });
    if (!cat) throw new BadRequestError('Category not found');
  }
  if (input.unitId) {
    const unit = await prisma.unit.findFirst({ where: { id: input.unitId, tenantId } });
    if (!unit) throw new BadRequestError('Unit not found');
  }
  if (input.brandId !== undefined) await assertBrand(tenantId, input.brandId);

  const { currentStock: _ignore, ...data } = input;

  try {
    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          sku: data.sku === undefined ? undefined : data.sku || null,
          barcode: data.barcode === undefined ? undefined : data.barcode || null,
          categoryId: data.categoryId === undefined ? undefined : data.categoryId,
          brandId: data.brandId === undefined ? undefined : data.brandId,
          flavor: data.flavor === undefined ? undefined : data.flavor || null,
          size: data.size === undefined ? undefined : data.size || null,
          unitId: data.unitId === undefined ? undefined : data.unitId,
          purchasePrice: data.purchasePrice,
          salePrice: data.salePrice,
          minimumStock: data.minimumStock,
          description: data.description === undefined ? undefined : data.description,
          imageUrl: data.imageUrl === undefined ? undefined : data.imageUrl,
          isActive: data.isActive,
          updatedBy: userId,
        },
        include: productInclude,
      });

      if (afterPersist) {
        await afterPersist();
      }

      return updated;
    });
    return serializeProduct(product);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') {
      throw new ConflictError('SKU or barcode already exists for this store');
    }
    throw err;
  }
}

export async function setProductImage(
  tenantId: string,
  userId: string,
  id: string,
  imageUrl: string,
  afterPersist?: AfterPersistHook
) {
  const existing = await getProduct(tenantId, id);
  const product = await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id },
      data: { imageUrl, updatedBy: userId },
      include: productInclude,
    });
    if (existing.variantGroupId) {
      await tx.product.updateMany({
        where: {
          tenantId,
          variantGroupId: existing.variantGroupId,
          deletedAt: null,
          NOT: { id },
        },
        data: { imageUrl, updatedBy: userId },
      });
    }
    if (afterPersist) {
      await afterPersist();
    }
    return updated;
  });
  return serializeProduct(product);
}

export async function deleteProduct(tenantId: string, userId: string, id: string) {
  await getProduct(tenantId, id);
  const existing = await prisma.product.findFirstOrThrow({ where: { id, tenantId } });
  const suffix = `_del_${Date.now()}`;
  const product = await prisma.product.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
      updatedBy: userId,
      sku: existing.sku ? `${existing.sku}${suffix}` : null,
      barcode: existing.barcode ? `${existing.barcode}${suffix}` : null,
    },
    include: productInclude,
  });
  return serializeProduct(product);
}

function slugSkuFromName(name: string) {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[''`´]/g, '')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return base || 'PROD';
}

function barcodePrefixFromName(name: string) {
  const first =
    name
      .trim()
      .toUpperCase()
      .replace(/[''`´]/g, '')
      .replace(/[^A-Z0-9]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean)[0] || 'PROD';
  return first.slice(0, 8);
}

function randomDigits(length: number) {
  let digits = '';
  for (let i = 0; i < length; i += 1) {
    digits += Math.floor(Math.random() * 10).toString();
  }
  return digits;
}

async function isSkuTaken(tenantId: string, sku: string, excludeProductId?: string) {
  const found = await prisma.product.findFirst({
    where: {
      tenantId,
      sku,
      deletedAt: null,
      ...(excludeProductId ? { NOT: { id: excludeProductId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(found);
}

async function isBarcodeTaken(tenantId: string, barcode: string, excludeProductId?: string) {
  const found = await prisma.product.findFirst({
    where: {
      tenantId,
      barcode,
      deletedAt: null,
      ...(excludeProductId ? { NOT: { id: excludeProductId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(found);
}

async function nextSkuForName(
  tenantId: string,
  name: string,
  excludeProductId?: string,
  reserved: Set<string> = new Set()
) {
  const prefix = slugSkuFromName(name);
  const existing = await prisma.product.findMany({
    where: {
      tenantId,
      deletedAt: null,
      sku: { startsWith: `${prefix}-` },
      ...(excludeProductId ? { NOT: { id: excludeProductId } } : {}),
    },
    select: { sku: true },
  });

  let max = 0;
  for (const row of existing) {
    const match = row.sku?.match(/-(\d+)$/);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  for (const sku of reserved) {
    if (!sku.startsWith(`${prefix}-`)) continue;
    const match = sku.match(/-(\d+)$/);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }

  let n = max + 1;
  let candidate = `${prefix}-${String(n).padStart(3, '0')}`;
  while (reserved.has(candidate) || (await isSkuTaken(tenantId, candidate, excludeProductId))) {
    n += 1;
    candidate = `${prefix}-${String(n).padStart(3, '0')}`;
    if (n > 99999) {
      candidate = `${prefix}-${Date.now().toString(36).toUpperCase()}`;
      break;
    }
  }
  reserved.add(candidate);
  return candidate;
}

async function nextBarcodeForName(
  tenantId: string,
  name: string,
  excludeProductId?: string,
  reserved: Set<string> = new Set()
) {
  const prefix = barcodePrefixFromName(name);
  let attempts = 0;
  let candidate = `${prefix}-${randomDigits(8)}`;
  while (
    reserved.has(candidate) ||
    (await isBarcodeTaken(tenantId, candidate, excludeProductId))
  ) {
    candidate = `${prefix}-${randomDigits(8)}`;
    attempts += 1;
    if (attempts > 50) {
      candidate = `${prefix}-${Date.now().toString().slice(-8)}`;
      if (
        !reserved.has(candidate) &&
        !(await isBarcodeTaken(tenantId, candidate, excludeProductId))
      ) {
        break;
      }
    }
  }
  reserved.add(candidate);
  return candidate;
}

function codeSourceName(name: string, flavor?: string | null, size?: string | null) {
  return [name, flavor, size].filter((p) => p && String(p).trim()).join(' ');
}

export async function generateProductCodes(
  tenantId: string,
  input: {
    name: string;
    flavor?: string | null;
    size?: string | null;
    fields: 'sku' | 'barcode' | 'both';
    excludeProductId?: string;
  }
) {
  const result: { sku?: string; barcode?: string } = {};
  const source = codeSourceName(input.name, input.flavor, input.size);

  if (input.fields === 'sku' || input.fields === 'both') {
    result.sku = await nextSkuForName(tenantId, source, input.excludeProductId);
  }

  if (input.fields === 'barcode' || input.fields === 'both') {
    result.barcode = await nextBarcodeForName(tenantId, source, input.excludeProductId);
  }

  return result;
}

export async function createProductVariants(
  tenantId: string,
  userId: string,
  input: ProductVariantsCreateInput,
  afterPersist?: AfterPersistHook
) {
  if (input.categoryId) {
    const cat = await prisma.category.findFirst({ where: { id: input.categoryId, tenantId } });
    if (!cat) throw new BadRequestError('Category not found');
  }
  if (input.unitId) {
    const unit = await prisma.unit.findFirst({ where: { id: input.unitId, tenantId } });
    if (!unit) throw new BadRequestError('Unit not found');
  }
  await assertBrand(tenantId, input.brandId);

  const sizes = input.variants.map((v) => v.size.trim().toLowerCase());
  if (new Set(sizes).size !== sizes.length) {
    throw new BadRequestError('Each size must be unique in this product');
  }

  const variantGroupId = randomUUID();
  const reservedSkus = new Set<string>();
  const reservedBarcodes = new Set<string>();

  // Pre-resolve codes outside long transaction loops where possible
  const resolved: Array<{
    size: string;
    sku: string;
    barcode: string;
    purchasePrice: number;
    salePrice: number;
    minimumStock: number;
    currentStock: number;
  }> = [];

  for (const variant of input.variants) {
    const source = codeSourceName(input.name, input.flavor, variant.size);
    let sku = variant.sku?.trim() || '';
    let barcode = variant.barcode?.trim() || '';

    if (!sku) {
      sku = await nextSkuForName(tenantId, source, undefined, reservedSkus);
    } else {
      if (reservedSkus.has(sku) || (await isSkuTaken(tenantId, sku))) {
        throw new ConflictError(`SKU already exists: ${sku}`);
      }
      reservedSkus.add(sku);
    }

    if (!barcode) {
      barcode = await nextBarcodeForName(tenantId, source, undefined, reservedBarcodes);
    } else {
      if (reservedBarcodes.has(barcode) || (await isBarcodeTaken(tenantId, barcode))) {
        throw new ConflictError(`Barcode already exists: ${barcode}`);
      }
      reservedBarcodes.add(barcode);
    }

    resolved.push({
      size: variant.size.trim(),
      sku,
      barcode,
      purchasePrice: variant.purchasePrice ?? 0,
      salePrice: variant.salePrice,
      minimumStock: variant.minimumStock ?? 0,
      currentStock: variant.currentStock ?? 0,
    });
  }

  try {
    const products = await prisma.$transaction(async (tx) => {
      const createdList = [];

      for (const variant of resolved) {
        const created = await tx.product.create({
          data: {
            tenantId,
            name: input.name,
            sku: variant.sku,
            barcode: variant.barcode,
            categoryId: input.categoryId || null,
            brandId: input.brandId || null,
            flavor: input.flavor || null,
            size: variant.size,
            unitId: input.unitId || null,
            purchasePrice: variant.purchasePrice,
            salePrice: variant.salePrice,
            avgCost: variant.purchasePrice,
            minimumStock: variant.minimumStock,
            currentStock: 0,
            description: input.description || null,
            imageUrl: input.imageUrl || null,
            variantGroupId,
            isActive: input.isActive ?? true,
            createdBy: userId,
            updatedBy: userId,
          },
          include: productInclude,
        });

        if (variant.currentStock > 0) {
          await applyStockChange(tx, {
            tenantId,
            productId: created.id,
            quantityDelta: variant.currentStock,
            type: 'OPENING',
            unitCost: variant.purchasePrice,
            reason: 'Opening stock',
            createdBy: userId,
          });
        }

        createdList.push(created.id);
      }

      if (afterPersist) {
        await afterPersist();
      }

      return tx.product.findMany({
        where: { id: { in: createdList } },
        include: productInclude,
        orderBy: { size: 'asc' },
      });
    });

    return products.map(serializeProduct);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') {
      throw new ConflictError('SKU or barcode already exists for this store');
    }
    throw err;
  }
}
