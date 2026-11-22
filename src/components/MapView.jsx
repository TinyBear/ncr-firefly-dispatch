import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, useMapEvents } from "react-leaflet";
import { NCR_CENTER, NCR_BOUNDS, isWithinMetroManila } from "../utils/geofence";

const CARTO_KEY = import.meta.env.VITE_CARTO_KEY;

function createDepotIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="fd-pin" style="width:38px;height:38px;background:#1C1C1C;color:#FFF;border:3px solid #FFF;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-9h6v9"/></svg></div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

function createStopIcon(sequenceNumber, optimized = false) {
  const style = optimized
    ? "background:#00B14F;color:#FFF;border:3px solid #FFF;"
    : "background:#FFF;color:#007F37;border:2.5px solid #00B14F;";
  return L.divIcon({
    className: "",
    html: `<div class="fd-pin" style="${style}width:30px;height:30px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;box-shadow:0 3px 10px rgba(0,0,0,0.25);">${sequenceNumber}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
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
          pathOptions={{ color: "#7A8582", weight: 3, dashArray: "2 8", lineCap: "round", opacity: 0.9 }}
        />
      )}

      {routePolyline?.length > 1 && (
        <>
          {/* White casing keeps the route legible over busy street labels */}
          <Polyline positions={routePolyline} pathOptions={{ color: "#FFFFFF", weight: 9, opacity: 0.95, lineJoin: "round" }} />
          <Polyline positions={routePolyline} pathOptions={{ color: "#00B14F", weight: 5, opacity: 1, lineJoin: "round" }} />
        </>
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
          <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={createStopIcon(badgeLabel, orderIndex > 0)}>
            <Popup>
              <strong>Stop #{badgeLabel}:</strong> {stop.name}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}