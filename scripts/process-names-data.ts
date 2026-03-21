/**
 * Reads ONS XLSX file (1996-2024) and produces:
 * - names-aggregate.json: aggregate totals for all names
 * - yearly/{letter}.json: per-letter yearly breakdowns
 * - yearly-ranks/{letter}.json: per-letter yearly rankings
 */
import fs from "fs/promises";
import path from "path";

import XLSX from "xlsx";

interface NameRecord {
  name: string;
  girlsTotal: number;
  boysTotal: number;
}

type YearlyRecord = Record<
  string,
  {
    girls: Record<number, number>;
    boys: Record<number, number>;
  }
>;

function parseCount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const str = value.trim();
  if (str === "[x]" || str === "S") return null;
  const num = parseFloat(str.replaceAll('"', "").replaceAll(",", ""));
  return Number.isNaN(num) ? null : num;
}

function extractYearIndices(
  headerRow: unknown[],
): { index: number; year: number }[] {
  const yearIndices: { index: number; year: number }[] = [];

  for (let i = 0; i < headerRow.length; i++) {
    const cell = headerRow[i];
    if (typeof cell === "string" && cell.includes("Count")) {
      const yearMatch = cell.match(/(\d{4})\s+Count/);
      if (yearMatch) {
        yearIndices.push({ index: i, year: parseInt(yearMatch[1], 10) });
      }
    }
  }

  yearIndices.sort((a, b) => a.year - b.year);
  return yearIndices;
}

function readSheetRows(
  workbook: XLSX.WorkBook,
  sheetName: string,
): unknown[][] {
  const sheet = workbook.Sheets[sheetName] as XLSX.WorkSheet | undefined;
  if (sheet === undefined) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }

  return XLSX.utils.sheet_to_json(sheet, { header: 1, range: 4 });
}

function processRows(
  rows: unknown[][],
  gender: "boys" | "girls",
): { aggregate: Map<string, number>; yearly: YearlyRecord } {
  const headerRow = rows[0];
  const yearIndices = extractYearIndices(headerRow);
  const aggregate = new Map<string, number>();
  const yearly: YearlyRecord = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length === 0) continue;
    const rawName = row[0];
    if (typeof rawName !== "string" && typeof rawName !== "number") continue;
    const name = String(rawName).trim();
    if (!name || name.startsWith("[note")) continue;

    const nameLower = name.toLowerCase();
    if (!(nameLower in yearly)) yearly[nameLower] = { girls: {}, boys: {} };

    let totalCount = 0;
    for (const { index, year } of yearIndices) {
      const count = parseCount(row[index]);
      if (count !== null) {
        totalCount += count;
        yearly[nameLower][gender][year] = count;
      }
    }

    if (totalCount > 0) {
      aggregate.set(nameLower, (aggregate.get(nameLower) ?? 0) + totalCount);
    }
  }

  return { aggregate, yearly };
}

function mergeData(
  girlsAggregate: Map<string, number>,
  boysAggregate: Map<string, number>,
  girlsYearly: YearlyRecord,
  boysYearly: YearlyRecord,
): {
  aggregateData: Record<string, NameRecord>;
  yearlyData: Record<string, Record<string, Record<number, number>>>;
  sortedNames: string[];
} {
  const allNames = new Set([...girlsAggregate.keys(), ...boysAggregate.keys()]);
  const aggregateData: Record<string, NameRecord> = {};
  const yearlyData: Record<string, Record<string, Record<number, number>>> = {};

  for (const nameLower of allNames) {
    const displayName = nameLower.charAt(0).toUpperCase() + nameLower.slice(1);
    aggregateData[displayName] = {
      girlsTotal: girlsAggregate.get(nameLower) ?? 0,
      boysTotal: boysAggregate.get(nameLower) ?? 0,
      name: displayName,
    };

    const boysRecord = boysYearly[nameLower];
    const girlsRecord = girlsYearly[nameLower];
    yearlyData[displayName] = {
      girls: girlsRecord?.girls ?? {},
      boys: boysRecord?.boys ?? {},
    };
  }

  const sortedNames = [...allNames]
    .map((nameLower) => nameLower.charAt(0).toUpperCase() + nameLower.slice(1))
    .sort((a, b) => a.localeCompare(b));

  return { aggregateData, yearlyData, sortedNames };
}

