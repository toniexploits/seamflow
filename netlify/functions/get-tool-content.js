const { getStore } = require("@netlify/blobs");

// TODO: move the real DEPARTMENTS / questions / SOP library / KPI data from
// tools/clarity-plan.html, tools/structure-plan.html, tools/growth-plan.html
// into this file (or a JSON file this function reads), keyed by plan.
// Right now the tool HTML files still hold that content client-side —
// that's the gap this function is meant to close.
const CONTENT_BY_PLAN = {
  clarity: { placeholder: true, note: "Move DEPARTMENTS + questions array here" },
  structure: { placeholder: true, note: "Move the SOP library here" },
  growth: { placeholder: true, note: "Move the KPI/brand/expansion content here" }
};

exports.handler = async (event) => {
  const token = event.queryStringParameters?.token;
  const plan = event.queryStringParameters?.plan;

  if (!token || !plan || !CONTENT_BY_PLAN[plan]) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid token/plan" }) };
  }

  const store = getStore("access-tokens");
  let record;
  try {
    record = await store.get(token, { type: "json" });
  } catch {
    record = null;
  }

  if (!record || record.plan !== plan) {
    return { statusCode: 403, body: JSON.stringify({ error: "Invalid or expired access token" }) };
  }

  return { statusCode: 200, body: JSON.stringify(CONTENT_BY_PLAN[plan]) };
};
