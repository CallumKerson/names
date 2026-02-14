"""Pure operations on the names data model."""

from typing import Literal

from names_model import NameData, YearlyCount


def get_time_series(
    name_data: NameData,
    gender: Literal["boys", "girls", "combined"] = "combined",
) -> list[tuple[int, float]]:
    """Extract time series data for graphing.

    Args:
        name_data: NameData with yearly data loaded
        gender: Which time series to return

    Returns:
        List of (year, count) tuples sorted by year
    """
    if not name_data.has_yearly_data:
        return []

    if gender == "boys":
        yearly = name_data.boys_yearly or []
    elif gender == "girls":
        yearly = name_data.girls_yearly or []
    else:  # combined
        boys_by_year = {yc.year: yc.count for yc in (name_data.boys_yearly or [])}
        girls_by_year = {yc.year: yc.count for yc in (name_data.girls_yearly or [])}

        all_years = sorted(set(boys_by_year.keys()) | set(girls_by_year.keys()))
        return [(year, boys_by_year.get(year, 0) + girls_by_year.get(year, 0)) for year in all_years]

    return [(yc.year, yc.count) for yc in yearly]


def calculate_yearly_gender_scores(name_data: NameData) -> list[tuple[int, float]]:
    """Calculate gender score for each year.

    Args:
        name_data: NameData with yearly data loaded

    Returns:
        List of (year, gender_score) tuples sorted by year.
        Gender score ranges from -1 (masculine) to +1 (feminine).
    """
    if not name_data.boys_yearly or not name_data.girls_yearly:
        return []

    boys_by_year = {yc.year: yc.count for yc in name_data.boys_yearly}
    girls_by_year = {yc.year: yc.count for yc in name_data.girls_yearly}

    all_years = sorted(set(boys_by_year.keys()) | set(girls_by_year.keys()))

    result = []
    for year in all_years:
        boys_count = boys_by_year.get(year, 0)
        girls_count = girls_by_year.get(year, 0)
        total = boys_count + girls_count

        if total > 0:
            gender_score = (girls_count - boys_count) / total
            result.append((year, gender_score))

    return result


def filter_names_by_score(
    names: list[NameData],
    score_range: tuple[float, float] | None = None,
    top_n: int | None = None,
) -> list[NameData]:
    """Filter names by gender score range.

    Args:
        names: List of NameData to filter
        score_range: Optional tuple of (min_score, max_score)
        top_n: Optional limit to top N names

    Returns:
        Filtered list of NameData
    """
    result = names.copy()

    if score_range is not None:
        min_score, max_score = score_range
        result = [n for n in result if min_score <= n.gender_score <= max_score]

    if top_n is not None and top_n > 0:
        result = result[:top_n]

    return result


def find_closest_to_score(
    names: list[NameData],
    target: float,
    n: int,
) -> list[NameData]:
    """Find N names closest to target gender score.

    Args:
        names: List of NameData to search
        target: Target gender score (-1.0 to +1.0)
        n: Number of names to return

    Returns:
        N names with gender scores closest to target, sorted by distance
    """
    scored = [(name, abs(name.gender_score - target)) for name in names]
    scored.sort(key=lambda x: x[1])
    return [name for name, _ in scored[:n]]
