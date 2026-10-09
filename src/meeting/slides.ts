import type { RoomSnapshot, SharedSlide } from '../api'

export const demoSlides: SharedSlide[] = [
  { id: 'welcome', stage: 'consent', kind: 'welcome', title: 'ようこそ。今日の対話を始めます', body: '主催者が共有ページを進めます。いま表示されている問いだけに答え、必要なときはいつでも退出・削除できます。', actionLabel: '準備できました' },
  {
    id: 'stance', stage: 'stance', kind: 'choice', title: '今夜、SNSの通知をどう整える？', body: 'いまの立場に近いものを一つ選んでください。あとから変えても構いません。', actionLabel: 'この立場で回答する',
    options: [
      { id: 'support', label: 'すべてオンのままにする', description: '連絡を逃さない' },
      { id: 'oppose', label: '重要な通知だけ残す', description: '夜の区切りをつくる' },
      { id: 'unsure', label: '寝る前はまとめてオフにする', description: '朝にまとめて確認する' },
    ],
  },
  { id: 'interview', stage: 'interview', kind: 'text', title: '気になっていることを一言で', body: 'ここでの回答は本人だけに表示されます。短くても、空欄でも大丈夫です。', actionLabel: '回答を送る', placeholder: 'いま気になっていること' },
  { id: 'dialogue-1', stage: 'dialogue1', kind: 'message', title: '一人ずつ、理由を聞いてみる', body: '相手の経験を聞いてから、自分の考えを一つだけ共有します。', actionLabel: '発言を送る', placeholder: 'あなたの考えを短く書く' },
  { id: 'insight', stage: 'insights', kind: 'insight', title: '共通点と、まだ違うところを確かめる', body: '安心して使えることは共通しています。誰が区切りを決めるかは、もう少し話してみます。', actionLabel: '確認しました' },
  { id: 'dialogue-2', stage: 'dialogue2', kind: 'message', title: '違いを越える言葉を探す', body: '相手の立場を受け取り、次の案につながる一言を共有します。', actionLabel: '発言を送る', placeholder: '気づいたこと、残したいこと' },
  { id: 'proposal', stage: 'proposals', kind: 'proposal', title: 'みんなでできそうな案を一つ', body: '共通点と違いを手がかりに、明日から試せそうな案を書きます。', actionLabel: '案を送る', placeholder: '実行できそうな案' },
  { id: 'like', stage: 'proposals', kind: 'like', title: 'この案に、いいねを送りますか？', body: 'いいねは案への関心を表します。合意とは別に記録されます。', actionLabel: '反応を送る', options: [{ id: 'like', label: 'いいねを送る' }, { id: 'skip', label: '今回は送らない' }] },
  { id: 'agreement', stage: 'proposals', kind: 'agreement', title: 'この案に合意できますか？', body: 'いいねとは別に、案への意思を一つ選びます。', actionLabel: '合意を送る', options: [{ id: 'support', label: '合意する' }, { id: 'unsure', label: 'まだ決めない' }, { id: 'oppose', label: '合意しない' }, { id: 'no_answer', label: '回答しない' }] },
  { id: 'scale', stage: 'report', kind: 'scale', title: '今日の対話を、ひとことで振り返る', body: '話しやすさや気づきの大きさに近い数字を選びます。', actionLabel: '振り返りを送る', options: [1, 2, 3, 4, 5].map((value) => ({ id: String(value), label: String(value) })) },
  { id: 'summary', stage: 'report', kind: 'summary', title: '今日の対話を、あなたの記録として受け取る', body: 'あなたが入力した内容と、明示的に選んだ反応だけを個人レポートで確認できます。', actionLabel: '個人レポートを見る' },
]

const now = new Date().toISOString()

export function makeDemoSnapshot(): RoomSnapshot {
  const slide = demoSlides[1]!
  return {
    room: { id: 'demo', mode: 'demo', topic: '子どもとSNSのつきあい方', stage: slide.stage, stageStartedAt: now, timerEndsAt: new Date(Date.parse(now) + 504_000).toISOString(), createdAt: now, updatedAt: now },
    presentation: {
      currentSlideIndex: 1, currentSlideId: slide.id, totalSlides: demoSlides.length, revision: 4, slideStartedAt: now, slide,
      timerEndsAt: new Date(Date.parse(now) + 504_000).toISOString(), revealResults: false, responseStatus: 'waiting', responseCount: 3, responseTotal: 4,
      responseSummary: { support: 1, oppose: 1, unsure: 1 }, myResponse: null, serverNow: now,
    },
    currentSlideIndex: 1, currentSlideId: slide.id, presentationRevision: 4,
    progress: { participantCount: 4, minParticipants: 2, canProceed: true, reason: '参加者が揃っています。' },
    participants: [
      { id: 'demo-a', displayName: 'Aさん', active: true, inMyGroup: true, answeredCurrentSlide: true },
      { id: 'demo-b', displayName: 'Bさん', active: true, inMyGroup: true, answeredCurrentSlide: true },
      { id: 'demo-c', displayName: 'Cさん', active: true, inMyGroup: true, answeredCurrentSlide: true },
      { id: 'demo-you', displayName: 'あなた', active: true, inMyGroup: true, answeredCurrentSlide: false },
    ],
    groups: [{ id: 'group-1', memberIds: ['demo-a', 'demo-b', 'demo-c'], memberNames: ['Aさん', 'Bさん', 'Cさん'] }],
    messages: [
      { id: 'demo-message-a', participantId: 'demo-a', authorLabel: 'Aさん', text: '夜は区切りをつけたいけれど、連絡は残しておきたいです。', createdAt: now, updatedAt: now, demo: true },
      { id: 'demo-message-b', participantId: 'demo-b', authorLabel: 'Bさん', text: '自分で使い方を選べることも、大切にしたいです。', createdAt: now, updatedAt: now, demo: true },
      { id: 'demo-message-c', participantId: 'demo-c', authorLabel: 'Cさん', text: '何を止めて、何を残すかを分けて考えられそうです。', createdAt: now, updatedAt: now, demo: true },
    ],
    insights: [
      { id: 'demo-insight-common', kind: 'common', text: '安心して使えること', sourceMessageIds: ['demo-message-a', 'demo-message-c'], status: 'unconfirmed', corrections: [], demo: true },
      { id: 'demo-insight-difference', kind: 'difference', text: '誰が利用の区切りを決めるか', sourceMessageIds: ['demo-message-b'], status: 'unconfirmed', corrections: [], demo: true },
    ],
    proposals: [
      { id: 'demo-proposal-1', participantId: 'demo-c', authorLabel: 'Cさん', text: '家庭ごとに夜の区切りと連絡手段を選べるようにする', relatedMessageIds: ['demo-message-a'], likeCount: 2, likedByMe: false, agreement: { support: 2, unsure: 1, oppose: 0, noAnswer: 0, unanswered: 0, totalEligible: 3, myChoice: null }, createdAt: now, updatedAt: now, demo: true },
    ],
    stanceSummary: { support: 1, oppose: 1, unsure: 1, hold: 0, no_answer: 0 },
    me: null,
    hostView: { privateAnswersOmitted: true, feedbackCount: 0 },
  }
}
