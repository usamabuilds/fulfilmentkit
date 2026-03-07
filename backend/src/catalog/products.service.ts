import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts(input: {
    workspaceId: string;
    search?: string;
    page: number;
    pageSize: number;
  }) {
    const { workspaceId, search, page, pageSize } = input;

    const where: any = { workspaceId };

    if (search && search.trim().length > 0) {
      where.name = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          sku: true,
          name: true,
          createdAt: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}
