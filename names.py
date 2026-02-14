"""
Names script.

A script to generate a gender score for a given name, based on aggregated baby name data
from the UK Office for National Statistics from 1996 to 2024.
"""

import re
from pathlib import Path

import cyclopts
import plotext as plt
from rich.console import Console
from rich.table import Table

from names_model import NamesDataset
from names_operations import calculate_yearly_gender_scores, find_closest_to_score, get_time_series

app = cyclopts.App()
console = Console()

DATA_DIR = Path(__file__).parent / "babynames1996to2024"
BOYS_FILE = DATA_DIR / "Names for Baby Boys 1996-2024.csv"
GIRLS_FILE = DATA_DIR / "Names for Baby Girls 1996-2024.csv"

START_YEAR = 1996
END_YEAR = 2024
YEARS = list(range(START_YEAR, END_YEAR + 1))

# ANSI escape code pattern
ANSI_ESCAPE_PATTERN = re.compile(r"\x1b\[[0-9;]*m")

# Load data once at module level
dataset = NamesDataset.load(BOYS_FILE, GIRLS_FILE)


def strip_ansi_codes(text: str) -> str:
    """Remove ANSI escape codes from text."""
    return ANSI_ESCAPE_PATTERN.sub("", text)


def create_popularity_graph(
    time_series: list[tuple[int, float]],
    title: str,
    *,
    width: int = 80,
    height: int = 15,
) -> str:
    """
    Create ASCII graph of popularity over time.

    Args:
        time_series: List of (year, count) tuples.
        title: Graph title.
        width: Terminal width for graph.
        height: Terminal height for graph.

    Returns:
        Rendered ASCII graph as string.

    """
    plt.clear_figure()

    x = [t[0] for t in time_series]
    y = [t[1] for t in time_series]

    plt.plot(x, y)
    plt.title(title)
    plt.xlabel("Year")
    plt.ylabel("Count")
    plt.plotsize(width, height)

    return strip_ansi_codes(plt.build())


def create_gender_score_graph(
    gender_scores: list[tuple[int, float]],
    title: str,
    *,
    width: int = 80,
    height: int = 15,
) -> str:
    """
    Create ASCII graph of gender score over time.

    Args:
        gender_scores: List of (year, gender_score) tuples.
        title: Graph title.
        width: Terminal width.
        height: Terminal height.

    Returns:
        Rendered ASCII graph as string.

    """
    plt.clear_figure()

    x = [t[0] for t in gender_scores]
    y = [t[1] for t in gender_scores]

    plt.plot(x, y)
    plt.hline(0)
    plt.title(title)
    plt.xlabel("Year")
    plt.ylabel("Gender Score")
    plt.ylim(-1, 1)
    plt.plotsize(width, height)

    return strip_ansi_codes(plt.build())


def display_name_graphs(name_data) -> None:  # type: ignore[no-untyped-def]
    """
    Display popularity and gender score graphs for a name.

    Args:
        name_data: NameData object with yearly data loaded.

    """
    try:
        # Ensure yearly data is loaded (lazy loading)
        dataset.load_yearly_data(BOYS_FILE, GIRLS_FILE)

        if not name_data.has_yearly_data:
            console.print(f"[yellow]No historical data found for '{name_data.name}'[/yellow]")
            return

        # Get time series data for combined popularity
        time_series = get_time_series(name_data, "combined")

        if time_series:
            pop_graph = create_popularity_graph(
                time_series,
                f"Popularity Trend: {name_data.name}",
            )
            console.print(pop_graph)
            console.print()

        # Gender score graph: only if both boys and girls data exists
        if name_data.boys_yearly and name_data.girls_yearly:
            gender_scores = calculate_yearly_gender_scores(name_data)
            if gender_scores:
                gender_graph = create_gender_score_graph(
                    gender_scores,
                    f"Gender Score Evolution: {name_data.name}",
                )
                console.print(gender_graph)
    except Exception as e:  # noqa: BLE001
        msg = f"[yellow]Could not load historical data: {e}[/yellow]"
        console.print(msg)


