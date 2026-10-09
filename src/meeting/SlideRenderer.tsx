import { useState } from 'react'
import type { FormEvent } from 'react'
import type { SharedSlide, SlideResponseStatus, SlideResponseValue } from '../api'
import { Icon } from './icons'

type SlideRendererProps = {
  slide: SharedSlide
  isHost: boolean
  status: SlideResponseStatus
  selectedValue: SlideResponseValue | null
  previewValue?: SlideResponseValue | null
  onRespond: (value: SlideResponseValue) => void
  onReport?: () => void
}

const choiceHint: Record<string, string> = { support: '賛成', oppose: '反対', unsure: 'わからない', hold: '保留', no_answer: '回答しない' }

function ResponseState({ status }: { status: SlideResponseStatus }) {
  if (status === 'answered') return <div className="slide-response-state answered"><Icon name="check" size={17} />回答済み ・ 次のページを待っています</div>
  if (status === 'results') return <div className="slide-response-state results"><Icon name="eye" size={17} />回答結果が開示されています</div>
  if (status === 'waiting') return <div className="slide-response-state waiting"><span className="pulse-dot" />参加者の回答を待っています</div>
  return null
}

export function SlideRenderer({ slide, isHost, status, selectedValue, previewValue = null, onRespond, onReport }: SlideRendererProps) {
  const [draft, setDraft] = useState(() => typeof selectedValue === 'string' ? selectedValue : '')
  const [choiceState, setChoiceState] = useState<SlideResponseValue | null>(null)
  const choice = selectedValue ?? choiceState ?? previewValue

  const submitDraft = (event: FormEvent) => {
    event.preventDefault()
    const value = draft.trim()
    if (value) onRespond(value)
  }

  const submitChoice = (value: SlideResponseValue) => {
    setChoiceState(value)
    onRespond(value)
  }

  const optionLabel = (optionId: string) => choiceHint[optionId] ?? optionId
  const hasChoiceOptions = slide.kind === 'choice' || slide.kind === 'like' || slide.kind === 'agreement' || slide.kind === 'scale'

  return <div className={`slide-content slide-${slide.kind}`}>
    <div className="slide-kicker-row">
      <span className="slide-kicker">{slide.kind === 'welcome' ? '対話のひろば' : slide.kind === 'scale' ? '振り返り' : '共有された問い'}</span>
      {!isHost && <span className="host-progress-badge"><span className="pulse-dot" />ホストが進行中</span>}
    </div>
    <h2>{slide.title}</h2>
    <p className="slide-body">{slide.body}</p>

    {hasChoiceOptions && <div className={`slide-options options-${Math.min(slide.options?.length ?? 0, 5)}`} role={isHost ? undefined : 'group'} aria-label={isHost ? undefined : '回答を選択'}>
      {(slide.options ?? []).map((option, index) => {
        const isSelected = choice === option.id
        const optionContent = <><span className="option-letter">{slide.kind === 'scale' ? option.label : String.fromCharCode(65 + index)}</span><span className="option-copy"><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>{isSelected && <Icon name="check" size={21} />}</>
        if (isHost) return <div className={`slide-option ${isSelected ? 'selected' : ''}`} key={option.id}>{optionContent}</div>
        return <button type="button" className={`slide-option ${isSelected ? 'selected' : ''}`} key={option.id} onClick={() => submitChoice(option.id)} aria-pressed={isSelected}>{optionContent}</button>
      })}
    </div>}

    {(slide.kind === 'text' || slide.kind === 'message' || slide.kind === 'proposal') && !isHost && <form className="slide-text-form" onSubmit={submitDraft}>
      <label htmlFor={`slide-input-${slide.id}`}>{slide.kind === 'text' ? '本人だけに表示される回答' : slide.kind === 'proposal' ? '共有する案' : 'あなたの一言'}</label>
      <textarea id={`slide-input-${slide.id}`} rows={4} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={slide.placeholder ?? '短くても大丈夫です'} maxLength={1000} />
      <button type="submit" className="stage-action-button" disabled={!draft.trim()}><Icon name="send" size={18} />{slide.actionLabel ?? '送る'}</button>
    </form>}

    {(slide.kind === 'welcome' || slide.kind === 'insight' || slide.kind === 'summary') && <div className="slide-action-area">
      {!isHost && slide.kind !== 'summary' && <button type="button" className="stage-action-button" onClick={() => onRespond('done')}><Icon name="check" size={18} />{slide.actionLabel ?? '確認する'}</button>}
      {!isHost && slide.kind === 'summary' && <button type="button" className="stage-action-button" onClick={onReport}><Icon name="arrow-right" size={18} />{slide.actionLabel ?? 'レポートを見る'}</button>}
      {isHost && <div className="host-slide-note"><Icon name="lock" size={18} />参加者だけがこのページに回答できます</div>}
    </div>}

    {slide.kind === 'like' && !isHost && <p className="slide-privacy-note"><Icon name="heart" size={16} />いいねと合意は別々に記録されます</p>}
    {slide.kind === 'agreement' && !isHost && <p className="slide-privacy-note"><Icon name="shield" size={16} />回答しないことも選択できます</p>}
    {slide.kind === 'scale' && !isHost && <p className="scale-caption"><span>まだ話し足りない</span><span>とてもよかった</span></p>}
    <ResponseState status={status} />
    {hasChoiceOptions && !isHost && status === 'idle' && <p className="slide-hint">{slide.kind === 'scale' ? '数字を一つ選ぶと回答できます' : `回答を選ぶと「${optionLabel(String(choice ?? '')) || '選択'}」として送信されます`}</p>}
  </div>
}
