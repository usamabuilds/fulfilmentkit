import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

export function validateQuery<T extends z.ZodTypeAny>(schema: T, query: unknown): z.infer<T> {
  const result = schema.safeParse(query);

  if (!result.success) {
    // Keep details compact but useful. Our global exception filter will format this.
    throw new BadRequestException({
      message: 'Invalid query parameters',
      details: result.error.flatten(),
    });
  }

  return result.data;
}
