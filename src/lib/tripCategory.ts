export type TripCategory = 'home_to_campus' | 'campus_to_home';

export const DIRECTIONS: Record<TripCategory, string> = {
  home_to_campus: 'Home -> Campus',
  campus_to_home: 'Campus -> Home',
};

export const CATEGORY_LABEL: Record<TripCategory, string> = {
  home_to_campus: 'Home → Campus',
  campus_to_home: 'Campus → Home',
};

// Defaults to home_to_campus for null/legacy/unrecognized values so
// existing pickup-based UI keeps working until data is backfilled.
export function categoryOf(direction?: string | null): TripCategory {
  return direction === DIRECTIONS.campus_to_home ? 'campus_to_home' : 'home_to_campus';
}
