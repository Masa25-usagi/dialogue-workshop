import type { RoomSnapshot } from '../api'
import { Icon } from './icons'

type ParticipantStripProps = { snapshot: RoomSnapshot; isHost: boolean; displayName: string }
const tones = ['tone-mint', 'tone-cream', 'tone-gold', 'tone-lilac']

export function ParticipantStrip({ snapshot, isHost, displayName }: ParticipantStripProps) {
  return <section className="participant-strip" aria-label="参加者">
    <div className="strip-heading"><div><span className="rail-label">PARTICIPANTS</span><h2>参加者 <span>({snapshot.progress.participantCount})</span></h2></div><span className="strip-private"><Icon name="lock" size={14} />{isHost ? 'ホストのみ表示' : '同じ部屋'}</span></div>
    <div className="participant-list">{snapshot.participants.map((person, index) => {
      const mine = person.displayName === displayName || person.displayName === `${displayName}さん`
      return <div className={`participant-row ${mine ? 'mine' : ''} ${!person.active ? 'offline' : ''}`} key={person.id}><span className={`participant-avatar ${tones[index % tones.length]}`}>{person.displayName.slice(0, 1)}</span><span className="participant-name"><strong>{mine ? 'あなた' : person.displayName}</strong><small>{person.active ? (person.inMyGroup ? '同じグループ' : isHost ? '参加中' : '参加者') : '退出中'}</small></span><span className={`answered-check ${person.answeredCurrentSlide ? 'done' : ''}`} aria-label={person.answeredCurrentSlide ? '回答済み' : '未回答'}>{person.answeredCurrentSlide ? <Icon name="check" size={16} /> : <span />}</span></div>
    })}</div>
    {!isHost && <div className="participant-waiting"><span className="pulse-dot" /><div><strong>ホストが進行中</strong><small>次のページを待っています</small></div></div>}
    {isHost && <div className="host-privacy"><Icon name="shield" size={18} /><span>事前回答の本文は主催者には表示されません</span></div>}
  </section>
}

