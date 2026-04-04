from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from apps.interviews.views import (
    StartInterviewView, ProcessResponseView, EndInterviewView, ResultsView, CodeUpdateView
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/interviews/', include('apps.interviews.urls')),
    # Prompt-compatible aliases
    path('api/start-interview', StartInterviewView.as_view(), name='alias-start-interview'),
    path('api/process-response', ProcessResponseView.as_view(), name='alias-process-response'),
    path('api/code-update', CodeUpdateView.as_view(), name='alias-code-update'),
    path('api/end-interview', EndInterviewView.as_view(), name='alias-end-interview'),
    path('api/results/<int:session_id>', ResultsView.as_view(), name='alias-results'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
