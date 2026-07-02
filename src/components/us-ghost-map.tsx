"use client";

import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

type Company = {
  name: string;
  coordinates: [number, number]; // [경도, 위도]
  anchor?: "start" | "end";
  dy?: number;
};

const COMPANIES: Company[] = [
  { name: "Amazon", coordinates: [-122.3321, 47.6062], anchor: "start", dy: -8 },
  { name: "Microsoft", coordinates: [-122.1215, 47.6739], anchor: "start", dy: 8 },
  { name: "Nvidia", coordinates: [-121.9552, 37.371], anchor: "end", dy: -14 },
  { name: "Apple", coordinates: [-122.0322, 37.3318], anchor: "end", dy: 2 },
  { name: "Meta", coordinates: [-122.1478, 37.4848], anchor: "end", dy: 18 },
  { name: "Alphabet", coordinates: [-122.084, 37.422], anchor: "end", dy: 34 },
  { name: "Chevron", coordinates: [-121.9, 37.9], anchor: "end", dy: -30 },
  { name: "Nike", coordinates: [-122.84, 45.52], anchor: "start" },
  { name: "Boeing", coordinates: [-111.891, 40.7608], anchor: "start", dy: -6 },
  { name: "Tesla", coordinates: [-97.6205, 30.222], anchor: "start" },
  { name: "ExxonMobil", coordinates: [-95.3698, 29.7604], anchor: "start", dy: 14 },
  { name: "Walmart", coordinates: [-94.2088, 36.3729], anchor: "start" },
  { name: "3M", coordinates: [-93.09, 44.95], anchor: "start" },
  { name: "McDonald's", coordinates: [-87.6298, 41.8781], anchor: "start" },
  { name: "Ford", coordinates: [-83.2, 42.32], anchor: "end", dy: -6 },
  { name: "Coca-Cola", coordinates: [-84.388, 33.749], anchor: "start" },
  { name: "Disney", coordinates: [-81.38, 28.54], anchor: "start" },
  { name: "JPMorgan", coordinates: [-74.006, 40.7128], anchor: "start", dy: -6 },
  { name: "Goldman Sachs", coordinates: [-74.014, 40.714], anchor: "start", dy: 12 },
  { name: "IBM", coordinates: [-73.76, 41.11], anchor: "start", dy: -2 },
];

export function UsGhostMap({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{ scale: 1000 }}
        width={980}
        height={560}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="rgba(255,255,255,0.06)"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth={0.9}
                style={{
                  default: { outline: "none" },
                  hover: { outline: "none" },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        {COMPANIES.map((company) => {
          const end = company.anchor === "end";
          return (
            <Marker key={company.name} coordinates={company.coordinates}>
              <circle r={3.4} fill="rgba(255,255,255,1)" />
              <circle r={8} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1} />
              <text
                x={end ? -11 : 11}
                y={3 + (company.dy ?? 0)}
                textAnchor={end ? "end" : "start"}
                style={{ fontFamily: "inherit", fontSize: 11.5, fill: "#ffffff", fontWeight: 700 }}
              >
                {company.name}
              </text>
            </Marker>
          );
        })}
      </ComposableMap>
    </div>
  );
}
