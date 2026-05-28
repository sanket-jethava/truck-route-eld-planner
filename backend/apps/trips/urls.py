from django.urls import path

from backend.apps.trips.views import TripCalculateAPIView, TripListAPIView, TripRetrieveAPIView

urlpatterns = [
    path('', TripListAPIView.as_view(), name='trip-list'),
    path('calculate/', TripCalculateAPIView.as_view(), name='trip-calculate'),
    path('<int:pk>/', TripRetrieveAPIView.as_view(), name='trip-detail'),
]
