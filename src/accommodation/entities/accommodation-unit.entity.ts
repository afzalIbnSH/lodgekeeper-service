import { defineEntity, p } from '@mikro-orm/core';

import { updatedAtTrigger } from '../../database/updated-at-trigger';
import { AccommodationUnitType } from './accommodation-unit-type.entity';
import { Property as LodgingProperty } from './property.entity';
import { Tenant } from './tenant.entity';

const AccommodationUnitSchema = defineEntity({
  name: 'AccommodationUnit',
  tableName: 'accommodation_units',
  checks: [
    {
      name: 'units_code_not_blank',
      expression: "btrim(code) <> ''",
    },
    {
      name: 'units_floor_label_not_blank',
      expression: "floor_label is null or btrim(floor_label) <> ''",
    },
    {
      name: 'units_display_name_not_blank',
      expression: "display_name is null or btrim(display_name) <> ''",
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
        .fieldName('property_id')
        .createForeignKeyConstraint(false),
    unitType: () =>
      p
        .manyToOne(AccommodationUnitType)
        .joinColumns('tenant_id', 'property_id', 'accommodation_unit_type_id')
        .referencedColumnNames('tenant_id', 'property_id', 'id')
        .foreignKeyName('units_unit_type_fk')
        .deleteRule('restrict'),
    code: p.text(),
    floorLabel: p.text().fieldName('floor_label').nullable(),
    displayName: p.text().fieldName('display_name').nullable(),
    notes: p.text().nullable(),
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
      name: 'units_active_code_unique',
      expression:
        'create unique index units_active_code_unique on accommodation_units (tenant_id, property_id, lower(btrim(code))) where archived_at is null',
    },
  ],
  triggers: [updatedAtTrigger('accommodation_units')],
});

export class AccommodationUnit extends AccommodationUnitSchema.class {}
AccommodationUnitSchema.setClass(AccommodationUnit);
