/**
 * TypeScript interfaces for the names dataset.
 */

export interface YearlyCount {
  year: number;
  count: number;
}

export interface NameData {
  name: string;
  girlsTotal: number;
  boysTotal: number;
  girlsYearly?: YearlyCount[];
  boysYearly?: YearlyCount[];
}

export interface NameDataComputed extends NameData {
  totalCount: number;
  // -1.0 to +1.0
  genderScore: number;
}

export interface Ranks {
  overall: number;
  girls: number;
  boys: number;
}

export interface NameWithRank {
  name: NameDataComputed;
  ranks: Ranks;
}

export interface NamesDataset {
  metadata: {
    startYear: number;
    endYear: number;
    totalNames: number;
    generatedAt: string;
  };
  names: Record<string, NameData>;
}

export interface NamesYearlyDataset {
  metadata: {
    startYear: number;
    endYear: number;
    totalNames: number;
    generatedAt: string;
  };
  data: Record<
    string,
    {
      girls: Record<number, number>;
      boys: Record<number, number>;
    }
  >;
}

export interface NamesYearlyRanksDataset {
  metadata: {
    startYear: number;
    endYear: number;
    totalNames: number;
    generatedAt: string;
  };
  data: Record<string, Record<number, number>>;
}
