import assert from "node:assert/strict";
import test from "node:test";
import { DomainError, DomainState, STAGES } from "../src/domain.ts";

function expectDomainError(action: () => unknown, status: number, message?: string) {
  assert.throws(action, (error: unknown) => {
    return error instanceof DomainError
      && error.status === status
      && (message === undefined || error.message === message);
  });
}

test("live room keeps private answers private through the complete flow", () => {
  const state = new DomainState();
  const room = state.createRoom("live", "子どもとSNSのつきあい方");
  const alice = state.joinRoom(room.roomId, "Alice", true, true);
  const bob = state.joinRoom(room.roomId, "Bob", true, true);

  expectDomainError(() => state.setStance(room.roomId, alice.participantToken, "support"), 409, "stage_not_available");
  assert.equal(state.getSnapshot(room.roomId, room.hostToken).hostView?.privateAnswersOmitted, true);

  assert.equal(state.advanceStage(room.roomId, room.hostToken).stage, "stance");
  state.setStance(room.roomId, alice.participantToken, "support");
  state.setStance(room.roomId, bob.participantToken, "oppose");
  const groups = state.autoAssignGroups(room.roomId, room.hostToken, 2);
  assert.equal(groups.length, 1);
  assert.deepEqual(new Set(groups[0]?.memberIds), new Set([alice.participantId, bob.participantId]));

  assert.equal(state.advanceStage(room.roomId, room.hostToken).stage, "interview");
  state.setInterviewAnswer(room.roomId, alice.participantToken, "夜は通知を区切りたいです。");
  const aliceInterview = state.getSnapshot(room.roomId, alice.participantToken);
  assert.equal(aliceInterview.me?.interviewAnswer, "夜は通知を区切りたいです。");
  assert.equal(JSON.stringify(aliceInterview.participants).includes("夜は通知"), false);
  const hostInterview = state.getSnapshot(room.roomId, room.hostToken);
  assert.equal(JSON.stringify(hostInterview).includes("夜は通知"), false);

  assert.equal(state.advanceStage(room.roomId, room.hostToken).stage, "dialogue1");
  const aliceMessage = state.addMessage(room.roomId, alice.participantToken, "連絡の逃げ道は残したいです。");
  const bobMessage = state.addMessage(room.roomId, bob.participantToken, "家庭ごとに決めたいです。");
  expectDomainError(
    () => state.updateMessage(room.roomId, bob.participantToken, aliceMessage.id, "書き換えようとする"),
    403,
    "forbidden_message",
  );
  state.updateMessage(room.roomId, alice.participantToken, aliceMessage.id, "連絡の道は残したいです。");

  assert.equal(state.advanceStage(room.roomId, room.hostToken).stage, "insights");
  const insight = state.upsertInsight(room.roomId, room.hostToken, {
    kind: "common",
    text: "連絡手段を残すこと",
    sourceMessageIds: [aliceMessage.id, bobMessage.id],
  });
  assert.equal(state.confirmInsight(room.roomId, room.hostToken, insight.id, true).status, "confirmed");
  const correction = state.suggestInsightCorrection(room.roomId, bob.participantToken, insight.id, "緊急時の連絡を残すこと");
  assert.equal(state.resolveInsightCorrection(room.roomId, room.hostToken, correction.correctionId, true).status, "accepted");

  for (const expected of ["break", "dialogue2"] as const) {
    assert.equal(state.advanceStage(room.roomId, room.hostToken).stage, expected);
  }
  state.addMessage(room.roomId, bob.participantToken, "休憩後も相手の理由を聞きます。");
  assert.equal(state.advanceStage(room.roomId, room.hostToken).stage, "proposals");
  const proposal = state.createProposal(room.roomId, alice.participantToken, "夜の通知を選べるようにする", [aliceMessage.id]);
  state.toggleProposalLike(room.roomId, bob.participantToken, proposal.id);
  const agreement = state.setProposalAgreement(room.roomId, bob.participantToken, proposal.id, "support");
  assert.equal(agreement.support, 1);
  assert.equal(agreement.totalEligible, 2);
  assert.equal(agreement.unanswered, 1);
  state.setProposalAgreement(room.roomId, alice.participantToken, proposal.id, "no_answer");
  state.setContributionTag(room.roomId, alice.participantToken, aliceMessage.id, "idea");
  state.submitFeedback(room.roomId, alice.participantToken, 5, "話しやすかった");

  assert.equal(state.advanceStage(room.roomId, room.hostToken).stage, "report");
  const report = state.getPersonalReport(room.roomId, alice.participantToken);
  assert.equal(report.messages.length, 1);
  assert.equal(report.proposals.length, 1);
  assert.equal(report.relatedProposals.length, 1);
  assert.deepEqual(report.contributions, [{ targetId: aliceMessage.id, tag: "idea" }]);
  assert.equal(report.interviewAnswer, "夜は通知を区切りたいです。");
  assert.equal(report.note.includes("AI推定"), true);

  state.deleteParticipantData(room.roomId, alice.participantToken);
  expectDomainError(() => state.getSnapshot(room.roomId, alice.participantToken), 403, "forbidden_participant");
  const bobAfterDelete = state.getSnapshot(room.roomId, bob.participantToken);
  assert.equal(bobAfterDelete.participants.some((participant) => participant.id === alice.participantId), false);
  assert.equal(bobAfterDelete.messages.some((message) => message.participantId === alice.participantId), false);
  assert.equal(bobAfterDelete.proposals.some((item) => item.participantId === alice.participantId), false);

  assert.equal(state.deleteRoom(room.roomId, room.hostToken).deleted, true);
  expectDomainError(() => state.getSnapshot(room.roomId, room.hostToken), 404, "room_not_found");
  assert.deepEqual(STAGES.at(-1), "report");
});

