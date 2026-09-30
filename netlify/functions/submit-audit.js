// Called by tools/clarity-plan.html once the Business Systems Audit is
// completed. This is the only place a completed audit's answers/scores are
// captured — until this runs, results only ever existed in the visitor's
// browser. Read back via admin-submissions.js.
//
// The Clarity Plan is free and public (no access token) — the visitor's
// email, captured on the intro screen, is the only identity we have for a
// submission here.
const crypto = require("crypto");
const { getBlobStore } = require("./lib/blob-store");
const { sendAuditNotification } = require("./lib/notify");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { email, facility, role, selectedDepts, answers, deptScores, overall, tierLabel, tierStage } = body;
  const validEmail = typeof email === "string" && email.includes("@");
  if (!validEmail || !Array.isArray(selectedDepts) || selectedDepts.length === 0 || !answers
      || !Array.isArray(deptScores) || typeof overall !== "number") {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid audit data" }) };
  }

  const id = crypto.randomBytes(12).toString("hex");
  const submission = {
    id,
    email,
    plan: "clarity",
    facility: facility || "",
    role: role || "",
    selectedDepts,
    answers,
    deptScores,
    overall,
    tierLabel: tierLabel || "",
    tierStage: tierStage || "",
    submittedAt: new Date().toISOString()
  };

  const submissionStore = getBlobStore("audit-submissions");
  await submissionStore.setJSON(id, submission);

  // Best-effort — a failed/unconfigured email must never fail the submission.
  await sendAuditNotification(submission);

  return { statusCode: 200, body: JSON.stringify({ ok: true, id }) };
};
