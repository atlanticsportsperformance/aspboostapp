import fs from "fs";
import path from "path";
import { parse } from "csv-parse";

type NumericSummary = {
  count: number;
  values: number[];
};

type Percentiles = Record<string, Record<string, number>>;

function isNumericLike(value: string | null | undefined): boolean {
  if (value == null) return false;
  const trimmed = value.trim();
  if (trimmed === "") return false;
  const num = Number(trimmed);
  return Number.isFinite(num);
}

function computeQuantile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return NaN;
  if (p <= 0) return sortedValues[0];
  if (p >= 1) return sortedValues[sortedValues.length - 1];
  const position = (sortedValues.length - 1) * p;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const weightUpper = position - lowerIndex;
  if (upperIndex === lowerIndex) return sortedValues[lowerIndex];
  return (
    sortedValues[lowerIndex] * (1 - weightUpper) +
    sortedValues[upperIndex] * weightUpper
  );
}

async function main() {
  const inputCsv = path.resolve(process.cwd(), "public", "hp_obp.csv");
  const outputJson = path.resolve(
    process.cwd(),
    "public",
    "hp_obp_percentiles.json"
  );

  if (!fs.existsSync(inputCsv)) {
    console.error(`Input CSV not found at ${inputCsv}`);
    process.exit(1);
  }

  const parser = fs
    .createReadStream(inputCsv)
    .pipe(
      parse({
        columns: true,
        relax_column_count: true,
        skip_empty_lines: true,
        trim: true,
      })
    );

  const numericColumns: Record<string, NumericSummary> = {};
  let headerInitialized = false;
  let headerColumns: string[] = [];

  for await (const record of parser) {
    if (!headerInitialized) {
      headerColumns = Object.keys(record);
      headerInitialized = true;
    }

    for (const column of headerColumns) {
      const raw = (record as Record<string, string | undefined>)[column];

      if (!numericColumns[column]) {
        numericColumns[column] = { count: 0, values: [] };
      }

      if (isNumericLike(raw)) {
        numericColumns[column].values.push(Number(String(raw).trim()));
        numericColumns[column].count += 1;
      }
    }
  }

  const percentilesToCompute = [
    0.01, 0.05, 0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9,
    0.95, 0.99,
  ];

  const output: Percentiles = {};

  for (const [column, summary] of Object.entries(numericColumns)) {
    // Skip obviously non-numeric columns
    if (summary.count === 0) continue;

    const sorted = summary.values.slice().sort((a, b) => a - b);
    const series: Record<string, number> = {};
    for (const p of percentilesToCompute) {
      const value = computeQuantile(sorted, p);
      series[Math.round(p * 100).toString()] = Number.isFinite(value)
        ? Number(value.toFixed(4))
        : NaN;
    }
    // Always include min/max/mean for context
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mean = sorted.reduce((acc, v) => acc + v, 0) / sorted.length;
    series.min = Number(min.toFixed(4)) as unknown as number;
    series.max = Number(max.toFixed(4)) as unknown as number;
    series.mean = Number(mean.toFixed(4)) as unknown as number;

    output[column] = series;
  }

  fs.writeFileSync(outputJson, JSON.stringify(output, null, 2));
  console.log(`Wrote percentiles to ${outputJson}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


