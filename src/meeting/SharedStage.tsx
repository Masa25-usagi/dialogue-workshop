import { useEffect, useRef } from 'react'
import type { SharedSlide, SlideResponseStatus, SlideResponseValue } from '../api'
import { Icon } from './icons'
import { SlideRenderer } from './SlideRenderer'

type SharedStageProps = {
  slide: SharedSlide
  index: number
  total: number
  isHost: boolean
  status: SlideResponseStatus
  selectedValue: SlideResponseValue | null
  responseCount: number
  responseTotal: number
  onRespond: (value: SlideResponseValue) => void
  onReport?: () => void
}

export function SharedStage({ slide, index, total, isHost, status, selectedValue, responseCount, responseTotal, onRespond, onReport }: SharedStageProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const ratio = responseTotal > 0 ? Math.round((responseCount / responseTotal) * 100) : 0
  useEffect(() => {
    canvasRef.current?.scrollTo({ top: 0, left: 0 })
  }, [slide.id])
  return <section className="shared-stage" aria-label="共有HTMLスライド">
    <div className="shared-stage-topline">
      <span className="shared-stage-label"><span className="shared-live-dot" />共有中</span>
      <span className="slide-count">質問 {index + 1} / {total}</span>
      <span className="stage-response-meter"><span>{isHost ? '回答' : status === 'answered' ? '送信済み' : '回答受付中'}</span><strong>{isHost ? `${responseCount} / ${responseTotal}` : status === 'answered' ? '✓' : `${ratio}%`}</strong></span>
    </div>
    <div className="slide-canvas">
      <div className="slide-canvas-inner" ref={canvasRef}>
        <SlideRenderer key={slide.id} slide={slide} isHost={isHost} status={status} selectedValue={selectedValue} onRespond={onRespond} onReport={onReport} />
      </div>
    </div>
    <div className="shared-stage-caption"><Icon name="lock" size={16} />{isHost ? 'このページは主催者が共有しています' : 'ページ移動は主催者だけが操作します'}</div>
  </section>
}
