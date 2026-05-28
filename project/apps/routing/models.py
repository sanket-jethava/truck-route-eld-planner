from django.db import models


class Route(models.Model):
    trip = models.ForeignKey('trips.Trip', on_delete=models.CASCADE, related_name='routes')
    distance_miles = models.FloatField()
    drive_time_hours = models.FloatField()
    geometry = models.JSONField(null=True, blank=True)

    def __str__(self) -> str:
        return f"Route {self.pk} ({self.distance_miles} mi)"
