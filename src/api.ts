/**
 * API クライアント - ローカル loopback サーバーへの接続
 * 環境変数 VITE_API_URL または localhost:8787 をデフォルトで使用
 */

const DEFAULT_API_URL = "http://127.0.0.1:8787";

function getApiUrl(): string {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  // 開発ブラウザでは同一オリジンのViteプロキシを優先し、CORSやPrivate Network制約を避ける。
  if (import.meta.env.DEV && typeof window !== "undefined") return `${window.location.origin}/api`;
  return DEFAULT_API_URL;
}

export type RoomMode = "demo" | "live";
export type RoomStage =
  | "consent"
  | "stance"
  | "interview"
  | "dialogue1"
  | "insights"
  | "break"
  | "dialogue2"
  | "proposals"
  | "report";
export type VoteChoice = "support" | "oppose" | "unsure" | "hold" | "no_answer";
export type SharedSlideKind = "welcome" | "choice" | "text" | "message" | "insight" | "proposal" | "like" | "agreement" | "scale" | "summary";
export type SlideResponseValue = string | number;
export type SlideResponseStatus = "idle" | "answered" | "waiting" | "results";
export type SharedSlide = {
  id: string;
  stage: RoomStage;
  kind: SharedSlideKind;
  title: string;
  body: string;
  options?: Array<{ id: string; label: string; description?: string }>;
  actionLabel?: string;
  placeholder?: string;
};
export type AgreementChoice = "support" | "unsure" | "oppose" | "no_answer";
export type InsightKind = "common" | "difference";
export type InsightStatus = "unconfirmed" | "confirmed";
export type CorrectionStatus = "pending" | "accepted" | "rejected";
export type ContributionTag = "idea" | "question" | "concretized";

export type RoomMessage = {
  id: string;
  participantId: string;
  authorLabel: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  demo: boolean;
};

export type ProposalAgreement = {
  support: number;
  unsure: number;
  oppose: number;
  noAnswer: number;
  unanswered: number;
  totalEligible: number;
  myChoice: AgreementChoice | null;
};

export type RoomProposal = {
  id: string;
  participantId: string;
  authorLabel: string;
  text: string;
  relatedMessageIds: string[];
  likeCount: number;
  likedByMe: boolean;
  agreement: ProposalAgreement;
  createdAt: string;
  updatedAt: string;
  demo: boolean;
};

export type InsightCorrection = {
  id: string;
  text: string;
  status: CorrectionStatus;
  own: boolean;
};

export type RoomInsight = {
  id: string;
  kind: InsightKind;
  text: string;
  sourceMessageIds: string[];
  status: InsightStatus;
  corrections: InsightCorrection[];
  demo: boolean;
};

export type RoomSnapshot = {
  room: {
    id: string;
    mode: RoomMode;
    topic: string;
    stage: RoomStage;
    stageStartedAt: string;
    timerEndsAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
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
  messages: RoomMessage[];
  insights: RoomInsight[];
  proposals: RoomProposal[];
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
  /** 主催者には private な回答本文を返さないことを示すメタデータ。参加者では null。 */
  hostView: { privateAnswersOmitted: true; feedbackCount: number } | null;
};

export type PersonalReport = {
  participant: { id: string; displayName: string };
  stance: VoteChoice | null;
  interviewAnswer: string | null;
  messages: RoomMessage[];
  proposals: RoomProposal[];
  relatedProposals: RoomProposal[];
  contributions: Array<{ targetId: string; tag: ContributionTag }>;
  note: string;
};

export type CreateRoomResponse = {
  roomId: string;
  hostToken: string;
  mode: RoomMode;
};

export type JoinResponse = {
  roomId: string;
  participantId: string;
  participantToken: string;
  displayName: string;
  consented: boolean;
  adultConfirmed: boolean;
};

export type MessageResponse = Pick<RoomMessage, "id" | "text" | "createdAt">;
export type CorrectionResponse = { correctionId: string; status: CorrectionStatus };
export type LikeResponse = { liked: boolean; likeCount: number };
export type StanceResponse = { stance: VoteChoice };
export type InterviewResponse = { saved: boolean };
export type PresentationMutation = Pick<RoomSnapshot["presentation"], "currentSlideIndex" | "currentSlideId" | "totalSlides" | "revision" | "slideStartedAt" | "slide" | "timerEndsAt" | "revealResults">;
export type SlideResponse = { saved: boolean; slideId: string; response: { slideId: string; value: SlideResponseValue; submittedAt: string }; revision: number };

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message?: string) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.name = "ApiError";
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

