from django.db import models
from django.conf import settings


class InterviewSession(models.Model):
    ROLE_CHOICES = [
        ('frontend', 'Frontend Developer'),
        ('backend', 'Backend Developer'),
        ('fullstack', 'Full Stack Developer'),
        ('data_science', 'Data Scientist'),
        ('ml_engineer', 'ML Engineer'),
        ('devops', 'DevOps Engineer'),
        ('system_design', 'System Design'),
        ('product_manager', 'Product Manager'),
        ('general', 'General'),
    ]
    LEVEL_CHOICES = [
        ('junior', 'Junior'),
        ('mid', 'Mid-Level'),
        ('senior', 'Senior'),
        ('lead', 'Lead'),
    ]
    TYPE_CHOICES = [
        ('technical', 'Technical'),
        ('behavioral', 'Behavioral'),
        ('mixed', 'Mixed'),
        ('coding', 'Coding'),
    ]
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sessions')
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='general')
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='mid')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='mixed')
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='medium')
    max_questions = models.IntegerField(default=5)
    current_question_count = models.IntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-start_time']

    def __str__(self):
        return f"{self.user.email} - {self.role} ({self.level}) - {self.start_time.date()}"


class ConversationHistory(models.Model):
    SPEAKER_CHOICES = [('AI', 'AI'), ('User', 'User')]

    session = models.ForeignKey(InterviewSession, on_delete=models.CASCADE, related_name='conversation')
    speaker = models.CharField(max_length=10, choices=SPEAKER_CHOICES)
    message_text = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"[{self.speaker}] {self.message_text[:60]}"


class Question(models.Model):
    session = models.ForeignKey(InterviewSession, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    order = models.IntegerField(default=0)
    is_coding = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Q{self.order}: {self.question_text[:80]}"


class Answer(models.Model):
    question = models.OneToOneField(Question, on_delete=models.CASCADE, related_name='answer')
    answer_text = models.TextField()
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Answer to Q{self.question.order}"


class Evaluation(models.Model):
    answer = models.OneToOneField(Answer, on_delete=models.CASCADE, related_name='evaluation')
    score = models.FloatField(default=0)  # 0–10
    feedback = models.TextField()
    strengths = models.TextField(blank=True)
    weaknesses = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Eval: {self.score}/10 — {self.feedback[:60]}"


class FinalResult(models.Model):
    session = models.OneToOneField(InterviewSession, on_delete=models.CASCADE, related_name='result')
    overall_score = models.FloatField(default=0)
    summary = models.TextField()
    recommendation = models.TextField()
    strengths = models.TextField(blank=True)
    weaknesses = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Result for session {self.session.id} — {self.overall_score}/10"


class CodeSnapshot(models.Model):
    session = models.ForeignKey(InterviewSession, on_delete=models.CASCADE, related_name='code_snapshots')
    code_text = models.TextField()
    language = models.CharField(max_length=30, default='javascript')
    ai_feedback = models.TextField(blank=True)
    ai_question = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"CodeSnapshot(session={self.session_id}, lang={self.language})"
