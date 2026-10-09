// jest-dom adds custom matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest';

// jsdom does not implement IntersectionObserver (used by useInfiniteScroll).
// Provide a minimal no-op mock so table components can render in tests.
class MockIntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];

    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
        return [];
    }
}

if (typeof globalThis.IntersectionObserver === 'undefined') {
    globalThis.IntersectionObserver =
        MockIntersectionObserver as unknown as typeof IntersectionObserver;
}
