import * as React from 'react';
import { PMTLayer } from '@maticoapp/deck.gl-pmtiles';
import DeckGL from '@deck.gl/react/typed';
import { useFgbData } from './useFlatgeobufData';
import {WebMercatorViewport} from '@deck.gl/core/typed';

const INITIAL_VIEW_STATE = {
  longitude: -87,
  latitude: 42,
  zoom: 7,
  pitch: 0,
  bearing: 0,
};

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
    9,
    22,
    500,
    'GEOID'
  )
  console.log(cbgData)

  const layers = [
    new PMTLayer({
      id: 'pmtiles-layer',
      data: 'https://matico.s3.us-east-2.amazonaws.com/census/block_groups.pmtiles',
      maxZoom: 22,
      minZoom: 4,
      onClick: (info) => {
        console.log(info);
      },

      // @ts-ignore
      getFillColor: [255, 120, 120],
      getLineColor: [20, 20, 20],
      stroked: true,
      filled: true,
      lineWidthMinPixels: 1,
      pickable: true,
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