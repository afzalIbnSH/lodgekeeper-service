import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { isUuid } from '../common/uuid';

export type TenantWork<T> = (entityManager: EntityManager) => Promise<T>;

@Injectable()
export class TenantTransaction {
  constructor(
    @Inject(EntityManager) private readonly entityManager: EntityManager,
  ) {}

  async run<T>(tenantId: string, work: TenantWork<T>): Promise<T> {
    if (!isUuid(tenantId)) {
      throw new Error('tenantId must be a valid UUID');
    }

    return this.entityManager.transactional(async (transaction) => {
      await transaction.execute(
        "select set_config('app.current_tenant_id', ?, true)",
        [tenantId],
      );

      return work(transaction);
    });
  }
}
