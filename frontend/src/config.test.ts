import { describe, expect, it } from 'vitest';
import { API_BASE_URL } from './config';

describe('API_BASE_URL', () => {
    it('defaults to local backend when no env override is set', () => {
        expect(API_BASE_URL).toBe('http://localhost:8080');
    });
});
