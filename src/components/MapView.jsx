import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, useMapEvents } from "react-leaflet";
import { NCR_CENTER, NCR_BOUNDS, isWithinMetroManila } from "../utils/geofence";

const CARTO_KEY = import.meta.env.VITE_CARTO_KEY;

function createDepotIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;background:#0F172A;color:#FFF;border:2px solid #FFF;border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(15,23,42,0.28);">HUB</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function createStopIcon(sequenceNumber) {
  return L.divIcon({
    className: "",
    html: `<div style="width:24px;height:24px;background:#2563EB;color:#FFF;border:2px solid #FFF;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;box-shadow:0 2px 5px rgba(37,99,235,0.35);">${sequenceNumber}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function MapClickHandler({ onAddStop, onOutOfBounds }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (!isWithinMetroManila(lat, lng)) {
        onOutOfBounds?.("Delivery stops are restricted to Metro Manila (NCR).");
        return;
      }
      onAddStop({ lat, lng });
    },
  });
  return null;
}

function FitToPoints({ points, trigger }) {
  const map = useMap();
  useEffect(() => {
    if (!trigger || points.length === 0) return;
    map.fitBounds(points.map((p) => [p.lat, p.lng]), {
      paddingTopLeft: [400, 60],     // keeps pins clear of the 360px drawer
      paddingBottomRight: [60, 60],
      maxZoom: 14,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
  return null;
}

function FlyToPoint({ target }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return null;
}

export default function MapView({
  depot,
  stops,
  optimizedOrder,
  routePolyline,
  baselinePolyline,
  onAddStop,
  onOutOfBounds,
  fitTrigger,
  focusTarget,  
}) {
  return (
    <MapContainer
      center={NCR_CENTER}
      zoom={12}
      minZoom={11}
      maxBounds={NCR_BOUNDS}
      maxBoundsViscosity={0.9}
      zoomControl={false}
      style={{ width: "100vw", height: "100vh" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        url={`https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png?key=${CARTO_KEY}`}
      />
      <MapClickHandler onAddStop={onAddStop} onOutOfBounds={onOutOfBounds} />

      <FitToPoints
        points={[...(depot ? [depot] : []), ...stops]}
        trigger={fitTrigger}
      />

      <FlyToPoint target={focusTarget} />

      {baselinePolyline?.length > 1 && (
        <Polyline
          positions={baselinePolyline}
          pathOptions={{ color: "#94A3B8", weight: 2.5, dashArray: "6 6", opacity: 0.8 }}
        />
      )}

      {routePolyline?.length > 1 && (
        <Polyline
          positions={routePolyline}
          pathOptions={{ color: "#2563EB", weight: 4, opacity: 0.92 }}
        />
      )}

      {depot && (
        <Marker position={[depot.lat, depot.lng]} icon={createDepotIcon()}>
          <Popup>
            <strong>Depot:</strong> {depot.name}
          </Popup>
        </Marker>
      )}

      {stops.map((stop, idx) => {
        const orderIndex = optimizedOrder ? optimizedOrder.indexOf(idx + 1) : -1;
        const badgeLabel = orderIndex > 0 ? orderIndex : idx + 1;
        return (
          <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={createStopIcon(badgeLabel)}>
            <Popup>
              <strong>Stop #{badgeLabel}:</strong> {stop.name}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}