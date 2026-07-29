"""
Gemini AI Service — handles all AI interactions for the interview engine.
"""
import json
import os
import re
from pathlib import Path
import google.generativeai as genai
from django.conf import settings

_CURRENT_KEY = None


def _load_env_file_key():
    """Read GEMINI_API_KEY directly from backend/.env so key rotations don't require a Django restart."""
    env_path = Path(settings.BASE_DIR) / '.env'
    if not env_path.exists():
        return None
    try:
        for line in env_path.read_text().splitlines():
            if line.strip().startswith('GEMINI_API_KEY='):
                return line.split('=', 1)[1].strip()
    except Exception:
        pass
    return None


def _ensure_configured():
    """Reconfigure the SDK if the .env key has been changed since last call."""
    global _CURRENT_KEY
    key = _load_env_file_key() or os.getenv('GEMINI_API_KEY') or settings.GEMINI_API_KEY
    if key and key != _CURRENT_KEY:
        genai.configure(api_key=key)
        _CURRENT_KEY = key


_ensure_configured()


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

    # ── Service-based / mass-recruiter style (Hexaware, TCS, Infosys, etc.) ──
    # These interviews are theory-heavy CS fundamentals + scenario-based OOP
    # coding + a strong HR round — very different from FAANG DSA rounds.
    service_based = ('hexaware', 'tcs', 'infosys', 'wipro', 'cognizant', 'accenture', 'capgemini', 'hcl', 'tech mahindra', 'ltimindtree', 'mindtree')
    if any(name in company_lower for name in service_based):
        return (
            "This is a SERVICE-BASED / campus-placement style interview (e.g. Hexaware, TCS, Infosys, Wipro, Cognizant, Accenture). "
            "Match that real style closely. Cover a MIX of these areas, one concept at a time with natural follow-ups:\n"
            "1) CS FUNDAMENTALS THEORY: OOP four pillars (abstraction, encapsulation, inheritance, polymorphism), abstract class vs interface, "
            "access modifiers; Core Java (JVM, exception handling — try/catch, throw vs throws, why it's used; Java 8 features; Collections with real-time examples; "
            "Spring Boot annotations); DBMS (normalization, SQL, JDBC/CRUD); Operating Systems (deadlock, kernel, storage types); "
            "Computer Networks (OSI layers, topologies); SDLC.\n"
            "2) SCENARIO-BASED OOP CODING to implement in the compiler: e.g. model an Employee with role-based discount using interface + abstraction; "
            "an ATM using encapsulation; hierarchical inheritance. Also classic problems: second largest element in an array, character occurrence count, "
            "merge two lists and print duplicate elements.\n"
            "3) Keep it beginner-to-mid friendly and practical. Occasionally ask about the candidate's projects and internships."
        )
    return ""


def _topic_focus(interview_type: str) -> str:
    """Round-specific guidance so 'technical', 'HR', etc. produce the right style."""
    t = (interview_type or '').lower()
    if t == 'behavioral':
        return (
            "This is an HR / BEHAVIORAL round — NO coding. Ask natural, one-at-a-time questions such as: a self-introduction; about family/background; "
            "why this company; strengths and weaknesses; willingness to relocate; comfort with a service agreement / bond; how you handle team conflict or "
            "pressure; what you do apart from academics; where you see yourself in 5 years. Ask thoughtful FOLLOW-UP questions based on the candidate's answer."
        )
    if t == 'technical':
        return (
            "This is a CS-FUNDAMENTALS THEORY round. Ask conceptual questions across OOP, Core Java, DBMS, Operating Systems, Computer Networks, and SDLC. "
            "Prefer clear 'explain / compare / define' questions (e.g. four pillars of OOP, abstract class vs interface, normalization, deadlock, OSI layers). "
            "You MAY include ONE scenario-based OOP coding implementation, but most questions should be spoken theory (is_coding false)."
        )
    if t == 'mixed':
        return (
            "This is a MIXED round: blend a brief self-introduction, CS-fundamentals theory (OOP/Java/DBMS/OS/CN/SDLC), at least one scenario-based coding "
            "implementation, and a couple of HR questions (relocation, service agreement, teamwork). Vary between spoken and coding questions."
        )
    return ""


