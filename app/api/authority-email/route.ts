import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const authorityDirectory = {
  pmc: { label: "Patna Municipal Corporation", email: "patnamc-bih@gov.in" },
  pmc_sanitation: { label: "PMC Sanitation Department", email: "pmcsanitation@gmail.com" },
} as const;

const pollutionPortal = "https://bspcb.in/index.aspx";
type AuthorityKey = keyof typeof authorityDirectory | "bspcb_portal";

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.REPORTS_FROM_EMAIL;

  if (!url || !serviceKey) {
    return NextResponse.json({ status: "not_configured", message: "Server-side report delivery is not configured." }, { status: 503 });
  }

  let body: { reportId?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body.reportId || !/^[0-9a-f-]{36}$/i.test(body.reportId)) {
    return NextResponse.json({ error: "A valid report ID is required." }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: report, error: readError } = await admin
    .from("reports")
    .select("id,category,description,location_text,latitude,longitude,photo_path,severity,authority_keys,created_at,email_status")
    .eq("id", body.reportId).single();

  if (readError || !report) return NextResponse.json({ error: "Report could not be loaded." }, { status: 404 });

  const keys = (report.authority_keys || []) as AuthorityKey[];
  const includesPollutionPortal = keys.includes("bspcb_portal");
  const emailRecipients = [...new Set(
    keys.filter((key): key is keyof typeof authorityDirectory => key in authorityDirectory)
      .map((key) => authorityDirectory[key].email),
  )];
  const selectedLabels = keys.map((key) =>
    key === "bspcb_portal" ? "Bihar State Pollution Control Board grievance portal" :
    key in authorityDirectory ? authorityDirectory[key as keyof typeof authorityDirectory].label : null
  ).filter(Boolean);

  if (emailRecipients.length === 0) {
    const status = includesPollutionPortal ? "portal_only" : "not_requested";
    await admin.from("reports").update({ email_status: status }).eq("id", report.id);
    return NextResponse.json({
      status, portalUrl: includesPollutionPortal ? pollutionPortal : null,
      message: includesPollutionPortal
        ? "The Pollution Control Board states that grievances sent by email will not be entertained. Use its official grievance portal."
        : "No email authority was selected.",
    });
  }

  if (!resendKey || !fromEmail) {
    await admin.from("reports").update({
      email_status: "not_configured",
      email_error: "RESEND_API_KEY or REPORTS_FROM_EMAIL is missing.",
    }).eq("id", report.id);
    return NextResponse.json({
      status: "not_configured", portalUrl: includesPollutionPortal ? pollutionPortal : null,
      message: "The report was saved, but authority email delivery needs server configuration.",
    }, { status: 503 });
  }

  // Atomic claim: only one request can send a given report. Failed or
  // previously unconfigured deliveries can be retried after configuration.
  const { data: claim, error: claimError } = await admin.from("reports")
    .update({ email_status: "sending", email_error: null })
    .eq("id", report.id)
    .in("email_status", ["not_requested", "not_configured", "failed"])
    .select("id").maybeSingle();
  if (claimError || !claim) {
    return NextResponse.json({
      status: report.email_status,
      portalUrl: includesPollutionPortal ? pollutionPortal : null,
      message: report.email_status === "sent"
        ? "An authority email has already been sent for this report."
        : "An email attempt for this report is already in progress or has already been processed.",
    });
  }

  try {
    let attachment: { filename: string; content: string } | undefined;
    if (report.photo_path) {
      const { data: file, error: photoError } = await admin.storage.from("report-photos").download(report.photo_path);
      if (photoError || !file) throw new Error("The uploaded photo could not be retrieved for email attachment.");
      const bytes = Buffer.from(await file.arrayBuffer());
      const ext = report.photo_path.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
      attachment = { filename: `swachhseva-report-${report.id}.${ext}`, content: bytes.toString("base64") };
    }

    const coordinates = report.latitude !== null && report.longitude !== null
      ? `${report.latitude}, ${report.longitude}` : "Not provided";
    const submittedAt = new Date(report.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const subject = `SwachhSeva civic issue report: ${report.category} [${report.id.slice(0, 8)}]`;
    const textBody = [
      "A civic issue has been submitted through SwachhSeva for the Patna area.", "",
      `Report ID: ${report.id}`, `Submitted: ${submittedAt}`,
      `Category: ${report.category}`, `Severity: ${report.severity}`,
      `Location: ${report.location_text}`, `Coordinates: ${coordinates}`, "",
      "Issue description:", report.description, "",
      `Selected authority/authorities: ${selectedLabels.join(", ")}`, "",
      "This is a community-submitted report and has not been independently verified by the receiving authority or SwachhSeva.",
      "Please assess the issue through your usual process.", "",
      `SwachhSeva public map: ${(process.env.NEXT_PUBLIC_SITE_URL || "https://swachhseva-nine.vercel.app").replace(/\\/$/, "")}/map`,
      "SwachhSeva",
    ].join("\n");

    const payload: Record<string, unknown> = { from: fromEmail, to: emailRecipients, subject, text: textBody };
    if (attachment) payload.attachments = [attachment];

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error((await response.text()).slice(0, 1000));

    await admin.from("reports").update({
      email_status: "sent", email_sent_at: new Date().toISOString(), email_error: null,
    }).eq("id", report.id);
    return NextResponse.json({
      status: "sent", portalUrl: includesPollutionPortal ? pollutionPortal : null,
      message: "The report email was sent to the selected Patna authority contact(s).",
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Email delivery failed.";
    await admin.from("reports").update({ email_status: "failed", email_error: detail }).eq("id", report.id);
    return NextResponse.json({
      status: "failed", portalUrl: includesPollutionPortal ? pollutionPortal : null,
      message: "The report was saved, but the authority email could not be sent.",
    }, { status: 502 });
  }
}
