import React, { useState, useMemo, useRef } from "react";
import "./App.css";
import DeckGL from "@deck.gl/react/typed";
import { BitmapLayer, GeoJsonLayer } from "@deck.gl/layers/typed";
import { TileLayer } from "@deck.gl/geo-layers/typed";
// @ts-ignore
import { ColorArea, ColorWheel } from "@react-spectrum/color";
import { parseColor } from "@react-stately/color";
import { useQuery } from "@tanstack/react-query";
import { CSVLoader } from "@loaders.gl/csv";
import { load } from "@loaders.gl/core";
import {
  PMTLayer,
  PMTLoader,
  useJoinLoader,
  useJoinData,
} from "@maticoapp/deck.gl-pmtiles";
import CountUp from "react-countup";

// @ts-ignore
const {AnalyticWorker} = new ComlinkWorker<typeof import('./analyticsWorker.ts')>(new URL('./analyticsWorker.ts', import.meta.url));

const INITIAL_VIEW_STATE = {
  longitude: -90,
  latitude: 42,
  zoom: 10,
  pitch: 0,
  bearing: 0,
};
const incomeBreaks = [
  { value: 19624, color: "#440154" },
  { value: 26061, color: "#414487" },
  { value: 32860, color: "#2a788e" },
  { value: 43794, color: "#22a884" },
  { value: 652420, color: "#fde725" },
];

const getColorFunc = (
  breaks: { value: number; color: string }[],
  format = "rgbArray"
) => {
  const normalizedBreaks = breaks.map(({ value, color }) => {
    const normalizedColor = parseColor(color).toFormat("rgb");
    return {
      value: value,
      // @ts-ignore
      color: [normalizedColor.red, normalizedColor.green, normalizedColor.blue],
    };
  });

  return (value: number) => {
    // @ts-ignore
    if ([undefined, null].includes(value)) return [20, 20, 20];
    for (let i = 0; i < normalizedBreaks.length; i++) {
      if (value < normalizedBreaks[i].value) {
        return normalizedBreaks[i].color;
      }
    }
    return normalizedBreaks.at(-1)?.color;
  };
};

const incomeScale = getColorFunc(incomeBreaks);

export default function App() {
  const [dataSource, setDataSource] = useState<string>(
    "https://matico.s3.us-east-2.amazonaws.com/census/block_groups.pmtiles"
  );
  const tileMap = useRef<{ [key: string]: any }>({});
  const [medianValue, setMedianValue] = useState<number | null>(null);
  const [countInView, setCountInView] = useState<number | null>(null);

  const [zoomRange, setZoomRange] = useState<{ start: number; end: number }>({
    start: 0,
    end: 10,
  });
  const {
    isLoading,
    error,
    data: tableData,
  } = useQuery(["tableData"], () =>
    load("/percapita_income.csv", CSVLoader, {
      csv: { header: true, dynamicTyping: false },
    })
  );

  const cbgJoiner = useJoinData({
    shape: "binary",
    leftId: "GEOID",
    rightId: "GEOID",
    tableData,
    updateTriggers: [isLoading],
  });

  if (isLoading) {
    return (
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <p>loading...</p>
      </div>
    );
  }
  const layers = [
    new PMTLayer({
      id: "pmtiles-layer",
      data: dataSource,
      onClick: (info) => {
        console.log(info);
      },
      // @ts-ignore
      getFillColor: (d) => incomeScale(d.properties?.["PerCapitaIncome"]),
      stroked: false,
      lineWidthMinPixels: 1,
      pickable: true,
      tileSize: 256,
      maxZoom: 30,
      // @ts-ignore
      renderSubLayers: (props) => {
        if (props?.data) {
          // @ts-ignore
          const data = cbgJoiner(props.data);
          return new GeoJsonLayer({
            ...props,
            //@ts-ignore
            data,
          });
        } else {
          return null;
        }
      },
      onViewportLoad: (tiles) => {
        const data = tiles.map((tile) => {
          const  data= Object.values(tile?.content || {});
          return data.map((d) => d?.properties?.length ? d.properties : [])
        }).flat(2)
        AnalyticWorker.calculateMedian(data, tableData).then((r: any) => {
          setMedianValue(r.medianValue);
          setCountInView(r.count);
        })
      },
    }),
  ];

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <DeckGL
        // @ts-ignore
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          padding: "0 1em 1em 1em",
          background: "black",
          color: "lightgray",
          textAlign: "left",
          maxWidth: "25ch",
        }}
      >
        <p style={{ fontSize: "1rem" }}>
          <b>Census Block Groups</b>
          <br />
          Per Capita Income
          <br />
          2019 ACS
        </p>
        {Object.entries(incomeBreaks).map(([key, { value, color }], i) => (
          <div key={key} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{ width: "1em", height: "1em", background: color }}
            ></div>
            <p style={{ marginLeft: "0.5em", lineHeight: 0 }}>
              {i === 0
                ? `<${value.toLocaleString("en")}`
                : `${Object.entries(incomeBreaks)[
                    i - 1
                  ][1].value.toLocaleString("en")} - ${value.toLocaleString(
                    "en"
                  )}`}
            </p>
          </div>
        ))}
        {medianValue !== null && (
          <CountUp
            end={medianValue}
            duration={0.5}
            separator=","
            decimal=","
            prefix="$"
            preserveValue={true}
          >
            {({ countUpRef }) => (
              <div>
                <p>
                  Median value on view: <span ref={countUpRef} />
                </p>
              </div>
            )}
          </CountUp>
        )}
        {countInView !== null && (
          <CountUp
            end={countInView}
            duration={0.5}
            separator=","
            decimal=","
            preserveValue={true}
          >
            {({ countUpRef }) => (
              <div>
                <p>
                  Block groups in view: <span ref={countUpRef} />
                </p>
              </div>
            )}
          </CountUp>
        )}
        <p>Data architecture - single file PMtiles and CSV data joined</p>
      </div>
    </div>
  );
}
