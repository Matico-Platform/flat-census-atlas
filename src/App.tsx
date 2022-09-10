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
import { PMTLayer, PMTLoader, useJoinLoader } from "@maticoapp/deck.gl-pmtiles";

const INITIAL_VIEW_STATE = {
  longitude: -90,
  latitude: 42,
  zoom: 10,
  pitch: 0,
  bearing: 0,
};
const incomeBreaks = [
  {value: 19624, color:"#440154"},
  {value: 26061, color:"#414487"},
  {value: 32860, color:"#2a788e"},
  {value: 43794, color:"#22a884"},
  {value: 652420, color:'#fde725'}
]

const getColorFunc = (breaks: {value:number, color:string}[], format = "rgbArray") => {
  const normalizedBreaks = breaks.map(({value, color}) => {
    const normalizedColor = parseColor(color).toFormat('rgb')
    return {
    value: value,
    // @ts-ignore
    color: [normalizedColor.red, normalizedColor.green, normalizedColor.blue]
  }})

  return (value: number) => {
    // @ts-ignore
    if ([undefined,null].includes(value)) return [20,20,20]
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
  } = useQuery(["tableData"], () => load("/percapita_income.csv", CSVLoader, {csv: {header:true, dynamicTyping: false}}));

  let [fill, setFill] = useState(parseColor("hsl(162, 74%, 71%)"));
  let [, fillHue, fillLightness] = fill.getColorChannels();
  let [border, setBorder] = useState(parseColor("hsl(0, 0%, 19%)"));
  let [, borderHue, borderLightness] = border.getColorChannels();

  const joinCbgLoader = useJoinLoader({
    loader: PMTLoader,
    shape: "binary",
    leftId: "GEOID",
    rightId: "GEOID",
    tableData,
    updateTriggers: [isLoading]
  })

  if (isLoading) {
    return (
      <div style={{position:"absolute", 
        top:"50%",
        left:"50%",
        transform:"translate(-50%, -50%)",
      }}>
        <p>loading...</p>
      </div>
    )
  }

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
      onClick: (info) => {
        console.log(info);
      },
      maxZoom: zoomRange.end,
      minZoom: zoomRange.start,
      // @ts-ignore
      getFillColor: d => incomeScale(d.properties?.["PerCapitaIncome"]),
      stroked: false,
      lineWidthMinPixels: 1,
      pickable: true,
      tileSize: 256,
      loaders: [joinCbgLoader],
      // renderSubLayers: (props) => {
      //   console.log(props)
      //   const {
      //     // @ts-ignore
      //     bbox: { west, south, east, north },
      //   } = props.tile;

      //   return new BitmapLayer(props, {
      //     data: null,
      //     image: props.data,
      //     bounds: [west, south, east, north],
      //     extensions: []
      //   });
      // },
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
    </div>
  );
}