_FALLBACK_PROBLEMS = {
    'two_sum': {
        'question': "Hello — let's start with a classic problem. Read two lines from stdin: the first is a comma-separated list of integers, the second is a target integer. Print the indices (space-separated) of the two numbers that add up to the target.",
        'test_cases': [
            {'stdin': '2,7,11,15\n9', 'expected_stdout': '0 1', 'explanation': '2 + 7 = 9'},
            {'stdin': '3,2,4\n6', 'expected_stdout': '1 2', 'explanation': '2 + 4 = 6'},
            {'stdin': '3,3\n6', 'expected_stdout': '0 1', 'explanation': '3 + 3 = 6'},
        ],
        'starter_code': {
            'python': "nums = list(map(int, input().split(',')))\ntarget = int(input())\n# Print the two indices separated by a space\n",
            'javascript': "const readline = require('readline');\nconst rl = readline.createInterface({ input: process.stdin });\nconst lines = [];\nrl.on('line', l => lines.push(l));\nrl.on('close', () => {\n  const nums = lines[0].split(',').map(Number);\n  const target = Number(lines[1]);\n  // console.log two indices separated by a space\n});\n",
            'java': "import java.util.*;\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String[] parts = sc.nextLine().split(\",\");\n        int target = Integer.parseInt(sc.nextLine());\n        // Print the two indices separated by a space\n    }\n}",
            'cpp': "#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n    string line; getline(cin, line);\n    int target; cin >> target;\n    // Print the two indices separated by a space\n    return 0;\n}",
        },
    },
    'palindrome': {
        'question': "Warm-up problem. Read a single line from stdin. Print 'true' if it reads the same forwards and backwards after ignoring non-alphanumeric characters and casing, else 'false'.",
        'test_cases': [
            {'stdin': 'A man, a plan, a canal: Panama', 'expected_stdout': 'true', 'explanation': 'cleaned => amanaplanacanalpanama'},
            {'stdin': 'race a car', 'expected_stdout': 'false', 'explanation': 'raceacar is not a palindrome'},
            {'stdin': ' ', 'expected_stdout': 'true', 'explanation': 'empty after cleaning'},
        ],
        'starter_code': {
            'python': "import sys\ns = sys.stdin.read()\n# Print 'true' or 'false'\n",
            'javascript': "let data = '';\nprocess.stdin.on('data', d => data += d);\nprocess.stdin.on('end', () => {\n  // console.log('true') or console.log('false')\n});\n",
            'java': "import java.util.*;\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.hasNextLine() ? sc.nextLine() : \"\";\n        // Print true or false\n    }\n}",
            'cpp': "#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n    string s;\n    getline(cin, s);\n    // Print true or false\n    return 0;\n}",
        },
    },
}


def _fallback_first_question(role: str, level: str, difficulty: str, interview_type: str) -> dict:
    role_key = 'two_sum' if role in ('frontend', 'backend', 'fullstack', 'ml_engineer', 'data_science') else 'palindrome'
    problem = _FALLBACK_PROBLEMS[role_key]
    return {
        'question': problem['question'],
        'is_coding': True,
        'test_cases': problem['test_cases'],
        'starter_code': problem['starter_code'],
    }


