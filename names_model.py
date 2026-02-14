"""Data model for baby names dataset."""

from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd


def parse_count(value: str) -> float | None:
    """Parse a count value, handling special cases."""
    if pd.isna(value):
        return None
    value = str(value).strip()
    if value in ("[x]", "S", ""):
        return None
    # Remove quotes and commas from numbers like "3,451"
    value = value.replace('"', "").replace(",", "")
    try:
        return float(value)
    except ValueError:
        return None


@dataclass
class YearlyCount:
    """Single year's count for a name."""

    year: int
    count: float


@dataclass
class NameData:
    """All data for a single name (boys and girls combined)."""

    name: str
    boys_total: float
    girls_total: float
    boys_yearly: list[YearlyCount] | None = None
    girls_yearly: list[YearlyCount] | None = None

    @property
    def total_count(self) -> float:
        """Total count across boys and girls."""
        return self.boys_total + self.girls_total

    @property
    def gender_score(self) -> float:
        """Gender score: -1 (masculine) to +1 (feminine)."""
        if self.total_count == 0:
            return 0.0
        return (self.girls_total - self.boys_total) / self.total_count

    @property
    def has_yearly_data(self) -> bool:
        """Check if yearly data is loaded."""
        return self.boys_yearly is not None or self.girls_yearly is not None


@dataclass
class Ranks:
    """Computed popularity rankings for a name."""

    overall: int
    boys: int
    girls: int


