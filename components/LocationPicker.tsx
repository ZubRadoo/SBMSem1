"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";

type LocationPickerProps = {
  latitude: string;
  longitude: string;
  onChange: (latitude: string, longitude: string) => void;
};

const PATNA_CENTER: [number, number] = [85.1376, 25.5941];

function getMapStyleUrl() {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;

  return key
    ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}`
    : "https://demotiles.maplibre.org/style.json";
}

function isValidCoordinates(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
}: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [message, setMessage] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getMapStyleUrl(),
      center: PATNA_CENTER,
      zoom: 13,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("click", (event) => {
      onChangeRef.current(
        event.lngLat.lat.toFixed(7),
        event.lngLat.lng.toFixed(7),
      );
    });

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !latitude || !longitude) return;

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!isValidCoordinates(lat, lng)) return;

    const position: [number, number] = [lng, lat];

    if (!markerRef.current) {
      const marker = new maplibregl.Marker({ draggable: true })
        .setLngLat(position)
        .addTo(map);

      marker.on("dragend", () => {
        const point = marker.getLngLat();
        onChangeRef.current(point.lat.toFixed(7), point.lng.toFixed(7));
      });

      markerRef.current = marker;
    } else {
      markerRef.current.setLngLat(position);
    }

    map.easeTo({
      center: position,
      zoom: Math.max(map.getZoom(), 15),
    });
  }, [latitude, longitude]);

  const locate = () => {
    setMessage("");

    if (!navigator.geolocation) {
      setMessage("Location access is unavailable in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange(
          position.coords.latitude.toFixed(7),
          position.coords.longitude.toFixed(7),
        );
        setMessage("Location detected. Drag the pin if it needs adjustment.");
      },
      () => {
        setMessage(
          "Could not get your location. Click the map to place the pin manually.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  };

  return (
    <div>
      <button className="small-btn" type="button" onClick={locate}>
        Use my current location
      </button>

      <p className="muted" style={{ margin: "8px 0" }}>
        Click the map to place the pin, then drag it to the exact spot. Location
        permission is optional.
      </p>

      <div
        ref={mapContainerRef}
        style={{
          height: 300,
          width: "100%",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #d8ddd7",
        }}
        aria-label="Interactive location picker map"
      />

      {latitude && longitude ? (
        <p className="muted">
          Selected: {Number(latitude).toFixed(6)},{" "}
          {Number(longitude).toFixed(6)}
        </p>
      ) : (
        <p className="muted">No map position selected yet.</p>
      )}

      {message ? (
        <p className="muted" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
