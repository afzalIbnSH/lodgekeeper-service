import { defineEntity, p } from '@mikro-orm/core';

import { updatedAtTrigger } from '../../database/updated-at-trigger';
import { Tenant } from './tenant.entity';

const AmenitySchema = defineEntity({
  name: 'Amenity',
  tableName: 'amenities',
  checks: [
    {
      name: 'amenities_name_not_blank',
      expression: "btrim(name) <> ''",
    },
  ],
  properties: {
    id: p.uuid().primary().defaultRaw('uuidv7()'),
    tenant: () =>
      p
        .manyToOne(Tenant)
        .fieldName('tenant_id')
        .foreignKeyName('amenities_tenant_id_foreign')
        .deleteRule('restrict'),
    name: p.text(),
    description: p.text().nullable(),
    createdAt: p
      .datetime()
      .fieldName('created_at')
      .columnType('timestamptz')
      .defaultRaw('now()'),
    updatedAt: p
      .datetime()
      .fieldName('updated_at')
      .columnType('timestamptz')
      .defaultRaw('now()')
      .onUpdate(() => new Date()),
    archivedAt: p
      .datetime()
      .fieldName('archived_at')
      .columnType('timestamptz')
      .nullable(),
  },
  uniques: [
    {
      name: 'amenities_tenant_id_id_unique',
      properties: ['tenant', 'id'],
    },
    {
      name: 'amenities_active_name_unique',
      expression:
        'create unique index amenities_active_name_unique on amenities (tenant_id, lower(btrim(name))) where archived_at is null',
    },
  ],
  triggers: [updatedAtTrigger('amenities')],
});

export class Amenity extends AmenitySchema.class {}
AmenitySchema.setClass(Amenity);
