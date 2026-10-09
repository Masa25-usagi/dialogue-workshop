import { randomBytes, randomUUID } from "node:crypto";

export const STAGES = [
  "consent",
  "stance",
  "interview",
  "dialogue1",
  "insights",
  "break",
  "dialogue2",
  "proposals",
  "report",
] as const;

export type RoomMode = "demo" | "live";
export type Stage = (typeof STAGES)[number];
export type VoteChoice = "support" | "oppose" | "unsure" | "hold" | "no_answer";
export type SharedSlideKind =
  | "welcome"
  | "choice"
  | "text"
  | "message"
  | "insight"
  | "proposal"
  | "like"
  | "agreement"
  | "scale"
  | "summary";
export type SlideResponseValue = string | number;
export type SlideResponseStatus = "idle" | "answered" | "waiting" | "results";

export type SharedSlide = {
  id: string;
  stage: Stage;
  kind: SharedSlideKind;
  title: string;
  body: string;
  options?: Array<{ id: string; label: string; description?: string }>;
  actionLabel?: string;
  placeholder?: string;
};
export type InsightKind = "common" | "difference";
export type InsightStatus = "unconfirmed" | "confirmed";
export type AgreementChoice = "support" | "unsure" | "oppose" | "no_answer";
export type ContributionTag = "idea" | "question" | "concretized";
export type CorrectionStatus = "pending" | "accepted" | "rejected";

type Message = {
  id: string;
  participantId: string;
  authorLabel: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  demo: boolean;
};
type Proposal = {
  id: string;
  participantId: string;
  authorLabel: string;
  text: string;
  relatedMessageIds: string[];
  likes: Set<string>;
  agreements: Map<string, AgreementChoice>;
  createdAt: string;
  updatedAt: string;
  demo: boolean;
};
type Insight = {
  id: string;
  kind: InsightKind;
  text: string;
  sourceMessageIds: string[];
  status: InsightStatus;
  createdAt: string;
  updatedAt: string;
  demo: boolean;
};
type InsightCorrection = {
  id: string;
  insightId: string;
  participantId: string;
  text: string;
  status: CorrectionStatus;
  createdAt: string;
};
type Feedback = { rating: number; comment: string; createdAt: string };
type Participant = {
  id: string;
  token: string;
  displayName: string;
  adultConfirmed: boolean;
  consented: boolean;
  stance: VoteChoice | null;
  interviewAnswer: string | null;
  active: boolean;
  deleted: boolean;
  createdAt: string;
  leftAt: string | null;
  contributions: Map<string, ContributionTag>;
  feedback: Feedback | null;
};
type Room = {
  id: string;
  mode: RoomMode;
  topic: string;
  hostToken: string;
  stage: Stage;
  stageStartedAt: string;
  timerEndsAt: string | null;
  slides: SharedSlide[];
  currentSlideIndex: number;
  currentSlideId: string;
  presentationRevision: number;
  slideStartedAt: string;
  revealResults: boolean;
  slideResponses: Map<string, Map<string, { value: SlideResponseValue; submittedAt: string; clientMutationId?: string }>>;
  participants: Map<string, Participant>;
  messages: Map<string, Message>;
  proposals: Map<string, Proposal>;
  insights: Map<string, Insight>;
  corrections: Map<string, InsightCorrection>;
  groups: Map<string, string>;
  demoMessages: Message[];
  demoProposals: Proposal[];
  demoInsights: Insight[];
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RoomCreation = { roomId: string; hostToken: string; mode: RoomMode };
export type ParticipantJoin = {
  roomId: string;
  participantId: string;
  participantToken: string;
  displayName: string;
  consented: boolean;
  adultConfirmed: boolean;
};

export class DomainError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "DomainError";
    this.status = status;
  }
}

const MAX_TEXT = 500;
const MAX_TOPIC = 120;
const MAX_NAME = 40;
const MAX_INTERVIEW = 1000;
const MIN_PARTICIPANTS = 2;
const MESSAGE_STAGES = new Set<Stage>(["dialogue1", "dialogue2"]);
const DEMO_NAMES = new Map([
  ["demo-a", "A"],
  ["demo-b", "B"],
  ["demo-c", "C"],
]);

