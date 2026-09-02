const { getBlobStore } = require("./lib/blob-store");
const clarity = require("./clarity-content");
const structure = require("./structure-content");
const growth = require("./growth-content");

const CONTENT_BY_PLAN = {
  clarity,
  structure,
  growth
};

exports.handler = async (event) => {
  const token = event.queryStringParameters?.token;
  const plan = event.queryStringParameters?.plan;

  if (!token || !plan || !CONTENT_BY_PLAN[plan]) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid token/plan" }) };
  }

  const store = getBlobStore("access-tokens");
  let record;
  try {
    record = await store.get(token, { type: "json" });
  } catch {
    record = null;
  }

  const hasAccess = record && (record.plan === plan || record.grants?.includes(plan));
  if (!hasAccess) {
    return { statusCode: 403, body: JSON.stringify({ error: "Invalid or expired access token" }) };
  }

  return { statusCode: 200, body: JSON.stringify(CONTENT_BY_PLAN[plan]) };
};
