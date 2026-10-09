import { useState } from 'react'
import type { FormEvent } from 'react'
import { api, apiErrorMessage } from './api'

type JoinRoomProps = {
  onJoin: (roomId: string, token: string, displayName: string, isHost: boolean) => void
  onCancel: () => void
}
type EntryStep = 'landing' | 'create' | 'join' | 'consent'

function EntryIcon({ kind }: { kind: 'chat' | 'arrow' | 'shield' | 'close' }) {
  const props = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true as const }
  if (kind === 'chat') return <svg {...props}><path d="M5 5.5h14v10H10l-4 3v-3H5v-10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M8 9h8M8 12h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
  if (kind === 'arrow') return <svg {...props}><path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  if (kind === 'shield') return <svg {...props}><path d="M12 3.5 19 6v5.4c0 4.2-2.7 7.6-7 9-4.3-1.4-7-4.8-7-9V6l7-2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  return <svg {...props}><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
}

function EntryHeader({ onBack, showBack = false }: { onBack?: () => void; showBack?: boolean }) {
  return <header className="entry-header"><div className="entry-brand"><span className="entry-logo"><EntryIcon kind="chat" /></span><span>対話のひろば</span></div>{showBack ? <button type="button" className="entry-back" onClick={onBack}>戻る</button> : <span className="entry-local">ローカル版</span>}</header>
}

