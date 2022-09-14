class AnalyticsWorkerClass {
  constructor() {}
  async calculateMedian(data: any, tableData: any) {
    const allIds = new Set(data.map((d: any) => d.GEOID));

    const inViewValues = tableData
      ?.filter((f: any) => allIds.has(f.GEOID))
      .map((m: any) => +m.PerCapitaIncome)
      .sort();

    const medianValue = inViewValues?.length
      ? inViewValues[Math.floor(inViewValues.length / 2)]
      : null;

    return {
      medianValue,
      count: inViewValues.length,
    };
  }
}

export const AnalyticWorker = new AnalyticsWorkerClass();
