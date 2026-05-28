import pytest

from backend.apps.trips import views as trip_views
from backend.apps.trips.models import Trip
from backend.apps.routing.models import Route
from backend.apps.eld.models import LogSheet


@pytest.mark.django_db
def test_trip_history_list_view(client):
    trip = Trip.objects.create(
        current_location='Dallas, TX',
        pickup_location='Austin, TX',
        dropoff_location='Houston, TX',
        current_cycle_used=2.5,
        timeline_json=[
            {
                'type': 'pickup',
                'start': '2026-01-01T08:00:00',
                'end': '2026-01-01T09:00:00',
                'duration_hours': 1.0,
                'details': {},
            }
        ],
    )
    Route.objects.create(trip=trip, distance_miles=200.0, drive_time_hours=3.0, geometry={})
    LogSheet.objects.create(trip=trip, day_number=1, date='2026-01-01', log_data_json={})

    response = client.get('/api/trips/')

    assert response.status_code == 200
    data = response.json()
    assert 'results' in data
    assert len(data['results']) == 1
    assert data['results'][0]['id'] == trip.id
    assert data['results'][0]['current_location'] == 'Dallas, TX'


@pytest.mark.django_db
def test_trip_calculation_creates_stops_and_returns_coordinates(client, monkeypatch):
    monkeypatch.setattr(trip_views, 'geocode_location', lambda address: {
        'Dallas, TX': (32.7767, -96.7970),
        'Austin, TX': (30.2672, -97.7431),
        'Houston, TX': (29.7604, -95.3698),
    }[address])

    def fake_calculate_route(start, via, end):
        return {
            'distance_miles': 1800.0,
            'duration_hours': 25.0,
            'geometry': {'type': 'LineString', 'coordinates': [[-96.7970, 32.7767], [-97.7431, 30.2672], [-95.3698, 29.7604]]},
            'coordinates': [[-96.7970, 32.7767], [-97.7431, 30.2672], [-95.3698, 29.7604]],
            'start': (32.7767, -96.7970),
            'pickup': (30.2672, -97.7431),
            'end': (29.7604, -95.3698),
            'fuel_stop_coords': [(31.5, -96.0)],
        }

    monkeypatch.setattr(trip_views, 'calculate_route', fake_calculate_route)

    response = client.post(
        '/api/trips/calculate/',
        {
            'current_location': 'Dallas, TX',
            'pickup_location': 'Austin, TX',
            'dropoff_location': 'Houston, TX',
            'current_cycle_used': 10,
        },
        content_type='application/json',
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload['route']['start'] == [32.7767, -96.7970]
    assert payload['route']['pickup'] == [30.2672, -97.7431]
    assert payload['route']['end'] == [29.7604, -95.3698]
    assert payload['route']['fuel_stop_coords'] == [[31.5, -96.0]]
    assert {stop['type'] for stop in payload['stops']} == {'pickup', 'delivery', 'fuel'}
    fuel_stop = next(stop for stop in payload['stops'] if stop['type'] == 'fuel')
    assert fuel_stop['latitude'] == 31.5
    assert fuel_stop['longitude'] == -96.0


@pytest.mark.django_db
def test_trip_retrieve_view_returns_route_and_logs(client):
    trip = Trip.objects.create(
        current_location='Chicago, IL',
        pickup_location='Milwaukee, WI',
        dropoff_location='Madison, WI',
        current_cycle_used=1.0,
        timeline_json=[],
    )
    Route.objects.create(trip=trip, distance_miles=150.0, drive_time_hours=2.5, geometry={})
    LogSheet.objects.create(trip=trip, day_number=1, date='2026-01-01', log_data_json={})

    response = client.get(f'/api/trips/{trip.id}/')

    assert response.status_code == 200
    payload = response.json()
    assert payload['trip']['id'] == trip.id
    assert payload['route']['distance_miles'] == 150.0
    assert payload['logs'][0]['day_number'] == 1
