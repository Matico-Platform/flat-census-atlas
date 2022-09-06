import * as React from 'react';
import { PMTLayer } from '@maticoapp/deck.gl-pmtiles';
import DeckGL from '@deck.gl/react/typed';
import { useFgbData } from './useFlatgeobufData';
import {WebMercatorViewport} from '@deck.gl/core/typed';
import { number } from 'yargs';

const INITIAL_VIEW_STATE = {
  longitude: -87,
  latitude: 42,
  zoom: 10,
  pitch: 0,
  bearing: 0,
};

const NULL_COLOR = [0, 0, 0, 0];
type color = number[];
type scheme = {
  value: number,
  color: color
}[]
const densityScheme: scheme = [
  {value: 250, color: [255,255,204]},
  {value: 2000, color: [161,218,180]},
  {value: 4000, color: [65,182,196]},
  {value: 8000, color: [44,127,184]},
  {value: 53000, color: [37,52,148]},
]
const populationSchema: scheme = [
  {value: 800, color: [255,255,204]},
  {value: 1100, color: [161,218,180]},
  {value: 1400, color: [65,182,196]},
  {value: 1800, color: [44,127,184]},
  {value: 40000, color: [37,52,148]},
]

const getColorfunc = (scheme: scheme) => {
  return (d: number | string) => {
    const val = Number(d);
    if (d === null || isNaN(val)) {
      return NULL_COLOR
    }
    for (let i = 0; i < scheme.length; i++) {
      if (val < scheme[i].value) {
        return scheme[i].color;
      }
    }
    return NULL_COLOR
  }
}

const getPopDensityColor = getColorfunc(densityScheme)
const getTotalPopulationColor = getColorfunc(populationSchema)

export default function App() {
  const [currView, setCurrView] = React.useState({
    bounds: {
      maxX: 0,
      maxY: 0,
      minX: 0,
      minY: 0,
    },
    zoom: 0,
  })

  const {
    data: cbgData,
    updateHash: cbgDataHash
  } = useFgbData(
    `/cbg_pop.fgb`,
    'dict',
    currView.bounds,
    currView.zoom,
    7,
    22,
    500,
    'GEOID'
  )

  const layers = [
    new PMTLayer({
      id: 'pmtiles-layer',
      data: 'https://matico.s3.us-east-2.amazonaws.com/census/block_groups.pmtiles',
      maxZoom: 22,
      minZoom: 7,
      onClick: (info) => {
        console.log(info);
      },

      // @ts-ignore
      getFillColor: d => getTotalPopulationColor(cbgData?.[d.properties.GEOID]?.TotalPop),
      getLineColor: [20, 20, 20],
      stroked: true,
      filled: true,
      lineWidthMinPixels: 1,
      pickable: true,
      updateTriggers: {
        getFillColor: cbgDataHash,
      }
    }),
  ];

  return (
    <DeckGL
      initialViewState={INITIAL_VIEW_STATE}
      controller={true}
      layers={layers}
      onViewStateChange={({viewState}) => {
        const viewport = new WebMercatorViewport(viewState);
        const nw = viewport.unproject([0, 0]);
        const se = viewport.unproject([viewport.width, viewport.height]);
        setCurrView({
          zoom: viewState.zoom,
          bounds: {
            minX: nw[0],
            minY: se[1],
            maxX: se[0],
            maxY: nw[1],
          }
        })
      }}
    />
  );
}