import { useCallback, useEffect, useState } from 'react'
import {
  api,
  apiErrorMessage,
  type PersonalReport,
  type RoomSnapshot,
  type SlideResponseValue,
} from '../api'
import { HostConsole } from './HostConsole'
import { Icon } from './icons'
import { MeetingControls } from './MeetingControls'
import { ParticipantStrip } from './ParticipantStrip'
import { makeDemoSnapshot, demoSlides } from './slides'
import { SharedStage } from './SharedStage'

export type MeetingRoomProps = { mode: 'demo' | 'live'; roomId: string; token: string; displayName: string; isHost: boolean; onExit: () => void; onDemoRoleToggle?: () => void }

function formatTimer(seconds: number | null) {
  if (seconds === null) return '—'
  const safe = Math.max(0, seconds)
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}

function ReportDialog({ report, onClose }: { report: PersonalReport; onClose: () => void }) {
  return <div className="meeting-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="meeting-dialog" role="dialog" aria-modal="true" aria-labelledby="meeting-report-title"><div className="dialog-title-row"><div><span className="rail-label">PRIVATE REPORT</span><h2 id="meeting-report-title">あなたの個人レポート</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="閉じる"><Icon name="close" size={21} /></button></div><p className="report-lead"><Icon name="lock" size={16} />{report.note}</p><div className="report-stat-row"><div><strong>{report.messages.length}</strong><span>あなたの発言</span></div><div><strong>{report.proposals.length}</strong><span>あなたの案</span></div><div><strong>{report.relatedProposals.length}</strong><span>関連する案</span></div></div><div className="report-detail-grid"><section><h3>立場</h3><p>{report.stance === 'support' ? '賛成' : report.stance === 'oppose' ? '反対' : report.stance === 'unsure' ? 'わからない' : report.stance === 'hold' ? '保留' : '未回答'}</p></section><section><h3>事前回答</h3><p>{report.interviewAnswer ?? '回答なし'}</p></section><section><h3>あなたの記録</h3>{report.messages.length > 0 ? <ul>{report.messages.map((message) => <li key={message.id}>{message.text}</li>)}</ul> : <p>まだ記録はありません。</p>}</section><section><h3>あなたの案</h3>{report.proposals.length > 0 ? <ul>{report.proposals.map((proposal) => <li key={proposal.id}>{proposal.text}</li>)}</ul> : <p>まだ案はありません。</p>}</section></div><button type="button" className="stage-action-button report-close-button" onClick={onClose}>閉じる</button></section></div>
}

function localNavigate(snapshot: RoomSnapshot, direction: 'previous' | 'next') {
  const nextIndex = snapshot.presentation.currentSlideIndex + (direction === 'next' ? 1 : -1)
  const safeIndex = Math.max(0, Math.min(demoSlides.length - 1, nextIndex))
  const slide = demoSlides[safeIndex]!
  const timerEndsAt = null
  return {
    ...snapshot,
    room: { ...snapshot.room, stage: slide.stage, timerEndsAt, updatedAt: new Date().toISOString() },
    presentation: { ...snapshot.presentation, currentSlideIndex: safeIndex, currentSlideId: slide.id, slide, timerEndsAt, revision: snapshot.presentation.revision + 1, slideStartedAt: new Date().toISOString(), revealResults: false, responseStatus: 'waiting' as const, responseCount: 3, responseTotal: 4, responseSummary: slide.options ? Object.fromEntries(slide.options.map((option) => [option.id, 1])) : {}, myResponse: null },
    currentSlideIndex: safeIndex,
    currentSlideId: slide.id,
    presentationRevision: snapshot.presentation.revision + 1,
  }
}

