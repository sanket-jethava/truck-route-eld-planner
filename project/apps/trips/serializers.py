from django.contrib.auth.models import User
from rest_framework import serializers

from backend.apps.eld.models import LogSheet
from backend.apps.routing.models import Route
from backend.apps.trips.models import Trip


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('A user with that username already exists.')
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
        )


class TripInputSerializer(serializers.Serializer):
    current_location = serializers.CharField(max_length=255)
    pickup_location = serializers.CharField(max_length=255)
    dropoff_location = serializers.CharField(max_length=255)
    current_cycle_used = serializers.FloatField(min_value=0)
    start_datetime = serializers.DateTimeField()


class RouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Route
        fields = ['distance_miles', 'drive_time_hours', 'geometry']


class LogSheetSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogSheet
        fields = ['day_number', 'date', 'log_data_json']


class TripSerializer(serializers.ModelSerializer):
    drive_time_hours = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = [
            'id',
            'current_location',
            'pickup_location',
            'dropoff_location',
            'current_cycle_used',
            'start_datetime',
            'end_datetime',
            'drive_time_hours',
            'timeline_json',
            'created_at',
        ]

    def get_drive_time_hours(self, obj):
        route = obj.routes.first()
        return route.drive_time_hours if route else 0.0
