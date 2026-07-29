import { AccommodationUnitTypeAmenity } from './accommodation-unit-type-amenity.entity';
import { AccommodationUnitTypeRate } from './accommodation-unit-type-rate.entity';
import { AccommodationUnitType } from './accommodation-unit-type.entity';
import { AccommodationUnit } from './accommodation-unit.entity';
import { Amenity } from './amenity.entity';
import { Property } from './property.entity';
import { RentalPolicy } from './rental-policy.entity';
import { Tenant } from './tenant.entity';

export const accommodationEntities = [
  Tenant,
  Property,
  RentalPolicy,
  AccommodationUnitType,
  AccommodationUnit,
  Amenity,
  AccommodationUnitTypeAmenity,
  AccommodationUnitTypeRate,
] as const;

export {
  AccommodationUnit,
  AccommodationUnitType,
  AccommodationUnitTypeAmenity,
  AccommodationUnitTypeRate,
  Amenity,
  Property,
  RentalPolicy,
  Tenant,
};
