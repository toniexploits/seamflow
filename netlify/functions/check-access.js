const { getBlobStore } = require("./lib/blob-store");

exports.handler = async (event) => {
  const token = event.queryStringParameters?.token;
  const plan = event.queryStringParameters?.plan;

  if (!token || !plan) {
    return { statusCode: 400, body: JSON.stringify({ valid: false, reason: "Missing token or plan" }) };
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
    return { statusCode: 200, body: JSON.stringify({ valid: false }) };
  }

  return { statusCode: 200, body: JSON.stringify({ valid: true, email: record.email }) };
};
