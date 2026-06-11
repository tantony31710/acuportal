// Faculty building coordinates
export const FACULTY_LAT = 29.934828828978805
export const FACULTY_LNG = 30.881276577847842
export const ALLOWED_RADIUS_M = 300 // meters

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

// Haversine formula — distance between two GPS points in meters
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // Earth radius in meters
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export type LocationResult =
  | { ok: true; distance: number }
  | { ok: false; reason: string; distance?: number }

export function checkLocation(): Promise<LocationResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ ok: false, reason: 'GPS not supported on this device' })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = distanceMeters(
          pos.coords.latitude, pos.coords.longitude,
          FACULTY_LAT, FACULTY_LNG
        )
        if (dist <= ALLOWED_RADIUS_M) {
          resolve({ ok: true, distance: Math.round(dist) })
        } else {
          resolve({
            ok: false,
            distance: Math.round(dist),
            reason: `Location outside campus boundary (${Math.round(dist)}m away)`
          })
        }
      },
      (err) => {
        const reason =
          err.code === 1 ? 'Location access denied by student' :
          err.code === 2 ? 'GPS signal unavailable' :
          'Location check timed out'
        resolve({ ok: false, reason })
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
    )
  })
}
