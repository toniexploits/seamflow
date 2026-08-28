// Paystack calls this directly. This does NOT depend on the customer's browser
// staying open, so it's the record of truth even if verify-transaction.js
// never runs (closed tab, network drop, etc). Set this URL in the Paystack
// dashboard: https://<your-site>.netlify.app/.netlify/functions/paystack-webhook
const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const signature = event.headers["x-paystack-signature"];
  const expected = crypto.createHmac("sha512", secretKey).update(event.body).digest("hex");

  if (signature !== expected) {
    return { statusCode: 401, body: "Invalid signature" };
  }

  const payload = JSON.parse(event.body);

  if (payload.event === "charge.success") {
    const data = payload.data;
    const store = getStore("payment-log");
    await store.setJSON(data.reference, {
      email: data.customer?.email,
      amountKobo: data.amount,
      plan: data.metadata?.plan || null,
      paidAt: new Date().toISOString(),
      raw: data
    });

    // TODO once you're ready: send the receipt + access link by email here
    // (e.g. via Resend or SendGrid), using the same token-issuing logic as
    // verify-transaction.js, so a customer who closed the tab mid-payment
    // still gets their access link.
  }

  return { statusCode: 200, body: "ok" };
};
