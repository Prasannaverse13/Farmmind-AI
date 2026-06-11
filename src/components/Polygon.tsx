import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";

interface PolygonProps {
  paths: { lat: number; lng: number }[];
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  fillColor?: string;
  fillOpacity?: number;
  onClick?: (e: any) => void;
  key?: string;
}

export default function Polygon({
  paths,
  strokeColor = "#3E7250",
  strokeOpacity = 0.8,
  strokeWeight = 3,
  fillColor = "#3E7250",
  fillOpacity = 0.35,
  onClick,
}: PolygonProps) {
  const map = useMap();
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  useEffect(() => {
    if (!map) return;

    const poly = new google.maps.Polygon({
      paths,
      strokeColor,
      strokeOpacity,
      strokeWeight,
      fillColor,
      fillOpacity,
    });

    poly.setMap(map);
    polygonRef.current = poly;

    if (onClick) {
      const listener = poly.addListener("click", onClick);
      return () => {
        listener.remove();
      };
    }

    return () => {
      poly.setMap(null);
    };
  }, [map, paths, strokeColor, strokeOpacity, strokeWeight, fillColor, fillOpacity]);

  return null;
}
