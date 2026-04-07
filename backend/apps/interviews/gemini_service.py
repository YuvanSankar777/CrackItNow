"""
Gemini AI Service — handles all AI interactions for the interview engine.
"""
import json
import re
import google.generativeai as genai
from django.conf import settings

genai.configure(api_key=settings.GEMINI_API_KEY)


def _get_company_prompt_additive(company: str) -> str:
    if not company:
        return ""
    company_lower = company.lower()
    if 'google' in company_lower:
        return "You must focus heavily on Data Structures, Algorithms, and deep problem-solving skills, imitating a Google interview style."
    elif 'amazon' in company_lower:
        return "You must focus on Data Structures, Algorithms, and closely integrate Amazon's Leadership Principles into the scenarios."
    elif 'microsoft' in company_lower:
        return "You must focus on Coding fundamentals and incorporate system design basics, imitating a Microsoft interview."
    elif 'meta' in company_lower:
        return "You must focus on Data Structures, Algorithms, time/space complexity optimization, and fast pacing, imitating a Meta interview."
    elif 'apple' in company_lower:
        return "You must focus on low-level system understanding, meticulousness, and challenging edge cases."
    elif 'netflix' in company_lower:
        return "You must focus heavily on System Design, distributed systems, and massive scalability."
    elif 'adobe' in company_lower:
        return "You must focus on practical coding, robust code architecture, and object-oriented design."
    elif 'ibm' in company_lower:
        return "You must focus on engineering fundamentals, reliability, and traditional design patterns."
    elif 'oracle' in company_lower:
        return "You must focus heavily on Databases, SQL, indexing nuances, and transactional guarantees."
    elif 'salesforce' in company_lower:
        return "You must focus on Backend engineering, robust APIs, cloud architecture, and multi-tenant system design."
    return ""


def _fallback_first_question(role: str, level: str, difficulty: str, interview_type: str) -> dict:
    title_map = {
        'frontend': 'Two Sum',
        'backend': 'Valid Parentheses',
        'fullstack': 'Merge Intervals',
        'general': 'Palindrome Check'
    }
    prompt_map = {
        'frontend': 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
        'backend': 'Given a string containing only the characters ()[]{} determine if the input string is valid.',
        'fullstack': 'Given an array of intervals where intervals[i] = [start, end], merge all overlapping intervals.',
        'general': 'Return true if the given string is a palindrome after ignoring non-alphanumeric characters and casing.'
    }
    role_key = role if role in prompt_map else 'fullstack'
    return {
        'question': f"Hello — let's start with a problem: {prompt_map[role_key]}",
        'is_coding': True
    }


def _fallback_evaluate_and_next(role, level, interview_type, difficulty, conversation_history, current_question, candidate_answer, question_number, total_questions):
    # Simple heuristic fallback: score by length of answer
    score = min(10, max(0, int(len(candidate_answer) / 20))) if candidate_answer else 3
    is_last = question_number >= total_questions
    
    snippet = candidate_answer[:40] + "..." if candidate_answer and len(candidate_answer) > 40 else candidate_answer
    prefix = f"I see you mentioned '{snippet}'. " if snippet else "Understood. "
    
    follow_ups = [
        "What are the primary differences between this approach and alternative architectures?",
        f"How would you scale this solution considering you are aiming for a {level} {role} position?",
        "Can you describe a potential edge case that might break this logic?",
        "Could you explain the memory constraints and performance tradeoffs here?",
        "How would you structure unit tests for this implementation?"
    ]
    
    idx = (question_number - 1) % len(follow_ups)
    next_q = None if is_last else prefix + follow_ups[idx]

    return {
        'evaluation': {
            'score': score,
            'feedback': 'Good attempt. Be more specific about trade-offs and complexity.',
            'strengths': 'Clear thinking',
            'weaknesses': 'Needs more edge-case handling',
        },
        'next_question': next_q,
        'is_coding': False,
        'is_finished': is_last,
        'adjusted_difficulty': difficulty,
    }


