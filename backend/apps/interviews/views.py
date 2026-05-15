"""
Interview API Views — the core logic layer.
"""
from django.utils import timezone
from datetime import date, timedelta
from collections import defaultdict
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model

from .models import InterviewSession, ConversationHistory, Question, Answer, Evaluation, FinalResult, CodeSnapshot
from .serializers import (
    StartInterviewSerializer, ProcessResponseSerializer,
    InterviewSessionSerializer, FinalResultSerializer, CodeUpdateSerializer, ExecuteCodeSerializer,
    SubmitCodeSerializer,
)
from . import gemini_service
from .tts_service import text_to_speech_file as _tts_file
from .judge0_service import execute_code, Judge0Error


def _safe_tts(text: str) -> str:
    """Wrap gTTS so upstream failures don't take the whole endpoint with them."""
    try:
        return _tts_file(text)
    except Exception as e:
        print(f'TTS failed (ignored): {e}')
        return ''


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
            company=data.get('company'),
            max_questions=data['max_questions'],
        )

        try:
            # Generate first question via Gemini
            ai_data = gemini_service.generate_first_question(
                role=data['role'],
                level=data['level'],
                interview_type=data['type'],
                difficulty=data['difficulty'],
                company=data.get('company'),
            )

            question_text = ai_data.get('question', 'Tell me about yourself and your background.')
            is_coding = ai_data.get('is_coding', False)
            test_cases = ai_data.get('test_cases', []) if is_coding else []
            starter_code = ai_data.get('starter_code', {}) if is_coding else {}

            # Save question to DB
            question = Question.objects.create(
                session=session,
                question_text=question_text,
                order=1,
                is_coding=is_coding,
                test_cases=test_cases,
                starter_code=starter_code,
            )

            # Save to conversation history
            ConversationHistory.objects.create(
                session=session,
                speaker='AI',
                message_text=question_text,
            )

            # Generate TTS audio (backend fallback)
            audio_url = _safe_tts(question_text)

            return Response({
                'session_id': session.id,
                'question_id': question.id,
                'question': question_text,
                'is_coding': is_coding,
                'test_cases': test_cases,
                'starter_code': starter_code,
                'audio_url': request.build_absolute_uri(audio_url),
                'question_number': 1,
                'total_questions': session.max_questions,
                'difficulty': session.difficulty,
                'company': session.company or '',
                'role': session.role,
                'level': session.level,
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
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ProcessResponseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        try:
            # Support both authenticated and guest sessions
            if request.user and request.user.is_authenticated:
                session = InterviewSession.objects.get(id=data['session_id'], user=request.user)
            else:
                session = InterviewSession.objects.get(id=data['session_id'])
        except InterviewSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

        if session.is_completed:
            return Response({'error': 'Interview already completed'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            question = Question.objects.get(id=data['question_id'], session=session)
        except Question.DoesNotExist:
            return Response({'error': 'Question not found'}, status=status.HTTP_404_NOT_FOUND)

        # Save candidate answer. If one already exists for this question
        # (e.g. the user answered, then spoke again), update it instead of erroring.
        combined_text = data['answer_text']
        if data.get('code'):
            combined_text = (
                f"{data['answer_text']}\n\n"
                f"--- Submitted code ({data.get('language') or 'code'}, "
                f"{data.get('passed_count', 0)}/{data.get('total_cases', 0)} tests passed) ---\n"
                f"{data['code']}"
            )
        answer, _ = Answer.objects.update_or_create(
            question=question,
            defaults={'answer_text': combined_text},
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

        # When this /respond/ call is answering the post-submission follow-up
        # (we know because `code` was sent), reframe the context so Gemini
        # doesn't mistake it for an unanswered coding question and re-ask it.
        if data.get('code'):
            last_ai = next(
                (c.message_text for c in reversed(list(session.conversation.all()))
                 if c.speaker == 'AI'),
                question.question_text,
            )
            current_q_for_ai = (
                f"[CODE ALREADY SUBMITTED AND PASSED {data.get('passed_count', 0)}/"
                f"{data.get('total_cases', 0)} TEST CASES for the problem: "
                f"{question.question_text[:200]}...] "
                f"The candidate is now answering this follow-up: \"{last_ai}\""
            )
        else:
            current_q_for_ai = question.question_text

        try:
            ai_data = gemini_service.evaluate_and_next_question(
                role=session.role,
                level=session.level,
                interview_type=session.type,
                difficulty=session.difficulty,
                company=session.company,
                conversation_history=conv_history,
                current_question=current_q_for_ai,
                candidate_answer=data['answer_text'],
                question_number=question_number,
                total_questions=session.max_questions,
            )
        except Exception as e:
            return Response(
                {'error': f'AI processing failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Save evaluation. If this answer already had one, update in place.
        eval_data = ai_data.get('evaluation', {})
        explanation_score = float(eval_data.get('score', 5) or 5)

        # When the candidate submitted code alongside this answer, blend the coding
        # correctness score (from pass-ratio + the follow-up's coding_score) with
        # the explanation score so the final evaluation reflects both.
        final_score = explanation_score
        coding_score = data.get('coding_score')
        total_cases = data.get('total_cases', 0) or 0
        passed_count = data.get('passed_count', 0) or 0
        if data.get('code') and total_cases > 0:
            pass_ratio_score = (passed_count / total_cases) * 10.0
            code_component = float(coding_score) if coding_score is not None else pass_ratio_score
            # 60% code correctness, 40% explanation quality.
            final_score = round(0.6 * code_component + 0.4 * explanation_score, 1)

        evaluation, _ = Evaluation.objects.update_or_create(
            answer=answer,
            defaults={
                'score': final_score,
                'feedback': eval_data.get('feedback', ''),
                'strengths': eval_data.get('strengths', ''),
                'weaknesses': eval_data.get('weaknesses', ''),
            },
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
            next_tests = ai_data.get('test_cases', []) if next_is_coding else []
            next_starter = ai_data.get('starter_code', {}) if next_is_coding else {}

            if next_text:
                next_question = Question.objects.create(
                    session=session,
                    question_text=next_text,
                    order=question_number + 1,
                    is_coding=next_is_coding,
                    test_cases=next_tests,
                    starter_code=next_starter,
                )

                ConversationHistory.objects.create(
                    session=session,
                    speaker='AI',
                    message_text=next_text,
                )

                audio_url = _safe_tts(next_text)

                response_payload.update({
                    'next_question_id': next_question.id,
                    'next_question': next_text,
                    'is_coding': next_is_coding,
                    'test_cases': next_tests,
                    'starter_code': next_starter,
                    'audio_url': request.build_absolute_uri(audio_url),
                })
        else:
            session.is_completed = True
            session.end_time = timezone.now()
            session.save()

        return Response(response_payload, status=status.HTTP_200_OK)


class SubmitCodeView(APIView):
    """
    POST /api/interviews/submit-code/
    Candidate submits their coding solution. Returns a single probing follow-up
    question the interviewer asks next. No Answer row is created here — that
    happens when the candidate answers the follow-up via /respond/.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SubmitCodeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data

        try:
            session = InterviewSession.objects.get(id=data['session_id'])
        except InterviewSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)
        try:
            question = Question.objects.get(id=data['question_id'], session=session)
        except Question.DoesNotExist:
            return Response({'error': 'Question not found'}, status=status.HTTP_404_NOT_FOUND)

        # Persist the submitted code as a CodeSnapshot so it shows up in history.
        CodeSnapshot.objects.create(
            session=session,
            code_text=data['code'],
            language=data.get('language', 'javascript'),
        )

        followup = gemini_service.generate_code_followup(
            question_text=question.question_text,
            code=data['code'],
            language=data.get('language', 'javascript'),
            passed_count=data.get('passed_count', 0),
            total_cases=data.get('total_cases', 0),
        )

        ConversationHistory.objects.create(
            session=session,
            speaker='AI',
            message_text=followup.get('followup_question', ''),
        )

        audio_url = _safe_tts(followup.get('followup_question', ''))

        return Response({
            'followup_question': followup.get('followup_question', ''),
            'optimization_hint': followup.get('optimization_hint', ''),
            'coding_score': followup.get('coding_score', 5),
            'strengths': followup.get('strengths', ''),
            'weaknesses': followup.get('weaknesses', ''),
            'audio_url': request.build_absolute_uri(audio_url) if audio_url else '',
        }, status=status.HTTP_200_OK)


class EndInterviewView(APIView):
    """
    POST /api/interviews/end/
    Generate the final performance report.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        session_id = request.data.get('session_id')
        if not session_id:
            return Response({'error': 'session_id required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            session = InterviewSession.objects.get(id=session_id)
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
                'difficulty': s.difficulty,
                'company': s.company,
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
            audio_url = _safe_tts(text)
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
    No authentication required — code execution is standalone.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ExecuteCodeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data

        # Execute code via Judge0
        try:
            result = execute_code(
                source_code=data['source_code'],
                language_id=data.get('language_id', 63),
                stdin=data.get('stdin', ''),
            )
        except Judge0Error as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as e:
            return Response(
                {'error': f'Unexpected execution failure: {e}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Determine success/failure from Judge0 response
        status_id = result.get('status_id') or (result.get('status') or {}).get('id', 0)
        stderr = (result.get('stderr') or '').strip()
        compile_output = (result.get('compile_output') or '').strip()
        stdout = (result.get('stdout') or '').strip()

        # Status 3 = Accepted in Judge0
        passed = status_id == 3

        # Determine human-readable status
        status_desc = (result.get('status') or {}).get('description', '')
        if compile_output and not passed:
            display_status = 'Compilation Error'
        elif stderr and not passed:
            display_status = 'Runtime Error'
        elif passed:
            display_status = 'Accepted ✓'
        else:
            display_status = status_desc or 'Wrong Answer'

        # Combine output for display
        display_output = stdout
        if compile_output:
            display_output = compile_output
        elif stderr and not passed:
            display_output = stderr

        # Analyze complexity using Gemini (optional, non-blocking)
        language = data.get('language', 'javascript')
        complexity_analysis = {}
        try:
            complexity_analysis = gemini_service.analyze_code_complexity(
                code_text=data['source_code'],
                language=language,
            )
        except Exception:
            pass

        response_data = {
            'passed': passed,
            'output': display_output,
            'status': display_status,
            'time_complexity': complexity_analysis.get('time_complexity', ''),
            'space_complexity': complexity_analysis.get('space_complexity', ''),
            'suggestions': complexity_analysis.get('suggestions', []),
            'feedback': complexity_analysis.get('feedback', ''),
        }

        return Response(response_data, status=status.HTTP_200_OK)


class DashboardStatsView(APIView):
    """
    GET /api/interviews/dashboard/stats/
    Returns aggregated stats for the current user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = InterviewSession.objects.filter(user=request.user)
        completed = sessions.filter(is_completed=True)
        in_progress = sessions.filter(is_completed=False)

        # Average score
        scores = []
        for s in completed:
            if hasattr(s, 'result') and s.result:
                scores.append(s.result.overall_score)
        avg_score = round(sum(scores) / len(scores), 1) if scores else None

        # Company stats
        company_map = defaultdict(lambda: {'attempts': 0, 'scores': []})
        for s in sessions:
            key = s.company or 'General'
            company_map[key]['attempts'] += 1
            if hasattr(s, 'result') and s.result:
                company_map[key]['scores'].append(s.result.overall_score)

        company_stats = {}
        for company, data in company_map.items():
            company_stats[company] = {
                'attempts': data['attempts'],
                'avg_score': round(sum(data['scores']) / len(data['scores']), 1) if data['scores'] else None,
            }

        # Recent sessions
        recent = []
        for s in sessions.order_by('-start_time')[:8]:
            result = None
            if hasattr(s, 'result') and s.result:
                result = {'overall_score': s.result.overall_score}
            recent.append({
                'id': s.id,
                'role': s.role,
                'company': s.company,
                'level': s.level,
                'difficulty': s.difficulty,
                'is_completed': s.is_completed,
                'start_time': s.start_time,
                'result': result,
            })

        return Response({
            'total_sessions': sessions.count(),
            'completed': completed.count(),
            'in_progress': in_progress.count(),
            'average_score': avg_score,
            'company_stats': company_stats,
            'recent_sessions': recent,
        })


class DashboardStreakView(APIView):
    """
    GET /api/interviews/dashboard/streak/
    Returns streak data + 365-day activity map.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = InterviewSession.objects.filter(user=request.user).order_by('start_time')

        # Build activity map for past 365 days
        today = date.today()
        activity = defaultdict(int)
        for s in sessions:
            day = s.start_time.date()
            if (today - day).days <= 365:
                activity[day.isoformat()] += 1

        # Compute streaks
        current_streak = 0
        longest_streak = 0
        streak = 0
        check_day = today

        # Collect unique active days
        active_days = sorted(set(s.start_time.date() for s in sessions), reverse=True)

        for i, day in enumerate(active_days):
            if i == 0:
                if (today - day).days <= 1:
                    streak = 1
                else:
                    break
            else:
                prev = active_days[i - 1]
                if (prev - day).days == 1:
                    streak += 1
                else:
                    break
        current_streak = streak

        # Longest streak (ascending pass)
        asc_days = sorted(set(s.start_time.date() for s in sessions))
        run = 0
        for i, d in enumerate(asc_days):
            if i == 0:
                run = 1
            else:
                if (d - asc_days[i - 1]).days == 1:
                    run += 1
                else:
                    run = 1
            longest_streak = max(longest_streak, run)

        return Response({
            'current_streak': current_streak,
            'longest_streak': longest_streak,
            'activity': dict(activity),
        })
