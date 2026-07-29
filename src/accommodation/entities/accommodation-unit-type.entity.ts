import { defineEntity, p } from '@mikro-orm/core';

import { updatedAtTrigger } from '../../database/updated-at-trigger';
import { Property as LodgingProperty } from './property.entity';
import { RentalPolicy } from './rental-policy.entity';
import { Tenant } from './tenant.entity';

export enum AccommodationUnitKind {
  ROOM = 'room',
}

const AccommodationUnitTypeSchema = defineEntity({
  name: 'AccommodationUnitType',
  tableName: 'accommodation_unit_types',
  checks: [
    {
      name: 'unit_types_name_not_blank',
      expression: "btrim(name) <> ''",
    },
    {
      name: 'unit_types_max_occupancy_positive',
      expression: 'max_occupancy > 0',
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
        .foreignKeyName('unit_types_property_fk')
        .deleteRule('restrict'),
    rentalPolicy: () =>
      p
        .manyToOne(RentalPolicy)
        .joinColumns('tenant_id', 'property_id', 'rental_policy_id')
        .referencedColumnNames('tenant_id', 'property_id', 'id')
        .foreignKeyName('unit_types_rental_policy_fk')
        .deleteRule('restrict'),
    name: p.text(),
    kind: p
      .enum(() => AccommodationUnitKind)
      .default(AccommodationUnitKind.ROOM),
    description: p.text().nullable(),
    maxOccupancy: p.integer().fieldName('max_occupancy'),
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
      name: 'unit_types_tenant_property_id_unique',
      properties: ['tenant', 'property', 'id'],
    },
    {
      name: 'unit_types_active_name_unique',
      expression:
        'create unique index unit_types_active_name_unique on accommodation_unit_types (tenant_id, property_id, lower(btrim(name))) where archived_at is null',
    },
  ],
  triggers: [updatedAtTrigger('accommodation_unit_types')],
});

export class AccommodationUnitType extends AccommodationUnitTypeSchema.class {}
AccommodationUnitTypeSchema.setClass(AccommodationUnitType);
