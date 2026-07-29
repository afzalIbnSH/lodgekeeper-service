import { defineEntity, p } from '@mikro-orm/core';

import { AccommodationUnitType } from './accommodation-unit-type.entity';
import { Amenity } from './amenity.entity';
import { Property as LodgingProperty } from './property.entity';
import { Tenant } from './tenant.entity';

const AccommodationUnitTypeAmenitySchema = defineEntity({
  name: 'AccommodationUnitTypeAmenity',
  tableName: 'accommodation_unit_type_amenities',
  properties: {
    tenant: () =>
      p
        .manyToOne(Tenant)
        .fieldName('tenant_id')
        .primary()
        .createForeignKeyConstraint(false),
    property: () =>
      p
        .manyToOne(LodgingProperty)
        .fieldName('property_id')
        .createForeignKeyConstraint(false),
    unitTypeId: p
      .uuid()
      .fieldName('accommodation_unit_type_id')
      .primary()
      .persist(false),
    amenityId: p.uuid().fieldName('amenity_id').primary().persist(false),
    unitType: () =>
      p
        .manyToOne(AccommodationUnitType)
        .joinColumns('tenant_id', 'property_id', 'accommodation_unit_type_id')
        .referencedColumnNames('tenant_id', 'property_id', 'id')
        .columnTypes('uuid', 'uuid', 'uuid')
        .ownColumns('accommodation_unit_type_id')
        .foreignKeyName('unit_type_amenities_unit_type_fk')
        .updateRule('no action')
        .deleteRule('cascade'),
    amenity: () =>
      p
        .manyToOne(Amenity)
        .joinColumns('tenant_id', 'amenity_id')
        .referencedColumnNames('tenant_id', 'id')
        .columnTypes('uuid', 'uuid')
        .ownColumns('amenity_id')
        .foreignKeyName('unit_type_amenities_amenity_fk')
        .updateRule('no action')
        .deleteRule('restrict'),
    createdAt: p
      .datetime()
      .fieldName('created_at')
      .columnType('timestamptz')
      .defaultRaw('now()'),
  },
});

export class AccommodationUnitTypeAmenity
  extends AccommodationUnitTypeAmenitySchema.class {}
AccommodationUnitTypeAmenitySchema.setClass(AccommodationUnitTypeAmenity);
