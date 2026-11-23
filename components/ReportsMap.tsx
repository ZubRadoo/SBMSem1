"use client";

import { useCallback, useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { createReportMarker, getMapStyleUrl, isValidCoordinates, PATNA_CENTER } from "@/lib/map-utils";
import type { PublicReport } from "@/lib/report-types";

type ReportsMapProps = {
  reports: PublicReport[];
  theme?: "light" | "dark";
  locateToken?: number;
};

export default function ReportsMap({
  reports,
  theme = "light",
  locateToken = 0,
}: ReportsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const reportMarkersRef = useRef<maplibregl.Marker[]>([]);
  const reportsRef = useRef(reports);
  const styleUrlRef = useRef(getMapStyleUrl(theme));

  useEffect(() => {
    reportsRef.current = reports;
  }, [reports]);

  const drawMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    reportMarkersRef.current.forEach((marker) => marker.remove());
    reportMarkersRef.current = reportsRef.current.flatMap((report) => {
      if (
        report.latitude === null ||
        report.longitude === null ||
        !isValidCoordinates(report.latitude, report.longitude)
      ) {
        return [];
      }

      return [
        createReportMarker(map, {
          ...report,
          latitude: report.latitude,
          longitude: report.longitude,
        }),
      ];
    });
  }, []);

  const locate = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentMap = mapRef.current;
        if (!currentMap) return;

        const coordinates: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];

        currentMap.flyTo({ center: coordinates, zoom: 14, duration: 1200 });
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
        // Keep the Patna fallback when permission is denied or location is unavailable.
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrlRef.current,
      center: PATNA_CENTER,
      zoom: 11,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.once("load", drawMarkers);

    return () => {
      reportMarkersRef.current.forEach((marker) => marker.remove());
      reportMarkersRef.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [drawMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const nextStyle = getMapStyleUrl(theme);
    if (nextStyle === styleUrlRef.current) return;

    styleUrlRef.current = nextStyle;
    map.setStyle(nextStyle);
    map.once("style.load", drawMarkers);
  }, [theme, drawMarkers]);

  useEffect(() => {
    if (mapRef.current?.isStyleLoaded()) drawMarkers();
  }, [reports, drawMarkers]);

  useEffect(() => {
    if (locateToken > 0) locate();
  }, [locateToken, locate]);

  return (
    <div
      ref={containerRef}
      className="map-frame home-map"
      aria-label="Map of public cleanliness and pollution hotspots"
    />
  );
}
