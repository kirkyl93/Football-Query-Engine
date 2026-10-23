import {describe, expect, it} from "vitest";
import {exampleQueries, selectExampleQueries} from "./exampleQueries";

describe("selectExampleQueries", () => {
    it("selects three distinct queries without changing the pool", () => {
        const original = [...exampleQueries];
        const selected = selectExampleQueries(() => 0);

        expect(selected).toHaveLength(3);
        expect(new Set(selected.map(example => example.query)).size).toBe(3);
        expect(exampleQueries).toEqual(original);
    });

    it("can select from beyond the original three examples", () => {
        const selected = selectExampleQueries(() => 0.999999);

        expect(selected[0]).toEqual(exampleQueries[exampleQueries.length - 1]);
        expect(new Set(selected.map(example => example.query)).size).toBe(3);
        expect(selectExampleQueries(() => 0)).not.toEqual(selected);
    });
});
