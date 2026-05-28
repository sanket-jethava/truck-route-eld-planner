from django.db import models


class Stop(models.Model):
    TRIP_STOP_TYPES = [
        ('pickup', 'Pickup'),
        ('delivery', 'Delivery'),
        ('fuel', 'Fuel'),
        ('break', 'Break'),
        ('rest', 'Rest'),
    ]

    trip = models.ForeignKey('trips.Trip', on_delete=models.CASCADE, related_name='stops')
    type = models.CharField(max_length=20, choices=TRIP_STOP_TYPES)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    arrival_time = models.DateTimeField(null=True, blank=True)
    departure_time = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"Stop {self.pk} ({self.type})"
