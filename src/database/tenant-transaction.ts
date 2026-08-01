import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TenantWork<T> = (entityManager: EntityManager) => Promise<T>;

@Injectable()
export class TenantTransaction {
  constructor(
    @Inject(EntityManager) private readonly entityManager: EntityManager,
  ) {}

  async run<T>(tenantId: string, work: TenantWork<T>): Promise<T> {
    if (!UUID_PATTERN.test(tenantId)) {
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
