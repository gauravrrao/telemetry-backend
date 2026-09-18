import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

router.get("/summary", async (req, res) => {
  const { device_id, from, to } = req.query;

  if (!device_id || !from || !to)
    return res.status(400).json({ error: "device_id, from and to are required" });

  const fromMs = Number(from);
  const toMs = Number(to);

  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs))
    return res.status(400).json({ error: "from and to must be epoch millis" });
  if (fromMs > toMs)
    return res.status(400).json({ error: "from must be <= to" });

  const events = await prisma.telemetryEvent.findMany({
    where: {
      deviceId: device_id,
      timestamp: { gte: BigInt(fromMs), lte: BigInt(toMs) },
    },
    select: { speedKmph: true, accelX: true, accelY: true, accelZ: true },
  });

  if (events.length === 0) {
    return res.status(200).json({
      device_id,
      from: fromMs,
      to: toMs,
      avg_speed_kmph: null,
      max_accel_magnitude: null,
      event_count: 0,
    });
  }

  let speedSum = 0;
  let maxAccel = 0;
  for (const e of events) {
    speedSum += e.speedKmph;
    const mag = Math.sqrt(e.accelX ** 2 + e.accelY ** 2 + e.accelZ ** 2);
    if (mag > maxAccel) maxAccel = mag;
  }

  return res.status(200).json({
    device_id,
    from: fromMs,
    to: toMs,
    avg_speed_kmph: Number((speedSum / events.length).toFixed(2)),
    max_accel_magnitude: Number(maxAccel.toFixed(4)),
    event_count: events.length,
  });
});

export default router;