def _fallback_evaluate_and_next(role, level, interview_type, difficulty, conversation_history, current_question, candidate_answer, question_number, total_questions):
    # The AI is unreachable (quota, network, etc). Don't pretend to evaluate —
    # return a neutral score and flag it so the UI can show the candidate why.
    score = 5
    is_last = question_number >= total_questions

    # Rotate through fallback coding problems so the next question is still executable.
    wants_coding = interview_type in ('technical', 'coding', 'mixed') and not is_last
    next_q = None
    next_is_coding = False
    next_tests = []
    next_starter = {}

    if not is_last:
        if wants_coding:
            problem_keys = list(_FALLBACK_PROBLEMS.keys())
            # question_number = count of questions ALREADY answered.
            # Use that to index the NEXT problem, so it differs from the last one.
            pick = problem_keys[question_number % len(problem_keys)]
            problem = _FALLBACK_PROBLEMS[pick]
            next_q = problem['question']
            next_is_coding = True
            next_tests = problem['test_cases']
            next_starter = problem['starter_code']
        else:
            snippet = candidate_answer[:40] + "..." if candidate_answer and len(candidate_answer) > 40 else candidate_answer
            prefix = f"I see you mentioned '{snippet}'. " if snippet else "Understood. "
            follow_ups = [
                "What are the primary differences between this approach and alternative architectures?",
                f"How would you scale this solution considering you are aiming for a {level} {role} position?",
                "Can you describe a potential edge case that might break this logic?",
                "Could you explain the memory constraints and performance tradeoffs here?",
                "How would you structure unit tests for this implementation?",
            ]
            idx = (question_number - 1) % len(follow_ups)
            next_q = prefix + follow_ups[idx]

    return {
        'evaluation': {
            'score': score,
            'feedback': 'The AI evaluator is temporarily unavailable (likely hit its rate limit). This score is a placeholder — please retry later for a real evaluation.',
            'strengths': '',
            'weaknesses': '',
        },
        'next_question': next_q,
        'is_coding': next_is_coding,
        'test_cases': next_tests,
        'starter_code': next_starter,
        'is_finished': is_last,
        'adjusted_difficulty': difficulty,
        'fallback_used': True,
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


def _coding_prompt_contract() -> str:
    """Extra instructions appended when we want a coding question with test cases + starter code."""
    return """
This is a CODING question. The candidate will write a program that reads from stdin and writes to stdout.
You MUST include concrete test cases with exact stdin and expected stdout, plus starter code for four languages.

Rules for test cases:
- stdin must contain ONLY the raw input the program reads (no prose, no prefix like "Input:").
- expected_stdout must be the EXACT string the correct program should print (no trailing punctuation, no prose).
- Include 2-4 test cases, each small and unambiguous.
- Pick a deterministic output format and use it consistently.

Rules for starter_code:
- Provide minimal scaffolding for python, javascript (Node.js), java (class Solution with main), and cpp.
- Include the stdin-reading boilerplate so the candidate only has to fill in the logic.
- Do NOT solve the problem.
"""


def _coding_json_shape() -> str:
    return """{
  "question": "<the full problem statement, including input/output format and constraints>",
  "is_coding": true,
  "test_cases": [
    {"stdin": "<raw stdin>", "expected_stdout": "<exact expected stdout>", "explanation": "<short>"}
  ],
  "starter_code": {
    "python": "<code>",
    "javascript": "<code>",
    "java": "<code>",
    "cpp": "<code>"
  }
}"""


def generate_first_question(role: str, level: str, interview_type: str, difficulty: str, company: str = None) -> dict:
    """Generate the opening question for a new interview session."""
    # Only a pure 'coding' round opens with a coding problem. 'technical' (theory),
    # 'mixed' and 'behavioral' rounds open conversationally (intro/theory), then the
    # AI can introduce coding on later questions where appropriate.
    wants_coding = interview_type == 'coding'

    try:
        _ensure_configured()
        model = genai.GenerativeModel('gemini-2.5-flash')

        if wants_coding:
            json_shape = _coding_json_shape()
            contract = _coding_prompt_contract()
        else:
            json_shape = '{\n  "question": "<the full question text including any greeting>",\n  "is_coding": false\n}'
            contract = ""

        prompt = f"""You are an expert technical interviewer conducting a {interview_type} interview.

Candidate Profile:
- Role: {role}
- Level: {level}
- Difficulty: {difficulty}
{f"- Target Company: {company}" if company else ""}

Your task: Generate the very first interview question to open the conversation naturally.
Be warm, professional, and sound like a real human interviewer.
{_topic_focus(interview_type)}
{_get_company_prompt_additive(company)}
{contract}

Respond ONLY with valid JSON (no markdown, no explanation):
{json_shape}

Make the question appropriate for a {level} {role} candidate at {difficulty} difficulty.
"""

        response = model.generate_content(prompt)
        data = json.loads(_clean_json(response.text))
        # Normalize: ensure required coding fields exist when is_coding
        if data.get('is_coding'):
            data.setdefault('test_cases', [])
            data.setdefault('starter_code', {})
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
        _ensure_configured()
        model = genai.GenerativeModel('gemini-2.5-flash')

        history_text = "\n".join([
            f"{msg['speaker']}: {msg['text']}" for msg in conversation_history[-10:]
        ])

        is_last = question_number >= total_questions
        next_question_number = question_number + 1

        # Collect everything the AI has already asked so we can forbid repeats.
        previously_asked = [
            msg['text'] for msg in conversation_history if msg.get('speaker') == 'AI'
        ]
        asked_block = "\n".join(f"- {q}" for q in previously_asked) or "(none yet)"

        prompt = f"""You are an expert technical interviewer conducting a {interview_type} interview.

Candidate Profile:
- Role: {role}
- Level: {level}
- Current Difficulty: {difficulty}
{f"- Target Company: {company}" if company else ""}
- Candidate has just finished answering question {question_number} of {total_questions}.
- The NEXT question you generate will be question {next_question_number} of {total_questions}.

Recent Conversation:
{history_text}

Questions already asked — DO NOT repeat or paraphrase any of these:
{asked_block}

Current Question Asked:
"{current_question}"

Candidate's Answer:
"{candidate_answer}"

Your tasks:
1. Evaluate the candidate's answer honestly and constructively
2. {"Generate a BRAND NEW interview question that has not been asked above. Do not greet the candidate again — skip openers like 'Hello' or 'Let's start' — just ask the next question directly." if not is_last else "This is the LAST question, so set next_question to null"}
{_topic_focus(interview_type)}
{_get_company_prompt_additive(company)}

Adaptive difficulty rules:
- If score >= 8: increase difficulty in next question
- If score <= 4: decrease difficulty or re-approach the topic
- If 5 <= score <= 7: maintain current difficulty

{"The interview is ending after this evaluation. Set next_question to null and is_finished to true." if is_last else ""}

If the next question IS coding, also include test_cases and starter_code with this shape:
{_coding_prompt_contract() if not is_last else ''}

Respond ONLY with valid JSON (no markdown fences, no extra text):
{{
  "evaluation": {{
    "score": <number 0-10>,
    "feedback": "<2-3 sentence constructive feedback>",
    "strengths": "<key strengths shown>",
    "weaknesses": "<areas to improve>"
  }},
  "next_question": {"null" if is_last else '"<the next interview question text>"'},
  "is_coding": {"false" if is_last or interview_type not in ("technical", "coding", "mixed") else "<true or false>"},
  "test_cases": {"[]" if is_last else '<array as in the coding contract, or [] if is_coding is false>'},
  "starter_code": {"{{}}" if is_last else '<object as in the coding contract, or {{}} if is_coding is false>'},
  "is_finished": {"true" if is_last else "false"},
  "adjusted_difficulty": "<easy|medium|hard>"
}}
"""

        response = model.generate_content(prompt)
        data = json.loads(_clean_json(response.text))
        # Normalize coding fields
        if data.get('is_coding'):
            data.setdefault('test_cases', [])
            data.setdefault('starter_code', {})

        # Reject if Gemini ignored the forbid-repeat instruction and returned
        # a near-duplicate of something it already asked. Fall back instead.
        nq = (data.get('next_question') or '').strip().lower()
        if nq and not is_last:
            for prev in previously_asked:
                prev_norm = prev.strip().lower()
                if not prev_norm:
                    continue
                # exact match, or strong overlap of the first 60 chars
                if nq == prev_norm or (len(prev_norm) > 60 and prev_norm[:60] in nq):
                    print('Gemini returned a repeat — forcing fallback')
                    raise ValueError('duplicate_next_question')
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
        _ensure_configured()
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
        _ensure_configured()
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


def generate_code_followup(
    question_text: str,
    code: str,
    language: str,
    passed_count: int,
    total_cases: int,
) -> dict:
    """
    After a candidate submits code that passed the test cases, produce a single probing
    follow-up question (e.g. "why did you pick this approach?", "time complexity?",
    "can you optimize this further?") and a brief coding-correctness score.
    """
    pass_ratio = (passed_count / total_cases) if total_cases else 1.0
    try:
        _ensure_configured()
        model = genai.GenerativeModel('gemini-2.5-flash')

        prompt = f"""You are a senior technical interviewer. The candidate just submitted code for this problem:

PROBLEM:
{question_text}

CANDIDATE'S CODE ({language}):
```{language}
{code[-6000:]}
```

TEST RESULTS: {passed_count} / {total_cases} test cases passed.

Your tasks:
1. Score the CODE ITSELF on correctness and quality from 0-10 (factor in pass ratio AND code quality).
2. Ask ONE probing follow-up question an interviewer would naturally ask now. Pick ONE of:
   - "Why did you choose this approach over {{alternative}}?"
   - "What's the time and space complexity, and can you optimize it?"
   - "How would you handle {{specific edge case visible in the code}}?"
   Keep it specific to the candidate's actual code, not generic.
3. Briefly note the optimization they should consider (you'll share this if they get stuck).

Respond ONLY with valid JSON (no markdown):
{{
  "coding_score": <0-10>,
  "strengths": "<short>",
  "weaknesses": "<short>",
  "followup_question": "<the single question to ask the candidate>",
  "optimization_hint": "<one-sentence hint to share if the candidate is stuck>"
}}
"""
        response = model.generate_content(prompt)
        data = json.loads(_clean_json(response.text))
        return data
    except Exception as e:
        print('Gemini generate_code_followup failed:', str(e))
        # Deterministic fallback
        base = 8 if pass_ratio >= 0.99 else max(3, int(pass_ratio * 10))
        return {
            'coding_score': base,
            'strengths': 'Reached a working solution',
            'weaknesses': 'Could discuss trade-offs more explicitly',
            'followup_question': "Walk me through your approach — what's the time and space complexity, and can you think of a way to optimize it further?",
            'optimization_hint': 'Consider whether a hash map or two-pointer technique would reduce the complexity.',
        }


def analyze_code_complexity(code_text: str, language: str = 'javascript') -> dict:
    """Analyze code for time and space complexity."""
    try:
        _ensure_configured()
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