export type Snapshot = {
  room: {
    id: string;
    mode: RoomMode;
    topic: string;
    stage: Stage;
    stageStartedAt: string;
    timerEndsAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  /** Shared presentation state. The host is the sole writer for the current slide. */
  presentation: {
    currentSlideIndex: number;
    currentSlideId: string;
    totalSlides: number;
    revision: number;
    slideStartedAt: string;
    slide: SharedSlide;
    timerEndsAt: string | null;
    revealResults: boolean;
    responseStatus: SlideResponseStatus;
    responseCount: number;
    responseTotal: number;
    responseSummary: Record<string, number> | null;
    myResponse: { slideId: string; value: SlideResponseValue; submittedAt: string } | null;
    serverNow: string;
  };
  // Flat aliases make the shared source of truth easy to consume in small clients.
  currentSlideIndex: number;
  currentSlideId: string;
  presentationRevision: number;
  progress: {
    participantCount: number;
    minParticipants: number;
    canProceed: boolean;
    reason: string;
  };
  participants: Array<{
    id: string;
    displayName: string;
    active: boolean;
    inMyGroup: boolean;
    answeredCurrentSlide: boolean;
  }>;
  groups: Array<{ id: string; memberIds: string[]; memberNames: string[] }>;
  messages: Array<{
    id: string;
    participantId: string;
    authorLabel: string;
    text: string;
    createdAt: string;
    updatedAt: string;
    demo: boolean;
  }>;
  insights: Array<{
    id: string;
    kind: InsightKind;
    text: string;
    sourceMessageIds: string[];
    status: InsightStatus;
    corrections: Array<{
      id: string;
      text: string;
      status: CorrectionStatus;
      own: boolean;
    }>;
    demo: boolean;
  }>;
  proposals: Array<{
    id: string;
    participantId: string;
    authorLabel: string;
    text: string;
    relatedMessageIds: string[];
    likeCount: number;
    likedByMe: boolean;
    agreement: {
      support: number;
      unsure: number;
      oppose: number;
      noAnswer: number;
      unanswered: number;
      totalEligible: number;
      myChoice: AgreementChoice | null;
    };
    createdAt: string;
    updatedAt: string;
    demo: boolean;
  }>;
  stanceSummary: Record<VoteChoice, number>;
  me: {
    id: string;
    displayName: string;
    adultConfirmed: boolean;
    consented: boolean;
    active: boolean;
    stance: VoteChoice | null;
    interviewAnswer: string | null;
    contributions: Array<{ targetId: string; tag: ContributionTag }>;
  } | null;
  hostView: { privateAnswersOmitted: true; feedbackCount: number } | null;
};

export type PersonalReport = {
  participant: { id: string; displayName: string };
  stance: VoteChoice | null;
  interviewAnswer: string | null;
  messages: Snapshot["messages"];
  proposals: Snapshot["proposals"];
  relatedProposals: Snapshot["proposals"];
  contributions: Array<{ targetId: string; tag: ContributionTag }>;
  note: string;
};

function now() {
  return new Date().toISOString();
}

function buildSharedSlides(topic: string): SharedSlide[] {
  return [
    {
      id: "welcome",
      stage: "consent",
      kind: "welcome",
      title: "ようこそ。今日の対話を始めます",
      body: `テーマは「${topic}」。主催者が共有ページを進めます。いま表示されている問いだけに答えてください。`,
      actionLabel: "準備できました",
    },
    {
      id: "stance",
      stage: "stance",
      kind: "choice",
      title: "いまの立場を一つ選んでください",
      body: `「${topic}」について、今の気持ちに近いものを選びます。あとから変えても構いません。`,
      options: [
        { id: "support", label: "賛成", description: "今は前向きに考えています" },
        { id: "oppose", label: "反対", description: "気になる点があります" },
        { id: "unsure", label: "わからない", description: "もう少し話を聞きたいです" },
        { id: "hold", label: "保留", description: "今は決めずに考えます" },
        { id: "no_answer", label: "回答しない", description: "選択を共有しません" },
      ],
      actionLabel: "この立場で回答する",
    },
    {
      id: "interview",
      stage: "interview",
      kind: "text",
      title: "最初に、気になっていることを一言で",
      body: "ここでの回答は本人だけに表示されます。短くても、空欄でも大丈夫です。",
      actionLabel: "回答を送る",
      placeholder: "いま気になっていること",
    },
    {
      id: "dialogue-1",
      stage: "dialogue1",
      kind: "message",
      title: "一人ずつ、理由を聞いてみる",
      body: "相手の経験や理由を聞いてから、自分の考えを一つだけ共有します。",
      actionLabel: "発言を送る",
      placeholder: "あなたの考えを短く書く",
    },
    {
      id: "insight",
      stage: "insights",
      kind: "insight",
      title: "共通点と、まだ違うところを確かめる",
      body: "主催者が整理した要点を読み、表示内容に納得できたら確認します。訂正や補足も提案できます。",
      actionLabel: "確認しました",
    },
    {
      id: "dialogue-2",
      stage: "dialogue2",
      kind: "message",
      title: "もう一度、違いを越える言葉を探す",
      body: "相手の立場を受け取り、次の案につながる一言を共有します。",
      actionLabel: "発言を送る",
      placeholder: "気づいたこと、残したいこと",
    },
    {
      id: "proposal",
      stage: "proposals",
      kind: "proposal",
      title: "みんなでできそうな案を一つ",
      body: "共通点と違いを手がかりに、明日から試せそうな案を一つ書きます。",
      actionLabel: "案を送る",
      placeholder: "実行できそうな案",
    },
    {
      id: "like",
      stage: "proposals",
      kind: "like",
      title: "この案に、いいねを送りますか？",
      body: "いいねは案への関心を表します。合意とは別に記録されます。",
      options: [
        { id: "like", label: "いいねを送る" },
        { id: "skip", label: "今回は送らない" },
      ],
      actionLabel: "反応を送る",
    },
    {
      id: "agreement",
      stage: "proposals",
      kind: "agreement",
      title: "この案に合意できますか？",
      body: "いいねとは別に、案への意思を一つ選びます。回答しないことも選べます。",
      options: [
        { id: "support", label: "合意する" },
        { id: "unsure", label: "まだ決めない" },
        { id: "oppose", label: "合意しない" },
        { id: "no_answer", label: "回答しない" },
      ],
      actionLabel: "合意を送る",
    },
    {
      id: "scale",
      stage: "report",
      kind: "scale",
      title: "今日の対話を、ひとことで振り返る",
      body: "話しやすさや気づきの大きさに近い数字を選びます。これは人物評価ではありません。",
      options: [
        { id: "1", label: "1" },
        { id: "2", label: "2" },
        { id: "3", label: "3" },
        { id: "4", label: "4" },
        { id: "5", label: "5" },
      ],
      actionLabel: "振り返りを送る",
    },
    {
      id: "summary",
      stage: "report",
      kind: "summary",
      title: "今日の対話を、あなたの記録として受け取る",
      body: "あなたが入力した内容と、明示的に選んだ反応だけを個人レポートで確認できます。",
      actionLabel: "個人レポートを見る",
    },
  ];
}

function demoMessage(id: string, participantId: string, text: string, createdAt: string): Message {
  return {
    id,
    participantId,
    authorLabel: DEMO_NAMES.get(participantId) ?? participantId,
    text,
    createdAt,
    updatedAt: createdAt,
    demo: true,
  };
}

function demoProposal(id: string, participantId: string, text: string, createdAt: string): Proposal {
  return {
    id,
    participantId,
    authorLabel: DEMO_NAMES.get(participantId) ?? participantId,
    text,
    relatedMessageIds: [],
    likes: new Set(),
    agreements: new Map(),
    createdAt,
    updatedAt: createdAt,
    demo: true,
  };
}

function demoInsight(id: string, kind: InsightKind, text: string, sourceMessageIds: string[], createdAt: string): Insight {
  return {
    id,
    kind,
    text,
    sourceMessageIds,
    status: "unconfirmed",
    createdAt,
    updatedAt: createdAt,
    demo: true,
  };
}

export class DomainState {
  private readonly rooms = new Map<string, Room>();

  private token() {
    return randomBytes(24).toString("base64url");
  }

  private assertText(value: unknown, max = MAX_TEXT, allowEmpty = false) {
    if (typeof value !== "string" || value.length > max || (!allowEmpty && value.trim().length === 0)) {
      throw new DomainError(400, "invalid_text");
    }
    return value.trim();
  }

  private assertMode(mode: unknown): asserts mode is RoomMode {
    if (mode !== "demo" && mode !== "live") throw new DomainError(400, "invalid_mode");
  }

  private assertStage(stage: unknown): asserts stage is Stage {
    if (typeof stage !== "string" || !STAGES.includes(stage as Stage)) {
      throw new DomainError(400, "invalid_stage");
    }
  }

  private getRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.deleted) throw new DomainError(404, "room_not_found");
    return room;
  }

  private touch(room: Room) {
    room.updatedAt = now();
  }

  private authHost(room: Room, token: string) {
    if (typeof token !== "string" || room.hostToken !== token) throw new DomainError(403, "forbidden_host");
  }

  private findParticipant(room: Room, token: string, includeInactive = true) {
    const participant = [...room.participants.values()].find((value) => value.token === token && !value.deleted);
    if (!participant || (!includeInactive && !participant.active)) {
      throw new DomainError(participant ? 409 : 403, participant ? "participant_inactive" : "forbidden_participant");
    }
    return participant;
  }

  private authParticipant(room: Room, token: string) {
    return this.findParticipant(room, token, false);
  }

  private actor(room: Room, token: string) {
    if (token === room.hostToken) return { kind: "host" as const, participant: null };
    return { kind: "participant" as const, participant: this.findParticipant(room, token) };
  }

  private requireConsent(participant: Participant) {
    if (!participant.adultConfirmed || !participant.consented) throw new DomainError(409, "consent_required");
  }

  private requireStageAtLeast(room: Room, stage: Stage) {
    if (STAGES.indexOf(room.stage) < STAGES.indexOf(stage)) throw new DomainError(409, "stage_not_available");
  }

  private requireMessageStage(room: Room) {
    if (!MESSAGE_STAGES.has(room.stage)) throw new DomainError(409, "stage_not_available");
  }

  private message(room: Room, messageId: string) {
    const message = room.messages.get(messageId) ?? room.demoMessages.find((value) => value.id === messageId);
    if (!message) throw new DomainError(404, "message_not_found");
    return message;
  }

  private insight(room: Room, insightId: string) {
    const insight = room.insights.get(insightId) ?? room.demoInsights.find((value) => value.id === insightId);
    if (!insight) throw new DomainError(404, "insight_not_found");
    return insight;
  }

  private proposal(room: Room, proposalId: string) {
    const proposal = room.proposals.get(proposalId) ?? room.demoProposals.find((value) => value.id === proposalId);
    if (!proposal) throw new DomainError(404, "proposal_not_found");
    return proposal;
  }

  private assertSourceMessages(room: Room, sourceMessageIds: string[]) {
    if (!Array.isArray(sourceMessageIds) || sourceMessageIds.length > 20 || sourceMessageIds.some((id) => typeof id !== "string")) {
      throw new DomainError(400, "invalid_sources");
    }
    const unique = [...new Set(sourceMessageIds)];
    unique.forEach((id) => this.message(room, id));
    return unique;
  }

  private assertSlideResponse(slide: SharedSlide, value: unknown): SlideResponseValue {
    if (slide.kind === "scale") {
      if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
        throw new DomainError(400, "invalid_slide_response");
      }
      return value;
    }
    if (typeof value !== "string" || value.length > MAX_INTERVIEW || value.trim().length === 0) {
      throw new DomainError(400, "invalid_slide_response");
    }
    if (slide.options && !slide.options.some((option) => option.id === value)) {
      throw new DomainError(400, "invalid_slide_response");
    }
    return value.trim();
  }

  private presentationMutation(room: Room) {
    const slide = room.slides[room.currentSlideIndex];
    if (!slide) throw new DomainError(500, "slides_unavailable");
    return {
      currentSlideIndex: room.currentSlideIndex,
      currentSlideId: room.currentSlideId,
      totalSlides: room.slides.length,
      revision: room.presentationRevision,
      slideStartedAt: room.slideStartedAt,
      slide,
      timerEndsAt: room.timerEndsAt,
      revealResults: room.revealResults,
    };
  }

  createRoom(mode: RoomMode, topic: string): RoomCreation {
    this.assertMode(mode);
    const cleanTopic = this.assertText(topic, MAX_TOPIC);
    const createdAt = now();
    const slides = buildSharedSlides(cleanTopic);
    const initialSlide = slides[0];
    if (!initialSlide) throw new DomainError(500, "slides_unavailable");
    const demoMessages = mode === "demo"
      ? [
          demoMessage("demo-message-a", "demo-a", "夜は区切りをつけたいけれど、連絡は残しておきたいです。", createdAt),
          demoMessage("demo-message-b", "demo-b", "自分で使い方を選べることも、大切にしたいです。", createdAt),
          demoMessage("demo-message-c", "demo-c", "何を止めて、何を残すかを分けて考えられそうです。", createdAt),
        ]
      : [];
    const demoProposals = mode === "demo"
      ? [demoProposal("demo-proposal-1", "demo-c", "家庭ごとに夜の区切りと連絡手段を選べるようにする", createdAt)]
      : [];
    const demoInsights = mode === "demo"
      ? [
          demoInsight("demo-insight-common", "common", "安心して使えること", ["demo-message-a", "demo-message-c"], createdAt),
          demoInsight("demo-insight-difference", "difference", "誰が利用の区切りを決めるか", ["demo-message-b"], createdAt),
        ]
      : [];
    const room: Room = {
      id: randomUUID(),
      mode,
      topic: cleanTopic,
      hostToken: this.token(),
      stage: "consent",
      stageStartedAt: createdAt,
      timerEndsAt: null,
      slides,
      currentSlideIndex: 0,
      currentSlideId: initialSlide.id,
      presentationRevision: 0,
      slideStartedAt: createdAt,
      revealResults: false,
      slideResponses: new Map(),
      participants: new Map(),
      messages: new Map(),
      proposals: new Map(),
      insights: new Map(),
      corrections: new Map(),
      groups: new Map(),
      demoMessages,
      demoProposals,
      demoInsights,
      deleted: false,
      createdAt,
      updatedAt: createdAt,
    };
    this.rooms.set(room.id, room);
    return { roomId: room.id, hostToken: room.hostToken, mode: room.mode };
  }

  joinRoom(roomId: string, displayName: string, adultConfirmed = false, consented = false): ParticipantJoin {
    const room = this.getRoom(roomId);
    const cleanName = this.assertText(displayName, MAX_NAME);
    if (consented && !adultConfirmed) throw new DomainError(400, "adult_confirmation_required");
    const participant: Participant = {
      id: randomUUID(),
      token: this.token(),
      displayName: cleanName,
      adultConfirmed,
      consented,
      stance: null,
      interviewAnswer: null,
      active: true,
      deleted: false,
      createdAt: now(),
      leftAt: null,
      contributions: new Map(),
      feedback: null,
    };
    room.participants.set(participant.id, participant);
    this.touch(room);
    return {
      roomId: room.id,
      participantId: participant.id,
      participantToken: participant.token,
      displayName: participant.displayName,
      consented: participant.consented,
      adultConfirmed: participant.adultConfirmed,
    };
  }

  setConsent(roomId: string, participantToken: string, adultConfirmed: boolean, consented: boolean) {
    const room = this.getRoom(roomId);
    const participant = this.authParticipant(room, participantToken);
    if (typeof adultConfirmed !== "boolean" || typeof consented !== "boolean") throw new DomainError(400, "invalid_consent");
    if (consented && !adultConfirmed) throw new DomainError(400, "adult_confirmation_required");
    participant.adultConfirmed = adultConfirmed;
    participant.consented = consented;
    this.touch(room);
    return { adultConfirmed, consented };
  }

  leaveRoom(roomId: string, participantToken: string) {
    const room = this.getRoom(roomId);
    const participant = this.findParticipant(room, participantToken);
    participant.active = false;
    participant.leftAt = now();
    this.touch(room);
    return { participantId: participant.id, active: false };
  }

  rejoinRoom(roomId: string, participantToken: string) {
    const room = this.getRoom(roomId);
    const participant = this.findParticipant(room, participantToken);
    participant.active = true;
    participant.leftAt = null;
    this.touch(room);
    return { participantId: participant.id, active: true };
  }

  setStage(roomId: string, hostToken: string, stage: Stage) {
    const room = this.getRoom(roomId);
    this.authHost(room, hostToken);
    this.assertStage(stage);
    if (STAGES.indexOf(stage) < STAGES.indexOf(room.stage)) throw new DomainError(409, "stage_cannot_go_back");
    if (stage !== room.stage) {
      room.stage = stage;
      room.stageStartedAt = now();
      room.timerEndsAt = null;
      const slideIndex = room.slides.findIndex((slide) => slide.stage === stage);
      const nextSlide = slideIndex >= 0 ? room.slides[slideIndex] : undefined;
      if (nextSlide) {
        room.currentSlideIndex = slideIndex;
        room.currentSlideId = nextSlide.id;
        room.slideStartedAt = room.stageStartedAt;
      }
      room.revealResults = false;
      room.presentationRevision += 1;
      this.touch(room);
    }
    return { stage: room.stage, stageStartedAt: room.stageStartedAt };
  }

  advanceStage(roomId: string, hostToken: string) {
    const room = this.getRoom(roomId);
    this.authHost(room, hostToken);
    const nextIndex = STAGES.indexOf(room.stage) + 1;
    if (nextIndex >= STAGES.length) throw new DomainError(409, "stage_complete");
    const nextStage = STAGES[nextIndex];
    if (!nextStage) throw new DomainError(409, "stage_complete");
    return this.setStage(roomId, hostToken, nextStage);
  }

  setTimer(roomId: string, hostToken: string, durationSeconds: number) {
    const room = this.getRoom(roomId);
    this.authHost(room, hostToken);
    if (!Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > 7200) {
      throw new DomainError(400, "invalid_timer");
    }
    room.timerEndsAt = durationSeconds === 0 ? null : new Date(Date.now() + durationSeconds * 1000).toISOString();
    room.presentationRevision += 1;
    this.touch(room);
    return { timerEndsAt: room.timerEndsAt };
  }

  navigatePresentation(roomId: string, hostToken: string, input: { direction?: "previous" | "next"; index?: number; expectedRevision?: number }) {
    const room = this.getRoom(roomId);
    this.authHost(room, hostToken);
    if (input.expectedRevision !== undefined && input.expectedRevision !== room.presentationRevision) {
      throw new DomainError(409, "revision_conflict");
    }
    let nextIndex: number;
    if (input.index !== undefined) {
      if (!Number.isInteger(input.index)) throw new DomainError(400, "invalid_slide_index");
      nextIndex = input.index;
    } else if (input.direction === "previous") {
      nextIndex = room.currentSlideIndex - 1;
    } else if (input.direction === "next") {
      nextIndex = room.currentSlideIndex + 1;
    } else {
      throw new DomainError(400, "invalid_navigation");
    }
    if (nextIndex < 0) throw new DomainError(409, "presentation_at_start");
    if (nextIndex >= room.slides.length) throw new DomainError(409, "presentation_at_end");
    const nextSlide = room.slides[nextIndex];
    if (!nextSlide) throw new DomainError(409, "presentation_at_end");
    room.currentSlideIndex = nextIndex;
    room.currentSlideId = nextSlide.id;
    room.stage = nextSlide.stage;
    room.stageStartedAt = now();
    room.slideStartedAt = room.stageStartedAt;
    room.timerEndsAt = null;
    room.revealResults = false;
    room.presentationRevision += 1;
    this.touch(room);
    return this.presentationMutation(room);
  }

  revealPresentation(roomId: string, hostToken: string, reveal = true, expectedRevision?: number) {
    const room = this.getRoom(roomId);
    this.authHost(room, hostToken);
    if (expectedRevision !== undefined && expectedRevision !== room.presentationRevision) {
      throw new DomainError(409, "revision_conflict");
    }
    room.revealResults = reveal;
    room.presentationRevision += 1;
    this.touch(room);
    return this.presentationMutation(room);
  }

  respondToSlide(roomId: string, participantToken: string, slideId: string, value: SlideResponseValue, clientMutationId?: string) {
    const room = this.getRoom(roomId);
    const participant = this.authParticipant(room, participantToken);
    this.requireConsent(participant);
    const slide = room.slides.find((item) => item.id === slideId);
    if (!slide) throw new DomainError(404, "slide_not_found");
    if (room.currentSlideId !== slideId) throw new DomainError(409, "slide_not_current");
    const cleanValue = this.assertSlideResponse(slide, value);
    let responses = room.slideResponses.get(slideId);
    if (!responses) {
      responses = new Map();
      room.slideResponses.set(slideId, responses);
    }
    const existing = responses.get(participant.id);
    if (existing && clientMutationId && existing.clientMutationId === clientMutationId) {
      return { saved: true, slideId, response: { slideId, value: existing.value, submittedAt: existing.submittedAt }, revision: room.presentationRevision };
    }
    const submittedAt = now();
    responses.set(participant.id, { value: cleanValue, submittedAt, clientMutationId });
    // Keep the legacy fields useful for existing consumers and reports.
    if (slide.kind === "choice" && typeof cleanValue === "string" && ["support", "oppose", "unsure", "hold", "no_answer"].includes(cleanValue)) participant.stance = cleanValue as VoteChoice;
    if (slide.kind === "text" && typeof cleanValue === "string") participant.interviewAnswer = cleanValue || null;
    this.touch(room);
    return { saved: true, slideId, response: { slideId, value: cleanValue, submittedAt }, revision: room.presentationRevision };
  }

  setStance(roomId: string, participantToken: string, choice: VoteChoice) {
    const room = this.getRoom(roomId);
    const participant = this.authParticipant(room, participantToken);
    this.requireConsent(participant);
    this.requireStageAtLeast(room, "stance");
    if (!["support", "oppose", "unsure", "hold", "no_answer"].includes(choice)) throw new DomainError(400, "invalid_vote");
    participant.stance = choice;
    this.touch(room);
    return { stance: choice };
  }

  setInterviewAnswer(roomId: string, participantToken: string, answer: string) {
    const room = this.getRoom(roomId);
    const participant = this.authParticipant(room, participantToken);
    this.requireConsent(participant);
    this.requireStageAtLeast(room, "interview");
    participant.interviewAnswer = this.assertText(answer, MAX_INTERVIEW, true) || null;
    this.touch(room);
    return { saved: participant.interviewAnswer !== null };
  }

  addMessage(roomId: string, participantToken: string, text: string) {
    const room = this.getRoom(roomId);
    const participant = this.authParticipant(room, participantToken);
    this.requireConsent(participant);
    this.requireMessageStage(room);
    const createdAt = now();
    const message: Message = {
      id: randomUUID(),
      participantId: participant.id,
      authorLabel: participant.displayName,
      text: this.assertText(text),
      createdAt,
      updatedAt: createdAt,
      demo: false,
    };
    room.messages.set(message.id, message);
    this.touch(room);
    return this.publicMessage(message);
  }

  updateMessage(roomId: string, participantToken: string, messageId: string, text: string) {
    const room = this.getRoom(roomId);
    const participant = this.authParticipant(room, participantToken);
    const message = room.messages.get(messageId);
    if (!message) throw new DomainError(404, "message_not_found");
    if (message.participantId !== participant.id) throw new DomainError(403, "forbidden_message");
    message.text = this.assertText(text);
    message.updatedAt = now();
    this.touch(room);
    return this.publicMessage(message);
  }

  deleteMessage(roomId: string, participantToken: string, messageId: string) {
    const room = this.getRoom(roomId);
    const participant = this.authParticipant(room, participantToken);
    const message = room.messages.get(messageId);
    if (!message) throw new DomainError(404, "message_not_found");
    if (message.participantId !== participant.id) throw new DomainError(403, "forbidden_message");
    room.messages.delete(messageId);
    for (const proposal of room.proposals.values()) {
      proposal.relatedMessageIds = proposal.relatedMessageIds.filter((id) => id !== messageId);
    }
    for (const insight of room.insights.values()) {
      insight.sourceMessageIds = insight.sourceMessageIds.filter((id) => id !== messageId);
    }
    this.touch(room);
    return { deleted: true, messageId };
  }

  autoAssignGroups(roomId: string, hostToken: string, groupSize = 3) {
    const room = this.getRoom(roomId);
    this.authHost(room, hostToken);
    this.requireStageAtLeast(room, "stance");
    if (!Number.isInteger(groupSize) || groupSize < 2 || groupSize > 6) throw new DomainError(400, "invalid_group_size");
    const stanceOrder: VoteChoice[] = ["support", "oppose", "unsure", "hold", "no_answer"];
    const participants = [...room.participants.values()]
      .filter((participant) => participant.active && participant.consented && !participant.deleted)
      .sort((a, b) => {
        const stanceDifference = stanceOrder.indexOf(a.stance ?? "no_answer") - stanceOrder.indexOf(b.stance ?? "no_answer");
        return stanceDifference || a.id.localeCompare(b.id);
      });
    const groupCount = participants.length === 0 ? 0 : Math.ceil(participants.length / groupSize);
    room.groups.clear();
    for (let index = 0; index < participants.length; index += 1) {
      const participant = participants[index];
      if (!participant) continue;
      room.groups.set(participant.id, `group-${(index % groupCount) + 1}`);
    }
    this.touch(room);
    return this.groupViews(room, null);
  }

  upsertInsight(roomId: string, hostToken: string, input: { id?: string; kind: InsightKind; text: string; sourceMessageIds: string[] }) {
    const room = this.getRoom(roomId);
    this.authHost(room, hostToken);
    this.requireStageAtLeast(room, "insights");
    if (input.kind !== "common" && input.kind !== "difference") throw new DomainError(400, "invalid_insight_kind");
    const sourceMessageIds = this.assertSourceMessages(room, input.sourceMessageIds);
    const cleanText = this.assertText(input.text);
    const existing = input.id ? room.insights.get(input.id) : undefined;
    if (input.id && !existing) throw new DomainError(404, "insight_not_found");
    const timestamp = now();
    if (existing) {
      existing.kind = input.kind;
      existing.text = cleanText;
      existing.sourceMessageIds = sourceMessageIds;
      existing.status = "unconfirmed";
      existing.updatedAt = timestamp;
      this.touch(room);
      return this.publicInsight(room, existing, null);
    }
    const insight: Insight = {
      id: randomUUID(),
      kind: input.kind,
      text: cleanText,
      sourceMessageIds,
      status: "unconfirmed",
      createdAt: timestamp,
      updatedAt: timestamp,
      demo: false,
    };
    room.insights.set(insight.id, insight);
    this.touch(room);
    return this.publicInsight(room, insight, null);
  }

  confirmInsight(roomId: string, hostToken: string, insightId: string, confirmed: boolean) {
    const room = this.getRoom(roomId);
    this.authHost(room, hostToken);
    const insight = room.insights.get(insightId);
    if (!insight) throw new DomainError(404, "insight_not_found");
    insight.status = confirmed ? "confirmed" : "unconfirmed";
    insight.updatedAt = now();
    this.touch(room);
    return this.publicInsight(room, insight, null);
  }

  suggestInsightCorrection(roomId: string, participantToken: string, insightId: string, text: string) {
    const room = this.getRoom(roomId);
    const participant = this.authParticipant(room, participantToken);
    this.requireConsent(participant);
    const insight = this.insight(room, insightId);
    if (insight.demo) throw new DomainError(409, "demo_data_read_only");
    const correction: InsightCorrection = {
      id: randomUUID(),
      insightId,
      participantId: participant.id,
      text: this.assertText(text),
      status: "pending",
      createdAt: now(),
    };
    room.corrections.set(correction.id, correction);
    this.touch(room);
    return { correctionId: correction.id, status: correction.status };
  }

  resolveInsightCorrection(roomId: string, hostToken: string, correctionId: string, accept: boolean) {
    const room = this.getRoom(roomId);
    this.authHost(room, hostToken);
    const correction = room.corrections.get(correctionId);
    if (!correction) throw new DomainError(404, "correction_not_found");
    const insight = room.insights.get(correction.insightId);
    if (!insight) throw new DomainError(404, "insight_not_found");
    correction.status = accept ? "accepted" : "rejected";
    if (accept) {
      insight.text = correction.text;
      insight.status = "unconfirmed";
      insight.updatedAt = now();
    }
    this.touch(room);
    return { correctionId, status: correction.status };
  }

  createProposal(roomId: string, participantToken: string, text: string, relatedMessageIds: string[] = []) {
    const room = this.getRoom(roomId);
    const participant = this.authParticipant(room, participantToken);
    this.requireConsent(participant);
    this.requireStageAtLeast(room, "proposals");
    const timestamp = now();
    const proposal: Proposal = {
      id: randomUUID(),
      participantId: participant.id,
      authorLabel: participant.displayName,
      text: this.assertText(text),
      relatedMessageIds: this.assertSourceMessages(room, relatedMessageIds),
      likes: new Set(),
      agreements: new Map(),
      createdAt: timestamp,
      updatedAt: timestamp,
      demo: false,
    };
    room.proposals.set(proposal.id, proposal);
    this.touch(room);
    return this.publicProposal(room, proposal, participant.id);
  }

  updateProposal(roomId: string, participantToken: string, proposalId: string, text: string, relatedMessageIds?: string[]) {
    const room = this.getRoom(roomId);
    const participant = this.authParticipant(room, participantToken);
    const proposal = room.proposals.get(proposalId);
    if (!proposal) throw new DomainError(404, "proposal_not_found");
    if (proposal.participantId !== participant.id) throw new DomainError(403, "forbidden_proposal");
    proposal.text = this.assertText(text);
    if (relatedMessageIds !== undefined) proposal.relatedMessageIds = this.assertSourceMessages(room, relatedMessageIds);
    proposal.updatedAt = now();
    this.touch(room);
    return this.publicProposal(room, proposal, participant.id);
  }

  toggleProposalLike(roomId: string, participantToken: string, proposalId: string) {
    const room = this.getRoom(roomId);
    const participant = this.authParticipant(room, participantToken);
    this.requireConsent(participant);
    const proposal = this.proposal(room, proposalId);
    if (proposal.demo) throw new DomainError(409, "demo_data_read_only");
    const liked = proposal.likes.has(participant.id);
    if (liked) proposal.likes.delete(participant.id);
    else proposal.likes.add(participant.id);
    this.touch(room);
    return { liked: !liked, likeCount: proposal.likes.size };
  }

  setProposalAgreement(roomId: string, participantToken: string, proposalId: string, choice: AgreementChoice) {
    const room = this.getRoom(roomId);
    const participant = this.authParticipant(room, participantToken);
    this.requireConsent(participant);
    const proposal = this.proposal(room, proposalId);
    if (proposal.demo) throw new DomainError(409, "demo_data_read_only");
    if (!["support", "unsure", "oppose", "no_answer"].includes(choice)) throw new DomainError(400, "invalid_agreement");
    proposal.agreements.set(participant.id, choice);
    this.touch(room);
    return this.agreementSummary(room, proposal, participant.id);
  }

  setContributionTag(roomId: string, participantToken: string, targetId: string, tag: ContributionTag) {
    const room = this.getRoom(roomId);
    const participant = this.authParticipant(room, participantToken);
    if (!["idea", "question", "concretized"].includes(tag)) throw new DomainError(400, "invalid_contribution_tag");
    const message = room.messages.get(targetId);
    const proposal = room.proposals.get(targetId);
    if (!message && !proposal) throw new DomainError(404, "contribution_target_not_found");
    if ((message ?? proposal)?.participantId !== participant.id) throw new DomainError(403, "forbidden_contribution");
    participant.contributions.set(targetId, tag);
    this.touch(room);
    return { targetId, tag };
  }

  submitFeedback(roomId: string, participantToken: string, rating: number, comment: string) {
    const room = this.getRoom(roomId);
    const participant = this.authParticipant(room, participantToken);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new DomainError(400, "invalid_rating");
    participant.feedback = { rating, comment: this.assertText(comment, 500, true), createdAt: now() };
    this.touch(room);
    return { saved: true };
  }

  getPersonalReport(roomId: string, participantToken: string): PersonalReport {
    const room = this.getRoom(roomId);
    const participant = this.findParticipant(room, participantToken);
    const ownMessageIds = [...room.messages.values()]
      .filter((message) => message.participantId === participant.id)
      .map((message) => message.id);
    const ownProposals = [...room.proposals.values()]
      .filter((proposal) => proposal.participantId === participant.id)
      .map((proposal) => this.publicProposal(room, proposal, participant.id));
    const relatedProposals = [...room.proposals.values()]
      .filter((proposal) => proposal.relatedMessageIds.some((id) => ownMessageIds.includes(id)))
      .map((proposal) => this.publicProposal(room, proposal, participant.id));
    return {
      participant: { id: participant.id, displayName: participant.displayName },
      stance: participant.stance,
      interviewAnswer: participant.interviewAnswer,
      messages: [...room.messages.values()]
        .filter((message) => message.participantId === participant.id)
        .map((message) => this.publicMessage(message)),
      proposals: ownProposals,
      relatedProposals,
      contributions: [...participant.contributions.entries()].map(([targetId, tag]) => ({ targetId, tag })),
      note: "これはあなたの入力と明示的な貢献タグだけを表示する個人レポートです。人物評価やAI推定は含みません。",
    };
  }

  deleteParticipantData(roomId: string, participantToken: string) {
    const room = this.getRoom(roomId);
    const participant = this.findParticipant(room, participantToken);
    for (const [messageId, message] of room.messages) {
      if (message.participantId === participant.id) room.messages.delete(messageId);
    }
    for (const [proposalId, proposal] of room.proposals) {
      if (proposal.participantId === participant.id) room.proposals.delete(proposalId);
      else {
        proposal.likes.delete(participant.id);
        proposal.agreements.delete(participant.id);
      }
    }
    for (const [correctionId, correction] of room.corrections) {
      if (correction.participantId === participant.id) room.corrections.delete(correctionId);
    }
    for (const responses of room.slideResponses.values()) responses.delete(participant.id);
    room.groups.delete(participant.id);
    participant.deleted = true;
    participant.active = false;
    participant.token = this.token();
    participant.stance = null;
    participant.interviewAnswer = null;
    participant.contributions.clear();
    participant.feedback = null;
    this.touch(room);
    return { deleted: true, participantId: participant.id };
  }

  deleteRoom(roomId: string, hostToken: string) {
    const room = this.getRoom(roomId);
    this.authHost(room, hostToken);
    room.deleted = true;
    room.participants.clear();
    room.messages.clear();
    room.proposals.clear();
    room.insights.clear();
    room.corrections.clear();
    room.groups.clear();
    room.slideResponses.clear();
    return { deleted: true, roomId };
  }

  getSnapshot(roomId: string, token: string): Snapshot {
    const room = this.getRoom(roomId);
    const actor = this.actor(room, token);
    const participant = actor.participant;
    const currentSlide = room.slides[room.currentSlideIndex];
    if (!currentSlide) throw new DomainError(500, "slides_unavailable");
    const currentResponses = room.slideResponses.get(currentSlide.id) ?? new Map();
    const participants = [...room.participants.values()]
      .filter((value) => !value.deleted)
      .map((value) => ({
        id: value.id,
        displayName: value.displayName,
        active: value.active,
        inMyGroup: participant ? room.groups.get(value.id) !== undefined && room.groups.get(value.id) === room.groups.get(participant.id) : false,
        answeredCurrentSlide: currentResponses.has(value.id),
      }));
    const groups = this.groupViews(room, participant);
    const allMessages = room.mode === "demo" ? [...room.demoMessages, ...room.messages.values()] : [...room.messages.values()];
    const allInsights = room.mode === "demo" ? [...room.demoInsights, ...room.insights.values()] : [...room.insights.values()];
    const allProposals = room.mode === "demo" ? [...room.demoProposals, ...room.proposals.values()] : [...room.proposals.values()];
    const activeCount = [...room.participants.values()].filter((value) => value.active && value.consented && !value.deleted).length;
    const reason = activeCount >= MIN_PARTICIPANTS
      ? "参加者が揃っています。"
      : activeCount === 0
        ? "参加者を待っています。"
        : "人数が少ないため、主催者が理由を確認して手動で進行できます。";
    const stanceSummary: Record<VoteChoice, number> = { support: 0, oppose: 0, unsure: 0, hold: 0, no_answer: 0 };
    for (const value of room.participants.values()) {
      if (value.active && value.consented && value.stance) stanceSummary[value.stance] += 1;
    }
    const eligibleParticipants = [...room.participants.values()].filter((value) => value.active && value.consented && !value.deleted);
    const responseCount = eligibleParticipants.filter((value) => currentResponses.has(value.id)).length;
    const responseSummary: Record<string, number> = {};
    for (const option of currentSlide.options ?? []) responseSummary[option.id] = 0;
    for (const response of currentResponses.values()) {
      if (typeof response.value === "string" && responseSummary[response.value] !== undefined) {
        responseSummary[response.value] = (responseSummary[response.value] ?? 0) + 1;
      }
    }
    const ownResponse = participant ? currentResponses.get(participant.id) : undefined;
    const responseStatus: SlideResponseStatus = actor.kind === "host"
      ? (room.revealResults ? "results" : "waiting")
      : ownResponse
        ? "answered"
        : "idle";
    return {
      room: {
        id: room.id,
        mode: room.mode,
        topic: room.topic,
        stage: room.stage,
        stageStartedAt: room.stageStartedAt,
        timerEndsAt: room.timerEndsAt,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      },
      presentation: {
        currentSlideIndex: room.currentSlideIndex,
        currentSlideId: room.currentSlideId,
        totalSlides: room.slides.length,
        revision: room.presentationRevision,
        slideStartedAt: room.slideStartedAt,
        slide: currentSlide,
        timerEndsAt: room.timerEndsAt,
        revealResults: room.revealResults,
        responseStatus,
        responseCount,
        responseTotal: eligibleParticipants.length,
        responseSummary: actor.kind === "host" || room.revealResults ? responseSummary : null,
        myResponse: ownResponse ? { slideId: currentSlide.id, value: ownResponse.value, submittedAt: ownResponse.submittedAt } : null,
        serverNow: now(),
      },
      currentSlideIndex: room.currentSlideIndex,
      currentSlideId: room.currentSlideId,
      presentationRevision: room.presentationRevision,
      progress: { participantCount: activeCount, minParticipants: MIN_PARTICIPANTS, canProceed: activeCount >= MIN_PARTICIPANTS, reason },
      participants,
      groups,
      messages: allMessages.map((message) => this.publicMessage(message)),
      insights: allInsights.map((insight) => this.publicInsight(room, insight, participant)),
      proposals: allProposals.map((proposal) => this.publicProposal(room, proposal, participant?.id ?? null)),
      stanceSummary,
      me: participant
        ? {
            id: participant.id,
            displayName: participant.displayName,
            adultConfirmed: participant.adultConfirmed,
            consented: participant.consented,
            active: participant.active,
            stance: participant.stance,
            interviewAnswer: participant.interviewAnswer,
            contributions: [...participant.contributions.entries()].map(([targetId, tag]) => ({ targetId, tag })),
          }
        : null,
      hostView: actor.kind === "host"
        ? { privateAnswersOmitted: true, feedbackCount: [...room.participants.values()].filter((value) => value.feedback !== null).length }
        : null,
    };
  }

  private publicMessage(message: Message) {
    return {
      id: message.id,
      participantId: message.participantId,
      authorLabel: message.authorLabel,
      text: message.text,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      demo: message.demo,
    };
  }

  private publicInsight(room: Room, insight: Insight, participant: Participant | null) {
    return {
      id: insight.id,
      kind: insight.kind,
      text: insight.text,
      sourceMessageIds: [...insight.sourceMessageIds],
      status: insight.status,
      corrections: [...room.corrections.values()]
        .filter((correction) => correction.insightId === insight.id && (participant === null || correction.participantId === participant.id))
        .map((correction) => ({ id: correction.id, text: correction.text, status: correction.status, own: participant !== null && correction.participantId === participant.id })),
      demo: insight.demo,
    };
  }

  private agreementSummary(room: Room, proposal: Proposal, participantId: string | null) {
    const eligible = [...room.participants.values()].filter((value) => value.active && value.consented && !value.deleted);
    const counts = { support: 0, unsure: 0, oppose: 0, noAnswer: 0 };
    for (const choice of proposal.agreements.values()) {
      if (choice === "support") counts.support += 1;
      else if (choice === "unsure") counts.unsure += 1;
      else if (choice === "oppose") counts.oppose += 1;
      else counts.noAnswer += 1;
    }
    const answered = counts.support + counts.unsure + counts.oppose + counts.noAnswer;
    return {
      ...counts,
      unanswered: Math.max(0, eligible.length - answered + counts.noAnswer),
      totalEligible: eligible.length,
      myChoice: participantId ? proposal.agreements.get(participantId) ?? null : null,
    };
  }

  private publicProposal(room: Room, proposal: Proposal, participantId: string | null) {
    return {
      id: proposal.id,
      participantId: proposal.participantId,
      authorLabel: proposal.authorLabel,
      text: proposal.text,
      relatedMessageIds: [...proposal.relatedMessageIds],
      likeCount: proposal.likes.size,
      likedByMe: participantId !== null && proposal.likes.has(participantId),
      agreement: this.agreementSummary(room, proposal, participantId),
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt,
      demo: proposal.demo,
    };
  }

  private groupViews(room: Room, participant: Participant | null) {
    const groups = new Map<string, Participant[]>();
    for (const [participantId, groupId] of room.groups) {
      const member = room.participants.get(participantId);
      if (!member || member.deleted) continue;
      if (!groups.has(groupId)) groups.set(groupId, []);
      groups.get(groupId)?.push(member);
    }
    return [...groups.entries()]
      .filter(([, members]) => participant === null || members.some((member) => member.id === participant.id))
      .map(([id, members]) => ({
        id,
        memberIds: members.map((member) => member.id),
        memberNames: members.map((member) => member.displayName),
      }));
  }
}