test("demo content is isolated from live rooms", () => {
  const state = new DomainState();
  const demo = state.createRoom("demo", "デモの話題");
  const live = state.createRoom("live", "実際の話題");
  const demoSnapshot = state.getSnapshot(demo.roomId, demo.hostToken);
  const liveSnapshot = state.getSnapshot(live.roomId, live.hostToken);

  assert.equal(demoSnapshot.room.mode, "demo");
  assert.equal(demoSnapshot.messages.length > 0, true);
  assert.equal(demoSnapshot.messages.every((message) => message.demo), true);
  assert.equal(demoSnapshot.proposals.every((proposal) => proposal.demo), true);
  assert.equal(liveSnapshot.room.mode, "live");
  assert.equal(liveSnapshot.messages.length, 0);
  assert.equal(liveSnapshot.insights.length, 0);
  assert.equal(liveSnapshot.proposals.length, 0);
});

test("consent and ownership checks reject unsafe mutations", () => {
  const state = new DomainState();
  const room = state.createRoom("live", "確認");
  const participant = state.joinRoom(room.roomId, "未同意", false, false);
  const other = state.joinRoom(room.roomId, "別の人", true, true);

  assert.equal(state.advanceStage(room.roomId, room.hostToken).stage, "stance");
  expectDomainError(() => state.setStance(room.roomId, participant.participantToken, "support"), 409, "consent_required");
  expectDomainError(() => state.setConsent(room.roomId, participant.participantToken, false, true), 400, "adult_confirmation_required");
  state.setConsent(room.roomId, participant.participantToken, true, true);
  state.setStance(room.roomId, participant.participantToken, "unsure");
  assert.equal(state.getSnapshot(room.roomId, participant.participantToken).me?.stance, "unsure");
  assert.equal(state.getSnapshot(room.roomId, other.participantToken).me?.stance, null);
  expectDomainError(() => state.setStage(room.roomId, participant.participantToken, "dialogue1"), 403, "forbidden_host");
});

test("shared presentation is host-controlled and restores participant answers", () => {
  const state = new DomainState();
  const room = state.createRoom("live", "共有スライドの確認");
  const alice = state.joinRoom(room.roomId, "Alice", true, true);
  const bob = state.joinRoom(room.roomId, "Bob", true, true);
  const initial = state.getSnapshot(room.roomId, room.hostToken);
  assert.equal(initial.currentSlideIndex, 0);
  assert.equal(initial.currentSlideId, "welcome");
  assert.equal(initial.presentation.totalSlides >= 8, true);
  expectDomainError(() => state.navigatePresentation(room.roomId, alice.participantToken, { direction: "next" }), 403, "forbidden_host");

  state.respondToSlide(room.roomId, alice.participantToken, "welcome", "done");
  state.navigatePresentation(room.roomId, room.hostToken, { direction: "next", expectedRevision: initial.presentation.revision });
  const stance = state.getSnapshot(room.roomId, alice.participantToken);
  assert.equal(stance.presentation.currentSlideId, "stance");
  assert.equal(stance.presentation.responseStatus, "idle");
  state.respondToSlide(room.roomId, alice.participantToken, "stance", "support", "mutation-1");
  const host = state.getSnapshot(room.roomId, room.hostToken);
  assert.equal(host.presentation.responseCount, 1);
  assert.equal(host.presentation.responseSummary?.support, 1);
  assert.equal(host.presentation.myResponse, null);
  assert.equal(host.participants.find((person) => person.displayName === "Alice")?.answeredCurrentSlide, true);
  state.revealPresentation(room.roomId, room.hostToken, true, host.presentation.revision);
  assert.equal(state.getSnapshot(room.roomId, bob.participantToken).presentation.responseSummary?.support, 1);

  state.navigatePresentation(room.roomId, room.hostToken, { direction: "previous" });
  const restored = state.getSnapshot(room.roomId, alice.participantToken);
  assert.equal(restored.presentation.currentSlideId, "welcome");
  assert.equal(restored.presentation.responseStatus, "answered");
  assert.equal(restored.presentation.myResponse?.value, "done");
  assert.equal(bob.participantId !== alice.participantId, true);
});
