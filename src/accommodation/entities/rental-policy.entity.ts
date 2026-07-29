import { defineEntity, p } from '@mikro-orm/core';

import { updatedAtTrigger } from '../../database/updated-at-trigger';
import { Property as LodgingProperty } from './property.entity';
import { Tenant } from './tenant.entity';

export enum RentalPolicyKind {
  CALENDAR_NIGHT = 'calendar_night',
  ROLLING_DURATION = 'rolling_duration',
}

const RentalPolicySchema = defineEntity({
  name: 'RentalPolicy',
  tableName: 'rental_policies',
  checks: [
    {
      name: 'rental_policies_name_not_blank',
      expression: "btrim(name) <> ''",
    },
    {
      name: 'rental_policies_grace_non_negative',
      expression: 'grace_period_minutes >= 0',
    },
    {
      name: 'rental_policies_shape_valid',
      expression: `
        (
          kind = 'rolling_duration'
          and duration_minutes > 0
          and check_in_time is null
          and check_out_time is null
        )
        or
        (
          kind = 'calendar_night'
          and duration_minutes is null
          and check_in_time is not null
          and check_out_time is not null
        )
      `,
    },
  ],
  properties: {
    id: p.uuid().primary().defaultRaw('uuidv7()'),
    tenant: () =>
      p
        .manyToOne(Tenant)
        .fieldName('tenant_id')
        .createForeignKeyConstraint(false),
    property: () =>
      p
        .manyToOne(LodgingProperty)
        .joinColumns('tenant_id', 'property_id')
        .referencedColumnNames('tenant_id', 'id')
        .foreignKeyName('rental_policies_property_fk')
        .deleteRule('restrict'),
    name: p.text(),
    kind: p.enum(() => RentalPolicyKind),
    durationMinutes: p.integer().fieldName('duration_minutes').nullable(),
    gracePeriodMinutes: p
      .integer()
      .fieldName('grace_period_minutes')
      .default(0),
    checkInTime: p.time().fieldName('check_in_time').nullable(),
    checkOutTime: p.time().fieldName('check_out_time').nullable(),
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
      name: 'rental_policies_tenant_property_id_unique',
      properties: ['tenant', 'property', 'id'],
    },
    {
      name: 'rental_policies_active_name_unique',
      expression:
        'create unique index rental_policies_active_name_unique on rental_policies (tenant_id, property_id, lower(btrim(name))) where archived_at is null',
    },
  ],
  triggers: [updatedAtTrigger('rental_policies')],
});

export class RentalPolicy extends RentalPolicySchema.class {}
RentalPolicySchema.setClass(RentalPolicy);
