# API Examples

## POST `/api/v1/telemetry/ingest`

```bash
curl -X POST http://localhost:3000/api/v1/telemetry/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "DVC-1029",
    "events": [
      {
        "timestamp": 1730894521123,
        "lat": 12.9716,
        "lon": 77.5946,
        "speed_kmph": 42.5,
        "accel_x": 0.12,
        "accel_y": -0.03,
        "accel_z": 9.81,
        "gyro_x": 0.002,
        "gyro_y": -0.001,
        "gyro_z": 0.0
      },
      {
        "timestamp": 1730894521173,
        "lat": 12.9716,
        "lon": 77.5947,
        "speed_kmph": 42.8,
        "accel_x": 0.14,
        "accel_y": -0.02,
        "accel_z": 9.80,
        "gyro_x": 0.001,
        "gyro_y": -0.001,
        "gyro_z": 0.0
      }
    ]
  }'
```

## GET `/api/v1/telemetry/summary`

```bash
curl "http://localhost:3000/api/v1/telemetry/summary?device_id=DVC-1029&from=1730894520000&to=1730894580000"
```
