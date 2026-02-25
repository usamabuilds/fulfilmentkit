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
          id: true,
          locationId: true,
          productId: true,
          onHand: true,
          createdAt: true,
          updatedAt: true,
          location: {
            select: {
              code: true,
              name: true,
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

    const items = rows.map((r) => ({
      id: r.id,
      locationId: r.locationId,
      productId: r.productId,
      onHand: r.onHand,
      location: r.location,
      product: r.product,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return { total, items };
  }
}
