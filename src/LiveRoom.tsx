import { MeetingRoom } from './meeting/MeetingRoom'

type LiveRoomProps = { roomId: string; token: string; displayName: string; isHost: boolean; onExit: () => void }

/** Backwards-compatible entry point for integrations that imported LiveRoom directly. */
export function LiveRoom(props: LiveRoomProps) {
  return <MeetingRoom mode="live" {...props} />
}

