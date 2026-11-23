import maplibregl from "maplibre-gl";

export const PATNA_CENTER: [number, number] = [85.1376, 25.5941];

export function getMapStyleUrl(theme: "light" | "dark" = "light") {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;

  if (key) {
    const style = theme === "dark" ? "streets-v2-dark" : "streets-v2";
    return `https://api.maptiler.com/maps/${style}/style.json?key=${key}`;
  }

  return theme === "dark"
    ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
}

export function isValidCoordinates(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function createReportMarker(
  map: maplibregl.Map,
  report: {
    category: string;
    location_text: string;
    latitude: number;
    longitude: number;
    status: string;
    severity?: string;
  },
) {
  const colors: Record<string, string> = {
    resolved: "#4b6d9b",
    acknowledged: "#668e71",
  };
  const element = document.createElement("button");
  element.type = "button";
  element.className = "report-map-marker";
  element.style.cssText =
    "width:20px;height:20px;border:3px solid white;border-radius:50%;box-shadow:0 1px 5px #0006;cursor:pointer";
  element.style.backgroundColor = colors[report.status] ?? "#d99b42";
  element.setAttribute("aria-label", `${report.category} at ${report.location_text}`);

  const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[character];
    });

  const popupContent = [
    `<strong>${escapeHtml(report.category)}</strong>`,
    `<p>${escapeHtml(report.location_text)}</p>`,
    `<small>Severity: ${escapeHtml(report.severity || "medium")}</small>`,
    `<br><small>${escapeHtml(report.status.replaceAll("_", " "))}</small>`,
  ].join("");

  return new maplibregl.Marker({ element })
    .setLngLat([report.longitude, report.latitude])
    .setPopup(new maplibregl.Popup({ offset: 14, maxWidth: "260px" }).setHTML(popupContent))
    .addTo(map);
}
