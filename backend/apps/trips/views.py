from datetime import datetime, timezone as dt_timezone

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status as drf_status
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from backend.apps.eld.models import LogSheet
from backend.apps.hos.models import Stop
from backend.apps.routing.models import Route
from backend.apps.trips.models import Trip
from backend.apps.trips.serializers import RegisterSerializer, TripInputSerializer, TripSerializer
from backend.services.eld_generator import generate_daily_logs
from backend.services.hos_engine import calculate_trip_schedule
from backend.services.routing_service import calculate_route, geocode_location


class RegisterAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({'id': user.id, 'username': user.username, 'email': user.email}, status=status.HTTP_201_CREATED)


class TripCalculateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            serializer = TripInputSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            validated = serializer.validated_data

            current_location = validated['current_location']
            pickup_location = validated['pickup_location']
            dropoff_location = validated['dropoff_location']
            current_cycle_used = validated['current_cycle_used']
            start_datetime = validated['start_datetime']
            
            if timezone.is_naive(start_datetime):
                start_datetime = timezone.make_aware(start_datetime, timezone.get_current_timezone())
            if start_datetime.tzinfo != dt_timezone.utc:
                start_datetime = start_datetime.astimezone(dt_timezone.utc)

            def get_week_key(dt):
                week = dt.isocalendar()
                return (week.year, week.week)

            selected_week = get_week_key(start_datetime)
            same_week_cycle_used = 0.0
            
            for existing_trip in Trip.objects.filter(owner=request.user, start_datetime__isnull=False).prefetch_related('routes'):
                if get_week_key(existing_trip.start_datetime) == selected_week:
                    route = existing_trip.routes.first()
                    if route:
                        same_week_cycle_used += route.drive_time_hours

            current_cycle_used = same_week_cycle_used

            current_coords = geocode_location(current_location)
            pickup_coords = geocode_location(pickup_location)
            dropoff_coords = geocode_location(dropoff_location)

            route_data = calculate_route(current_coords, pickup_coords, dropoff_coords)

            timeline = calculate_trip_schedule(
                distance_miles=route_data['distance_miles'],
                drive_time_hours=route_data['duration_hours'],
                current_cycle_used=current_cycle_used,
                start_datetime=start_datetime,
            )
            try:
                logs = generate_daily_logs(timeline)
            except Exception as e:
                print(f"Error generating logs: {str(e)}")
                logs = []
            trip_end = datetime.fromisoformat(timeline[-1]['end'])
            if timezone.is_naive(trip_end):
                trip_end = timezone.make_aware(trip_end, dt_timezone.utc)
            overlap_qs = Trip.objects.filter(owner=request.user, start_datetime__isnull=False, end_datetime__isnull=False).filter(
                Q(start_datetime__lt=trip_end) & Q(end_datetime__gt=start_datetime)
            )
            if overlap_qs.exists():
                return Response(
                    {'detail': 'Selected trip start date and time conflicts with an existing trip.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            def _stop_location(event_type):
                if event_type == 'pickup':
                    return pickup_coords
                if event_type == 'delivery':
                    return dropoff_coords
                return None

            def _parse_iso_datetime(value):
                try:
                    dt = datetime.fromisoformat(value)
                    return timezone.make_aware(dt) if timezone.is_naive(dt) else dt
                except Exception as e:
                    print(f"Error parsing datetime '{value}': {str(e)}")
                    return None

            stop_locations = {
                'pickup': pickup_coords,
                'delivery': dropoff_coords,
            }
            fuel_stop_coords = list(route_data.get('fuel_stop_coords', []))

            def _next_fuel_location():
                return fuel_stop_coords.pop(0) if fuel_stop_coords else None

            def _stop_coords(event_type):
                if event_type == 'fuel':
                    return _next_fuel_location()
                return stop_locations.get(event_type)

            def _build_stop(event):
                try:
                    loc = _stop_coords(event['type'])
                    return Stop(
                        trip=trip,
                        type=event['type'],
                        latitude=loc[0] if loc else None,
                        longitude=loc[1] if loc else None,
                        arrival_time=_parse_iso_datetime(event['start']),
                        departure_time=_parse_iso_datetime(event['end']),
                    )
                except Exception as e:
                    print(f"Error building stop for event {event}: {str(e)}")
                    return Stop(
                        trip=trip,
                        type=event['type'],
                        latitude=None,
                        longitude=None,
                        arrival_time=_parse_iso_datetime(event['start']),
                        departure_time=_parse_iso_datetime(event['end']),
                    )
            with transaction.atomic():
                trip = Trip.objects.create(
                    owner=request.user,
                    current_location=current_location,
                    pickup_location=pickup_location,
                    dropoff_location=dropoff_location,
                    current_cycle_used=current_cycle_used,
                    start_datetime=start_datetime,
                    end_datetime=trip_end,
                    timeline_json=timeline,
                )
                Route.objects.create(
                    trip=trip,
                    distance_miles=route_data['distance_miles'],
                    drive_time_hours=route_data['duration_hours'],
                    geometry=route_data['geometry'],
                )
                Stop.objects.bulk_create(
                    [
                        _build_stop(event)
                        for event in timeline
                        if event['type'] in {'pickup', 'delivery', 'fuel', 'break', 'rest'}
                    ]
                )
                LogSheet.objects.bulk_create(
                    [
                        LogSheet(
                            trip=trip,
                            day_number=entry['day'],
                            date=entry['date'],
                            log_data_json=entry,
                        )
                        for entry in logs
                    ]
                )

            fuel_response_coords = list(route_data.get('fuel_stop_coords', []))

            def _response_stop_coords(event_type):
                if event_type == 'fuel':
                    return fuel_response_coords.pop(0) if fuel_response_coords else None
                return _stop_location(event_type)

            def _stop_response(stop):
                loc = _response_stop_coords(stop['type'])
                return {
                    'type': stop['type'],
                    'latitude': loc[0] if loc else None,
                    'longitude': loc[1] if loc else None,
                    'arrival_time': stop['start'],
                    'departure_time': stop['end'],
                }

            return Response(
                {
                    'trip': {
                        'id': trip.id,
                        'current_location': trip.current_location,
                        'pickup_location': trip.pickup_location,
                        'dropoff_location': trip.dropoff_location,
                        'current_cycle_used': trip.current_cycle_used,
                        'start_datetime': trip.start_datetime,
                        'end_datetime': trip.end_datetime,
                        'timeline_json': trip.timeline_json,
                        'created_at': trip.created_at,
                    },
                    'route': route_data,
                    'timeline': timeline,
                    'logs': logs,
                    'stops': [
                        _stop_response(stop)
                        for stop in timeline
                        if stop['type'] in {'pickup', 'delivery', 'fuel'}
                    ],
                },
                status=status.HTTP_201_CREATED,
            )
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print("error in TripCalculateAPIView", str(e))
            return Response({'detail': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TripListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        trips = Trip.objects.filter(owner=request.user).order_by('-created_at')[:10]
        serializer = TripSerializer(trips, many=True)
        return Response({'results': serializer.data})


class TripRetrieveAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, *args, **kwargs):
        try:
            trip = Trip.objects.get(pk=pk)
            if trip.owner_id != request.user.id:
                return Response({'detail': 'Trip not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Trip.DoesNotExist:
            return Response({'detail': 'Trip not found.'}, status=status.HTTP_404_NOT_FOUND)

        route = Route.objects.filter(trip=trip).first()
        logs = [
            {
                'day_number': log.day_number,
                'date': log.date,
                'log_data_json': log.log_data_json,
            }
            for log in trip.logs.order_by('day_number')
        ]

        route_payload = None
        if route is not None:
            geometry = route.geometry
            route_payload = {
                'distance_miles': route.distance_miles,
                'drive_time_hours': route.drive_time_hours,
                'geometry': geometry,
                'coordinates': geometry.get('coordinates') if isinstance(geometry, dict) else None,
            }

        return Response(
            {
                'trip': {
                    'id': trip.id,
                    'current_location': trip.current_location,
                    'pickup_location': trip.pickup_location,
                    'dropoff_location': trip.dropoff_location,
                    'current_cycle_used': trip.current_cycle_used,
                    'start_datetime': trip.start_datetime,
                    'end_datetime': trip.end_datetime,
                    'timeline_json': trip.timeline_json,
                    'created_at': trip.created_at,
                },
                'route': route_payload,
                'timeline': trip.timeline_json,
                'logs': logs,
            }
        )


class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request, *args, **kwargs):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response({'detail': 'Refresh token required.'}, status=drf_status.HTTP_400_BAD_REQUEST)
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'detail': 'Refresh token blacklisted.'}, status=drf_status.HTTP_200_OK)
        except Exception as e:
            return Response({'detail': 'Invalid token.'}, status=drf_status.HTTP_400_BAD_REQUEST)
