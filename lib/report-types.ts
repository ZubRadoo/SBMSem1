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
export type PublicReportStatus = Extract<
  ReportStatus,
  "approved" | "acknowledged" | "resolved"
>;

export type ReportRecord = {
  id: string;
  category: string;
  location_text: string;
  latitude: number | null;
  longitude: number | null;
  status: ReportStatus;
  severity: ReportSeverity;
  created_at: string;
};

export type PublicReport = ReportRecord & {
  status: PublicReportStatus;
};

export type AdminReport = ReportRecord & {
  description: string;
  photo_path: string | null;
};

export function isReportSeverity(value: string): value is ReportSeverity {
  return (REPORT_SEVERITIES as readonly string[]).includes(value);
}

export function isReportStatus(value: string): value is ReportStatus {
  return (REPORT_STATUSES as readonly string[]).includes(value);
}
