import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Question, GameSession, DifficultyLevel } from '../types'
import { DIFFICULTY_ORDER, DIFFICULTY_POINTS } from '../types'

const QUESTION_TIME = 60

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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentDifficulty = (index: number): DifficultyLevel => {
    return DIFFICULTY_ORDER[index % DIFFICULTY_ORDER.length]
  }

  // Bir soru havuzu içinde rastgele seçim yapar.
  const pickRandom = (rows: Question[] | null): Question | null => {
    if (!rows || rows.length === 0) return null
    return rows[Math.floor(Math.random() * rows.length)] as Question
  }

  // ÖNEMLİ: Bu fonksiyon "used" setindeki hiçbir soruyu ASLA döndürmez.
  // Dışlama (exclude) filtresi normalde doğrudan veritabanı sorgusunda
  // uygulanır (hızlı yol). Kullanıcının gördüğü soru sayısı çok büyüdüğünde
  // (yüzlerce/binlerce) tek bir sorgu URL'sine tüm id'leri gömmek pratik
  // değildir; bu durumda otomatik olarak sayfalı + istemci tarafı filtrelemeye
  // düşer (yavaş ama %100 güvenilir yol). Hangi yol kullanılırsa kullanılsın,
  // sonuç kümesinde "used" içindeki hiçbir id asla bulunmaz.
  const EXCLUDE_URL_SAFE_LIMIT = 300
  const POOL_PAGE_SIZE = 1000

  const fetchQuestion = useCallback(async (difficulty: DifficultyLevel, cat: string, used: Set<string>) => {
    const excludeIds = Array.from(used)

    const buildQuery = (withCategory: boolean) => {
      let q = supabase
        .from('questions')
        .select('*')
        .eq('difficulty', difficulty)
        .eq('is_active', true)

      if (withCategory && cat !== 'karisik') {
        q = q.eq('category', cat)
      }
      if (excludeIds.length > 0 && excludeIds.length <= EXCLUDE_URL_SAFE_LIMIT) {
        const list = excludeIds.map((id) => `"${id}"`).join(',')
        q = q.not('id', 'in', `(${list})`)
      }
      return q.limit(200)
    }

    // Hariç tutma listesi URL için güvenli olmayacak kadar büyükse, tüm
    // havuzu sayfalayarak çekip istemci tarafında filtreliyoruz. Bu yol
    // yavaştır ama her koşulda doğru sonucu garanti eder.
    const fetchPoolFiltered = async (withCategory: boolean) => {
      const all: Question[] = []
      let from = 0
      for (let page = 0; page < 50; page++) {
        let q = supabase.from('questions').select('*').eq('difficulty', difficulty).eq('is_active', true)
        if (withCategory && cat !== 'karisik') q = q.eq('category', cat)
        const { data, error } = await q.range(from, from + POOL_PAGE_SIZE - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        all.push(...(data as Question[]))
        if (data.length < POOL_PAGE_SIZE) break
        from += POOL_PAGE_SIZE
      }
      return all.filter((row) => !used.has(row.id))
    }

    const runTier = async (withCategory: boolean) => {
      if (excludeIds.length > EXCLUDE_URL_SAFE_LIMIT) {
        const rows = await fetchPoolFiltered(withCategory)
        return pickRandom(rows)
      }
      const { data, error } = await buildQuery(withCategory)
      if (error) throw error
      return pickRandom(data as Question[] | null)
    }

    // 1) Aynı zorluk + aynı kategori, daha önce hiç sorulmamış sorular
    const primaryPick = await runTier(true)
    if (primaryPick) return primaryPick

    // 2) Kategoriye özel havuz tükendiyse, aynı zorlukta diğer kategorilere bak
    //    (yalnızca belirli bir kategori seçiliyse anlamlı; "karışık"ta zaten aynı sorgu)
    if (cat !== 'karisik') {
      const byDifficultyPick = await runTier(false)
      if (byDifficultyPick) return byDifficultyPick
    }

    // 3) Bu zorlukta gösterilecek hiç yeni soru kalmadı. Daha önce sorulmuş
    // bir soruyu tekrar göstermek yerine null döndürüyoruz.
    return null
  }, [])

  // ÖNEMLİ: "Görülen soru" kaydı artık Supabase'deki `user_seen_questions`
  // tablosunda TUTULUR (bkz. migration: 20260723090000_user_seen_questions.sql).
  // Bu, tarayıcı önbelleği temizlense, farklı bir cihazdan girilse veya
  // uygulama yeniden yüklense bile aynı kullanıcıya aynı sorunun BİR DAHA ASLA
  // gösterilmemesini garanti eder (localStorage gibi yerel/geçici bir
  // çözümün aksine, kalıcıdır ve hesaba bağlıdır).

  // Kullanıcının bugüne kadar gördüğü TÜM soruların id'lerini yükler.
  // Supabase tek istekte sınırlı satır döndürdüğü için sayfalama yapılır.
  const SEEN_PAGE_SIZE = 1000
  const loadSeenQuestionIds = useCallback(async (userId: string): Promise<Set<string>> => {
    const seen = new Set<string>()
    let from = 0
    // Güvenlik amaçlı üst sınır (sonsuz döngüye karşı) - normalde hiç ulaşılmaz.
    for (let page = 0; page < 200; page++) {
      const { data, error } = await supabase
        .from('user_seen_questions')
        .select('question_id')
        .eq('user_id', userId)
        .range(from, from + SEEN_PAGE_SIZE - 1)
      if (error) {
        console.error('Görülen sorular yüklenemedi:', error)
        break
      }
      if (!data || data.length === 0) break
      for (const row of data as { question_id: string }[]) seen.add(row.question_id)
      if (data.length < SEEN_PAGE_SIZE) break
      from += SEEN_PAGE_SIZE
    }
    return seen
  }, [])

  // Bir soru kullanıcıya gösterildiği an kalıcı olarak "görüldü" işaretlenir.
  // upsert + ignoreDuplicates: aynı çift zaten varsa sessizce yok sayılır,
  // hata fırlatmaz.
  const markQuestionSeen = useCallback((userId: string, questionId: string) => {
    supabase
      .from('user_seen_questions')
      .upsert(
        { user_id: userId, question_id: questionId },
        { onConflict: 'user_id,question_id', ignoreDuplicates: true }
      )
      .then(({ error }) => {
        if (error) console.error('Soru "görüldü" olarak işaretlenemedi:', error)
      })
  }, [])

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
      setStreak(0)

      // Kullanıcının bugüne kadar (geçmiş tüm oyunlar dahil) gördüğü sorular
      // kalıcı depodan yüklenir; yeni oyun bu listeyi asla sıfırlamaz.
      const seen = await loadSeenQuestionIds(user.id)
      setUsedQuestions(seen)

      const diff = currentDifficulty(0)
      const q = await fetchQuestion(diff, category, seen)
      if (!q) {
        setError('Bu kategori/zorlukta gösterilecek yeni soru kalmadı. Tüm soruları tamamlamış olabilirsiniz.')
        return
      }
      setQuestion(q)
      setTimeLeft(QUESTION_TIME)
      setSelectedAnswer(null)
      setShowResult(false)
      setEliminatedOptions([])
      setAudienceHint(null)
      // Soru ekrana gelir gelmez kalıcı olarak "görüldü" işaretlenir; kullanıcı
      // cevaplamadan çıksa bile bu soru bir daha asla karşısına çıkmaz.
      setUsedQuestions((prev) => new Set(prev).add(q.id))
      markQuestionSeen(user.id, q.id)
    } catch (err) {
      setError('Oyun başlatılamadı. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }, [user, category, fetchQuestion, loadSeenQuestionIds, markQuestionSeen])

  const resumeGame = useCallback(async (existingSession: GameSession) => {
    if (!user) return
    setLoading(true)
    setError(null)
    setSession(existingSession)
    setStreak(0)

    // Kalıcı depodan (Supabase) yüklenir; "ara ver" öncesi hangi cihazda
    // oynanmış olursa olsun, kullanıcının gördüğü hiçbir soru tekrar gelmez.
    const seen = await loadSeenQuestionIds(user.id)
    setUsedQuestions(seen)

    const diff = currentDifficulty(existingSession.difficulty_index)
    const q = await fetchQuestion(diff, existingSession.category, seen)
    if (!q) {
      setError('Bu kategori/zorlukta gösterilecek yeni soru kalmadı. Tüm soruları tamamlamış olabilirsiniz.')
      setLoading(false)
      return
    }
    setQuestion(q)
    setTimeLeft(QUESTION_TIME)
    setSelectedAnswer(null)
    setShowResult(false)
    setEliminatedOptions([])
    setAudienceHint(null)
    setUsedQuestions((prev) => new Set(prev).add(q.id))
    markQuestionSeen(user.id, q.id)
    setLoading(false)
  }, [user, fetchQuestion, loadSeenQuestionIds, markQuestionSeen])

  const nextQuestion = useCallback(async () => {
    if (!session || !user) return

    const newIndex = session.difficulty_index + 1
    const diff = currentDifficulty(newIndex)
    const q = await fetchQuestion(diff, session.category, usedQuestions)

    if (!q) {
      setError('Soru bulunamadı. Lütfen tekrar deneyin.')
      return
    }

    const newUsed = new Set(usedQuestions)
    if (question) newUsed.add(question.id)
    newUsed.add(q.id)
    setUsedQuestions(newUsed)
    // Yeni soru ekrana gelir gelmez kalıcı olarak işaretlenir.
    markQuestionSeen(user.id, q.id)

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
  }, [session, user, usedQuestions, question, fetchQuestion, markQuestionSeen])

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
    if (!user) return

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
  }, [user])

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