async function apiFetch<T>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
  } = {},
): Promise<T> {
  const baseUrl = getApiUrl();
  const url = baseUrl.startsWith("/")
    ? `${window.location.origin}${baseUrl.replace(/\/$/, "")}${path}`
    : `${baseUrl.replace(/\/$/, "")}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new ApiError(response.status, "invalid_response", "レスポンスが不正です");
    }

    if (!response.ok) {
      const error = data as { error?: unknown };
      const code = typeof error.error === "string" ? error.error : "unknown_error";
      throw new ApiError(response.status, code);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, "network_error", "ネットワークエラーが発生しました");
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  adult_confirmation_required: "18歳以上であることの確認が必要です",
  authentication_required: "認証が必要です。もう一度参加してください",
  consent_required: "利用同意が必要です",
  contribution_target_not_found: "貢献を付ける対象が見つかりません",
  demo_data_read_only: "デモデータは変更できません",
  forbidden_contribution: "自分の発言にだけ貢献タグを付けられます",
  forbidden_host: "主催者としての認証に失敗しました",
  forbidden_message: "自分の発言だけ変更できます",
  forbidden_participant: "参加者としての認証に失敗しました",
  forbidden_proposal: "自分の案だけ変更できます",
  invalid_agreement: "合意の選択内容を確認してください",
  invalid_consent: "同意の内容を確認してください",
  invalid_group_size: "グループサイズは2〜6人で指定してください",
  invalid_interview: "インタビュー回答を確認してください",
  invalid_json: "送信内容を確認してください",
  invalid_mode: "参加方法を確認してください",
  invalid_rating: "評価は1〜5で指定してください",
  invalid_navigation: "共有ページの移動内容を確認してください",
  invalid_slide_index: "共有ページの番号を確認してください",
  invalid_slide_response: "回答内容を確認してください",
  invalid_sources: "根拠の指定を確認してください",
  invalid_stage: "段階の指定を確認してください",
  invalid_text: "入力内容を確認してください",
  invalid_vote: "立場の選択内容を確認してください",
  message_not_found: "発言が見つかりません",
  network_error: "サーバーに接続できません。ローカルAPIが起動しているか確認してください",
  participant_inactive: "現在は参加状態ではありません",
  proposal_not_found: "案が見つかりません",
  room_not_found: "ルームが見つかりません",
  slide_not_current: "主催者が表示しているページだけ回答できます",
  presentation_at_start: "最初の共有ページです",
  presentation_at_end: "最後の共有ページです",
  revision_conflict: "共有状態が更新されました。もう一度お試しください",
  stage_cannot_go_back: "段階を戻すことはできません",
  stage_complete: "すべての段階が完了しています",
  stage_not_available: "現在の段階ではこの操作を利用できません",
};

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  return ERROR_MESSAGES[error.code] ?? (error.code.startsWith("invalid_") ? "入力内容を確認してください" : fallback);
}

export const api = {
  async getHealth() {
    return apiFetch<{ ok: boolean; storage: string; externalAi: boolean }>("/health");
  },

  async createRoom(mode: RoomMode, topic: string) {
    return apiFetch<CreateRoomResponse>("/rooms", {
      method: "POST",
      body: { mode, topic },
    });
  },

  async joinRoom(roomId: string, displayName: string, adultConfirmed: boolean, consented: boolean) {
    return apiFetch<JoinResponse>(`/rooms/${encodeURIComponent(roomId)}/join`, {
      method: "POST",
      body: { displayName, adultConfirmed, consented },
    });
  },

  async getSnapshot(roomId: string, token: string) {
    return apiFetch<RoomSnapshot>(`/rooms/${encodeURIComponent(roomId)}/snapshot`, { token });
  },

  async getReport(roomId: string, token: string) {
    return apiFetch<PersonalReport>(`/rooms/${encodeURIComponent(roomId)}/report`, { token });
  },

  async setConsent(roomId: string, token: string, adultConfirmed: boolean, consented: boolean) {
    return apiFetch<{ adultConfirmed: boolean; consented: boolean }>(`/rooms/${encodeURIComponent(roomId)}/consent`, {
      method: "POST",
      token,
      body: { adultConfirmed, consented },
    });
  },

  async setStage(roomId: string, token: string, stage?: RoomStage) {
    return apiFetch<{ stage: RoomStage; stageStartedAt: string }>(`/rooms/${encodeURIComponent(roomId)}/stage`, {
      method: "POST",
      token,
      body: stage ? { stage } : {},
    });
  },

  async setTimer(roomId: string, token: string, durationSeconds: number) {
    return apiFetch<{ timerEndsAt: string | null }>(`/rooms/${encodeURIComponent(roomId)}/timer`, {
      method: "POST",
      token,
      body: { durationSeconds },
    });
  },

  async navigatePresentation(roomId: string, token: string, direction: "previous" | "next", expectedRevision?: number) {
    return apiFetch<PresentationMutation>(`/rooms/${encodeURIComponent(roomId)}/presentation/navigate`, {
      method: "POST",
      token,
      body: { direction, ...(expectedRevision === undefined ? {} : { expectedRevision }) },
    });
  },

  async setPresentationIndex(roomId: string, token: string, index: number, expectedRevision?: number) {
    return apiFetch<PresentationMutation>(`/rooms/${encodeURIComponent(roomId)}/presentation/navigate`, {
      method: "POST",
      token,
      body: { index, ...(expectedRevision === undefined ? {} : { expectedRevision }) },
    });
  },

  async revealPresentation(roomId: string, token: string, reveal = true, expectedRevision?: number) {
    return apiFetch<PresentationMutation>(`/rooms/${encodeURIComponent(roomId)}/presentation/reveal`, {
      method: "POST",
      token,
      body: { reveal, ...(expectedRevision === undefined ? {} : { expectedRevision }) },
    });
  },

  async respondToSlide(roomId: string, token: string, slideId: string, value: SlideResponseValue, clientMutationId?: string) {
    return apiFetch<SlideResponse>(`/rooms/${encodeURIComponent(roomId)}/slides/${encodeURIComponent(slideId)}/respond`, {
      method: "POST",
      token,
      body: { value, ...(clientMutationId === undefined ? {} : { clientMutationId }) },
    });
  },

  async autoAssignGroups(roomId: string, token: string, groupSize = 3) {
    return apiFetch<RoomSnapshot["groups"]>(`/rooms/${encodeURIComponent(roomId)}/groups/auto`, {
      method: "POST",
      token,
      body: { groupSize },
    });
  },

  async deleteRoom(roomId: string, token: string) {
    return apiFetch<{ deleted: boolean; roomId: string }>(`/rooms/${encodeURIComponent(roomId)}`, {
      method: "DELETE",
      token,
    });
  },

  async setStance(roomId: string, token: string, choice: VoteChoice) {
    return apiFetch<StanceResponse>(`/rooms/${encodeURIComponent(roomId)}/stance`, {
      method: "POST",
      token,
      body: { choice },
    });
  },

  async setInterviewAnswer(roomId: string, token: string, answer: string) {
    return apiFetch<InterviewResponse>(`/rooms/${encodeURIComponent(roomId)}/interview`, {
      method: "POST",
      token,
      body: { answer },
    });
  },

  async addMessage(roomId: string, token: string, text: string) {
    return apiFetch<MessageResponse>(`/rooms/${encodeURIComponent(roomId)}/messages`, {
      method: "POST",
      token,
      body: { text },
    });
  },

  async deleteMessage(roomId: string, token: string, messageId: string) {
    return apiFetch<{ deleted: boolean; messageId: string }>(
      `/rooms/${encodeURIComponent(roomId)}/messages/${encodeURIComponent(messageId)}`,
      { method: "DELETE", token },
    );
  },

  async createProposal(roomId: string, token: string, text: string, relatedMessageIds: string[] = []) {
    return apiFetch<RoomProposal>(`/rooms/${encodeURIComponent(roomId)}/proposals`, {
      method: "POST",
      token,
      body: { text, relatedMessageIds },
    });
  },

  async toggleProposalLike(roomId: string, token: string, proposalId: string) {
    return apiFetch<LikeResponse>(
      `/rooms/${encodeURIComponent(roomId)}/proposals/${encodeURIComponent(proposalId)}/like`,
      { method: "POST", token },
    );
  },

  async setProposalAgreement(roomId: string, token: string, proposalId: string, choice: AgreementChoice) {
    return apiFetch<ProposalAgreement>(
      `/rooms/${encodeURIComponent(roomId)}/proposals/${encodeURIComponent(proposalId)}/agreement`,
      { method: "POST", token, body: { choice } },
    );
  },

  async suggestInsightCorrection(roomId: string, token: string, insightId: string, text: string) {
    return apiFetch<CorrectionResponse>(
      `/rooms/${encodeURIComponent(roomId)}/insights/${encodeURIComponent(insightId)}/corrections`,
      { method: "POST", token, body: { text } },
    );
  },

  async resolveInsightCorrection(roomId: string, token: string, correctionId: string, accept: boolean) {
    return apiFetch<{ correctionId: string; status: "pending" | "accepted" | "rejected" }>(
      `/rooms/${encodeURIComponent(roomId)}/corrections/${encodeURIComponent(correctionId)}`,
      { method: "POST", token, body: { accept } },
    );
  },

  async leaveRoom(roomId: string, token: string) {
    return apiFetch<{ participantId: string; active: false }>(`/rooms/${encodeURIComponent(roomId)}/leave`, {
      method: "POST",
      token,
    });
  },

  async rejoinRoom(roomId: string, token: string) {
    return apiFetch<{ participantId: string; active: true }>(`/rooms/${encodeURIComponent(roomId)}/rejoin`, {
      method: "POST",
      token,
    });
  },

  async deleteParticipantData(roomId: string, token: string) {
    return apiFetch<{ deleted: boolean; participantId: string }>(`/rooms/${encodeURIComponent(roomId)}/me`, {
      method: "DELETE",
      token,
    });
  },

  // 以下は主催者向けのインサイト編集・確認など、LiveRoom外からも使えるAPI。
  async upsertInsight(roomId: string, token: string, data: { id?: string; kind: InsightKind; text: string; sourceMessageIds?: string[] }) {
    const method = data.id ? "PATCH" : "POST";
    const path = data.id
      ? `/rooms/${encodeURIComponent(roomId)}/insights/${encodeURIComponent(data.id)}`
      : `/rooms/${encodeURIComponent(roomId)}/insights`;
    return apiFetch<RoomInsight>(path, { method, token, body: data });
  },

  async confirmInsight(roomId: string, token: string, insightId: string, confirmed: boolean) {
    return apiFetch<RoomInsight>(
      `/rooms/${encodeURIComponent(roomId)}/insights/${encodeURIComponent(insightId)}/confirm`,
      { method: "POST", token, body: { confirmed } },
    );
  },

  async submitFeedback(roomId: string, token: string, rating: number, comment = "") {
    return apiFetch<{ saved: boolean }>(`/rooms/${encodeURIComponent(roomId)}/feedback`, {
      method: "POST",
      token,
      body: { rating, comment },
    });
  },
};
