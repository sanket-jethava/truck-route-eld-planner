from datetime import datetime, timedelta

from backend.services.hos_engine import calculate_trip_schedule


def test_schedule_includes_pickup_and_delivery():
    timeline = calculate_trip_schedule(distance_miles=500, drive_time_hours=8, current_cycle_used=0)
    types = [event['type'] for event in timeline]
    assert types[0] == 'pickup'
    assert types[-1] == 'delivery'
    assert any(event['type'] == 'drive' for event in timeline)
    assert not any(event['type'] == 'break' for event in timeline)


def test_schedule_respects_selected_start_datetime():
    start = datetime.fromisoformat('2026-01-02T10:00:00')
    timeline = calculate_trip_schedule(distance_miles=100, drive_time_hours=2, current_cycle_used=0, start_datetime=start)
    assert timeline[0]['type'] == 'pickup'
    assert timeline[0]['start'] == start.isoformat()
    assert timeline[0]['end'] == (start + timedelta(hours=1)).isoformat()


def test_schedule_inserts_fuel_stop_for_long_distance():
    timeline = calculate_trip_schedule(distance_miles=1500, drive_time_hours=15, current_cycle_used=0)
    assert any(event['type'] == 'fuel' for event in timeline)
    assert any(event['type'] == 'rest' for event in timeline)
    fuel_events = [event for event in timeline if event['type'] == 'fuel']
    assert len(fuel_events) >= 1
    assert fuel_events[0]['duration_hours'] == 0.5


def test_schedule_inserts_break_after_eight_hours_driving():
    timeline = calculate_trip_schedule(distance_miles=900, drive_time_hours=9, current_cycle_used=0)
    assert any(event['type'] == 'break' for event in timeline)
    break_event = next(event for event in timeline if event['type'] == 'break')
    assert break_event['duration_hours'] == 0.5
    # Break should occur before delivery if there is still driving remaining
    drive_events = [event for event in timeline if event['type'] == 'drive']
    assert len(drive_events) >= 2
