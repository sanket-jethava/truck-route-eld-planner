from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from backend.apps.trips.views import RegisterAPIView
from backend.apps.trips.views import LogoutAPIView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/trips/', include('backend.apps.trips.urls')),
    path('api/auth/register/', RegisterAPIView.as_view(), name='register'),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/logout/', LogoutAPIView.as_view(), name='token_blacklist'),
]
