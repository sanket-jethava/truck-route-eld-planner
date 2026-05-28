"""Routing service for OpenRouteService geocoding and route calculation."""
from __future__ import annotations

import os
from math import acos, atan2, ceil, cos, radians, sin, sqrt
from typing import Dict, List, Tuple

import requests

ORS_BASE_URL = os.getenv("ORS_BASE_URL", "https://api.openrouteservice.org")

FUEL_DISTANCE_MILES = 1000


def _haversine_distance_miles(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    r = 3958.8
    phi1 = radians(lat1)
    phi2 = radians(lat2)
    dphi = radians(lat2 - lat1)
    dlambda = radians(lon2 - lon1)
    a = sin(dphi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(dlambda / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return r * c


def _interpolate_coordinate(start: Tuple[float, float], end: Tuple[float, float], fraction: float) -> Tuple[float, float]:
    lat1, lon1 = start
    lat2, lon2 = end
    return (lat1 + (lat2 - lat1) * fraction, lon1 + (lon2 - lon1) * fraction)


def _fuel_stop_coordinates(coordinates: List[List[float]], total_distance: float) -> List[Tuple[float, float]]:
    if total_distance <= FUEL_DISTANCE_MILES:
        return []

    points = [(coord[1], coord[0]) for coord in coordinates]
    segments = [
        _haversine_distance_miles(points[i], points[i + 1])
        for i in range(len(points) - 1)
    ]
    targets = list(range(FUEL_DISTANCE_MILES, int(total_distance) + 1, FUEL_DISTANCE_MILES))
    stops: List[Tuple[float, float]] = []
    current_distance = 0.0
    segment_index = 0

    for target in targets:
        while segment_index < len(segments) and current_distance + segments[segment_index] < target:
            current_distance += segments[segment_index]
            segment_index += 1

        if segment_index >= len(segments):
            break

        remaining = target - current_distance
        segment_length = segments[segment_index] or 1.0
        fraction = min(max(remaining / segment_length, 0.0), 1.0)
        stop_coord = _interpolate_coordinate(points[segment_index], points[segment_index + 1], fraction)
        stops.append(stop_coord)

    return stops


def _get_api_key() -> str:
    api_key = os.getenv("ORS_API_KEY")
    if not api_key:
        raise EnvironmentError("ORS_API_KEY environment variable is required")
    return api_key


def geocode_location(address: str) -> Tuple[float, float]:
    """Resolve an address to latitude and longitude."""
    if not address:
        raise ValueError("address must be provided")

    params = {
        "api_key": _get_api_key(),
        "text": address,
        "size": 1,
    }
    response = requests.get(f"{ORS_BASE_URL}/geocode/search", params=params, timeout=20)
    response.raise_for_status()
    data = response.json()
    features = data.get("features", [])
    if not features:
        raise ValueError(f"No geocoding result for address: {address}")
    
    lon, lat = features[0]["geometry"]["coordinates"]
    return lat, lon


def calculate_route(start: Tuple[float, float], via: Tuple[float, float], end: Tuple[float, float]) -> Dict[str, object]:
    """Calculate a route via a pickup waypoint and return trip details."""
    if not start or not end:
        raise ValueError("start and end coordinates are required")
    
    coords: List[List[float]] = [
        [start[1], start[0]],
        [via[1], via[0]],
        [end[1], end[0]],
    ]
    headers = {
        "Authorization": _get_api_key(),
        "Content-Type": "application/json",
    }
    body = {
        "coordinates": coords,
        # "format": "geojson",
        # "instructions": False,
        # "units": "mi",
    }
    response = requests.post(
        f"{ORS_BASE_URL}/v2/directions/driving-car/geojson",
        headers=headers,
        json=body,
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    routes = payload.get("features", [])
    if not routes:
        raise ValueError("No route could be calculated")   
    route = routes[0]
    summary = route.get("properties", {}).get("summary", {})
    geometry = route.get("geometry", {})
    coordinates = geometry.get("coordinates", [])   
    res = {
        "distance_miles": float(summary.get("distance", 0.0))/ 1000.0 * 0.60934,
        "duration_hours": float(summary.get("duration", 0.0)) / 3600.0,
        "geometry": geometry,
        "coordinates": coordinates,
        "start": start,
        "pickup": via,
        "end": end,
        "fuel_stop_coords": _fuel_stop_coordinates(coordinates, float(summary.get("distance", 0.0))),
    }
    
    return res
