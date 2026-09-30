// Sends the "someone completed the audit" email via Resend's HTTP API
// (https://resend.com/docs/api-reference/emails/send-email). No SDK — just a
// fetch call, so it costs nothing to load when RESEND_API_KEY isn't set yet.
// Callers should treat this as best-effort: a failed email must never block
// the actual submission from being saved.
async function sendAuditNotification(record) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // not configured yet — silently skip

  const from = process.env.RESEND_FROM || "SeamFlow Audits <onboarding@resend.dev>";
  const to = process.env.ADMIN_NOTIFY_EMAIL || "seamflowconsulting@gmail.com";

  const sorted = [...record.deptScores].sort((a, b) => a.score - b.score);
  const bottomThree = sorted.slice(0, 3);

  const html = `
    <div style="font-family:Calibri,Arial,sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#021D4B;margin:0 0 4px;">New Business Systems Audit completed</h2>
      <p style="color:#6B7280;font-size:13.5px;margin:0 0 20px;">${new Date(record.submittedAt).toLocaleString()}</p>
      <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:4px 0;color:#6B7280;">Facility</td><td style="padding:4px 0;font-weight:700;">${record.facility || "—"}</td></tr>
        <tr><td style="padding:4px 0;color:#6B7280;">Role</td><td style="padding:4px 0;">${record.role || "—"}</td></tr>
        <tr><td style="padding:4px 0;color:#6B7280;">Email</td><td style="padding:4px 0;">${record.email || "—"}</td></tr>
        <tr><td style="padding:4px 0;color:#6B7280;">Departments assessed</td><td style="padding:4px 0;">${record.selectedDepts.length}</td></tr>
        <tr><td style="padding:4px 0;color:#6B7280;">Overall score</td><td style="padding:4px 0;font-weight:700;">${record.overall}/100 — ${record.tierLabel} (${record.tierStage})</td></tr>
      </table>
      <p style="font-weight:700;color:#021D4B;margin:0 0 8px;">Top priority gaps</p>
      <ol style="margin:0 0 20px;padding-left:18px;font-size:13.5px;">
        ${bottomThree.map(d => `<li>${d.name} — ${d.score}/100</li>`).join("")}
      </ol>
      <p style="font-size:13px;color:#6B7280;">Full report: log into <a href="https://seamflowconsulting.com.ng/admin.html">admin.html</a> and open this submission (id: ${record.id}).</p>
    </div>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to,
        subject: `New audit: ${record.facility || "Untitled facility"} — ${record.overall}/100`,
        html
      })
    });
  } catch {
    // best-effort — never throw out of here
  }
}

module.exports = { sendAuditNotification };
