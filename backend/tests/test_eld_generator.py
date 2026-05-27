from backend.services.eld_generator import generate_daily_logs


def test_generate_daily_logs_single_day():
    timeline = [
        {
            "type": "pickup",
            "start": "2026-01-01T08:00:00",
            "end": "2026-01-01T09:00:00",
        },
        {
            "type": "drive",
            "start": "2026-01-01T09:00:00",
            "end": "2026-01-01T12:00:00",
        },
        {
            "type": "break",
            "start": "2026-01-01T12:00:00",
            "end": "2026-01-01T12:30:00",
        },
        {
            "type": "delivery",
            "start": "2026-01-01T12:30:00",
            "end": "2026-01-01T13:30:00",
        },
    ]
    logs = generate_daily_logs(timeline)
    assert len(logs) == 1
    day1 = logs[0]
    assert day1["day"] == 1
    assert day1["date"] == "2026-01-01"
    assert [event["status"] for event in day1["events"]] == [4, 3, 1, 4]


def test_generate_daily_logs_crosses_midnight():
    timeline = [
        {
            "type": "drive",
            "start": "2026-01-01T22:00:00",
            "end": "2026-01-02T02:00:00",
        }
    ]
    logs = generate_daily_logs(timeline)
    assert len(logs) == 2
    assert logs[0]["date"] == "2026-01-01"
    assert logs[0]["events"][0]["end"] == "2026-01-02T00:00:00"
    assert logs[1]["date"] == "2026-01-02"
    assert logs[1]["events"][0]["start"] == "2026-01-02T00:00:00"
