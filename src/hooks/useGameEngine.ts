import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { loadQuestions, pickRandomQuestion } from '../lib/questions'
import type { Question, GameSession, DifficultyLevel } from '../types'
import { DIFFICULTY_ORDER, DIFFICULTY_POINTS } from '../types'

const QUESTION_TIME = 45

export function useGameEngine(category: string) {
  const { user, profile, refreshProfile } = useAuth()
  const [session, setSession] = useState<GameSession | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usedQuestions, setUsedQuestions] = useState<Set<string>>(new Set())
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([])
  const [audienceHint, setAudienceHint] = useState<Record<string, number> | null>(null)
  const [streak, setStreak] = useState(0)
  const [questionsPool, setQuestionsPool] = useState<Question[]>([])
  // questions.json fetch'i bitmeden startNewGame/resumeGame'in tetiklenip
  // "havuz boş" hatası vermesini engellemek için ayrı bir yüklendi bayrağı.
  const [questionsLoaded, setQuestionsLoaded] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentDifficulty = (index: number): DifficultyLevel => {
    return DIFFICULTY_ORDER[index % DIFFICULTY_ORDER.length]
  }

  // Soru havuzunu JSON'dan yükle
  useEffect(() => {
    let cancelled = false
    loadQuestions().then((qs) => {
      if (!cancelled) {
        setQuestionsPool(qs)
        setQuestionsLoaded(true)
      }
    })
    return () => { cancelled = true }
  }, [])

  const getQuestion = useCallback(
    (difficulty: DifficultyLevel, cat: string, used: Set<string>): Question | null => {
      if (questionsPool.length === 0) return null
      return pickRandomQuestion(questionsPool, difficulty, cat, used)
    },
    [questionsPool]
  )

  const startNewGame = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .insert({
          user_id: user.id,
          category,
          difficulty_index: 0,
          current_question_number: 1,
          current_points: 0,
          lifelines_used: { fifty_fifty: false, phone: false, audience: false },
          status: 'active',
        })
        .select()
        .single()

      if (error) throw error

      setSession(data as GameSession)
      setUsedQuestions(new Set())
      setStreak(0)

      const diff = currentDifficulty(0)
      const q = getQuestion(diff, category, new Set())
      if (!q) {
        setError('Soru havuzu yükleniyor. Lütfen birkaç saniye sonra tekrar deneyin.')
        return
      }
      setQuestion(q)
      setTimeLeft(QUESTION_TIME)
      setSelectedAnswer(null)
      setShowResult(false)
      setEliminatedOptions([])
      setAudienceHint(null)
    } catch {
      setError('Oyun başlatılamadı. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }, [user, category, getQuestion])

  const resumeGame = useCallback(async (existingSession: GameSession) => {
    setLoading(true)
    setError(null)
    setSession(existingSession)
    setStreak(0)

    const diff = currentDifficulty(existingSession.difficulty_index)
    const q = getQuestion(diff, existingSession.category, new Set())
    if (!q) {
      setError('Soru havuzu yükleniyor. Lütfen birkaç saniye sonra tekrar deneyin.')
      setLoading(false)
      return
    }
    setQuestion(q)
    setTimeLeft(QUESTION_TIME)
    setSelectedAnswer(null)
    setShowResult(false)
    setEliminatedOptions([])
    setAudienceHint(null)
    setLoading(false)
  }, [getQuestion])

  const nextQuestion = useCallback(async () => {
    if (!session || !user) return

    const newIndex = session.difficulty_index + 1
    const diff = currentDifficulty(newIndex)

    const newUsed = new Set(usedQuestions)
    if (question) newUsed.add(question.id)
    setUsedQuestions(newUsed)

    const q = getQuestion(diff, session.category, newUsed)

    if (!q) {
      setError('Soru bulunamadı. Lütfen tekrar deneyin.')
      return
    }

    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({
        difficulty_index: newIndex,
        current_question_number: session.current_question_number + 1,
      })
      .eq('id', session.id)

    if (updateError) {
      console.error('Session update error:', updateError)
    }

    setSession({
      ...session,
      difficulty_index: newIndex,
      current_question_number: session.current_question_number + 1,
    })
    setQuestion(q)
    setTimeLeft(QUESTION_TIME)
    setSelectedAnswer(null)
    setShowResult(false)
    setEliminatedOptions([])
    setAudienceHint(null)
  }, [session, user, usedQuestions, question, getQuestion])

  const answerQuestion = useCallback(async (answer: string) => {
    if (!question || !session || !user || showResult) return

    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    setSelectedAnswer(answer)
    const correct = question.correct_answer === answer
    setIsCorrect(correct)
    setShowResult(true)

    if (correct) {
      const diff = currentDifficulty(session.difficulty_index)
      const points = DIFFICULTY_POINTS[diff]
      const newPoints = session.current_points + points
      const newStreak = streak + 1
      setStreak(newStreak)

      const { error: updateError } = await supabase
        .from('game_sessions')
        .update({ current_points: newPoints })
        .eq('id', session.id)

      if (updateError) {
        console.error('Points update error:', updateError)
      }

      setSession({ ...session, current_points: newPoints })
    } else {
      setStreak(0)
    }
  }, [question, session, user, showResult, streak])

  const takeBreak = useCallback(async () => {
    if (!session) return

    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    const { error } = await supabase
      .from('game_sessions')
      .update({
        status: 'break',
        paused_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    if (error) {
      console.error('Break error:', error)
    }
  }, [session])

  const endGame = useCallback(async () => {
    if (!session || !user) return

    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    const { error } = await supabase
      .from('game_sessions')
      .update({
        status: 'finished',
        finished_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    if (error) {
      console.error('End game error:', error)
    }

    const { error: scoreError } = await supabase
      .from('scores')
      .insert({
        user_id: user.id,
        score: session.current_points,
        category: session.category,
        questions_answered: session.current_question_number,
      })

    if (scoreError) {
      console.error('Score insert error:', scoreError)
    }

    const newTotal = (profile?.total_points || 0) + session.current_points
    const newBest = Math.max(profile?.best_score || 0, session.current_points)
    const newGames = (profile?.games_played || 0) + 1

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        total_points: newTotal,
        best_score: newBest,
        games_played: newGames,
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
    }

    await refreshProfile()
  }, [session, user, profile, refreshProfile])

  const useFiftyFifty = useCallback(() => {
    if (!question || !session) return
    if (session.lifelines_used.fifty_fifty) return

    const wrong = ['A', 'B', 'C', 'D'].filter((a) => a !== question.correct_answer)
    const shuffled = wrong.sort(() => Math.random() - 0.5)
    setEliminatedOptions(shuffled.slice(0, 2))

    const updated = { ...session.lifelines_used, fifty_fifty: true }
    setSession({ ...session, lifelines_used: updated })
    supabase
      .from('game_sessions')
      .update({ lifelines_used: updated })
      .eq('id', session.id)
      .then(({ error }) => {
        if (error) console.error('Lifeline update error:', error)
      })
  }, [question, session])

  const useAudience = useCallback(() => {
    if (!question || !session) return
    if (session.lifelines_used.audience) return

    const correct = question.correct_answer
    const hint: Record<string, number> = {}
    const correctPercent = 40 + Math.floor(Math.random() * 30)
    hint[correct] = correctPercent
    const remaining = 100 - correctPercent
    const wrong = ['A', 'B', 'C', 'D'].filter((a) => a !== correct)
    const w1 = Math.floor(Math.random() * remaining)
    hint[wrong[0]] = w1
    const w2 = Math.floor(Math.random() * (remaining - w1))
    hint[wrong[1]] = w2
    hint[wrong[2]] = remaining - w1 - w2
    setAudienceHint(hint)

    const updated = { ...session.lifelines_used, audience: true }
    setSession({ ...session, lifelines_used: updated })
    supabase
      .from('game_sessions')
      .update({ lifelines_used: updated })
      .eq('id', session.id)
      .then(({ error }) => {
        if (error) console.error('Lifeline update error:', error)
      })
  }, [question, session])

  const usePhone = useCallback(() => {
    if (!question || !session) return
    if (session.lifelines_used.phone) return

    const correct = question.correct_answer
    const isRight = Math.random() > 0.25
    const guess = isRight ? correct : ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]
    setAudienceHint({ [guess]: 100 })

    const updated = { ...session.lifelines_used, phone: true }
    setSession({ ...session, lifelines_used: updated })
    supabase
      .from('game_sessions')
      .update({ lifelines_used: updated })
      .eq('id', session.id)
      .then(({ error }) => {
        if (error) console.error('Lifeline update error:', error)
      })
  }, [question, session])

  // Timer
  useEffect(() => {
    if (loading || showResult || !question) return

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          setShowResult(true)
          setIsCorrect(false)
          setSelectedAnswer('timeout')
          setStreak(0)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [loading, showResult, question])

  // Check for existing session
  useEffect(() => {
    // Soru havuzu (questions.json) henüz yüklenmediyse bekle; aksi halde
    // startNewGame boş havuzla çalışıp gereksiz yere hata veriyordu.
    if (!user || !questionsLoaded) return

    const checkExisting = async () => {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'break')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data && !error) {
        resumeGame(data as GameSession)
      } else {
        startNewGame()
      }
    }

    checkExisting()
  }, [user, questionsLoaded])

  return {
    session,
    question,
    timeLeft,
    selectedAnswer,
    showResult,
    isCorrect,
    loading,
    error,
    streak,
    eliminatedOptions,
    audienceHint,
    currentDifficulty: currentDifficulty(session?.difficulty_index ?? 0),
    startNewGame,
    nextQuestion,
    answerQuestion,
    takeBreak,
    endGame,
    useFiftyFifty,
    useAudience,
    usePhone,
    QUESTION_TIME,
  }
}
