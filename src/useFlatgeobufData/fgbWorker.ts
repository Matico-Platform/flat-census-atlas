import { expose } from "comlink";
import { geojson as fgb } from "flatgeobuf";
const { deserialize } = fgb;

export class FgbWorker {
  // constructor(){

  // }
  async getFgbData(
    path: string,
    bounds: any,
    dataShape: string,
    idCol?: string,
    maxFeatures?: number
  ): Promise<any> {
    let iter = deserialize(path, bounds);
    let features = [];
    let count = 0;
    // @ts-ignore
    for await (let feature of iter) {
      features.push(feature);
      if (maxFeatures && count >= maxFeatures) {
        break;
      } else {
        count++;
      }
    }
    switch (dataShape) {
      case "props":
        return features.map((f: any) => f.properties);
      case "dict":
        return features.reduce((prev, curr) => {
          prev[curr.properties[idCol as string]] = curr.properties;
          return prev;
        }, {});
      default:
        return {
          type: "FeatureCollection",
          features: features,
        };
    }
  }
}

expose(new FgbWorker());
