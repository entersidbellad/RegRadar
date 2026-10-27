"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, Polygon } from "react-leaflet";
import type { Business } from "@/lib/types";
import { NC_BOUNDARY } from "@/lib/nc-boundary";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/status";
import "leaflet/dist/leaflet.css";

interface NCMapProps {
  businesses: Business[];
  onMarkerClick: (business: Business) => void;
  highlightedIds?: string[];
}

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
      // Leaflet panes use z-index 400+; isolate them so overlays like the analysis panel stay on top.
      className="isolate h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      <Polygon
        positions={NC_BOUNDARY}
        pathOptions={{
          color: "#2d5016",
          weight: 2,
          opacity: 0.6,
          fillColor: "#2d5016",
          fillOpacity: 0.04,
          dashArray: "6 4",
        }}
      />

      {businesses.map((biz) => {
        const isHighlighted = highlightedIds.includes(biz.id);
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
              className: isHighlighted ? "leaflet-highlighted-marker" : undefined,
            }}
            eventHandlers={{ click: () => onMarkerClick(biz) }}
          >
            <Tooltip direction="top" offset={[0, -radius]} sticky={false}>
              <span className="text-xs font-medium">{biz.name}</span>
              {isHighlighted && (
                <span className="ml-1 text-xs text-red-600 font-semibold">&bull; Alert</span>
              )}
            </Tooltip>

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
                    Affected by active alert
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
