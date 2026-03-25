import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

type InventoryListArgs = {
  workspaceId: string;
  locationId?: string;
  search?: string;
  skip: number;
  take: number;
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(args: InventoryListArgs) {
    const where: any = {
      workspaceId: args.workspaceId,
    };

    if (args.locationId) {
      where.locationId = args.locationId;
    }

    if (args.search) {
      where.product = {
        OR: [
          { sku: { contains: args.search, mode: 'insensitive' } },
          { name: { contains: args.search, mode: 'insensitive' } },
        ],
      };
    }

    const [total, rows] = await Promise.all([
      this.prisma.inventory.count({ where }),
      this.prisma.inventory.findMany({
        where,
        skip: args.skip,
        take: args.take,
        orderBy: [
          { location: { code: 'asc' } },
          { product: { sku: 'asc' } },
        ],
        select: {
          locationId: true,
          onHand: true,
          reserved: true,
          location: {
            select: {
              code: true,
            },
          },
          product: {
            select: {
              sku: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const items = rows.map((r) => {
      // Business rule: available = onHand - reserved, clamped to never go below zero.
      const available = Math.max(r.onHand - r.reserved, 0);

      return {
        available,
        sku: r.product.sku,
        name: r.product.name,
        locationId: r.locationId,
        locationCode: r.location.code,
        onHand: r.onHand,
        reserved: r.reserved,
        lowStockThreshold: null,
        outOfStockThreshold: null,
      };
    });

    return { total, items };
  }
}
