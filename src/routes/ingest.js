import { Router } from "express";
import { prisma } from "../db.js";
import { validateEvent } from "../validation.js";

const router = Router();

router.post("/ingest", async (req, res) => {
  const { device_id, events } = req.body ?? {};

  if (typeof device_id !== "string" || !device_id.trim()) {
    return res.status(400).json({ error: "device_id is required" });
  }

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({
      error: "events must be a non-empty array",
    });
  }

  if (events.length > 500) {
    return res.status(400).json({
      error: "events array cannot contain more than 500 events",
    });
  }

  const now = Date.now();
  const errors = [];
  const duplicateIndexes = [];
  const seenTimestamps = new Set();
  const validEvents = [];

  events.forEach((event, index) => {
    const reason = validateEvent(event, now);

    if (reason) {
      errors.push({ index, reason });
      return;
    }

    if (seenTimestamps.has(event.timestamp)) {
      duplicateIndexes.push(index);
      return;
    }

    seenTimestamps.add(event.timestamp);
    validEvents.push({ event, index });
  });

  let accepted = 0;

  for (const { event, index } of validEvents) {
    try {
      await prisma.telemetryEvent.create({
        data: {
          deviceId: device_id,
          timestamp: BigInt(event.timestamp),
          lat: event.lat,
          lon: event.lon,
          speedKmph: event.speed_kmph,
          accelX: event.accel_x,
          accelY: event.accel_y,
          accelZ: event.accel_z,
          gyroX: event.gyro_x,
          gyroY: event.gyro_y,
          gyroZ: event.gyro_z,
        },
      });

      accepted += 1;
    } catch (error) {
      // Prisma P2002 means a unique constraint was violated.
      if (error?.code === "P2002") {
        duplicateIndexes.push(index);
        continue;
      }

      console.error("Telemetry insertion failed:", error);
      return res.status(500).json({
        error: "Failed to store telemetry events",
      });
    }
  }

  duplicateIndexes.sort((a, b) => a - b);
  errors.sort((a, b) => a.index - b.index);

  return res.status(200).json({
    device_id,
    accepted,
    duplicates: {
      count: duplicateIndexes.length,
      indexes: duplicateIndexes,
    },
    rejected: errors.length,
    errors,
  });
});

export default router;