function computeYearlyRanks(
  yearlyData: Record<string, Record<string, Record<number, number>>>,
  sortedNames: string[],
): Record<string, Record<number, number>> {
  const allYears = new Set<number>();
  for (const name of sortedNames) {
    const data = yearlyData[name];
    for (const year of Object.keys(data.girls))
      allYears.add(parseInt(year, 10));
    for (const year of Object.keys(data.boys)) allYears.add(parseInt(year, 10));
  }

  const yearlyRanks: Record<string, Record<number, number>> = {};
  for (const year of allYears) {
    const counts: [string, number][] = [];
    for (const name of sortedNames) {
      const data = yearlyData[name];
      const total = (data.girls[year] ?? 0) + (data.boys[year] ?? 0);
      if (total > 0) counts.push([name, total]);
    }
    counts.sort((a, b) => b[1] - a[1]);
    for (let i = 0; i < counts.length; i++) {
      const name = counts[i][0];
      if (!(name in yearlyRanks)) yearlyRanks[name] = {};
      yearlyRanks[name][year] = i + 1;
    }
  }
  return yearlyRanks;
}

async function writeJsonFile(
  filePath: string,
  data: Record<string, unknown>,
): Promise<number> {
  const json = JSON.stringify(data, undefined, 2);
  await fs.writeFile(filePath, json);
  return json.length;
}

function groupByLetter<T>(
  data: Record<string, T>,
  names: string[],
): Map<string, Record<string, T>> {
  const groups = new Map<string, Record<string, T>>();
  for (const name of names) {
    const first = name.charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(first) ? first.toLowerCase() : "_";
    let group = groups.get(letter);
    if (!group) {
      group = {};
      groups.set(letter, group);
    }
    group[name] = data[name];
  }
  return groups;
}

async function writePerLetterFiles(
  dir: string,
  data: Record<string, unknown>,
  names: string[],
  metadata: Record<string, unknown>,
): Promise<number> {
  await fs.mkdir(dir, { recursive: true });
  const groups = groupByLetter(data, names);

  const sizes = await Promise.all(
    [...groups.entries()].map(([letter, group]) =>
      writeJsonFile(path.join(dir, `${letter}.json`), {
        data: group,
        metadata,
      }),
    ),
  );
  const totalSize = sizes.reduce((sum, s) => sum + s, 0);

  // Write an index file listing available letters
  const letters = [...groups.keys()].sort();
  await fs.writeFile(path.join(dir, "index.json"), JSON.stringify(letters));

  return totalSize;
}

async function writeOutputFiles(
  outputDir: string,
  aggregateData: Record<string, NameRecord>,
  yearlyData: Record<string, Record<string, Record<number, number>>>,
  sortedNames: string[],
): Promise<void> {
  const metadata = {
    endYear: 2024,
    generatedAt: new Date().toISOString(),
    startYear: 1996,
    totalNames: sortedNames.length,
  };

  const aggregateSize = await writeJsonFile(
    path.join(outputDir, "names-aggregate.json"),
    {
      metadata,
      names: Object.fromEntries(
        sortedNames.map((name: string) => [name, aggregateData[name]]),
      ),
    },
  );

  const yearlySize = await writePerLetterFiles(
    path.join(outputDir, "yearly"),
    yearlyData,
    sortedNames,
    metadata,
  );

  const yearlyRanksSize = await writePerLetterFiles(
    path.join(outputDir, "yearly-ranks"),
    computeYearlyRanks(yearlyData, sortedNames),
    sortedNames,
    metadata,
  );

  console.log(
    `Done: aggregate ${(aggregateSize / 1024).toFixed(0)} KB, ` +
      `yearly ${(yearlySize / 1024 / 1024).toFixed(1)} MB, ` +
      `ranks ${(yearlyRanksSize / 1024 / 1024).toFixed(1)} MB`,
  );
}

async function processData(): Promise<void> {
  const xlsxPath = path.join(process.cwd(), "data", "babynames1996to2024.xlsx");
  const outputDir = path.join(process.cwd(), "public", "data");

  console.log(`Reading ${xlsxPath}...`);
  const workbook = XLSX.readFile(xlsxPath);

  const { aggregate: girlsAggregate, yearly: girlsYearly } = processRows(
    readSheetRows(workbook, "Table_1"),
    "girls",
  );
  const { aggregate: boysAggregate, yearly: boysYearly } = processRows(
    readSheetRows(workbook, "Table_2"),
    "boys",
  );

  const { aggregateData, yearlyData, sortedNames } = mergeData(
    girlsAggregate,
    boysAggregate,
    girlsYearly,
    boysYearly,
  );

  await fs.mkdir(outputDir, { recursive: true });
  await writeOutputFiles(outputDir, aggregateData, yearlyData, sortedNames);
}

processData().catch((error) => {
  console.error("Error processing data:", error);
  process.exit(1);
});
