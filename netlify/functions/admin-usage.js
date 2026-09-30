// Backs the "Tool Usage" tab in admin.html — same ADMIN_KEY gate as
// admin-submissions.js, just reading from the tool-usage store instead.
const { getBlobStore } = require("./lib/blob-store");

exports.handler = async (event) => {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return { statusCode: 503, body: JSON.stringify({ error: "Admin access not configured" }) };
  }

  const suppliedKey = event.headers["x-admin-key"] || event.queryStringParameters?.key;
  if (suppliedKey !== adminKey) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const store = getBlobStore("tool-usage");
  const { blobs = [] } = await store.list();
  const items = [];
  for (const blob of blobs) {
    const record = await store.get(blob.key, { type: "json" });
    if (record) items.push(record);
  }
  items.sort((a, b) => new Date(b.at) - new Date(a.at));

  return { statusCode: 200, body: JSON.stringify({ items }) };
};
