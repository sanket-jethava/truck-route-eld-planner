from django.db import models


class LogSheet(models.Model):
    trip = models.ForeignKey('trips.Trip', on_delete=models.CASCADE, related_name='logs')
    day_number = models.IntegerField()
    date = models.DateField()
    log_data_json = models.JSONField()

    def __str__(self) -> str:
        return f"LogSheet {self.trip_id} day {self.day_number}"
