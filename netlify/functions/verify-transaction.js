// Called by checkout.html right after Paystack's popup reports success.
// Never trusts the client's claim of "paid" — it re-checks the transaction
// with Paystack's own API using the secret key before issuing an access token.
const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");

const PLAN_PRICES_KOBO = {
  clarity: 15000000,   // ₦150,000
  structure: 25000000, // ₦250,000
  growth: 35000000,    // ₦350,000
  bundle: 65000000     // ₦650,000
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const { reference, plan } = JSON.parse(event.body || "{}");
  if (!reference || !PLAN_PRICES_KOBO[plan]) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid reference/plan" }) };
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server misconfigured: no Paystack key" }) };
  }

  // Ask Paystack directly. This is the only source of truth for "did the money move".
  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` }
  });
  const verifyJson = await verifyRes.json();

  if (!verifyRes.ok || !verifyJson.status || verifyJson.data?.status !== "success") {
    return { statusCode: 402, body: JSON.stringify({ error: "Payment not confirmed" }) };
  }

  const paidKobo = verifyJson.data.amount;
  const expectedKobo = PLAN_PRICES_KOBO[plan];
  if (paidKobo < expectedKobo) {
    return { statusCode: 402, body: JSON.stringify({ error: "Amount paid does not match plan price" }) };
  }

  const email = verifyJson.data.customer?.email || "unknown";
  const token = crypto.randomBytes(24).toString("hex");

  const store = getStore("access-tokens");
  await store.setJSON(token, {
    plan,
    email,
    reference,
    paidAt: new Date().toISOString(),
    amountKobo: paidKobo
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ token, plan })
  };
};
