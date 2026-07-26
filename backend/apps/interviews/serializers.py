from rest_framework import serializers
from .models import InterviewSession, ConversationHistory, Question, Answer, Evaluation, FinalResult


class ConversationHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ConversationHistory
        fields = ['id', 'speaker', 'message_text', 'timestamp']


class EvaluationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evaluation
        fields = ['id', 'score', 'feedback', 'strengths', 'weaknesses', 'created_at']


class AnswerSerializer(serializers.ModelSerializer):
    evaluation = EvaluationSerializer(read_only=True)

    class Meta:
        model = Answer
        fields = ['id', 'answer_text', 'submitted_at', 'evaluation']


class QuestionSerializer(serializers.ModelSerializer):
    answer = AnswerSerializer(read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'question_text', 'order', 'is_coding', 'test_cases', 'starter_code', 'created_at', 'answer']


class FinalResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinalResult
        fields = ['id', 'overall_score', 'summary', 'recommendation', 'strengths', 'weaknesses', 'created_at']


class InterviewSessionSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    result = FinalResultSerializer(read_only=True)
    conversation = ConversationHistorySerializer(many=True, read_only=True)

    class Meta:
        model = InterviewSession
        fields = [
            'id', 'role', 'level', 'type', 'difficulty', 'company',
            'max_questions', 'current_question_count', 'is_completed',
            'start_time', 'end_time', 'questions', 'result', 'conversation'
        ]


class StartInterviewSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=InterviewSession.ROLE_CHOICES, default='fullstack')
    level = serializers.ChoiceField(choices=InterviewSession.LEVEL_CHOICES, default='mid')
    type = serializers.ChoiceField(choices=InterviewSession.TYPE_CHOICES, default='mixed')
    difficulty = serializers.ChoiceField(choices=InterviewSession.DIFFICULTY_CHOICES, default='medium')
    company = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    max_questions = serializers.IntegerField(min_value=3, max_value=15, default=5)
    ai_voice = serializers.CharField(required=False, default='female')
    ai_gender = serializers.CharField(required=False, default='female')


class ProcessResponseSerializer(serializers.Serializer):
    session_id = serializers.IntegerField()
    answer_text = serializers.CharField()
    question_id = serializers.IntegerField()
    # Optional: when the answer is explaining a submitted coding solution,
    # the frontend passes the code + pass-rate so evaluation can weight correctness.
    code = serializers.CharField(required=False, allow_blank=True, default='')
    language = serializers.CharField(required=False, allow_blank=True, default='')
    coding_score = serializers.FloatField(required=False, default=None, allow_null=True)
    passed_count = serializers.IntegerField(required=False, default=0)
    total_cases = serializers.IntegerField(required=False, default=0)


class SubmitCodeSerializer(serializers.Serializer):
    session_id = serializers.IntegerField()
    question_id = serializers.IntegerField()
    code = serializers.CharField()
    language = serializers.CharField(required=False, default='javascript')
    passed_count = serializers.IntegerField(default=0)
    total_cases = serializers.IntegerField(default=0)


class CodeUpdateSerializer(serializers.Serializer):
    session_id = serializers.IntegerField()
    code_text = serializers.CharField()
    language = serializers.CharField(required=False, default='javascript')


class ExecuteCodeSerializer(serializers.Serializer):
    source_code = serializers.CharField()
    language_id = serializers.IntegerField(default=63)  # JavaScript (Node.js)
    language = serializers.CharField(required=False, default='javascript')
    stdin = serializers.CharField(required=False, allow_blank=True, default='')
    is_submission = serializers.BooleanField(required=False, default=False)
    # When False (the default), skip the Gemini complexity analysis. Running it
    # per-test-case adds several seconds of latency the caller usually ignores.
    analyze = serializers.BooleanField(required=False, default=False)