function localResponse(snapshot: RoomSnapshot, value: SlideResponseValue): RoomSnapshot {
  const slide = snapshot.presentation.slide
  const alreadyAnswered = snapshot.presentation.myResponse?.slideId === slide.id
  const nextSummary = typeof value === 'string' && slide.options ? { ...snapshot.presentation.responseSummary, [value]: (snapshot.presentation.responseSummary?.[value] ?? 0) + (alreadyAnswered ? 0 : 1) } : snapshot.presentation.responseSummary
  return { ...snapshot, presentation: { ...snapshot.presentation, responseStatus: 'answered', myResponse: { slideId: slide.id, value, submittedAt: new Date().toISOString() }, responseCount: Math.min(snapshot.presentation.responseTotal, snapshot.presentation.responseCount + (alreadyAnswered ? 0 : 1)), responseSummary: nextSummary }, participants: snapshot.participants.map((person) => person.displayName === 'あなた' ? { ...person, answeredCurrentSlide: true } : person) }
}

export function MeetingRoom({ mode, roomId, token, displayName, isHost, onExit, onDemoRoleToggle }: MeetingRoomProps) {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(() => mode === 'demo' ? makeDemoSnapshot() : null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(mode === 'live')
  const [clock, setClock] = useState(() => Date.now())
  const [lastSynced, setLastSynced] = useState<Date | null>(() => mode === 'demo' ? new Date() : null)
  const [report, setReport] = useState<PersonalReport | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [roomIdCopied, setRoomIdCopied] = useState(false)

  const refresh = useCallback(async () => {
    if (mode === 'demo') return
    try {
      const next = await api.getSnapshot(roomId, token)
      setSnapshot(next)
      setLastSynced(new Date())
      setError(null)
    } catch (caught) {
      setError(apiErrorMessage(caught, 'ルームの状態を取得できませんでした'))
    } finally {
      setLoading(false)
    }
  }, [mode, roomId, token])

  useEffect(() => {
    if (mode === 'demo') return
    void refresh()
    const interval = window.setInterval(() => void refresh(), 2000)
    return () => window.clearInterval(interval)
  }, [mode, refresh])
  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const presentation = snapshot?.presentation
  const currentSlide = presentation?.slide
  const remainingSeconds = presentation?.timerEndsAt ? Math.ceil((new Date(presentation.timerEndsAt).getTime() - clock) / 1000) : null
  const participantCount = snapshot?.progress.participantCount ?? 0
  const selectedValue = presentation?.myResponse?.value ?? null
  const demoPreview = mode === 'demo' && isHost && currentSlide?.kind === 'choice' ? 'unsure' : null

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    if (busy) return
    setBusy(true)
    try {
      await action()
      await refresh()
    } catch (caught) {
      setError(apiErrorMessage(caught, fallback))
    } finally {
      setBusy(false)
    }
  }

  const navigate = (direction: 'previous' | 'next') => {
    if (!snapshot || !presentation) return
    if (mode === 'demo') {
      const index = presentation.currentSlideIndex + (direction === 'next' ? 1 : -1)
      if (index < 0 || index >= demoSlides.length) return
      setSnapshot(localNavigate(snapshot, direction))
      setLastSynced(new Date())
      return
    }
    void run(() => api.navigatePresentation(roomId, token, direction, presentation.revision), '共有ページを移動できませんでした')
  }

  const setTimer = (seconds: number) => {
    if (mode === 'demo') {
      if (!snapshot) return
      const timerEndsAt = seconds <= 0 ? null : new Date(Date.now() + seconds * 1000).toISOString()
      setSnapshot({ ...snapshot, room: { ...snapshot.room, timerEndsAt }, presentation: { ...snapshot.presentation, timerEndsAt, revision: snapshot.presentation.revision + 1 }, presentationRevision: snapshot.presentationRevision + 1 })
      setLastSynced(new Date())
      return
    }
    void run(() => api.setTimer(roomId, token, Math.max(0, Math.round(seconds))), '共有タイマーを設定できませんでした')
  }

  const reveal = () => {
    if (mode === 'demo') {
      if (!snapshot) return
      setSnapshot({ ...snapshot, presentation: { ...snapshot.presentation, revealResults: !snapshot.presentation.revealResults, responseStatus: snapshot.presentation.revealResults ? 'waiting' : 'results', revision: snapshot.presentation.revision + 1 }, presentationRevision: snapshot.presentationRevision + 1 })
      setLastSynced(new Date())
      return
    }
    void run(() => api.revealPresentation(roomId, token, !presentation?.revealResults, presentation?.revision), '回答結果を切り替えられませんでした')
  }

  const respond = async (value: SlideResponseValue) => {
    if (!snapshot || !currentSlide || busy || isHost) return
    const slide = currentSlide
    if (mode === 'demo') {
      setSnapshot(localResponse(snapshot, value))
      setLastSynced(new Date())
      return
    }
    setBusy(true)
    try {
      if (slide.kind === 'choice' && typeof value === 'string') await api.setStance(roomId, token, value as 'support' | 'oppose' | 'unsure' | 'hold' | 'no_answer')
      if (slide.kind === 'text') await api.setInterviewAnswer(roomId, token, typeof value === 'string' ? value : '')
      if (slide.kind === 'message' && typeof value === 'string') await api.addMessage(roomId, token, value)
      if (slide.kind === 'proposal' && typeof value === 'string') await api.createProposal(roomId, token, value, snapshot.messages.filter((message) => message.participantId === snapshot.me?.id).map((message) => message.id))
      if (slide.kind === 'insight') {
        const insight = snapshot.insights[0]
        if (insight) await api.confirmInsight(roomId, token, insight.id, true)
      }
      if (slide.kind === 'like' && value === 'like') {
        const proposal = snapshot.proposals[0]
        if (proposal) await api.toggleProposalLike(roomId, token, proposal.id)
      }
      if (slide.kind === 'agreement' && typeof value === 'string') {
        const proposal = snapshot.proposals[0]
        if (proposal) await api.setProposalAgreement(roomId, token, proposal.id, value as 'support' | 'unsure' | 'oppose' | 'no_answer')
      }
      if (slide.kind === 'scale' && typeof value === 'number') await api.submitFeedback(roomId, token, value, '')
      await api.respondToSlide(roomId, token, slide.id, value, `${slide.id}-${Date.now()}`)
      await refresh()
    } catch (caught) {
      setError(apiErrorMessage(caught, '回答を送信できませんでした'))
    } finally {
      setBusy(false)
    }
  }

  const openReport = async () => {
    if (isHost || reportLoading) return
    if (report) { setReportOpen(true); return }
    setReportLoading(true)
    try {
      if (mode === 'demo') {
        setReport({ participant: { id: 'demo-you', displayName }, stance: 'unsure', interviewAnswer: null, messages: [], proposals: [], relatedProposals: snapshot?.proposals ?? [], contributions: [], note: 'これはあなたの入力と明示的な貢献タグだけを表示する個人レポートです。人物評価やAI推定は含みません。' })
      } else setReport(await api.getReport(roomId, token))
      setReportOpen(true)
    } catch (caught) {
      setError(apiErrorMessage(caught, '個人レポートを取得できませんでした'))
    } finally {
      setReportLoading(false)
    }
  }

  const leave = async () => {
    if (!isHost && mode === 'live') {
      await run(() => api.leaveRoom(roomId, token), '退出処理に失敗しました')
    }
    onExit()
  }

  const deleteOwnData = async () => {
    if (mode === 'demo' || isHost || !window.confirm('このルームに保存された自分の入力を削除しますか？')) return
    await run(() => api.deleteParticipantData(roomId, token), '自分のデータを削除できませんでした')
    onExit()
  }

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId)
      setRoomIdCopied(true)
      window.setTimeout(() => setRoomIdCopied(false), 1800)
    } catch {
      setRoomIdCopied(false)
    }
  }

  if (loading && !snapshot) return <div className="meeting-backdrop"><div className="meeting-loading"><span className="shared-live-dot" />ルームを読み込んでいます…</div></div>
  if (!snapshot || !presentation || !currentSlide) return <div className="meeting-backdrop"><div className="meeting-error-screen"><Icon name="shield" size={28} /><h1>ルームに接続できません</h1><p>{error ?? 'APIサーバーが起動しているか確認してください。'}</p><button type="button" className="stage-action-button" onClick={onExit}>入室画面へ戻る</button></div></div>

  const syncedLabel = mode === 'demo' ? '合成データのデモ' : lastSynced ? `同期済み ${lastSynced.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}` : '同期中'
  return <div className={`meeting-backdrop ${isHost ? 'host-view' : 'participant-view'}`}><div className="meeting-frame">
    <header className="meeting-header"><div className="meeting-brand"><span className="brand-mark"><Icon name="brand" size={27} /></span><div><strong>対話のひろば</strong><span>{snapshot.room.topic}</span></div></div><div className="meeting-header-center"><span className={`meeting-mode ${mode}`}>{mode === 'live' ? 'LIVE' : 'DEMO'}</span><span className="meeting-shared-state"><span className="shared-live-dot" />共有中</span><span className="header-meta"><Icon name="users" size={16} />{participantCount}人</span><span className="header-meta"><Icon name="clock" size={16} />{formatTimer(remainingSeconds)}</span></div><div className="meeting-header-right">{mode === 'demo' && onDemoRoleToggle && <button type="button" className="demo-role-toggle" onClick={onDemoRoleToggle}>{isHost ? '参加者ビュー' : '主催者ビュー'}</button>}<span className="connection-state"><span className="connection-dot" />{isHost ? '主催者' : displayName}</span><button type="button" className="header-exit" onClick={() => void leave()}>終了</button></div></header>
    {error && <div className="meeting-error-bar" role="alert"><span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="エラーを閉じる"><Icon name="close" size={16} /></button></div>}
    <div className="meeting-toolbar"><div><span className="toolbar-room">Hall / Room A</span><span className="toolbar-separator" /><span>{syncedLabel}</span></div><div className="meeting-toolbar-right">{mode === 'live' && isHost && <div className="host-room-share"><span>ルームID</span><code>{roomId}</code><button type="button" onClick={() => void copyRoomId}>{roomIdCopied ? 'コピー済み' : 'コピー'}</button></div>}<span className="toolbar-note">{isHost ? 'あなたが共有ページを進めます' : 'ホストが進行中'}</span></div></div>
    <div className="meeting-layout"><main className="meeting-main"><SharedStage slide={currentSlide} index={presentation.currentSlideIndex} total={presentation.totalSlides} isHost={isHost} status={presentation.responseStatus} selectedValue={isHost ? demoPreview : selectedValue} responseCount={presentation.responseCount} responseTotal={presentation.responseTotal} onRespond={(value) => void respond(value)} onReport={() => void openReport()} />{!isHost && <div className="participant-help"><Icon name="shield" size={18} /><div><strong>あなたの回答だけが記録されます</strong><span>ページ移動と集計の操作は主催者に限られます。</span></div></div>}</main><aside className="meeting-rail"><ParticipantStrip snapshot={snapshot} isHost={isHost} displayName={displayName} />{isHost && <HostConsole slide={currentSlide} index={presentation.currentSlideIndex} total={presentation.totalSlides} status={presentation.responseStatus} responseCount={presentation.responseCount} responseTotal={presentation.responseTotal} responseSummary={presentation.responseSummary} revealResults={presentation.revealResults} remainingSeconds={remainingSeconds} onPrevious={() => navigate('previous')} onNext={() => navigate('next')} onTimer={setTimer} onReveal={reveal} atStart={presentation.currentSlideIndex === 0} atEnd={presentation.currentSlideIndex >= presentation.totalSlides - 1} />}{!isHost && <div className="participant-side-note"><span className="pulse-dot" /><div><strong>ホストが進行中</strong><small>表示が変わるまでこのページを見ていてください</small></div></div>}</aside></div>
    <div className="meeting-footer-note"><span><Icon name="shield" size={15} />{mode === 'demo' ? '合成データのデモ。APIは呼び出していません。' : 'ローカルAPIで同期中。事前回答の本文は主催者に表示されません。'}</span><span>最終同期：{lastSynced ? lastSynced.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}</span></div>
    <MeetingControls isHost={isHost} onLeave={() => void leave()} onReport={() => void openReport()} onDeleteData={!isHost ? () => void deleteOwnData() : undefined} />
    {reportOpen && report && <ReportDialog report={report} onClose={() => setReportOpen(false)} />}
  </div></div>
}