def _fallback_final_report(role, level, interview_type, evaluations, conversation_summary):
    avg_score = round(sum(e.get('score', 5) for e in evaluations) / max(1, len(evaluations)), 1)
    return {
        'overall_score': avg_score,
        'summary': 'Candidate showed solid fundamentals with room for improvement.',
        'strengths': 'Problem solving; communication; fundamentals',
        'weaknesses': 'Edge cases; performance considerations',
        'recommendation': 'Maybe — needs targeted practice',
        'study_plan': 'Practice data structures, complexity analysis, and system design basics',
    }


def _clean_json(text: str) -> str:
    """Strip markdown code fences if Gemini wraps JSON in them."""
    text = text.strip()
    # Remove ```json ... ``` or ``` ... ```
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return text.strip()


def generate_first_question(role: str, level: str, interview_type: str, difficulty: str, company: str = None) -> dict:
    """Generate the opening question for a new interview session."""
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        prompt = f"""You are an expert technical interviewer conducting a {interview_type} interview.

Candidate Profile:
- Role: {role}
- Level: {level}
- Difficulty: {difficulty}
{f"- Target Company: {company}" if company else ""}

Your task: Generate the very first interview question to open the conversation naturally.
Be warm, professional, and sound like a real human interviewer.
{_get_company_prompt_additive(company)}

{"Include a brief friendly greeting before the question." if True else ""}

Respond ONLY with valid JSON (no markdown, no explanation):
{{
  "question": "<the full question text including any greeting>",
  "is_coding": false
}}

Make the question appropriate for a {level} {role} candidate at {difficulty} difficulty.
"""

        response = model.generate_content(prompt)
        data = json.loads(_clean_json(response.text))
        return data
    except Exception as e:
        # Log and return fallback content when Gemini or model is unavailable
        print('Gemini generate_first_question failed:', str(e))
        return _fallback_first_question(role, level, difficulty, interview_type)


def evaluate_and_next_question(
    role: str,
    level: str,
    interview_type: str,
    difficulty: str,
    conversation_history: list,
    current_question: str,
    candidate_answer: str,
    question_number: int,
    total_questions: int,
    company: str = None,
) -> dict:
    """
    Evaluate the candidate's answer and generate the next question.
    Returns a structured dict with evaluation + next_question.
    """
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')

        history_text = "\n".join([
            f"{msg['speaker']}: {msg['text']}" for msg in conversation_history[-10:]
        ])

        is_last = question_number >= total_questions

        prompt = f"""You are an expert technical interviewer conducting a {interview_type} interview.

Candidate Profile:
- Role: {role}
- Level: {level}
- Current Difficulty: {difficulty}
{f"- Target Company: {company}" if company else ""}
- Question {question_number} of {total_questions}

Recent Conversation:
{history_text}

Current Question Asked:
"{current_question}"

Candidate's Answer:
"{candidate_answer}"

Your tasks:
1. Evaluate the candidate's answer honestly and constructively
2. {"Generate the next interview question" if not is_last else "This is the LAST question, so set next_question to null"}
{_get_company_prompt_additive(company)}

Adaptive difficulty rules:
- If score >= 8: increase difficulty in next question
- If score <= 4: decrease difficulty or re-approach the topic
- If 5 <= score <= 7: maintain current difficulty

{"The interview is ending after this evaluation. Set next_question to null and is_finished to true." if is_last else ""}

Respond ONLY with valid JSON (no markdown fences, no extra text):
{{
  "evaluation": {{
    "score": <number 0-10>,
    "feedback": "<2-3 sentence constructive feedback>",
    "strengths": "<key strengths shown>",
    "weaknesses": "<areas to improve>"
  }},
  "next_question": {"null" if is_last else '"<the next interview question text>"'},
  "is_coding": {"false" if interview_type != "coding" else "<true or false>"},
  "is_finished": {"true" if is_last else "false"},
  "adjusted_difficulty": "<easy|medium|hard>"
}}
"""

        response = model.generate_content(prompt)
        data = json.loads(_clean_json(response.text))
        return data
    except Exception as e:
        print('Gemini evaluate_and_next_question failed:', str(e))
        return _fallback_evaluate_and_next(role, level, interview_type, difficulty, conversation_history, current_question, candidate_answer, question_number, total_questions)


