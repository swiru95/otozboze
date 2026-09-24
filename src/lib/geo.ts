/**
 * Distance between two points on the map.
 *
 * Straight-line only — no routing service is involved — so the result is
 * multiplied by a road factor to land near what a truck actually drives. It
 * is good enough to price freight and to sort a board by proximity, and it is
 * deliberately not presented as an exact route length.
 */

const EARTH_RADIUS_KM = 6371;

/** Polish road network vs. straight line, empirical rule of thumb. */
const ROAD_FACTOR = 1.25;

export type Coordinates = {
  latitude: number | null;
  longitude: number | null;
};

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in kilometres. */
function haversineKm(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
) {
  const dLat = toRadians(toLat - fromLat);
  const dLon = toRadians(toLon - fromLon);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Estimated road distance in whole kilometres, or null when either end has no
 * coordinates. Null is a real answer: the UI shows a dash rather than a made-up
 * number, and freight falls back to a flat rate.
 */
export function estimateRoadDistanceKm(
  from: Coordinates,
  to: Coordinates,
): number | null {
  if (
    from.latitude === null ||
    from.longitude === null ||
    to.latitude === null ||
    to.longitude === null
  ) {
    return null;
  }

  const straight = haversineKm(
    from.latitude,
    from.longitude,
    to.latitude,
    to.longitude,
  );

  return Math.max(1, Math.round(straight * ROAD_FACTOR));
}
