import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const WORKSPACE_ID = '11111111-1111-1111-1111-111111111111';

// External auth ids we use in dev tokens (sub)
const OWNER_EXTERNAL_ID = 'demo-user-1';
const VIEWER_EXTERNAL_ID = 'viewer-user-1';

function createPrisma() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is missing from environment variables');
  }

  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  return { prisma, pool };
}

async function main() {
  const { prisma, pool } = createPrisma();

  try {
    // 0) Users (MUST exist before WorkspaceMember FK can work)
    // IMPORTANT: We set User.id = external auth id for now (Option B expects FK to User.id).
    // Your User model requires: authProvider + authProviderUserId
    await prisma.user.upsert({
      where: { id: OWNER_EXTERNAL_ID },
      update: {
        email: 'demo1@example.com',
        authProvider: 'DEV',
        authProviderUserId: OWNER_EXTERNAL_ID,
      },
      create: {
        id: OWNER_EXTERNAL_ID,
        email: 'demo1@example.com',
        authProvider: 'DEV',
        authProviderUserId: OWNER_EXTERNAL_ID,
      },
    });

    await prisma.user.upsert({
      where: { id: VIEWER_EXTERNAL_ID },
      update: {
        email: 'viewer@example.com',
        authProvider: 'DEV',
        authProviderUserId: VIEWER_EXTERNAL_ID,
      },
      create: {
        id: VIEWER_EXTERNAL_ID,
        email: 'viewer@example.com',
        authProvider: 'DEV',
        authProviderUserId: VIEWER_EXTERNAL_ID,
      },
    });

    // 1) Workspace
    await prisma.workspace.upsert({
      where: { id: WORKSPACE_ID },
      update: { name: 'Demo Workspace' },
      create: {
        id: WORKSPACE_ID,
        name: 'Demo Workspace',
      },
    });

    // 1.1) Workspace membership
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: WORKSPACE_ID,
          userId: OWNER_EXTERNAL_ID, // FK -> User.id
        },
      },
      update: { role: 'OWNER' },
      create: {
        workspaceId: WORKSPACE_ID,
        userId: OWNER_EXTERNAL_ID, // FK -> User.id
        role: 'OWNER',
      },
    });

    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: WORKSPACE_ID,
          userId: VIEWER_EXTERNAL_ID, // FK -> User.id
        },
      },
      update: { role: 'VIEWER' },
      create: {
        workspaceId: WORKSPACE_ID,
        userId: VIEWER_EXTERNAL_ID, // FK -> User.id
        role: 'VIEWER',
      },
    });

    // 2) Locations
    const mainLocation = await prisma.location.upsert({
      where: {
        workspaceId_code: {
          workspaceId: WORKSPACE_ID,
          code: 'MAIN',
        },
      },
      update: {
        name: 'Main Warehouse',
      },
      create: {
        workspaceId: WORKSPACE_ID,
        code: 'MAIN',
        name: 'Main Warehouse',
      },
    });

    const retLocation = await prisma.location.upsert({
      where: {
        workspaceId_code: {
          workspaceId: WORKSPACE_ID,
          code: 'RET',
        },
      },
      update: {
        name: 'Retail',
      },
      create: {
        workspaceId: WORKSPACE_ID,
        code: 'RET',
        name: 'Retail',
      },
    });

    // 3) Products
    const productA = await prisma.product.upsert({
      where: {
        workspaceId_sku: {
          workspaceId: WORKSPACE_ID,
          sku: 'SKU-TEST-001',
        },
      },
      update: {
        name: 'Test Product 001',
      },
      create: {
        workspaceId: WORKSPACE_ID,
        sku: 'SKU-TEST-001',
        name: 'Test Product 001',
      },
    });

    const productB = await prisma.product.upsert({
      where: {
        workspaceId_sku: {
          workspaceId: WORKSPACE_ID,
          sku: 'SKU-TEST-002',
        },
      },
      update: {
        name: 'Test Product 002',
      },
      create: {
        workspaceId: WORKSPACE_ID,
        sku: 'SKU-TEST-002',
        name: 'Test Product 002',
      },
    });

    // 4) Inventory (onHand Int)
    // Tweak for alerts:
    // - MAIN + SKU-TEST-001 => 0 (stockout)
    // - RET + SKU-TEST-002 => 5 (low stock)
    await prisma.inventory.upsert({
      where: {
        workspaceId_locationId_productId: {
          workspaceId: WORKSPACE_ID,
          locationId: mainLocation.id,
          productId: productA.id,
        },
      },
      update: {
        onHand: 0,
      },
      create: {
        workspaceId: WORKSPACE_ID,
        locationId: mainLocation.id,
        productId: productA.id,
        onHand: 0,
      },
    });

    await prisma.inventory.upsert({
      where: {
        workspaceId_locationId_productId: {
          workspaceId: WORKSPACE_ID,
          locationId: retLocation.id,
          productId: productB.id,
        },
      },
      update: {
        onHand: 5,
      },
      create: {
        workspaceId: WORKSPACE_ID,
        locationId: retLocation.id,
        productId: productB.id,
        onHand: 5,
      },
    });

    // 5) Order + OrderItems
    const subtotal = new Prisma.Decimal('123.45');
    const tax = new Prisma.Decimal('0');
    const shipping = new Prisma.Decimal('0');
    const total = subtotal.plus(tax).plus(shipping);

    const orderedAt = new Date('2026-02-03T10:00:00.000Z');

    const order = await prisma.order.upsert({
      where: {
        workspaceId_externalRef: {
          workspaceId: WORKSPACE_ID,
          externalRef: 'ORDER-EXT-001',
        },
      },
      update: {
        orderNumber: '1001',
        channel: 'shopify',
        orderedAt,
        status: 'paid',
        currency: 'USD',
        subtotal,
        tax,
        shipping,
        total,
      },
      create: {
        workspaceId: WORKSPACE_ID,
        externalRef: 'ORDER-EXT-001',
        orderNumber: '1001',
        channel: 'shopify',
        orderedAt,
        status: 'paid',
        currency: 'USD',
        subtotal,
        tax,
        shipping,
        total,
      },
    });

    const unitPriceA = new Prisma.Decimal('50');
    const qtyA = 2;
    const lineTotalA = unitPriceA.times(qtyA);

    await prisma.orderItem.upsert({
      where: {
        orderId_lineKey: {
          orderId: order.id,
          lineKey: 'line-1',
        },
      },
      update: {
        productId: productA.id,
        quantity: qtyA,
        unitPrice: unitPriceA,
        total: lineTotalA,
        locationId: mainLocation.id,
      },
      create: {
        orderId: order.id,
        lineKey: 'line-1',
        productId: productA.id,
        quantity: qtyA,
        unitPrice: unitPriceA,
        total: lineTotalA,
        locationId: mainLocation.id,
      },
    });

    const unitPriceB = new Prisma.Decimal('23.45');
    const qtyB = 1;
    const lineTotalB = unitPriceB.times(qtyB);

    await prisma.orderItem.upsert({
      where: {
        orderId_lineKey: {
          orderId: order.id,
          lineKey: 'line-2',
        },
      },
      update: {
        productId: productB.id,
        quantity: qtyB,
        unitPrice: unitPriceB,
        total: lineTotalB,
        locationId: retLocation.id,
      },
      create: {
        orderId: order.id,
        lineKey: 'line-2',
        productId: productB.id,
        quantity: qtyB,
        unitPrice: unitPriceB,
        total: lineTotalB,
        locationId: retLocation.id,
      },
    });

    // 6) Fee + Refund
    await prisma.fee.upsert({
      where: {
        workspaceId_externalRef: {
          workspaceId: WORKSPACE_ID,
          externalRef: 'FEE-EXT-001',
        },
      },
      update: {
        orderId: order.id,
        type: 'processing',
        amount: new Prisma.Decimal('3.21'),
        currency: 'USD',
      },
      create: {
        workspaceId: WORKSPACE_ID,
        orderId: order.id,
        externalRef: 'FEE-EXT-001',
        type: 'processing',
        amount: new Prisma.Decimal('3.21'),
        currency: 'USD',
      },
    });

    await prisma.refund.upsert({
      where: {
        workspaceId_externalRef: {
          workspaceId: WORKSPACE_ID,
          externalRef: 'REFUND-EXT-001',
        },
      },
      update: {
        orderId: order.id,
        reason: 'test',
        amount: new Prisma.Decimal('10'),
        currency: 'USD',
      },
      create: {
        workspaceId: WORKSPACE_ID,
        orderId: order.id,
        externalRef: 'REFUND-EXT-001',
        reason: 'test',
        amount: new Prisma.Decimal('10'),
        currency: 'USD',
      },
    });

    // 7) DailyMetric
    const metricDay = new Date('2026-02-03T00:00:00.000Z');

    const revenue = total;
    const orders = 1;
    const units = qtyA + qtyB;
    const refundsAmount = new Prisma.Decimal('10');
    const feesAmount = new Prisma.Decimal('3.21');
    const cogsAmount = new Prisma.Decimal('0');

    const grossMarginAmount = revenue.minus(refundsAmount).minus(feesAmount).minus(cogsAmount);
    const denom = revenue.equals(0) ? new Prisma.Decimal('0') : revenue;
    const grossMarginPercent = denom.equals(0)
      ? new Prisma.Decimal('0')
      : grossMarginAmount.div(denom).times(100);

    const stockoutsCount = 1;
    const lowStockCount = 1;

    await prisma.dailyMetric.upsert({
      where: {
        workspaceId_day: {
          workspaceId: WORKSPACE_ID,
          day: metricDay,
        },
      },
      update: {
        revenue,
        orders,
        units,
        refundsAmount,
        feesAmount,
        cogsAmount,
        grossMarginAmount,
        grossMarginPercent,
        stockoutsCount,
        lowStockCount,
      },
      create: {
        workspaceId: WORKSPACE_ID,
        day: metricDay,
        revenue,
        orders,
        units,
        refundsAmount,
        feesAmount,
        cogsAmount,
        grossMarginAmount,
        grossMarginPercent,
        stockoutsCount,
        lowStockCount,
      },
    });

    // 8) Connections
    await prisma.connection.upsert({
      where: {
        workspaceId_platform: {
          workspaceId: WORKSPACE_ID,
          platform: 'SHOPIFY',
        },
      },
      update: {
        status: 'ACTIVE',
        displayName: 'Demo Shopify Store',
        lastSyncAt: new Date('2026-02-04T12:00:00.000Z'),
        lastError: null,
      },
      create: {
        workspaceId: WORKSPACE_ID,
        platform: 'SHOPIFY',
        status: 'ACTIVE',
        displayName: 'Demo Shopify Store',
        lastSyncAt: new Date('2026-02-04T12:00:00.000Z'),
        lastError: null,
      },
    });

    await prisma.connection.upsert({
      where: {
        workspaceId_platform: {
          workspaceId: WORKSPACE_ID,
          platform: 'WOOCOMMERCE',
        },
      },
      update: {
        status: 'DISCONNECTED',
        displayName: 'Demo WooCommerce Store',
        lastSyncAt: null,
        lastError: null,
      },
      create: {
        workspaceId: WORKSPACE_ID,
        platform: 'WOOCOMMERCE',
        status: 'DISCONNECTED',
        displayName: 'Demo WooCommerce Store',
        lastSyncAt: null,
        lastError: null,
      },
    });

    await prisma.connection.upsert({
      where: {
        workspaceId_platform: {
          workspaceId: WORKSPACE_ID,
          platform: 'AMAZON',
        },
      },
      update: {
        status: 'ERROR',
        displayName: 'Amazon Seller Central',
        lastSyncAt: new Date('2026-02-01T09:00:00.000Z'),
        lastError: 'Unauthorized (demo error)',
      },
      create: {
        workspaceId: WORKSPACE_ID,
        platform: 'AMAZON',
        status: 'ERROR',
        displayName: 'Amazon Seller Central',
        lastSyncAt: new Date('2026-02-01T09:00:00.000Z'),
        lastError: 'Unauthorized (demo error)',
      },
    });

    console.log('Seed complete');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Seed failed', err);
  process.exitCode = 1;
});
