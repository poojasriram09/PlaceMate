/**
 * Interview engine — all client-side using Groq.
 * Robust error handling, type validation, graceful degradation.
 */
import { callGroq } from './ai'

function safeNum(val, fallback = 5) {
  const n = Number(val)
  return isNaN(n) ? fallback : Math.max(1, Math.min(10, n))
}

export async function startInterview(job, profile) {
  const firstQ = await callGroq(`You are an expert interviewer conducting a mock interview for a "${job.title}" position at ${job.company_name}.

Job Description: ${(job.description || '').substring(0, 500)}
Required Skills: ${(job.skills_required || []).join(', ')}

Candidate Background:
- Skills: ${(profile?.skills || []).join(', ') || 'Not specified'}
- Year of Study: ${profile?.candidate_year ? profile.candidate_year + ['st','nd','rd','th'][Math.min(profile.candidate_year - 1, 3)] + ' year' : 'Not specified'}
- Education: ${profile?.education || 'Not specified'}

Interview structure (6 questions total):
- Questions 1-2: Behavioral (introduce yourself, motivation)
- Questions 3-4: Technical (test their claimed skills)
- Question 5: Problem-solving scenario
- Question 6: Closing (future goals, wrap-up)

Be professional but friendly. Tailor to their actual skills.

Ask question 1 now. Return JSON:
{
  "question_number": 1,
  "question": "your interview question here",
  "question_type": "behavioral",
  "what_to_look_for": "brief note on what a good answer includes"
}`)

  // Validate
  if (!firstQ?.question) throw new Error('AI failed to generate first question. Try again.')

  return {
    id: crypto.randomUUID(),
    job,
    profile,
    questions: [firstQ],
    answers: [],
    scores: [],
    history: [{ role: 'interviewer', q: firstQ.question, type: firstQ.question_type || 'behavioral' }],
    currentQuestion: 0,
    totalQuestions: 6,
    status: 'in_progress',
    startedAt: Date.now(), // timestamp number, not Date object — survives React state
  }
}

export async function submitAnswer(session, answerText, timeTaken) {
  const currentQ = session.questions[session.currentQuestion]
  if (!currentQ) throw new Error('No current question found')

  const qNum = session.currentQuestion + 1
  const isLast = qNum >= session.totalQuestions

  const historyText = session.history.map(h => {
    if (h.role === 'interviewer') return `Interviewer: ${h.q}`
    return `Candidate: ${h.a}`
  }).join('\n')

  const nextType = qNum + 1 <= 2 ? 'behavioral' : qNum + 1 <= 4 ? 'technical' : qNum + 1 === 5 ? 'problem_solving' : 'closing'

  const prompt = `You are continuing a mock interview for "${session.job.title}" at ${session.job.company_name}.

Conversation so far:
${historyText}

Candidate just answered question ${qNum}:
"${answerText}"
(They took ${timeTaken} seconds to answer)

Instructions:
1. Score this answer 1-10 for: relevance, depth, communication, confidence, overall.
2. Give 1-2 sentences of specific feedback.
3. ${isLast ? 'This was the LAST question. Set "next_question" to null.' : `Ask question ${qNum + 1} of 6 (type: ${nextType}). Reference their previous answer.`}

Return JSON (use actual numbers like 7, not ranges):
{
  "evaluation": {
    "relevance": 7,
    "depth": 6,
    "communication": 8,
    "confidence": 7,
    "overall": 7,
    "feedback": "Your specific feedback here"
  },
  "next_question": ${isLast ? 'null' : `{
    "question_number": ${qNum + 1},
    "question": "Your next interview question",
    "question_type": "${nextType}",
    "what_to_look_for": "What a good answer includes"
  }`}
}`

  let result
  try {
    result = await callGroq(prompt)
  } catch (err) {
    throw new Error('AI failed to respond: ' + (err.message || 'Try again'))
  }

  // Robust validation — coerce types
  if (!result?.evaluation) {
    result = { evaluation: { overall: 5, feedback: 'Could not evaluate this answer.' }, next_question: isLast ? null : undefined }
  }
  result.evaluation.overall = safeNum(result.evaluation.overall)
  result.evaluation.relevance = safeNum(result.evaluation.relevance)
  result.evaluation.depth = safeNum(result.evaluation.depth)
  result.evaluation.communication = safeNum(result.evaluation.communication)
  result.evaluation.confidence = safeNum(result.evaluation.confidence)
  if (!result.evaluation.feedback) result.evaluation.feedback = 'Good effort. Keep practicing.'

  // Update session (immutable-safe — caller should use returned data)
  session.answers.push({ text: answerText, time: timeTaken })
  session.scores.push(result.evaluation)
  session.history.push({ role: 'candidate', a: answerText })

  if (result.next_question?.question) {
    session.questions.push(result.next_question)
    session.history.push({ role: 'interviewer', q: result.next_question.question, type: result.next_question.question_type || nextType })
    session.currentQuestion++
  } else {
    session.status = 'completed'
  }

  const isComplete = !result.next_question?.question
  return {
    evaluation: { overall: result.evaluation.overall, feedback: result.evaluation.feedback },
    nextQuestion: result.next_question?.question ? result.next_question : null,
    isComplete,
    updatedSession: { ...session }, // return copy for React state update
  }
}

