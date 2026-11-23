"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { hasSupabase, supabase } from "@/lib/supabase";

type Report = {
  id: string;
  category: string;
  description: string;
  location_text: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  created_at: string;
};

const ReportsMap = dynamic(() => import("@/components/ReportsMap"), {
  ssr: false,
  loading: () => <div className="home-map-loading">Loading community map…</div>,
});

const filters = ["All", "Streets", "Rivers", "Nature"] as const;
type Filter = (typeof filters)[number];

function matchesFilter(report: Report, filter: Filter) {
  if (filter === "All") return true;
  const category = report.category.toLowerCase();
  if (filter === "Rivers") return category.includes("river") || category.includes("water");
  if (filter === "Nature") return category.includes("nature");
  return !category.includes("river") && !category.includes("water") && !category.includes("nature");
}

function readableStatus(status: string) {
  if (status === "acknowledged") return "Acknowledged";
  if (status === "resolved") return "Marked resolved";
  return "Approved";
}

export default function HomeDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadReports() {
      if (!hasSupabase || !supabase) {
        if (active) {
          setError("Community reports are temporarily unavailable.");
          setLoading(false);
        }
        return;
      }
      const { data, error: queryError } = await supabase
        .from("public_reports")
        .select("id,category,description,location_text,latitude,longitude,status,created_at")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (queryError) setError("We couldn't load community reports. Please refresh the page.");
      else setReports((data || []) as Report[]);
      setLoading(false);
    }
    loadReports();
    return () => { active = false; };
  }, []);

  const visibleReports = useMemo(
    () => reports.filter((report) => matchesFilter(report, filter)),
    [reports, filter]
  );
  const mappedReports = visibleReports.filter(
    (report) => report.latitude !== null && report.longitude !== null
  );
  const recentReports = visibleReports.slice(0, 5);
  const acknowledged = reports.filter((report) => report.status === "acknowledged").length;
  const resolved = reports.filter((report) => report.status === "resolved").length;

  return (
    <section className="community-dashboard" aria-labelledby="community-heading">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">LIVE COMMUNITY ACTIVITY</p>
          <h2 id="community-heading">See what’s happening around you.</h2>
          <p className="dashboard-intro">Browse public reports shared by the community. Only submissions approved by the review team appear here.</p>
        </div>
        <Link className="button button-dark dashboard-report-button" href="/report">＋ Report an issue</Link>
      </div>

      <div className="dashboard-stats" aria-live="polite">
        <div className="dashboard-stat"><strong>{loading ? "—" : reports.length}</strong><span>Public reports</span></div>
        <div className="dashboard-stat"><strong>{loading ? "—" : acknowledged}</strong><span>Acknowledged</span></div>
        <div className="dashboard-stat"><strong>{loading ? "—" : resolved}</strong><span>Marked resolved</span></div>
      </div>

      <div className="dashboard-map-heading">
        <div>
          <h3>Community report map</h3>
          <p>Choose a category to filter the map and recent reports.</p>
        </div>
        <div className="dashboard-filters" role="group" aria-label="Filter reports by category">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? "dashboard-filter active" : "dashboard-filter"}
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="notice">{error}</div>
      ) : (
        <>
          <div className="home-map-wrap">
            <ReportsMap reports={mappedReports} />
          </div>
          <div className="map-footnote">
            <span>{loading ? "Loading reports…" : visibleReports.length + " public reports" + (mappedReports.length !== visibleReports.length ? " · " + (visibleReports.length - mappedReports.length) + " without map coordinates" : "")}</span>
            <span className="map-status-key"><i className="legend-dot" style={{ background: "#d99b42" }} /> Approved <i className="legend-dot" style={{ background: "#668e71" }} /> Acknowledged <i className="legend-dot" style={{ background: "#4b6d9b" }} /> Resolved</span>
          </div>

          <div className="recent-reports-heading">
            <div><h3>Recent contributions</h3><p>Latest reports approved for public viewing.</p></div>
            <Link href="/map" className="text-link">Open full map ↗</Link>
          </div>
          {loading ? <div className="recent-empty">Loading recent reports…</div> : recentReports.length ? (
            <div className="recent-report-list">
              {recentReports.map((report) => (
                <article className="recent-report" key={report.id}>
                  <div className="recent-report-main">
                    <strong>{report.category}</strong>
                    <span>{report.location_text}</span>
                    <small>{new Date(report.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</small>
                  </div>
                  <span className={"report-status status-" + report.status}>{readableStatus(report.status)}</span>
                </article>
              ))}
            </div>
          ) : (
            <div className="recent-empty">No public reports in this category yet. You can be the first to contribute.</div>
          )}
        </>
      )}
      <div className="dashboard-bottom-cta">
        <div><strong>Noticed a cleanliness issue?</strong><span>Share the location and a short description. No account is required.</span></div>
        <Link className="button button-dark" href="/report">Submit a report</Link>
      </div>
    </section>
  );
}
