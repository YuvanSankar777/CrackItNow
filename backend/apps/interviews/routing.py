from django.urls import re_path
from .consumers import InterviewSessionConsumer

websocket_urlpatterns = [
    re_path(r'^ws/interview/(?P<session_id>\d+)/$', InterviewSessionConsumer.as_asgi()),
]
