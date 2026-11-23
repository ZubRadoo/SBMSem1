"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";

type Report = {
  id: string;
  category: string;
  description: string;
  location_text: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  severity?: string;
};

type ReportsMapProps = {
  reports: Report[];
  theme?: "light" | "dark";
  locateToken?: number;
};

const PATNA_CENTER: [number, number] = [85.1376, 25.5941];

function getStyleUrl(theme: "light" | "dark") {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;

  if (key) {
    const style = theme === "dark" ? "streets-v2-dark" : "streets-v2";
    return `https://api.maptiler.com/maps/${style}/style.json?key=${key}`;
  }

  return theme === "dark"
    ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

function getMarkerColor(status: string) {
  if (status === "resolved") return "#4b6d9b";
  if (status === "acknowledged") return "#668e71";
  return "#d99b42";
}

export default function ReportsMap({
  reports,
  theme = "light",
  locateToken = 0,
}: ReportsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const reportMarkersRef = useRef<maplibregl.Marker[]>([]);
  const currentStyleRef = useRef("");
  const [mapReady, setMapReady] = useState(false);

  const locate = useCallback(() => {
    const map = mapRef.current;

    if (!navigator.geolocation || !map) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentMap = mapRef.current;
        if (!currentMap) return;

        const coordinates: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];

        currentMap.flyTo({
          center: coordinates,
          zoom: 14,
          duration: 1200,
        });

        userMarkerRef.current?.remove();

        const element = document.createElement("div");
        element.className = "visitor-location-dot";

        userMarkerRef.current = new maplibregl.Marker({ element })
          .setLngLat(coordinates)
          .setPopup(
            new maplibregl.Popup({ offset: 12 }).setText(
              "Your approximate location",
            ),
          )
          .addTo(currentMap);
      },
      () => {
        // Keep the Patna fallback when location access is unavailable.
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000,
      },
    );
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialStyle = getStyleUrl(theme);
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: initialStyle,
      center: PATNA_CENTER,
      zoom: 11,
    });

    mapRef.current = map;
    currentStyleRef.current = initialStyle;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.once("load", () => {
      setMapReady(true);
      locate();
    });

    return () => {
      reportMarkersRef.current.forEach((marker) => marker.remove());
      reportMarkersRef.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // The map is created once. Theme changes are handled by the next effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const nextStyle = getStyleUrl(theme);
    if (nextStyle === currentStyleRef.current) return;

    currentStyleRef.current = nextStyle;
    map.setStyle(nextStyle);
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    reportMarkersRef.current.forEach((marker) => marker.remove());

    reportMarkersRef.current = reports.flatMap((report) => {
      if (
        report.latitude === null ||
        report.longitude === null ||
        !Number.isFinite(report.latitude) ||
        !Number.isFinite(report.longitude) ||
        report.latitude < -90 ||
        report.latitude > 90 ||
        report.longitude < -180 ||
        report.longitude > 180
      ) {
        return [];
      }

      const element = document.createElement("div");
      element.className = "report-map-marker";
      element.style.cssText = "width:15px;height:15px;border:3px solid white;border-radius:50%;box-shadow:0 1px 5px #0006;cursor:pointer";
      element.style.backgroundColor = getMarkerColor(report.status);
      element.setAttribute("aria-label", report.category);

      const popupContent = [
        `<strong>${escapeHtml(report.category)}</strong>`,
        `<p>${escapeHtml(report.location_text)}</p>`,
        `<small>Severity: ${escapeHtml(report.severity || "medium")}</small>`,
        `<br><small>${escapeHtml(report.status.replaceAll("_", " "))}</small>`,
      ].join("");

      const popup = new maplibregl.Popup({
        offset: 14,
        maxWidth: "260px",
      }).setHTML(popupContent);

      return [
        new maplibregl.Marker({ element })
          .setLngLat([report.longitude, report.latitude])
          .setPopup(popup)
          .addTo(map),
      ];
    });
  }, [reports, mapReady]);

  useEffect(() => {
    if (mapReady && locateToken > 0) locate();
  }, [locateToken, locate, mapReady]);

  return (
    <div
      ref={containerRef}
      className="map-frame home-map"
      aria-label="Map of public cleanliness and pollution hotspots"
    />
  );
}