class NamesDataset:
    """Complete dataset of baby names with lazy loading."""

    def __init__(self) -> None:
        self._names: dict[str, NameData] = {}
        self._yearly_loaded: bool = False
        self._ranks_cache: dict[str, Ranks] | None = None

    @classmethod
    def load(cls, boys_file: Path, girls_file: Path) -> "NamesDataset":
        """Load aggregated data from CSV files.

        Args:
            boys_file: Path to boys names CSV
            girls_file: Path to girls names CSV

        Returns:
            Populated NamesDataset with aggregated counts
        """
        dataset = cls()

        # Load boys data
        boys_df = cls._load_aggregated(boys_file)
        boys_dict = dict(zip(boys_df["name"], boys_df["total_count"]))

        # Load girls data
        girls_df = cls._load_aggregated(girls_file)
        girls_dict = dict(zip(girls_df["name"], girls_df["total_count"]))

        # Get all unique names
        all_names = set(boys_dict.keys()) | set(girls_dict.keys())

        # Create NameData objects for all names
        for name in sorted(all_names):
            boys_count = boys_dict.get(name, 0.0)
            girls_count = girls_dict.get(name, 0.0)

            name_data = NameData(
                name=name,
                boys_total=boys_count,
                girls_total=girls_count,
            )
            dataset._names[name.lower()] = name_data

        return dataset

    @classmethod
    def _load_aggregated(cls, filepath: Path) -> pd.DataFrame:
        """Load a names CSV file and aggregate counts across all years.

        Args:
            filepath: Path to CSV file

        Returns:
            DataFrame with columns [name, count]
        """
        df = pd.read_csv(filepath, skiprows=4, header=0, dtype=str)

        # Get the Name column and all Count columns
        name_col = df.columns[0]
        count_cols = [col for col in df.columns if "Count" in col]

        # Extract just name and count columns
        result = df[[name_col, *count_cols]].copy()
        result.columns = ["name"] + [f"count_{i}" for i in range(len(count_cols))]

        # Parse count columns and sum across all years
        for col in result.columns[1:]:
            result[col] = result[col].apply(parse_count)

        result["total_count"] = result.iloc[:, 1:].sum(axis=1, skipna=True)

        return result[["name", "total_count"]].dropna(subset=["name"]).reset_index(drop=True)

    def ensure_yearly_loaded(self) -> None:
        """Lazy load yearly data if not already loaded."""
        if self._yearly_loaded:
            return

        # This will be populated by _load_yearly_data calls
        # Store reference to boys and girls data for lazy loading
        self._boys_yearly_raw = self._load_yearly_data(Path())
        self._girls_yearly_raw = self._load_yearly_data(Path())
        self._yearly_loaded = True

    def load_yearly_data(self, boys_file: Path, girls_file: Path) -> None:
        """Load yearly data from CSV files and populate NameData objects.

        Args:
            boys_file: Path to boys names CSV
            girls_file: Path to girls names CSV
        """
        if self._yearly_loaded:
            return

        # Load yearly data from both files
        boys_yearly_df = self._load_yearly_raw(boys_file)
        girls_yearly_df = self._load_yearly_raw(girls_file)

        # Sort before building dicts for efficient grouping
        boys_yearly_df = boys_yearly_df.sort_values("name_lower", ignore_index=True)
        girls_yearly_df = girls_yearly_df.sort_values("name_lower", ignore_index=True)

        # Build dicts using vectorized operations
        boys_yearly_dict = self._build_yearly_dict(boys_yearly_df)
        girls_yearly_dict = self._build_yearly_dict(girls_yearly_df)

        # Populate yearly data in NameData objects
        for name_lower, name_data in self._names.items():
            if name_lower in boys_yearly_dict:
                name_data.boys_yearly = boys_yearly_dict[name_lower]
            if name_lower in girls_yearly_dict:
                name_data.girls_yearly = girls_yearly_dict[name_lower]

        self._yearly_loaded = True

    @classmethod
    def _build_yearly_dict(cls, df: pd.DataFrame) -> dict[str, list[YearlyCount]]:
        """Build yearly dict from DataFrame.

        Args:
            df: DataFrame with columns [name, name_lower, year, count]

        Returns:
            Dict of name_lower -> list of YearlyCount (sorted by year)
        """
        result: dict[str, list[YearlyCount]] = {}

        # Convert to numpy arrays for faster iteration
        names = df["name_lower"].values
        years = df["year"].values.astype(int)
        counts = df["count"].values

        # Group by name_lower manually
        current_name = None
        current_list: list[YearlyCount] = []

        for name, year, count in zip(names, years, counts):
            if name != current_name:
                if current_name is not None:
                    result[current_name] = current_list
                current_name = name
                current_list = []

            current_list.append(YearlyCount(year=year, count=count))

        # Don't forget the last name
        if current_name is not None:
            result[current_name] = current_list

        return result

    @classmethod
    def _load_yearly_raw(cls, filepath: Path) -> pd.DataFrame:
        """Load yearly data from CSV in long format.

        Args:
            filepath: Path to CSV file

        Returns:
            DataFrame with columns [name_lower, year, count]
        """
        df = pd.read_csv(filepath, skiprows=4, header=0, dtype=str)

        # Get the Name column and all Count columns
        name_col = df.columns[0]
        count_cols = [col for col in df.columns if "Count" in col]

        # Extract names and count columns
        result = df[[name_col, *count_cols]].copy()
        result = result.rename(columns={name_col: "name"})

        # Remove empty names
        result = result[result["name"].notna() & (result["name"].str.strip() != "")]

        # Use pd.melt for faster wide-to-long conversion
        melted = result.melt(
            id_vars=["name"],
            value_vars=count_cols,
            var_name="year_col",
            value_name="count",
        )

        # Extract year from column name
        melted["year"] = melted["year_col"].str.replace(" Count", "").astype(int, errors="ignore")

        # Parse counts
        melted["count"] = melted["count"].apply(parse_count)

        # Remove rows with None counts
        melted = melted[melted["count"].notna()]

        # Add lowercase name
        melted["name_lower"] = melted["name"].str.lower()

        return melted[["name", "name_lower", "year", "count"]]

    def get_name(self, name: str) -> NameData | None:
        """Get data for a specific name (case-insensitive).

        Args:
            name: Name to look up

        Returns:
            NameData if found, None otherwise
        """
        return self._names.get(name.lower())

    def get_all_names(self) -> list[NameData]:
        """Get all names in the dataset.

        Returns:
            List of all NameData objects
        """
        return list(self._names.values())

    def get_ranked_names(self, top_n: int = 0) -> list[tuple[NameData, Ranks]]:
        """Get names sorted by popularity with ranks.

        Args:
            top_n: Return only top N names. 0 = all names.

        Returns:
            List of (NameData, Ranks) tuples sorted by total_count descending.
        """
        # Compute ranks if not cached
        if self._ranks_cache is None:
            self._compute_ranks()

        # Get all names sorted by total count
        all_names = sorted(self._names.values(), key=lambda x: x.total_count, reverse=True)

        # Filter to top_n if specified
        if top_n > 0:
            all_names = all_names[:top_n]

        # Return with ranks
        return [(name, self._ranks_cache[name.name]) for name in all_names]

    def _compute_ranks(self) -> None:
        """Compute and cache all rankings."""
        self._ranks_cache = {}

        all_names = list(self._names.values())

        # Sort by total count for overall rank
        by_total = sorted(all_names, key=lambda x: x.total_count, reverse=True)
        overall_ranks = {name.name: rank + 1 for rank, name in enumerate(by_total)}

        # Sort by boys count
        by_boys = sorted(all_names, key=lambda x: x.boys_total, reverse=True)
        boys_ranks = {name.name: rank + 1 for rank, name in enumerate(by_boys)}

        # Sort by girls count
        by_girls = sorted(all_names, key=lambda x: x.girls_total, reverse=True)
        girls_ranks = {name.name: rank + 1 for rank, name in enumerate(by_girls)}

        # Create Ranks objects
        for name_data in all_names:
            self._ranks_cache[name_data.name] = Ranks(
                overall=overall_ranks[name_data.name],
                boys=boys_ranks[name_data.name],
                girls=girls_ranks[name_data.name],
            )