export async function generateScorecard(session) {
  // Build transcript from however many questions were answered (might be < 6)
  const answeredCount = session.answers.length
  const transcript = session.questions.slice(0, answeredCount).map((q, i) => {
    const a = session.answers[i]
    const s = session.scores[i]
    return `Q${i + 1} (${q.question_type || 'question'}): ${q.question}\nAnswer: ${a?.text || '(no answer)'} [${a?.time || 0}s]\nScore: ${s?.overall || 0}/10`
  }).join('\n\n')

  if (answeredCount === 0) {
    return {
      overall_score: 0, grade: 'F', hire_recommendation: 'No Hire',
      summary: 'No questions were answered.', category_scores: {},
      top_strengths: [], areas_to_improve: [], sample_better_answers: [], final_tip: 'Try completing the full interview next time.'
    }
  }

  try {
    return await callGroq(`Generate a final interview scorecard. Be encouraging but honest.

Position: ${session.job.title} at ${session.job.company_name}
Skills Required: ${(session.job.skills_required || []).join(', ')}
Questions Answered: ${answeredCount} of ${session.totalQuestions}

Full Interview:
${transcript}

Return JSON with actual numbers. Use this structure:
{
  "overall_score": 75,
  "grade": "B+",
  "hire_recommendation": "Lean Hire",
  "summary": "2-3 sentence assessment",
  "category_scores": {
    "technical_knowledge": { "score": 70, "feedback": "feedback" },
    "communication_skills": { "score": 80, "feedback": "feedback" },
    "problem_solving": { "score": 65, "feedback": "feedback" },
    "cultural_fit": { "score": 75, "feedback": "feedback" },
    "confidence_and_clarity": { "score": 72, "feedback": "feedback" }
  },
  "top_strengths": ["strength 1", "strength 2", "strength 3"],
  "areas_to_improve": [
    { "area": "area name", "suggestion": "specific advice" }
  ],
  "sample_better_answers": [
    { "question_number": 1, "original_answer_summary": "what they said", "improved_answer": "a stronger answer" }
  ],
  "final_tip": "One key advice for next time"
}`)
  } catch {
    // Fallback scorecard from local data
    const avgScore = session.scores.length > 0
      ? Math.round(session.scores.reduce((s, e) => s + (e.overall || 5), 0) / session.scores.length * 10)
      : 50
    return {
      overall_score: avgScore,
      grade: avgScore >= 80 ? 'A' : avgScore >= 70 ? 'B+' : avgScore >= 60 ? 'B' : avgScore >= 50 ? 'C' : 'D',
      hire_recommendation: avgScore >= 70 ? 'Hire' : avgScore >= 50 ? 'Maybe' : 'No Hire',
      summary: `You answered ${answeredCount} questions with an average score of ${avgScore}%. AI scorecard generation failed, showing basic results.`,
      category_scores: {},
      top_strengths: ['Completed the interview'],
      areas_to_improve: [{ area: 'Practice more', suggestion: 'Try the interview again for more detailed feedback.' }],
      sample_better_answers: [],
      final_tip: 'Practice makes perfect. Try again when AI is available.',
    }
  }
}
