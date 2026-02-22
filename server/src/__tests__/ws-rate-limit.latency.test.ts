import { afterEach, describe, expect, it, vi } from 'vitest';
import { wsRateLimitAllow } from '../ws/ws-rate-limit.js';

describe('wsRateLimitAllow latency behavior', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('enforces burst capacity exactly', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const socket = {};

    for (let i = 0; i < 30; i += 1) {
      expect(wsRateLimitAllow(socket)).toBe(true);
    }
    expect(wsRateLimitAllow(socket)).toBe(false);
  });

  it('refills by whole-second intervals only', () => {
    const now = vi.spyOn(Date, 'now');
    const socket = {};

    now.mockReturnValue(5_000);
    for (let i = 0; i < 5; i += 1) {
      expect(wsRateLimitAllow(socket, 5, 2)).toBe(true);
    }
    expect(wsRateLimitAllow(socket, 5, 2)).toBe(false);

    now.mockReturnValue(5_999);
    expect(wsRateLimitAllow(socket, 5, 2)).toBe(false);

    now.mockReturnValue(6_000);
    expect(wsRateLimitAllow(socket, 5, 2)).toBe(true);
    expect(wsRateLimitAllow(socket, 5, 2)).toBe(true);
    expect(wsRateLimitAllow(socket, 5, 2)).toBe(false);

    now.mockReturnValue(8_000);
    expect(wsRateLimitAllow(socket, 5, 2)).toBe(true);
    expect(wsRateLimitAllow(socket, 5, 2)).toBe(true);
    expect(wsRateLimitAllow(socket, 5, 2)).toBe(true);
    expect(wsRateLimitAllow(socket, 5, 2)).toBe(true);
    expect(wsRateLimitAllow(socket, 5, 2)).toBe(false);
  });

  it('isolates buckets per socket', () => {
    vi.spyOn(Date, 'now').mockReturnValue(10_000);
    const a = {};
    const b = {};

    for (let i = 0; i < 30; i += 1) {
      expect(wsRateLimitAllow(a)).toBe(true);
    }
    expect(wsRateLimitAllow(a)).toBe(false);

    for (let i = 0; i < 30; i += 1) {
      expect(wsRateLimitAllow(b)).toBe(true);
    }
    expect(wsRateLimitAllow(b)).toBe(false);
  });
});
