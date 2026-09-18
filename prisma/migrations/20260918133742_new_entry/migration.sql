-- CreateTable
CREATE TABLE "telemetry_events" (
    "id" BIGSERIAL NOT NULL,
    "device_id" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "speed_kmph" DOUBLE PRECISION NOT NULL,
    "accel_x" DOUBLE PRECISION NOT NULL,
    "accel_y" DOUBLE PRECISION NOT NULL,
    "accel_z" DOUBLE PRECISION NOT NULL,
    "gyro_x" DOUBLE PRECISION NOT NULL,
    "gyro_y" DOUBLE PRECISION NOT NULL,
    "gyro_z" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "telemetry_events_device_id_timestamp_idx" ON "telemetry_events"("device_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "telemetry_events_device_id_timestamp_key" ON "telemetry_events"("device_id", "timestamp");
