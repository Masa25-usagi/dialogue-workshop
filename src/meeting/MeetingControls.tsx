import { Icon } from './icons'

type MeetingControlsProps = { isHost: boolean; onLeave: () => void; onReport: () => void; onDeleteData?: () => void }

export function MeetingControls({ isHost, onLeave, onReport, onDeleteData }: MeetingControlsProps) {
  return <footer className="meeting-controls"><div className="meeting-control-group"><button type="button" className="meeting-control disabled-control" disabled title="音声接続は未接続です"><span><Icon name="mic-off" size={21} /></span><small>マイク<br />オフ</small></button><button type="button" className="meeting-control disabled-control" disabled title="映像接続は未接続です"><span><Icon name="camera-off" size={21} /></span><small>カメラ<br />オフ</small></button></div><div className="footer-status"><Icon name="lock" size={17} /><span>ローカル保存 ・ 外部AI／音声／録画は未接続</span></div><div className="meeting-control-group meeting-control-right"><button type="button" className="footer-link" onClick={onReport}>{isHost ? '参加者の状態' : '個人レポート'}</button>{!isHost && onDeleteData && <button type="button" className="footer-link danger-link" onClick={onDeleteData}>自分のデータを削除</button>}<button type="button" className="leave-button" onClick={onLeave}><Icon name="leave" size={18} />退出</button></div></footer>
}

