"""ELD log generator converting HOS schedules into daily duty status segments."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, List

EVENT_STATUS_MAP = {
    "drive": 3,
    "break": 1,
    "rest": 2,
    "fuel": 4,
    "pickup": 4,
    "delivery": 4,
}


def _parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _status_for_event(event_type: str) -> int:
    return EVENT_STATUS_MAP.get(event_type, 4)


def generate_daily_logs(timeline: List[Dict]) -> List[Dict]:
    """Convert a timeline into daily ELD logs with status segments."""
    if not timeline:
        return []

    events: List[Dict] = sorted(timeline, key=lambda item: item["start"])
    logs_by_date: Dict[str, Dict] = {}

    for event in events:
        start = _parse_timestamp(event["start"])
        end = _parse_timestamp(event["end"])
        if end < start:
            raise ValueError("Event end time must be after start time")

        current = start
        while current < end:
            # boundary = datetime.combine(current.date() + timedelta(days=1), datetime.min.time())
            # boundary = datetime.combine(
            #     current.date() + timedelta(days=1),
            #     datetime.min.time()
            # ).replace(tzinfo=current.tzinfo)
            boundary = datetime.combine(
                current.date() + timedelta(days=1),
                datetime.min.time(),
                tzinfo=current.tzinfo,
            )
            segment_end = min(end, boundary)
            date_key = current.date().isoformat()

            logs_by_date.setdefault(date_key, {"date": date_key, "events": []})
            logs_by_date[date_key]["events"].append(
                {
                    "status": _status_for_event(event["type"]),
                    "type": event["type"],
                    "start": current.isoformat(),
                    "end": segment_end.isoformat(),
                    "duration_hours": (segment_end - current).total_seconds() / 3600.0,
                }
            )
            current = segment_end

    sorted_dates = sorted(logs_by_date.keys())
    daily_logs: List[Dict] = []
    for index, date_key in enumerate(sorted_dates, start=1):
        entry = logs_by_date[date_key]
        daily_logs.append(
            {
                "day": index,
                "date": entry["date"],
                "events": entry["events"],
            }
        )

    return daily_logs
