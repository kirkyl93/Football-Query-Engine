/** Structured fetch error that preserves HTTP context for logging. */
export class ApiError extends Error {
    readonly status?: number;
    readonly endpoint: string;

    constructor(message: string, endpoint: string, status?: number) {
        super(message);
        this.name = 'ApiError';
        this.endpoint = endpoint;
        this.status = status;
    }
}

export const isAbortError = (error: unknown): boolean =>
    error instanceof Error && error.name === 'AbortError';

/** Summarise a URL for logs: path + query length only, no body/PII. */
const summariseUrl = (url: string): string => {
    try {
        const parsed = new URL(url);
        return `${parsed.pathname}${parsed.search ? `?${parsed.searchParams.toString()}` : ''}`;
    } catch {
        return url;
    }
};

/** Single place for client-side fetch failure logging (browser console / Vercel). */
export const logApiError = (endpoint: string, url: string, error: unknown): void => {
    if (isAbortError(error)) {
        return;
    }
    const status = error instanceof ApiError ? error.status : undefined;
    const message = error instanceof Error ? error.message : String(error);
    console.error('[api-fetch-failed]', {
        endpoint,
        url: summariseUrl(url),
        status: status ?? 'network-or-parse',
        message,
    });
};

/** Fetch JSON, throwing an ApiError (and logging) on non-OK or invalid JSON. */
export const fetchJson = async <T>(endpoint: string, url: string, signal?: AbortSignal): Promise<T> => {
    let response: Response;
    try {
        response = await fetch(url, signal ? { signal } : undefined);
    } catch (error) {
        logApiError(endpoint, url, error);
        throw error;
    }
    if (!response.ok) {
        const error = new ApiError(
            `Request failed with status ${response.status}`,
            endpoint,
            response.status,
        );
        logApiError(endpoint, url, error);
        throw error;
    }
    try {
        return (await response.json()) as T;
    } catch (error) {
        const parseError = new ApiError('Failed to parse response', endpoint, response.status);
        logApiError(endpoint, url, parseError);
        throw parseError;
    }
};
