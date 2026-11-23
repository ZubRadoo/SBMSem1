"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { hasSupabase, supabase } from "@/lib/supabase";
import {
  isReportStatus,
  type AdminReport,
  type ReportStatus,
} from "@/lib/report-types";

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;

    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user: authenticatedUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authenticatedUser) {
        setUser(null);
        setVerified(false);
        setReports([]);
        return;
      }

      setUser(authenticatedUser.email || "Faculty reviewer");

      const { data: admin, error: adminError } = await supabase
        .from("faculty_admins")
        .select("user_id")
        .eq("user_id", authenticatedUser.id)
        .maybeSingle();

      if (adminError) throw adminError;

      if (!admin) {
        setVerified(false);
        setReports([]);
        setMessage(
          "This account is not on the faculty-approved reviewer list. Ask the project administrator to verify it.",
        );
        return;
      }

      setVerified(true);

      const { data, error: reportsError } = await supabase
        .from("reports")
        .select(
          "id,category,description,location_text,latitude,longitude,status,severity,created_at,photo_path",
        )
        .order("created_at", { ascending: false });

      if (reportsError) throw reportsError;
      setReports((data ?? []) as AdminReport[]);
    } catch {
      setMessage(
        "Could not load reviewer access or reports. Check your connection and try again.",
      );
      setVerified(false);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasSupabase) void load();
  }, [load]);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || busy) return;

    setBusy(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      await load();
    } catch {
      setMessage("Sign-in failed. Check the email, password and connection.");
    } finally {
      setBusy(false);
    }
  };

  const update = async (id: string, nextStatus: ReportStatus) => {
    if (!supabase || busy || !isReportStatus(nextStatus)) return;

    setBusy(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("reports")
        .update({
          status: nextStatus,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error("The report was not updated. Refresh and try again.");
      }

      await load();
    } catch {
      setMessage("Could not update this report. Refresh and try again.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    if (!supabase || busy) return;

    setBusy(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setVerified(false);
      setReports([]);
      setPassword("");
    } catch {
      setMessage("Sign-out failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <nav className="nav shell">
        <Link className="brand" href="/">
          <span className="brand-mark">S</span> SwachhSeva
        </Link>
        <Link className="back-link" href="/">
          ← Home
        </Link>
      </nav>

      <div className="page-shell">
        <p className="eyebrow">RESTRICTED ACCESS / FACULTY REVIEW</p>
        <h1 className="page-title">Review submissions.</h1>
        <p className="page-intro">
          Only faculty-verified accounts can access reports and change their
          public status.
        </p>

        {!hasSupabase ? (
          <div className="notice">
            Supabase is not configured. Add the environment variables and apply
            the database setup before using the admin portal.
          </div>
        ) : !user ? (
          <form className="panel-card" onSubmit={signIn}>
            <div className="field">
              <label htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <button className="button button-dark" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : (
          <div className="panel-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 15,
                flexWrap: "wrap",
              }}
            >
              <b>{user}</b>
              <button
                className="small-btn"
                type="button"
                onClick={signOut}
                disabled={busy}
              >
                Sign out
              </button>
            </div>

            {loading ? <p className="muted">Loading submissions…</p> : null}

            {verified ? (
              <>
                <p className="muted">
                  Faculty verification confirmed · {reports.length} submissions
                </p>
                {reports.map((report) => (
                  <div className="report-row" key={report.id}>
                    <div style={{ maxWidth: 560 }}>
                      <b>{report.category}</b>
                      <p>{report.location_text}</p>
                      <p className="muted">{report.description}</p>
                      <span className="status">
                        {report.status.replaceAll("_", " ")}
                      </span>
                      <span
                        className={`severity-pill severity-${report.severity || "medium"}`}
                      >
                        {(report.severity || "medium").toUpperCase()} severity
                      </span>
                    </div>

                    <div className="admin-actions">
                      {report.status === "pending_review" ? (
                        <>
                          <button
                            className="small-btn primary"
                            type="button"
                            onClick={() => update(report.id, "approved")}
                            disabled={busy}
                          >
                            Approve
                          </button>
                          <button
                            className="small-btn"
                            type="button"
                            onClick={() => update(report.id, "rejected")}
                            disabled={busy}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                      {report.status === "approved" ? (
                        <button
                          className="small-btn primary"
                          type="button"
                          onClick={() => update(report.id, "acknowledged")}
                          disabled={busy}
                        >
                          Acknowledged
                        </button>
                      ) : null}
                      {report.status === "acknowledged" ? (
                        <button
                          className="small-btn primary"
                          type="button"
                          onClick={() => update(report.id, "resolved")}
                          disabled={busy}
                        >
                          Mark resolved
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </>
            ) : null}
          </div>
        )}

        {message ? (
          <div className="notice" role="status" style={{ marginTop: 15 }}>
            {message}
          </div>
        ) : null}

        <p className="muted" style={{ marginTop: 20 }}>
          Faculty approval must be granted by adding the authenticated user ID
          to the faculty_admins table in Supabase. Do not expose service-role
          keys in the browser.
        </p>
      </div>
    </main>
  );
}
