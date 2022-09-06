import React, { useEffect, useMemo, useRef } from "react";
import { FeatureCollection, GeoJsonProperties } from "geojson";
import { Remote, wrap } from "comlink";
import { FgbWorker } from "./fgbWorker";

// const FgbWorker: Remote<{
//   getFgbData: (
//     url: string,
//     bounds: {maxX: number, maxY: number, minX: number, minY: number},
//     dataShape: string,
//     idCol?: string,
//     maxFeatures?: number
//   ) => Promise<any>;
// }> = wrap(new Worker(new URL("./fgbWorker", import.meta.url)));

const FgbProcessor: {
  getFgbData: (
    url: string,
    bounds: {maxX: number, maxY: number, minX: number, minY: number},
    dataShape: string,
    idCol?: string,
    maxFeatures?: number
  ) => Promise<any>;
} = new FgbWorker()

type DataShapes = "geojson" | "props" | "dict";
type DataOutputs<T> = T extends "geojson"
  ? FeatureCollection
  : T extends "props"
  ? GeoJsonProperties[]
  : T extends "dict"
  ? { [key: string]: any }[]
  : never;

const DefaultData = {
  geojson: { type: "FeatureCollection", features: [] } as FeatureCollection,
  props: [] as GeoJsonProperties[],
  dict: [] as { [key: string]: any }[],
};

export function useFgbData<T extends DataShapes>(
  url: string,
  dataShape: T,
  bounds: {maxX: number, maxY: number, minX: number, minY: number},
  currZoom: number = 0,
  minZoom: number = 6,
  maxZoom: number = 22,
  debounceTime: number = 500,
  idCol?: string,
  maxFeatures?: number
): { data: DataOutputs<T>; updateHash: string } {
  const [debounce, setDebounce] = React.useState<null | NodeJS.Timeout>(null);
  const [data, setData] = React.useState<DataOutputs<T>>(
    DefaultData[dataShape] as DataOutputs<T>
  );
  const [updateHash, setUpdateHash] = React.useState<string>("");
  useEffect(() => {
    debounce && clearTimeout(debounce);
    if (currZoom >= minZoom && currZoom <= maxZoom) {
      setDebounce(
        setTimeout(() => {
          fetchFgbData(
            url,
            dataShape,
            bounds,
            setData,
            idCol,
            maxFeatures
          ).then(() => {
            setUpdateHash(JSON.stringify({bounds, currZoom}));
          });
        }, debounceTime)
      );
    }

    return () => {
      if (debounce && typeof window !== "undefined") {
        clearTimeout(debounce);
      }
    };
  }, [url, dataShape, JSON.stringify(bounds), minZoom, maxZoom, maxFeatures]);

  return {
    data,
    updateHash,
  };
}

async function fetchFgbData<T extends DataShapes>(
  url: string,
  dataShape: T = "props" as T,
  bounds: {maxX: number, maxY: number, minX: number, minY: number},
  callback: (data: DataOutputs<T>) => void,
  idCol?: string,
  maxFeatures?: number
): Promise<void> {
  const data = await FgbProcessor.getFgbData(
    url,
    bounds,
    dataShape,
    idCol,
    maxFeatures
  );
  return callback(data);
}
