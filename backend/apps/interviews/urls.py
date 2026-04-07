from django.urls import path
from .views import (
    StartInterviewView, ProcessResponseView,
    EndInterviewView, ResultsView, SessionListView, TTSView, CodeUpdateView, ExecuteCodeView,
    DashboardStatsView, DashboardStreakView
)

urlpatterns = [
    path('start/', StartInterviewView.as_view(), name='start-interview'),
    path('respond/', ProcessResponseView.as_view(), name='process-response'),
    path('end/', EndInterviewView.as_view(), name='end-interview'),
    path('results/<int:session_id>/', ResultsView.as_view(), name='interview-results'),
    path('sessions/', SessionListView.as_view(), name='session-list'),
    path('tts/', TTSView.as_view(), name='tts'),
    path('code-update/', CodeUpdateView.as_view(), name='code-update'),
    path('execute-code/', ExecuteCodeView.as_view(), name='execute-code'),
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('dashboard/streak/', DashboardStreakView.as_view(), name='dashboard-streak'),
]

