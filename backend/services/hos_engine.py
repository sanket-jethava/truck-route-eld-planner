"""HOS engine implementing FMCSA rules.

This module creates a sequence of duty events for a trip using distance,
estimated drive time, and the current rolling cycle used.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from math import ceil
from typing import Dict, List, Optional

# Core constants
MAX_DRIVING_HOURS = 11
MAX_DUTY_HOURS = 14
BREAK_AFTER_HOURS = 8
BREAK_DURATION_MIN = 30
OFF_DUTY_HOURS = 10
MAX_CYCLE_HOURS = 70
FUEL_DISTANCE_MILES = 1000
PICKUP_DURATION_MIN = 60
DELIVERY_DURATION_MIN = 60
FUEL_DURATION_MIN = 30
START_HOUR = 8


def _minutes_to_iso(start: datetime, minutes: int) -> str:
    return (start + timedelta(minutes=minutes)).isoformat()


def _add_event(timeline: List[Dict], event_type: str, start: datetime, duration_minutes: int, base_date: datetime.date, details: Optional[Dict] = None) -> datetime:
    end = start + timedelta(minutes=duration_minutes)
    timeline.append(
        {
            'type': event_type,
            'start': start.isoformat(),
            'end': end.isoformat(),
            'duration_hours': duration_minutes / 60,
            'details': details or {},
            'day_number': 1 + (start.date() - base_date).days,
        }
    )
    return end


def calculate_trip_schedule(distance_miles: float, drive_time_hours: float, current_cycle_used: float, start_datetime: Optional[datetime] = None) -> List[Dict]:
    """Build a trip timeline under FMCSA HOS rules.

    The returned timeline includes pickup, driving segments, fuel stops, breaks,
    delivery, and overnight rest periods.
    """
    if distance_miles < 0 or drive_time_hours < 0:
        raise ValueError('distance_miles and drive_time_hours must be non-negative')

    if current_cycle_used >= MAX_CYCLE_HOURS:
        raise ValueError('Cycle limit already reached; no additional duty can be scheduled')

    total_drive_minutes = int(round(drive_time_hours * 60))
    if total_drive_minutes == 0 and distance_miles > 0:
        raise ValueError('Drive time is required to cover a positive distance')
    
    current_time = start_datetime or datetime(2026, 1, 1, START_HOUR, 0)
    base_date = current_time.date()
    timeline: List[Dict] = []
    cycle_hours_used = current_cycle_used
    duty_today = 0
    drive_today = 0
    miles_remaining = distance_miles
    minutes_remaining = total_drive_minutes
    miles_per_minute = distance_miles / total_drive_minutes if total_drive_minutes else 0
    miles_to_next_fuel = FUEL_DISTANCE_MILES if distance_miles > FUEL_DISTANCE_MILES else float('inf')

    def _reset_day():
        nonlocal duty_today, drive_today
        duty_today = 0
        drive_today = 0

    def _ensure_cycle_time(additional_minutes: int) -> None:
        nonlocal cycle_hours_used
               
        if cycle_hours_used + (additional_minutes / 60) > MAX_CYCLE_HOURS:
            raise ValueError('Trip would exceed rolling 70-hour cycle')

    def _schedule_rest(start_time: datetime) -> datetime:
        nonlocal cycle_hours_used
        _ensure_cycle_time(OFF_DUTY_HOURS * 60)
        end_time = _add_event(timeline, 'rest', start_time, OFF_DUTY_HOURS * 60, base_date)
        cycle_hours_used += OFF_DUTY_HOURS
        _reset_day()
        return end_time

    # Pickup event
    _ensure_cycle_time(PICKUP_DURATION_MIN)
    current_time = _add_event(timeline, 'pickup', current_time, PICKUP_DURATION_MIN, base_date)
    duty_today += PICKUP_DURATION_MIN
    cycle_hours_used += PICKUP_DURATION_MIN / 60

    while minutes_remaining > 0:
        if drive_today >= MAX_DRIVING_HOURS * 60 or duty_today >= MAX_DUTY_HOURS * 60:
            current_time = _schedule_rest(current_time)
            continue

        available_drive_minutes = min(
            MAX_DRIVING_HOURS * 60 - drive_today,
            MAX_DUTY_HOURS * 60 - duty_today,
            minutes_remaining,
        )

        if available_drive_minutes <= 0:
            current_time = _schedule_rest(current_time)
            continue

        if drive_today >= BREAK_AFTER_HOURS * 60:
            # break required before additional driving
            _ensure_cycle_time(BREAK_DURATION_MIN)
            current_time = _add_event(timeline, 'break', current_time, BREAK_DURATION_MIN, base_date)
            duty_today += BREAK_DURATION_MIN
            cycle_hours_used += BREAK_DURATION_MIN / 60
            drive_today = 0
            continue

        if miles_to_next_fuel <= 0 and minutes_remaining > 0:
            _ensure_cycle_time(FUEL_DURATION_MIN)
            current_time = _add_event(timeline, 'fuel', current_time, FUEL_DURATION_MIN, base_date)
            duty_today += FUEL_DURATION_MIN
            cycle_hours_used += FUEL_DURATION_MIN / 60
            miles_to_next_fuel = FUEL_DISTANCE_MILES
            continue

        minutes_to_break = (BREAK_AFTER_HOURS * 60 - drive_today)
        if miles_to_next_fuel == float('inf') or miles_per_minute == 0:
            minutes_to_fuel = available_drive_minutes
        else:
            minutes_to_fuel = ceil(miles_to_next_fuel / miles_per_minute)
        segment_minutes = min(available_drive_minutes, minutes_to_break, minutes_to_fuel)

        if segment_minutes <= 0:
            current_time = _schedule_rest(current_time)
            continue

        _ensure_cycle_time(segment_minutes)
        segment_end = _add_event(timeline, 'drive', current_time, segment_minutes, base_date)
        duty_today += segment_minutes
        drive_today += segment_minutes
        cycle_hours_used += segment_minutes / 60
        miles_covered = segment_minutes * miles_per_minute
        miles_remaining = max(0.0, miles_remaining - miles_covered)
        minutes_remaining -= segment_minutes
        miles_to_next_fuel -= miles_covered
        current_time = segment_end

        # schedule fuel if threshold passed and there is more distance to cover
        if miles_to_next_fuel <= 0 and minutes_remaining > 0:
            _ensure_cycle_time(FUEL_DURATION_MIN)
            current_time = _add_event(timeline, 'fuel', current_time, FUEL_DURATION_MIN, base_date)
            duty_today += FUEL_DURATION_MIN
            cycle_hours_used += FUEL_DURATION_MIN / 60
            miles_to_next_fuel += FUEL_DISTANCE_MILES
        elif drive_today >= BREAK_AFTER_HOURS * 60 and minutes_remaining > 0:
            _ensure_cycle_time(BREAK_DURATION_MIN)
            current_time = _add_event(timeline, 'break', current_time, BREAK_DURATION_MIN, base_date)
            duty_today += BREAK_DURATION_MIN
            cycle_hours_used += BREAK_DURATION_MIN / 60
            drive_today = 0

    # Delivery event after all driving is complete
    _ensure_cycle_time(DELIVERY_DURATION_MIN)
    current_time = _add_event(timeline, 'delivery', current_time, DELIVERY_DURATION_MIN, base_date)
    duty_today += DELIVERY_DURATION_MIN
    cycle_hours_used += DELIVERY_DURATION_MIN / 60
    
    return timeline
