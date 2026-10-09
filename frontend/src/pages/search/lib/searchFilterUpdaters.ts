/**
 * Generic state helpers for the search filter drawer. They collapse the
 * dozens of near-identical setLocalFilterState wrappers into two call
 * shapes: toggle a value in an array, or parse an optional number from a
 * select. Covered by unit tests.
 */
export const toggleArrayValue = <T>(values: T[], value: T): T[] =>
    values.includes(value) ? values.filter(v => v !== value) : [...values, value];

export const parseOptionalNumber = (value: string): number | undefined =>
    value ? parseInt(value, 10) : undefined;
