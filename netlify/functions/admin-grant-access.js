// Backs the "Grant Access" tab in admin.html. Structure/Growth access used to
// be created automatically by verify-transaction.js after a Paystack payment;
// now that pricing is scoped per-client instead of paid through self-checkout,
// the admin issues access tokens manually here once a deal is agreed. Same
// x-admin-key gate as admin-submissions.js / admin-usage.js, and writes to the
// same "access-tokens" store that check-access.js / get-tool-content.js read.
const crypto = require("crypto");
const { getBlobStore } = require("./lib/blob-store");

const GRANTABLE_PLANS = ["structure", "growth"];

exports.handler = async (event) => {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return { statusCode: 503, body: JSON.stringify({ error: "Admin access not configured" }) };
  }

  const suppliedKey = event.headers["x-admin-key"] || event.queryStringParameters?.key;
  if (suppliedKey !== adminKey) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { email, facility, plans } = body;
  const grants = Array.isArray(plans) ? plans.filter(p => GRANTABLE_PLANS.includes(p)) : [];
  if (!email || !email.includes("@") || grants.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid email/plans" }) };
  }

  const token = crypto.randomBytes(24).toString("hex");
  const store = getBlobStore("access-tokens");
  await store.setJSON(token, {
    plan: grants[0],
    grants,
    email,
    facility: facility || "",
    issuedAt: new Date().toISOString(),
    issuedBy: "admin"
  });

  const links = grants.map(plan => ({
    plan,
    url: `/tools/${plan}-plan.html?token=${token}&plan=${plan}`
  }));

  return { statusCode: 200, body: JSON.stringify({ token, links }) };
};
