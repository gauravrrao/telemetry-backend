const MAX_FUTURE_MS = 24 * 60 * 60 * 1000;

function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

export function validateEvent(evt, now = Date.now()) {
  if (!evt || typeof evt !== "object") return "event is not an object";

  const required = [
    "timestamp", "lat", "lon", "speed_kmph",
    "accel_x", "accel_y", "accel_z",
    "gyro_x", "gyro_y", "gyro_z",
  ];
  for (const f of required) {
    if (evt[f] === undefined || evt[f] === null) return `missing field: ${f}`;
  }

  if (!Number.isInteger(evt.timestamp) || evt.timestamp <= 0)
    return "timestamp must be a positive integer";
  if (evt.timestamp > now + MAX_FUTURE_MS)
    return "timestamp more than 24h in future";

  if (!isFiniteNumber(evt.lat) || evt.lat < -90 || evt.lat > 90)
    return "lat out of range";
  if (!isFiniteNumber(evt.lon) || evt.lon < -180 || evt.lon > 180)
    return "lon out of range";
  if (!isFiniteNumber(evt.speed_kmph) || evt.speed_kmph < 0 || evt.speed_kmph > 300)
    return "speed_kmph out of range";

  const numeric = ["accel_x","accel_y","accel_z","gyro_x","gyro_y","gyro_z"];
  for (const f of numeric) {
    if (!isFiniteNumber(evt[f])) return `${f} must be numeric`;
  }
  return null;
}