def generate_final_report(
    role: str,
    level: str,
    interview_type: str,
    evaluations: list,
    conversation_summary: str
) -> dict:
    """Generate the comprehensive final interview report."""
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')

        eval_text = "\n".join([
            f"Q{i+1}: Score {e['score']}/10 — Strengths: {e['strengths']} | Weaknesses: {e['weaknesses']}"
            for i, e in enumerate(evaluations)
        ])

        avg_score = sum(e['score'] for e in evaluations) / len(evaluations) if evaluations else 0

        prompt = f"""You are a senior interviewer writing a post-interview assessment report.

Interview Details:
- Role: {role}
- Level: {level}
- Type: {interview_type}
- Average Score: {avg_score:.1f}/10

Per-Question Evaluations:
{eval_text}

Conversation Summary:
{conversation_summary}

Write a comprehensive, honest, and actionable final report.

Respond ONLY with valid JSON (no markdown fences):
{{
  "overall_score": <average score as float>,
  "summary": "<3-4 sentence executive summary of the candidate's performance>",
  "strengths": "<bullet-style list of top 3 strengths>",
  "weaknesses": "<bullet-style list of top 3 areas for improvement>",
  "recommendation": "<hiring recommendation: Strong Yes / Yes / Maybe / No — with 2-3 sentence justification>",
  "study_plan": "<3-4 specific topics the candidate should study to improve>"
}}
"""

        response = model.generate_content(prompt)
        data = json.loads(_clean_json(response.text))
        data['overall_score'] = round(avg_score, 1)
        return data
    except Exception as e:
        print('Gemini generate_final_report failed:', str(e))
        data = _fallback_final_report(role, level, interview_type, evaluations, conversation_summary)
        data['overall_score'] = round(sum(e.get('score', 5) for e in evaluations) / max(1, len(evaluations)), 1)
        return data


def analyze_code_update(
    role: str,
    level: str,
    difficulty: str,
    conversation_history: list,
    code_text: str,
    language: str = 'javascript',
) -> dict:
    """Analyze latest code snapshot and return probing feedback/question."""
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')

        history_text = "\n".join([
            f"{msg['speaker']}: {msg['text']}" for msg in conversation_history[-8:]
        ])

        prompt = f"""You are a senior technical interviewer running a live coding interview.

Candidate context:
- Role: {role}
- Level: {level}
- Difficulty: {difficulty}
- Language: {language}

Recent conversation:
{history_text}

Current code snapshot:
```{language}
{code_text[-6000:]}
```

Analyze the code snapshot and produce interviewer-style follow-up.
Be concise and realistic. Ask exactly one probing question.

Respond ONLY with valid JSON:
{{
  "feedback": "<short analysis of logic, errors, or edge cases>",
  "question": "<one contextual follow-up question>",
  "line_hints": [<optional line numbers as integers>]
}}
"""
        response = model.generate_content(prompt)
        return json.loads(_clean_json(response.text))
    except Exception as e:
        print('Gemini analyze_code_update failed:', str(e))
        # Minimal fallback feedback
        return {
            'feedback': 'Quick fallback analysis: ensure edge cases and input validation.',
            'question': 'Can you explain the time complexity of your current approach?',
            'line_hints': []
        }


def analyze_code_complexity(code_text: str, language: str = 'javascript') -> dict:
    """Analyze code for time and space complexity."""
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')

        prompt = f"""Analyze the following {language} code for complexity:

```{language}
{code_text}
```

Provide a brief analysis in JSON format ONLY (no markdown):
{{
  "time_complexity": "<e.g., O(n) or O(n log n)>",
  "space_complexity": "<e.g., O(1) or O(n)>",
  "suggestions": ["<optimization tip 1>", "<optimization tip 2>", "<optimization tip 3>"],
  "logic_score": <0-10>,
  "issues": ["<potential issue 1>", "<potential issue 2>"]
}}
"""
        response = model.generate_content(prompt)
        return json.loads(_clean_json(response.text))
    except Exception as e:
        print('Gemini analyze_code_complexity failed:', str(e))
        return {
            'time_complexity': 'O(n)',
            'space_complexity': 'O(1)',
            'suggestions': ['Add input validation', 'Consider edge cases', 'Optimize for large inputs'],
            'logic_score': 5,
            'issues': []
        }
