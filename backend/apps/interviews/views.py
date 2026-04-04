"""
Interview API Views — the core logic layer.
"""
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model

from .models import InterviewSession, ConversationHistory, Question, Answer, Evaluation, FinalResult, CodeSnapshot
from .serializers import (
    StartInterviewSerializer, ProcessResponseSerializer,
    InterviewSessionSerializer, FinalResultSerializer, CodeUpdateSerializer, ExecuteCodeSerializer
)
from . import gemini_service
from .tts_service import text_to_speech_file
from .judge0_service import execute_code


class StartInterviewView(APIView):
    """
    POST /api/interviews/start/
    Creates a new interview session and generates the first question.
    """
    # Allow unauthenticated access for local demos and quick starts
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = StartInterviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # Determine user: allow guest sessions when unauthenticated
        if request.user and request.user.is_authenticated:
            user = request.user
        else:
            User = get_user_model()
            guest, _ = User.objects.get_or_create(username='guest', defaults={'email': 'guest@local'})
            user = guest

        # Create session
        session = InterviewSession.objects.create(
            user=user,
            role=data['role'],
            level=data['level'],
            type=data['type'],
            difficulty=data['difficulty'],
            max_questions=data['max_questions'],
        )

        try:
            # Generate first question via Gemini
            ai_data = gemini_service.generate_first_question(
                role=data['role'],
                level=data['level'],
                interview_type=data['type'],
                difficulty=data['difficulty'],
            )

            question_text = ai_data.get('question', 'Tell me about yourself and your background.')
            is_coding = ai_data.get('is_coding', False)

            # Save question to DB
            question = Question.objects.create(
                session=session,
                question_text=question_text,
                order=1,
                is_coding=is_coding,
            )

            # Save to conversation history
            ConversationHistory.objects.create(
                session=session,
                speaker='AI',
                message_text=question_text,
            )

            # Generate TTS audio (backend fallback)
            audio_url = text_to_speech_file(question_text)

            return Response({
                'session_id': session.id,
                'question_id': question.id,
                'question': question_text,
                'is_coding': is_coding,
                'audio_url': request.build_absolute_uri(audio_url),
                'question_number': 1,
                'total_questions': session.max_questions,
                'difficulty': session.difficulty,
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            session.delete()
            return Response(
                {'error': f'Failed to generate question: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ProcessResponseView(APIView):
    """
    POST /api/interviews/respond/
    Accepts candidate answer, evaluates it, returns next question.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ProcessResponseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        try:
            session = InterviewSession.objects.get(id=data['session_id'], user=request.user)
        except InterviewSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

        if session.is_completed:
            return Response({'error': 'Interview already completed'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            question = Question.objects.get(id=data['question_id'], session=session)
        except Question.DoesNotExist:
            return Response({'error': 'Question not found'}, status=status.HTTP_404_NOT_FOUND)

        # Save candidate answer
        answer = Answer.objects.create(
            question=question,
            answer_text=data['answer_text'],
        )

        # Save to conversation history
        ConversationHistory.objects.create(
            session=session,
            speaker='User',
            message_text=data['answer_text'],
        )

        # Build conversation history for Gemini context
        conv_history = [
            {'speaker': c.speaker, 'text': c.message_text}
            for c in session.conversation.all()
        ]

        session.current_question_count += 1
        question_number = session.current_question_count
        is_last = question_number >= session.max_questions

        try:
            ai_data = gemini_service.evaluate_and_next_question(
                role=session.role,
                level=session.level,
                interview_type=session.type,
                difficulty=session.difficulty,
                conversation_history=conv_history,
                current_question=question.question_text,
                candidate_answer=data['answer_text'],
                question_number=question_number,
                total_questions=session.max_questions,
            )
        except Exception as e:
            return Response(
                {'error': f'AI processing failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Save evaluation
        eval_data = ai_data.get('evaluation', {})
        evaluation = Evaluation.objects.create(
            answer=answer,
            score=eval_data.get('score', 5),
            feedback=eval_data.get('feedback', ''),
            strengths=eval_data.get('strengths', ''),
            weaknesses=eval_data.get('weaknesses', ''),
        )

        # Update difficulty if adapted
        adjusted_difficulty = ai_data.get('adjusted_difficulty', session.difficulty)
        session.difficulty = adjusted_difficulty
        session.save()

        response_payload = {
            'evaluation': {
                'score': evaluation.score,
                'feedback': evaluation.feedback,
                'strengths': evaluation.strengths,
                'weaknesses': evaluation.weaknesses,
            },
            'is_finished': ai_data.get('is_finished', is_last),
            'question_number': question_number,
            'total_questions': session.max_questions,
            'difficulty': session.difficulty,
        }

        if not ai_data.get('is_finished', is_last):
            next_text = ai_data.get('next_question', '')
            next_is_coding = ai_data.get('is_coding', False)

            if next_text:
                next_question = Question.objects.create(
                    session=session,
                    question_text=next_text,
                    order=question_number + 1,
                    is_coding=next_is_coding,
                )

                ConversationHistory.objects.create(
                    session=session,
                    speaker='AI',
                    message_text=next_text,
                )

                audio_url = text_to_speech_file(next_text)

                response_payload.update({
                    'next_question_id': next_question.id,
                    'next_question': next_text,
                    'is_coding': next_is_coding,
                    'audio_url': request.build_absolute_uri(audio_url),
                })
        else:
            session.is_completed = True
            session.end_time = timezone.now()
            session.save()

        return Response(response_payload, status=status.HTTP_200_OK)


class EndInterviewView(APIView):
    """
    POST /api/interviews/end/
    Generate the final performance report.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_id = request.data.get('session_id')
        if not session_id:
            return Response({'error': 'session_id required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            session = InterviewSession.objects.get(id=session_id, user=request.user)
        except InterviewSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check if result already exists
        if hasattr(session, 'result'):
            return Response(FinalResultSerializer(session.result).data)

        # Collect all evaluations
        evaluations = []
        for q in session.questions.all():
            if hasattr(q, 'answer') and hasattr(q.answer, 'evaluation'):
                ev = q.answer.evaluation
                evaluations.append({
                    'score': ev.score,
                    'feedback': ev.feedback,
                    'strengths': ev.strengths,
                    'weaknesses': ev.weaknesses,
                })

        if not evaluations:
            return Response({'error': 'No evaluations found'}, status=status.HTTP_400_BAD_REQUEST)

        conv_text = "\n".join([
            f"{c.speaker}: {c.message_text}"
            for c in session.conversation.all()
        ])

        try:
            report_data = gemini_service.generate_final_report(
                role=session.role,
                level=session.level,
                interview_type=session.type,
                evaluations=evaluations,
                conversation_summary=conv_text[-3000:],  # Limit length
            )
        except Exception as e:
            return Response(
                {'error': f'Report generation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        final_result = FinalResult.objects.create(
            session=session,
            overall_score=report_data.get('overall_score', 0),
            summary=report_data.get('summary', ''),
            recommendation=report_data.get('recommendation', ''),
            strengths=report_data.get('strengths', ''),
            weaknesses=report_data.get('weaknesses', ''),
        )

        if not session.is_completed:
            session.is_completed = True
            session.end_time = timezone.now()
            session.save()

        return Response({
            'session_id': session.id,
            'result': FinalResultSerializer(final_result).data,
            'study_plan': report_data.get('study_plan', ''),
        }, status=status.HTTP_201_CREATED)


class ResultsView(APIView):
    """
    GET /api/interviews/results/<session_id>/
    Fetch the full session with results.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        try:
            session = InterviewSession.objects.get(id=session_id, user=request.user)
        except InterviewSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = InterviewSessionSerializer(session)
        return Response(serializer.data)


class SessionListView(APIView):
    """
    GET /api/interviews/sessions/
    List all sessions for the current user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = InterviewSession.objects.filter(user=request.user).order_by('-start_time')
        data = []
        for s in sessions:
            result = None
            if hasattr(s, 'result'):
                result = {'overall_score': s.result.overall_score}
            data.append({
                'id': s.id,
                'role': s.role,
                'level': s.level,
                'type': s.type,
                'is_completed': s.is_completed,
                'start_time': s.start_time,
                'result': result,
            })
        return Response(data)


class TTSView(APIView):
    """
    POST /api/interviews/tts/
    Convert text to speech and return audio URL.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        text = request.data.get('text', '')
        if not text:
            return Response({'error': 'text is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            audio_url = text_to_speech_file(text)
            return Response({'audio_url': request.build_absolute_uri(audio_url)})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CodeUpdateView(APIView):
    """
    POST /api/interviews/code-update/
    Save code snapshot and return contextual AI feedback + probing question.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CodeUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        try:
            session = InterviewSession.objects.get(id=data['session_id'], user=request.user)
        except InterviewSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

        code_text = data['code_text']
        language = data.get('language', 'javascript')
        conv_history = [
            {'speaker': c.speaker, 'text': c.message_text}
            for c in session.conversation.all()
        ]

        try:
            ai_data = gemini_service.analyze_code_update(
                role=session.role,
                level=session.level,
                difficulty=session.difficulty,
                conversation_history=conv_history,
                code_text=code_text,
                language=language,
            )
        except Exception as e:
            return Response(
                {'error': f'AI code analysis failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        snapshot = CodeSnapshot.objects.create(
            session=session,
            code_text=code_text,
            language=language,
            ai_feedback=ai_data.get('feedback', ''),
            ai_question=ai_data.get('question', ''),
        )

        return Response({
            'snapshot_id': snapshot.id,
            'feedback': snapshot.ai_feedback,
            'question': snapshot.ai_question,
            'line_hints': ai_data.get('line_hints', []),
        }, status=status.HTTP_200_OK)


class ExecuteCodeView(APIView):
    """
    POST /api/interviews/execute-code/
    Execute candidate code through Judge0 and analyze complexity.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ExecuteCodeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        
        # Execute code via Judge0
        result = execute_code(
            source_code=data['source_code'],
            language_id=data.get('language_id', 63),
            stdin=data.get('stdin', ''),
        )
        
        # Analyze complexity using Gemini
        language = data.get('language', 'javascript')
        complexity_analysis = gemini_service.analyze_code_complexity(
            code_text=data['source_code'],
            language=language,
        )
        
        # Structure response with test results and complexity
        response_data = {
            'passed': result.get('status_id', 0) == 3,  # Status 3 = Accepted
            'output': result.get('stdout', ''),
            'status': result.get('status', {}).get('description', 'Unknown'),
            'time_complexity': complexity_analysis.get('time_complexity', 'O(n)'),
            'space_complexity': complexity_analysis.get('space_complexity', 'O(1)'),
            'suggestions': complexity_analysis.get('suggestions', []),
            'feedback': f"Logic score: {complexity_analysis.get('logic_score', 5)}/10",
            'test_results': [
                {
                    'input': 'Sample test',
                    'expected': 'Sample output',
                    'actual': result.get('stdout', ''),
                    'passed': result.get('status_id', 0) == 3,
                }
            ]
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
