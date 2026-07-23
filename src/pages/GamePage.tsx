import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameEngine } from '../hooks/useGameEngine'
import { AdBanner } from '../components/AdBanner'
import { BorderBeam } from '../components/BorderBeam'
import { playTick, playTimeUp } from '../lib/sound'
import { vibrateTick, vibrateTimeUp } from '../lib/haptics'
import { DIFFICULTY_LABELS, DIFFICULTY_POINTS, DIFFICULTY_COLORS } from '../types'
import {
  Home, Coffee, Trophy, X, Users, Phone, Lightbulb,
  ChevronRight, AlertCircle, Clock,
} from 'lucide-react'

// Doğru cevaptan sonra kaç saniye içinde bir sonraki soruya otomatik geçilecek
const AUTO_ADVANCE_SECONDS_CORRECT = 3
// Yanlış/süre dolduğunda doğru cevabı okuyabilmesi için biraz daha uzun süre
const AUTO_ADVANCE_SECONDS_WRONG = 5
// Geri sayımın bu saniyeden itibaren "kritik" (titreşim + tık sesi) sayılacağı eşik
const URGENT_THRESHOLD_SECONDS = 10

export default function GamePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const category = searchParams.get('category') || 'karisik'
  const resume = searchParams.get('resume') === 'true'

  const engine = useGameEngine(category)
  const [showEndModal, setShowEndModal] = useState(false)
  const [autoAdvanceIn, setAutoAdvanceIn] = useState<number | null>(null)
  const advancingRef = useRef(false)

  const {
    session, question, timeLeft, selectedAnswer, showResult, isCorrect,
    loading, error, streak, eliminatedOptions, audienceHint,
    currentDifficulty, nextQuestion, answerQuestion, takeBreak, endGame,
    useFiftyFifty, useAudience, usePhone, QUESTION_TIME,
  } = engine

  const handleQuit = async () => {
    await endGame()
    setShowEndModal(true)
  }

  const handleBreak = async () => {
    await takeBreak()
    navigate('/')
  }

  const handleNextOrEnd = async () => {
    if (isCorrect) {
      await nextQuestion()
    } else {
      await endGame()
      setShowEndModal(true)
    }
  }

  // Elle tıklama ya da otomatik geri sayım - hangisi önce gerçekleşirse bir
  // sonraki soruya/oyun sonu ekranına o geçsin; ikisinin aynı anda
  // tetiklenip iki kere ilerlemesini engelle.
  const triggerAdvance = () => {
    if (advancingRef.current) return
    advancingRef.current = true
    setAutoAdvanceIn(null)
    handleNextOrEnd()
  }

  // Sonuç ekranı gösterildiğinde otomatik geri sayımı başlat.
  // Kullanıcı elle butona basmasa bile bir sonraki soruya otomatik geçilir.
  useEffect(() => {
    if (!showResult || showEndModal) {
      setAutoAdvanceIn(null)
      return
    }

    advancingRef.current = false
    const total = isCorrect ? AUTO_ADVANCE_SECONDS_CORRECT : AUTO_ADVANCE_SECONDS_WRONG
    setAutoAdvanceIn(total)

    const interval = setInterval(() => {
      setAutoAdvanceIn((prev) => {
        if (prev === null) return null
        if (prev <= 1) {
          if (!advancingRef.current) {
            advancingRef.current = true
            handleNextOrEnd()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResult, isCorrect, showEndModal, question?.id])

  // Son 10 saniyede her saniye "tick" sesi + hafif titreşim. `timeLeft`
  // zaten oyun motoru tarafından saniyede bir güncelleniyor; burada yalnızca
  // o değişime tepki veriyoruz (yeni bir sayaç kurmuyoruz), böylece mevcut
  // oyun mantığına dokunmadan salt sunum (UI) katmanında çalışıyor.
  const lastTickedSecondRef = useRef<number | null>(null)
  useEffect(() => {
    if (loading || showResult || !question) {
      lastTickedSecondRef.current = null
      return
    }
    if (
      timeLeft > 0 &&
      timeLeft <= URGENT_THRESHOLD_SECONDS &&
      lastTickedSecondRef.current !== timeLeft
    ) {
      lastTickedSecondRef.current = timeLeft
      playTick()
      vibrateTick()
    }
  }, [timeLeft, showResult, loading, question])

  // Süre tamamen dolduğunda (manuel cevaplamadan farklı olarak) tık
  // sesinden belirgin şekilde farklı bir uyarı sesi + daha güçlü titreşim.
  // Her soru için yalnızca bir kez tetiklenir.
  const timeUpAlertedForRef = useRef<string | null>(null)
  useEffect(() => {
    if (showResult && selectedAnswer === 'timeout' && question && timeUpAlertedForRef.current !== question.id) {
      timeUpAlertedForRef.current = question.id
      playTimeUp()
      vibrateTimeUp()
    }
  }, [showResult, selectedAnswer, question])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-accent-400 rounded-full animate-spin-slow mx-auto mb-4" />
          <p className="text-primary-300">Sorular hazırlanıyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="glass-card p-8 text-center max-w-md">
          <AlertCircle size={48} className="text-error-400 mx-auto mb-4" />
          <p className="text-cream-100 mb-4">{error}</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    )
  }

  if (!question || !session) return null

  const options = [
    { key: 'A', text: question.option_a },
    { key: 'B', text: question.option_b },
    { key: 'C', text: question.option_c },
    { key: 'D', text: question.option_d },
  ]

  const timerPercent = (timeLeft / QUESTION_TIME) * 100
  const timerColor = timeLeft > 30 ? '#22c55e' : timeLeft > 10 ? '#f5b041' : '#ef4444'

  return (
    <div className="min-h-screen px-4 py-6 max-w-3xl mx-auto safe-bottom">
      {/* Top Ad */}
      <div className="mb-4">
        <AdBanner placement="game_top" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <button onClick={() => navigate('/')} className="btn-ghost text-sm flex items-center gap-1">
          <Home size={16} />
          <span className="hidden sm:inline">Ana Sayfa</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="glass-card px-3 py-1.5 flex items-center gap-2">
            <Trophy size={16} className="text-accent-400" />
            <span className="text-cream-100 font-semibold">{session.current_points}</span>
            <span className="text-primary-400 text-sm">puan</span>
          </div>
          {streak >= 3 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="glass-card px-3 py-1.5 flex items-center gap-1 glow-accent"
            >
              <span className="text-accent-400 font-bold text-sm">{streak}x</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Question Info */}
      <div className="flex items-center justify-between mb-4 text-sm">
        <div className="text-primary-300">
          Soru <span className="text-cream-100 font-bold">{session.current_question_number}</span>
        </div>
        <div className={`font-semibold ${DIFFICULTY_COLORS[currentDifficulty]}`}>
          {DIFFICULTY_LABELS[currentDifficulty]} ({DIFFICULTY_POINTS[currentDifficulty]} puan)
        </div>
      </div>

      {/* Timer */}
      <div className="flex justify-center mb-4">
        <div
          className={`relative w-20 h-20 ${
            timeLeft <= URGENT_THRESHOLD_SECONDS && timeLeft > 0 && !showResult ? 'animate-timer-shake' : ''
          }`}
          style={{ transform: 'translateZ(0)' }}
        >
          <svg className="timer-ring w-full h-full" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(168,189,212,0.1)" strokeWidth="4" />
            <circle
              cx="40" cy="40" r="36" fill="none" stroke={timerColor} strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 36}`}
              strokeDashoffset={`${2 * Math.PI * 36 * (1 - timerPercent / 100)}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold" style={{ color: timerColor }}>
              {timeLeft}
            </span>
          </div>
        </div>
      </div>

      {/* Question Card */}
      <motion.div
        key={question.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="question-card relative p-4 sm:p-6 mb-4 overflow-hidden"
      >
        <p className="text-base sm:text-xl text-cream-100 text-center font-medium leading-relaxed text-balance break-anywhere">
          {question.question_text}
        </p>
        <BorderBeam size={140} duration={7} borderWidth={1.5} colorFrom="#f5b041" colorTo="#4d7aa8" />
      </motion.div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-2 mb-4">
        {options.map((opt) => {
          const isEliminated = eliminatedOptions.includes(opt.key)
          const isSelected = selectedAnswer === opt.key
          const isCorrectAnswer = question.correct_answer === opt.key
          let className = 'option-btn p-3 sm:p-4'
          if (showResult) {
            if (isCorrectAnswer) className += ' option-correct'
            else if (isSelected) className += ' option-wrong'
          }
          if (isEliminated) className += ' opacity-30'

          return (
            <motion.button
              // question.id'yi anahtara dahil etmek, her yeni soruya geçildiğinde
              // butonun DOM düğümünü tamamen yeniden oluşturur; böylece bir önceki
              // sorudan kalan hover/focus/active/seçili görsel izi mutlak şekilde
              // temizlenir (state zaten sıfırlanıyor, bu sadece görsel garantidir).
              key={`${question.id}-${opt.key}`}
              whileTap={{ scale: 0.98 }}
              disabled={showResult || isEliminated}
              onClick={() => answerQuestion(opt.key)}
              className={className}
              aria-label={`Seçenek ${opt.key}: ${opt.text}`}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0 ${
                  showResult && isCorrectAnswer
                    ? 'bg-success-500 text-white'
                    : showResult && isSelected
                    ? 'bg-error-500 text-white'
                    : 'bg-primary-700 text-primary-200'
                }`}>
                  {opt.key}
                </span>
                <span className="flex-1 text-sm sm:text-base leading-snug break-anywhere">{opt.text}</span>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Audience Hint */}
      {audienceHint && !showResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-3 sm:p-4 mb-3"
        >
          <div className="text-sm text-primary-300 mb-2">İpucu sonucu:</div>
          <div className="space-y-1.5">
            {options.map((opt) => (
              <div key={opt.key} className="flex items-center gap-2">
                <span className="w-6 text-primary-400 font-bold">{opt.key}</span>
                <div className="flex-1 h-4 bg-primary-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-400 rounded-full transition-all duration-500"
                    style={{ width: `${audienceHint[opt.key] || 0}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm text-primary-300">%{audienceHint[opt.key] || 0}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Lifelines */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 flex-wrap">
        <button
          onClick={useFiftyFifty}
          disabled={session.lifelines_used.fifty_fifty || showResult}
          className="btn-ghost text-sm flex flex-col items-center gap-1 disabled:opacity-30"
        >
          <X size={18} />
          <span className="text-xs">50:50</span>
        </button>
        <button
          onClick={useAudience}
          disabled={session.lifelines_used.audience || showResult}
          className="btn-ghost text-sm flex flex-col items-center gap-1 disabled:opacity-30"
        >
          <Users size={18} />
          <span className="text-xs">Seyirci</span>
        </button>
        <button
          onClick={usePhone}
          disabled={session.lifelines_used.phone || showResult}
          className="btn-ghost text-sm flex flex-col items-center gap-1 disabled:opacity-30"
        >
          <Phone size={18} />
          <span className="text-xs">Telefon</span>
        </button>
      </div>

      {/* Result & Actions */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 mb-4 text-center"
          >
            {isCorrect ? (
              <>
                <p className="text-success-400 font-bold text-lg mb-2">Doğru!</p>
                <p className="text-primary-300 text-sm">
                  +{DIFFICULTY_POINTS[currentDifficulty]} puan kazandınız
                </p>
                {question.explanation && (
                  <p className="text-primary-400 text-xs mt-2 italic break-anywhere">{question.explanation}</p>
                )}
                <button
                  onClick={triggerAdvance}
                  className="btn-accent mt-4 flex items-center gap-2 mx-auto"
                >
                  Sonraki Soru {autoAdvanceIn !== null && `(${autoAdvanceIn})`}
                  <ChevronRight size={20} />
                </button>
                {autoAdvanceIn !== null && (
                  <p className="text-primary-500 text-xs mt-2">
                    {autoAdvanceIn} saniye içinde otomatik geçilecek
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-error-400 font-bold text-lg mb-2">
                  {selectedAnswer === 'timeout' ? 'Süre Doldu!' : 'Yanlış!'}
                </p>
                <p className="text-primary-300 text-sm">
                  Doğru cevap: {question.correct_answer}
                </p>
                {question.explanation && (
                  <p className="text-primary-400 text-xs mt-2 italic break-anywhere">{question.explanation}</p>
                )}
                <button
                  onClick={triggerAdvance}
                  className="btn-danger mt-4 flex items-center gap-2 mx-auto"
                >
                  <Trophy size={18} />
                  Oyunu Bitir {autoAdvanceIn !== null && `(${autoAdvanceIn})`}
                </button>
                {autoAdvanceIn !== null && (
                  <p className="text-primary-500 text-xs mt-2">
                    {autoAdvanceIn} saniye içinde otomatik sonlanacak
                  </p>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Actions */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button
          onClick={handleBreak}
          disabled={showResult}
          className="btn-ghost text-sm flex items-center gap-1 disabled:opacity-30"
        >
          <Coffee size={16} />
          Ara Ver
        </button>
        <button
          onClick={handleQuit}
          disabled={showResult}
          className="btn-ghost text-sm flex items-center gap-1 disabled:opacity-30"
        >
          <Trophy size={16} />
          Çekil
        </button>
      </div>

      {/* Bottom Ad */}
      <div className="mt-6">
        <AdBanner placement="game_bottom" />
      </div>

      {/* End Game Modal */}
      <AnimatePresence>
        {showEndModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card p-8 max-w-md w-full text-center glow-accent"
            >
              <Trophy size={48} className="text-accent-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-cream-100 mb-2">Oyun Bitti</h2>
              <p className="text-primary-300 mb-4">
                {session.current_question_number} soru cevapladınız
              </p>
              <div className="text-4xl font-bold text-accent-400 mb-6">
                {session.current_points} puan
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => navigate('/leaderboard')} className="btn-accent">
                  Liderlik Tablosu
                </button>
                <button onClick={() => navigate('/')} className="btn-primary">
                  Ana Sayfa
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