function JoinRoom({ onJoin, onCancel }: JoinRoomProps) {
  const [step, setStep] = useState<EntryStep>('landing')
  const [topic, setTopic] = useState('')
  const [roomId, setRoomId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [adultConfirmed, setAdultConfirmed] = useState(false)
  const [consented, setConsented] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!topic.trim()) { setError('テーマを入力してください'); return }
    setLoading(true)
    setError(null)
    try {
      const result = await api.createRoom('live', topic.trim())
      onJoin(result.roomId, result.hostToken, '主催者', true)
    } catch (caught) {
      setError(apiErrorMessage(caught, 'ルームを作成できませんでした'))
    } finally {
      setLoading(false)
    }
  }

  const moveToConsent = (event: FormEvent) => {
    event.preventDefault()
    if (!roomId.trim()) { setError('ルームIDを入力してください'); return }
    if (!displayName.trim()) { setError('表示名を入力してください'); return }
    setError(null)
    setStep('consent')
  }

  const handleJoin = async () => {
    if (!adultConfirmed) { setError('18歳以上であることの確認が必要です'); return }
    if (!consented) { setError('利用条件への同意が必要です'); return }
    setLoading(true)
    setError(null)
    try {
      const result = await api.joinRoom(roomId.trim(), displayName.trim(), true, true)
      onJoin(result.roomId, result.participantToken, result.displayName, false)
    } catch (caught) {
      setError(apiErrorMessage(caught, 'ルームに参加できませんでした'))
      setStep('join')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'landing') return <div className="entry-backdrop"><div className="entry-window"><EntryHeader /><main className="entry-main"><section className="entry-preview"><div className="preview-orbit orbit-one" /><div className="preview-orbit orbit-two" /><div className="preview-copy"><p className="entry-overline">考えの違いを、対話の時間に</p><h1>安心して話せる<br />小さなひろば。</h1><p>立場の違いを聞き、共通点と残る違いを自分たちで確かめます。</p></div><div className="preview-topic"><span>今日のテーマ</span><strong>子どもとSNSのつきあい方</strong><div className="preview-people"><span className="preview-avatar teal">A</span><span className="preview-avatar clay">B</span><span className="preview-avatar lilac">C</span><span>3人の声を、順番に。</span></div></div></section><section className="entry-actions"><div><p className="entry-overline">参加方法を選ぶ</p><h2>ここから始めます</h2><p className="entry-description">合成デモで流れを見てから、ルームを作成・参加できます。</p></div><div className="entry-option-list"><button type="button" className="entry-option demo" onClick={() => onJoin('demo', 'demo-token', 'あなた', false)}><span className="option-icon"><EntryIcon kind="chat" /></span><span><strong>合成デモを見る</strong><small>サンプルの対話を最初から最後まで</small></span><EntryIcon kind="arrow" /></button><button type="button" className="entry-option" onClick={() => { setStep('create'); setError(null) }}><span className="option-icon"><EntryIcon kind="chat" /></span><span><strong>ルームを作る</strong><small>主催者としてテーマを決める</small></span><EntryIcon kind="arrow" /></button><button type="button" className="entry-option" onClick={() => { setStep('join'); setError(null) }}><span className="option-icon"><EntryIcon kind="arrow" /></span><span><strong>ルームに参加</strong><small>共有されたルームIDを使う</small></span><EntryIcon kind="arrow" /></button></div><div className="entry-safety"><EntryIcon kind="shield" /><span>ローカル保存・外部送信なし<br /><small>表示名はニックネームで参加できます</small></span></div></section></main><footer className="entry-footer"><span>対話のひろば</span><button type="button" onClick={onCancel}>閉じる</button></footer></div></div>

  if (step === 'create') return <EntryFormShell title="ルームを作る" description="テーマを決めて、参加者を迎えます。" onBack={() => setStep('landing')}><form className="entry-form" onSubmit={handleCreate}><label htmlFor="topic">対話のテーマ<span>必須</span></label><input id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="例：子どもとSNSのつきあい方" maxLength={120} disabled={loading} /><div className="field-note">{topic.length} / 120文字</div>{error && <p className="form-error" role="alert">{error}</p>}<button type="submit" className="entry-primary" disabled={loading || !topic.trim()}>{loading ? '作成しています…' : <>ルームを作成する <EntryIcon kind="arrow" /></>}</button></form></EntryFormShell>

  if (step === 'join') return <EntryFormShell title="ルームに参加" description="表示名を決めて、共有されたルームへ入ります。" onBack={() => setStep('landing')}><form className="entry-form" onSubmit={moveToConsent}><label htmlFor="room-id">ルームID<span>必須</span></label><input id="room-id" value={roomId} onChange={(event) => setRoomId(event.target.value)} placeholder="主催者から共有されたID" disabled={loading} /><label htmlFor="display-name">表示名（ニックネーム）<span>必須</span></label><input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="例：参加者A" maxLength={40} disabled={loading} /><div className="field-note">本名や連絡先は不要です</div>{error && <p className="form-error" role="alert">{error}</p>}<button type="submit" className="entry-primary" disabled={loading || !roomId.trim() || !displayName.trim()}>次へ進む <EntryIcon kind="arrow" /></button></form></EntryFormShell>

  return <EntryFormShell title="参加条件を確認" description="安心して参加するため、次の内容を確認してください。" onBack={() => setStep('join')}><div className="consent-card"><div className="consent-title"><EntryIcon kind="shield" /><strong>保存と削除について</strong></div><ul><li>発言・投票・案・反応は、このルームに記録されます。</li><li>途中退出と本人データの削除をいつでも選べます。</li><li>外部サイト・AI・音声サービスへ送信しません。</li></ul></div><div className="consent-checks"><label><input type="checkbox" checked={adultConfirmed} onChange={(event) => setAdultConfirmed(event.target.checked)} />18歳以上であることを確認します</label><label><input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} />上記の条件に同意します</label></div>{error && <p className="form-error" role="alert">{error}</p>}<button type="button" className="entry-primary" onClick={() => void handleJoin()} disabled={loading || !adultConfirmed || !consented}>{loading ? '参加しています…' : <>テキスト対話に参加する <EntryIcon kind="arrow" /></>}</button><p className="form-note"><EntryIcon kind="shield" />参加後も「終了」からいつでも退出できます。</p></EntryFormShell>
}

function EntryFormShell({ title, description, onBack, children }: { title: string; description: string; onBack: () => void; children: React.ReactNode }) {
  return <div className="entry-backdrop"><div className="entry-window entry-form-window"><EntryHeader showBack onBack={onBack} /><main className="entry-form-main"><div className="form-title"><p className="entry-overline">対話のひろば</p><h1>{title}</h1><p>{description}</p></div>{children}</main><footer className="entry-footer"><span>入力内容はこのルームの中だけで扱います。</span><button type="button" onClick={onBack}>戻る</button></footer></div></div>
}

export { JoinRoom }
