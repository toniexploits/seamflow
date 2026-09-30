// Called by structure-plan.html and growth-plan.html — tools with no
// questionnaire of their own, so there's nothing to "submit" the way
// submit-audit.js does for the Clarity Plan. This just records that someone
// with valid access opened the tool, and which sections/SOPs they looked at,
// so admin.html has some visibility into who's actually using what they paid
// for. Fire-and-forget from the client; failures here shouldn't disrupt
// browsing the tool.
const crypto = require("crypto");
const { getBlobStore } = require("./lib/blob-store");

const TRACKED_PLANS = ["structure", "growth"];
const EVENT_TYPES = ["access", "view"];

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

  const { token, plan, type, label } = body;
  if (!token || !TRACKED_PLANS.includes(plan) || !EVENT_TYPES.includes(type)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid usage data" }) };
  }

  const tokenStore = getBlobStore("access-tokens");
  let record;
  try {
    record = await tokenStore.get(token, { type: "json" });
  } catch {
    record = null;
  }
  const hasAccess = record && (record.plan === plan || record.grants?.includes(plan));
  if (!hasAccess) {
    return { statusCode: 403, body: JSON.stringify({ error: "Invalid or expired access token" }) };
  }

  const id = crypto.randomBytes(12).toString("hex");
  const usageStore = getBlobStore("tool-usage");
  await usageStore.setJSON(id, {
    id,
    token,
    email: record.email,
    plan,
    type,
    label: label || "",
    at: new Date().toISOString()
  });

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
