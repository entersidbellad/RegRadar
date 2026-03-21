"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from "react-leaflet";
import type { Business } from "@/lib/types";
import "leaflet/dist/leaflet.css";

// ── Status colors ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<Business["latest_status"], string> = {
  compliant:     "#22c55e",
  warning:       "#eab308",
  non_compliant: "#ef4444",
  unknown:       "#9ca3af",
};

const STATUS_LABELS: Record<Business["latest_status"], string> = {
  compliant:     "Compliant",
  warning:       "Warning",
  non_compliant: "Non-Compliant",
  unknown:       "Unknown",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface NCMapProps {
  businesses: Business[];
  onMarkerClick: (business: Business) => void;
  /** IDs of businesses to highlight (from alert navigation) */
  highlightedIds?: string[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NCMap({
  businesses,
  onMarkerClick,
  highlightedIds = [],
}: NCMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/20">
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={[35.0, -78.0]}
      zoom={8}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {businesses.map((biz) => {
        const isHighlighted = highlightedIds.includes(biz.id);
        // Highlighted markers: forced red, larger, thicker border
        const fillColor = isHighlighted ? "#ef4444" : STATUS_COLORS[biz.latest_status];
        const radius    = isHighlighted ? 12 : 8;
        const weight    = isHighlighted ? 3  : 2;

        return (
          <CircleMarker
            key={biz.id}
            center={[biz.latitude, biz.longitude]}
            radius={radius}
            pathOptions={{
              fillColor,
              color: isHighlighted ? "#b91c1c" : fillColor,
              weight,
              opacity: 0.95,
              fillOpacity: isHighlighted ? 0.85 : 0.6,
              // SVG transition on color change
              className: isHighlighted ? "leaflet-highlighted-marker" : undefined,
            }}
            eventHandlers={{ click: () => onMarkerClick(biz) }}
          >
            {/* Hover tooltip showing business name */}
            <Tooltip direction="top" offset={[0, -radius]} sticky={false}>
              <span className="text-xs font-medium">{biz.name}</span>
              {isHighlighted && (
                <span className="ml-1 text-xs text-red-600 font-semibold">⚠ Alert</span>
              )}
            </Tooltip>

            {/* Click popup with detail summary */}
            <Popup minWidth={200}>
              <div className="space-y-1 py-1">
                <p className="font-semibold text-sm leading-tight">{biz.name}</p>
                <p className="text-xs text-gray-500">
                  {biz.county} County &middot; {biz.head_count.toLocaleString()} head
                </p>
                <p className="text-xs text-gray-500">{biz.operation_type}</p>
                <span
                  className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: STATUS_COLORS[biz.latest_status] }}
                >
                  {STATUS_LABELS[biz.latest_status]}
                </span>
                {isHighlighted && (
                  <p className="text-xs font-medium text-red-600 pt-1">
                    ⚠ Affected by active alert
                  </p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
