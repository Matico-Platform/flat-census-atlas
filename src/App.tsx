import React, { useState, useMemo } from "react";
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
import { PMTLayer, PMTLoader, useJoinLoader, useJoinData } from "@maticoapp/deck.gl-pmtiles";

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
  { value: 652420, color: '#fde725' }
]

const getColorFunc = (breaks: { value: number, color: string }[], format = "rgbArray") => {
  const normalizedBreaks = breaks.map(({ value, color }) => {
    const normalizedColor = parseColor(color).toFormat('rgb')
    return {
      value: value,
      // @ts-ignore
      color: [normalizedColor.red, normalizedColor.green, normalizedColor.blue]
    }
  })

  return (value: number) => {
    // @ts-ignore
    if ([undefined, null].includes(value)) return [20, 20, 20]
    for (let i = 0; i < normalizedBreaks.length; i++) {
      if (value < normalizedBreaks[i].value) {
        return normalizedBreaks[i].color
      }
    }
    return normalizedBreaks.at(-1)?.color
  }
}

const incomeScale = getColorFunc(incomeBreaks)

export default function App() {
  const [dataSource, setDataSource] = useState<string>(
    "https://matico.s3.us-east-2.amazonaws.com/census/block_groups.pmtiles"
  );
  const [zoomRange, setZoomRange] = useState<{ start: number; end: number }>({
    start: 0,
    end: 10,
  });
  const {
    isLoading,
    error,
    data: tableData,
  } = useQuery(["tableData"], () => load("/percapita_income.csv", CSVLoader, { csv: { header: true, dynamicTyping: false } }));

  // let [fill, setFill] = useState(parseColor("hsl(162, 74%, 71%)"));
  // let [, fillHue, fillLightness] = fill.getColorChannels();
  // let [border, setBorder] = useState(parseColor("hsl(0, 0%, 19%)"));
  // let [, borderHue, borderLightness] = border.getColorChannels();

  // const joinCbgLoader = useJoinLoader({
  //   loader: PMTLoader,
  //   shape: "binary",
  //   leftId: "GEOID",
  //   rightId: "GEOID",
  //   tableData,
  //   updateTriggers: [isLoading]
  // })

  const cbgJoiner = useJoinData({
    shape: "binary",
    leftId: "GEOID",
    rightId: "GEOID",
    tableData,
    updateTriggers: [isLoading]
  })


  if (isLoading) {
    return (
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }}>
        <p>loading...</p>
      </div>
    )
  }
  // console.log(navigator.hardwareConcurrency)
  const layers = [
    // new TileLayer({
    //   data: "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
    //   minZoom: 0,
    //   maxZoom: 19,
    //   tileSize: 256,
    //   renderSubLayers: (props) => {
    //     console.log(props)
    //     const {
    //       // @ts-ignore
    //       bbox: { west, south, east, north },
    //     } = props.tile;

    //     return new BitmapLayer(props, {
    //       data: null,
    //       image: props.data,
    //       bounds: [west, south, east, north],
    //     });
    //   },
    // }),

    new PMTLayer({
      id: "pmtiles-layer",
      data: dataSource,
      // raster: true,
      // @ts-ignore
      onClick: (info) => {
        console.log(info);
      },
      // loadOptions: {
      //   pmt: {
      // worker: false,
      // workerUrl: 'https://unpkg.com/@maticoapp/deck.gl-pmtiles@latest/dist/pmt-worker.js',
      // maxConcurrency: typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency-1) : 3,
      // maxMobileConcurrency: typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency-1) : 1,
      //   }
      // },
      // loaders: [joinCbgLoader],
      maxZoom: zoomRange.end,
      minZoom: zoomRange.start,
      // @ts-ignore
      getFillColor: d => incomeScale(d.properties?.["PerCapitaIncome"]),
      stroked: false,
      lineWidthMinPixels: 1,
      pickable: true,
      tileSize: 256,
      // @ts-ignore
      renderSubLayers: (props) => {
        if (props?.data) {
          return new GeoJsonLayer({
            ...props,
            // @ts-ignore
            data: cbgJoiner(props.data)
          })
        } else {
          return null
        }
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
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        padding: '0 1em 1em 1em',
        background: 'black',
        color: 'lightgray',
        textAlign: 'left',
        maxWidth: '25ch'
      }}>
        <p style={{fontSize:'1rem'}}>
          <b>Census Block Groups</b>
          <br/>
          Per Capita Income
          <br/>
          2019 ACS
        </p>
        {Object.entries(incomeBreaks).map(([key, { value, color }], i) => (
          <div key={key} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: "1em", height: "1em", background: color }}></div>
            <p style={{ marginLeft: "0.5em", lineHeight: 0 }}>{i === 0 ? `<${value.toLocaleString('en')}` : `${Object.entries(incomeBreaks)[i - 1][1].value.toLocaleString('en')} - ${value.toLocaleString('en')}`}</p>
          </div>
        ))}
        <p>Data architecture - single file PMtiles and CSV data joined</p>
      </div>
    </div>
  );
}
