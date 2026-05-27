import pytest

from backend.services import routing_service


class DummyResponse:
    def __init__(self, json_data, status_code=200):
        self._json_data = json_data
        self.status_code = status_code

    def json(self):
        return self._json_data

    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception(f"HTTP {self.status_code}")


def test_geocode_location(monkeypatch):
    monkeypatch.setenv("ORS_API_KEY", "testkey")

    def fake_get(url, params, timeout):
        assert url.endswith("/geocode/search")
        assert params["text"] == "Dallas, TX"
        return DummyResponse({
            "features": [
                {
                    "geometry": {"coordinates": [-96.7970, 32.7767]},
                }
            ]
        })

    monkeypatch.setattr(routing_service, "requests", type("R", (), {"get": fake_get}))
    lat, lon = routing_service.geocode_location("Dallas, TX")
    assert lat == 32.7767
    assert lon == -96.7970


def test_calculate_route(monkeypatch):
    monkeypatch.setenv("ORS_API_KEY", "testkey")

    def fake_post(url, headers, json, timeout):
        assert url.endswith("/v2/directions/driving-car")
        assert json["coordinates"][0] == [-96.7970, 32.7767]
        return DummyResponse(
            {
                "features": [
                    {
                        "geometry": {
                            "coordinates": [[-96.7970, 32.7767], [-84.3880, 33.7490], [-118.2437, 34.0522]]
                        },
                        "properties": {"summary": {"distance": 2050.0, "duration": 72000}},
                    }
                ]
            }
        )

    monkeypatch.setattr(routing_service, "requests", type("R", (), {"post": fake_post}))
    route = routing_service.calculate_route((32.7767, -96.7970), (33.7490, -84.3880), (34.0522, -118.2437))
    assert route["distance_miles"] == 2050.0
    assert route["duration_hours"] == 20.0
    assert route["geometry"]["coordinates"][0] == [-96.7970, 32.7767]
