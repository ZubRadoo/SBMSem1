export const REPORT_SEVERITIES = ["low", "medium", "high"] as const;
export type ReportSeverity = (typeof REPORT_SEVERITIES)[number];

export const REPORT_STATUSES = [
  "pending_review",
  "approved",
  "acknowledged",
  "resolved",
  "rejected",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export type PublicReport = {
  id: string;
  category: string;
  location_text: string;
  latitude: number | null;
  longitude: number | null;
  status: Extract<ReportStatus, "approved" | "acknowledged" | "resolved">;
  severity: ReportSeverity;
  created_at: string;
};

export type AdminReport = PublicReport & {
  description: string;
  photo_path: string | null;
};

export function isReportSeverity(value: string): value is ReportSeverity {
  return (REPORT_SEVERITIES as readonly string[]).includes(value);
}

export function isReportStatus(value: string): value is ReportStatus {
  return (REPORT_STATUSES as readonly string[]).includes(value);
}