def create_table(title: str, names_with_ranks: list[tuple]) -> Table:  # type: ignore[no-untyped-def]
    """
    Create a rich table for displaying names.

    Args:
        title: Table title
        names_with_ranks: List of (NameData, Ranks) tuples

    """
    table = Table(title=title)
    table.add_column("Rank", justify="right", style="dim")
    table.add_column("Name", style="bold")
    table.add_column("Gender Score", justify="right")
    table.add_column("Girls Rank", justify="right")
    table.add_column("Boys Rank", justify="right")
    table.add_column("Overall Rank", justify="right")
    table.add_column("Girls", justify="right")
    table.add_column("Boys", justify="right")
    table.add_column("Total Count", justify="right", style="dim")

    for rank, (name_data, ranks) in enumerate(names_with_ranks, 1):
        # Show "-" for rank if count is 0
        girls_rank = "-" if name_data.girls_total == 0 else str(ranks.girls)
        boys_rank = "-" if name_data.boys_total == 0 else str(ranks.boys)

        table.add_row(
            str(rank),
            name_data.name,
            f"{name_data.gender_score:+.4f}",
            girls_rank,
            boys_rank,
            str(ranks.overall),
            f"{int(name_data.girls_total):,}",
            f"{int(name_data.boys_total):,}",
            f"{int(name_data.total_count):,}",
        )

    return table


@app.command
def score(top: int = 1000) -> None:
    """
    Show names ranked by gender score (most masculine, feminine, and neutral).

    Args:
        top: Only consider names in the top N by popularity. 0 for no filter.

    """
    names_with_ranks = dataset.get_ranked_names(top_n=top)

    # Top masculine (most negative scores)
    n = 10
    masculine = sorted(names_with_ranks, key=lambda x: x[0].gender_score)[:n]
    console.print(create_table("Top Masculine Names", masculine))
    console.print()

    # Top feminine (most positive scores)
    feminine = sorted(names_with_ranks, key=lambda x: x[0].gender_score, reverse=True)[:n]
    console.print(create_table("Top Feminine Names", feminine))
    console.print()

    # Most gender-neutral (closest to 0)
    neutral = sorted(names_with_ranks, key=lambda x: abs(x[0].gender_score))[:n]
    console.print(create_table("Most Gender-Neutral Names", neutral))


@app.command
def popular(n: int = 25) -> None:
    """
    Show the most popular boys and girls names with their gender scores.

    Args:
        n: Number of names to show in each list.

    """
    all_ranked = dataset.get_ranked_names()

    # Top N boys names (by boys_total)
    boys = sorted(all_ranked, key=lambda x: x[0].boys_total, reverse=True)[:n]
    console.print(create_table("Top Boys Names", boys))
    console.print()

    # Top N girls names (by girls_total)
    girls = sorted(all_ranked, key=lambda x: x[0].girls_total, reverse=True)[:n]
    console.print(create_table("Top Girls Names", girls))


@app.command
def nearest(target: float, n: int = 25, top: int = 1000) -> None:
    """
    Find names closest to a specific gender score.

    Args:
        target: Target gender score (-1.0 = masculine, +1.0 = feminine).
        n: Number of names to show.
        top: Only consider names in the top N by popularity. 0 for no filter.

    """
    if not -1.0 <= target <= 1.0:
        console.print("[red]Error: target must be between -1.0 and 1.0[/red]")
        raise SystemExit(1)

    names_with_ranks = dataset.get_ranked_names(top_n=top)
    names_only = [name_data for name_data, _ in names_with_ranks]

    closest = find_closest_to_score(names_only, target, n)

    # Get ranks for display, preserving the order from closest (sorted by distance)
    ranks_map = {nd.name: ranks for nd, ranks in names_with_ranks}
    closest_with_ranks = [(nd, ranks_map[nd.name]) for nd in closest]
    console.print(create_table(f"Names Closest to {target:+.2f}", closest_with_ranks))


@app.command
def lookup(name: str) -> None:
    """
    Look up the gender score and statistics for a specific name.

    Args:
        name: The name to search for (case-insensitive).

    """
    name_data = dataset.get_name(name)

    if name_data is None:
        console.print(f"[red]Name '{name}' not found in dataset.[/red]")
        raise SystemExit(1)

    # Get ranks for this name
    all_ranked = dataset.get_ranked_names()
    ranks = next((r for nd, r in all_ranked if nd.name == name_data.name), None)

    # Display statistics table
    console.print(create_table(f"Statistics for '{name_data.name}'", [(name_data, ranks)]))

    # Display historical trends
    console.print()
    console.print("[bold]Historical Trends (1996-2024)[/bold]")
    console.print()

    display_name_graphs(name_data)


if __name__ == "__main__":
    app()
