import { useState } from 'react'
import type { SharedSlide, SlideResponseStatus } from '../api'
import { Icon } from './icons'

type HostConsoleProps = {
  slide: SharedSlide
  index: number
  total: number
  status: SlideResponseStatus
  responseCount: number
  responseTotal: number
  responseSummary: Record<string, number> | null
  revealResults: boolean
  remainingSeconds: number | null
  onPrevious: () => void
  onNext: () => void
  onTimer: (seconds: number) => void
  onReveal: () => void
  atStart: boolean
  atEnd: boolean
}

const format = (seconds: number | null) => seconds === null ? '—' : `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, '0')}:${String(Math.max(0, seconds) % 60).padStart(2, '0')}`

export function HostConsole({ slide, index, total, status, responseCount, responseTotal, responseSummary, revealResults, remainingSeconds, onPrevious, onNext, onTimer, onReveal, atStart, atEnd }: HostConsoleProps) {
  const [timerValue, setTimerValue] = useState(300)
  const percentage = responseTotal > 0 ? Math.round((responseCount / responseTotal) * 100) : 0
  return <section className="host-console" aria-label="主催者コンソール">
    <div className="console-heading"><div><span className="rail-label">HOST CONSOLE</span><h2>進行を整える</h2></div><span className="host-key"><Icon name="lock" size={14} />主催者のみ</span></div>
    <div className="console-section response-section"><div className="console-section-title"><span>回答ゲージ</span><strong>{responseCount} / {responseTotal}</strong></div><div className="response-track"><span style={{ width: `${percentage}%` }} /></div><div className="response-meta"><span>{status === 'results' ? '結果を開示中' : `${percentage}% 回答済み`}</span><button type="button" className={`reveal-button ${revealResults ? 'is-revealed' : ''}`} onClick={onReveal}><Icon name="eye" size={15} />{revealResults ? '結果を閉じる' : '結果を開示'}</button></div>{revealResults && responseSummary && <div className="mini-results">{(slide.options ?? []).map((option) => <div key={option.id}><span>{option.label}</span><strong>{responseSummary[option.id] ?? 0}</strong></div>)}</div>}</div>
    <div className="console-section timer-section"><div className="console-section-title"><span>共有タイマー</span><strong><Icon name="clock" size={16} />{format(remainingSeconds)}</strong></div><div className="timer-controls"><button type="button" onClick={() => onTimer(Math.max(0, (remainingSeconds ?? timerValue) - 30))}>−30秒</button><button type="button" onClick={() => onTimer((remainingSeconds ?? timerValue) + 30)}>＋30秒</button><label><span className="sr-only">秒数</span><input type="number" min={0} max={7200} value={timerValue} onChange={(event) => setTimerValue(Number(event.target.value))} /><button type="button" className="timer-set" onClick={() => onTimer(timerValue)}>セット</button></label></div></div>
    <div className="console-section nav-section"><div className="console-section-title"><span>共有ページ</span><strong>{index + 1} / {total}</strong></div><div className="host-nav"><button type="button" onClick={onPrevious} disabled={atStart}><Icon name="arrow-left" size={17} />前へ</button><button type="button" onClick={onNext} disabled={atEnd}>次へ<Icon name="arrow-right" size={17} /></button></div><p>前後移動は主催者だけが操作できます</p></div>
  </section>
}

