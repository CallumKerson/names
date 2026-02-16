# Baby Name Gender Score Analysis

Python script for analyzing baby names data (1996-2024) and calculating gender scores.

## Overview

This project analyzes baby name trends to calculate a **gender score** for each name, ranging from:

- **-1.0**: 100% masculine (only used for boys)
- **+1.0**: 100% feminine (only used for girls)
- **0.0**: Perfectly balanced (equal usage across genders)

The analysis explores how these gender scores interact with name popularity, weighted by total usage counts.

## Gender Score Formula

```python
gender_score = (feminine_count - masculine_count) / (feminine_count + masculine_count)
```

## Installation

This project uses [uv](https://github.com/astral-sh/uv) for dependency management:

```bash
uv sync
```

## Usage

Run the script

```bash
uv run names.py
```

## Data

The `babynames1996to2024` directory contains CSV files for the ONS data. These files include:

- `Names for Baby Girls 1996-2024.csv`
- `Names for Baby Boys 1996-2024.csv`

## Methodology

### Equal Scores

If two names have exactly equal gender scores, then the name with the higher frequency will be ranked higher.

### Aggregation

Gender scores are calculated by summing counts across all years (1996-2024) for robustness:

- Reduces impact of single-year anomalies
- Reflects overall cultural association
- Provides statistical confidence

### Data Quality

- Privacy redactions ('S' for counts ≤ 2): Converted to NaN
- Missing data: Handled with `skipna=True` in aggregations
- Names appearing in both tables: Combined to calculate true gender distribution
