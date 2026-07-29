import { defineEntity, p } from '@mikro-orm/core';

import { AccommodationUnitType } from './accommodation-unit-type.entity';
import { Property as LodgingProperty } from './property.entity';
import { Tenant } from './tenant.entity';

const AccommodationUnitTypeRateSchema = defineEntity({
  name: 'AccommodationUnitTypeRate',
  tableName: 'accommodation_unit_type_rates',
  checks: [
    {
      name: 'unit_type_rates_amount_positive',
      expression: 'amount_minor > 0',
    },
    {
      name: 'unit_type_rates_period_valid',
      expression: 'valid_to is null or valid_to > valid_from',
    },
    {
      name: 'unit_type_rates_periods_do_not_overlap',
      expression: `
        exclude using gist (
          tenant_id with =,
          accommodation_unit_type_id with =,
          daterange(valid_from, valid_to, '[)') with &&
        )
      `,
    },
  ],
  indexes: [
    {
      name: 'unit_type_rates_current_lookup',
      expression:
        'create index unit_type_rates_current_lookup on accommodation_unit_type_rates (tenant_id, accommodation_unit_type_id, valid_from desc)',
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
        .foreignKeyName('unit_type_rates_unit_type_fk')
        .deleteRule('restrict'),
    amountMinor: p.bigint().fieldName('amount_minor'),
    validFrom: p.date().fieldName('valid_from'),
    validTo: p.date().fieldName('valid_to').nullable(),
    createdAt: p
      .datetime()
      .fieldName('created_at')
      .columnType('timestamptz')
      .defaultRaw('now()'),
  },
});

export class AccommodationUnitTypeRate
  extends AccommodationUnitTypeRateSchema.class {}
AccommodationUnitTypeRateSchema.setClass(AccommodationUnitTypeRate);
