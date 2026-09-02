// Called by tools/clarity-plan.html once the Business Systems Audit is
// completed. This is the only place a completed audit's answers/scores are
// captured — until this runs, results only ever existed in the visitor's
// browser. Read back via admin-submissions.js.
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

  const { token, facility, role, selectedDepts, answers, deptScores, overall, tierLabel, tierStage } = body;
  if (!token || !Array.isArray(selectedDepts) || !answers || !Array.isArray(deptScores) || typeof overall !== "number") {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid audit data" }) };
  }

  // Reuse the same access check as check-access.js: only a token that's
  // actually entitled to the clarity plan can file a submission against it.
  const tokenStore = getBlobStore("access-tokens");
  let record;
  try {
    record = await tokenStore.get(token, { type: "json" });
  } catch {
    record = null;
  }
  const hasAccess = record && (record.plan === "clarity" || record.grants?.includes("clarity"));
  if (!hasAccess) {
    return { statusCode: 403, body: JSON.stringify({ error: "Invalid or expired access token" }) };
  }

  const id = crypto.randomBytes(12).toString("hex");
  const submission = {
    id,
    token,
    email: record.email,
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
