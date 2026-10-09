import { useState } from 'react'
import './App.css'
import { JoinRoom } from './JoinRoom'
import { MeetingRoom } from './meeting/MeetingRoom'

type AppMode = 'startup' | 'meeting'

function App() {
  const [mode, setMode] = useState<AppMode>('startup')
  const [room, setRoom] = useState<{ mode: 'demo' | 'live'; roomId: string; token: string; displayName: string; isHost: boolean } | null>(null)

  if (mode === 'startup' || !room) return <JoinRoom onJoin={(roomId, token, displayName, isHost) => { setRoom({ mode: roomId === 'demo' ? 'demo' : 'live', roomId, token, displayName, isHost: roomId === 'demo' ? true : isHost }); setMode('meeting') }} onCancel={() => setMode('startup')} />
  return <MeetingRoom {...room} onDemoRoleToggle={room.mode === 'demo' ? () => setRoom((current) => current ? { ...current, isHost: !current.isHost } : current) : undefined} onExit={() => { setRoom(null); setMode('startup') }} />
}

export default App
