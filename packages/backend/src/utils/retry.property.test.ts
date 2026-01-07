import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// Feature: architecture-review-system, Property 6: Retry Logic with Exponential Backoff
// Validates: Requirements 2.4

// Retry function implementation for testing
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialBackoffMs: number = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        const backoffTime = initialBackoffMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }

  throw lastError;
}

describe('Property 6: Retry Logic with Exponential Backoff', () => {
  it('should retry up to 3 times for any failing operation', async () => {
    const failureCountArbitrary = fc.integer({ min: 1, max: 10 });

    await fc.assert(
      fc.asyncProperty(failureCountArbitrary, async (failureCount: number) => {
        let attemptCount = 0;
        const operation = vi.fn(async () => {
          attemptCount++;
          if (attemptCount <= failureCount) {
            throw new Error(`Attempt ${attemptCount} failed`);
          }
          return 'success';
        });

        if (failureCount <= 3) {
          // Should succeed after retries
          const result = await retryWithBackoff(operation, 3, 10);
          expect(result).toBe('success');
          expect(attemptCount).toBe(failureCount + 1);
        } else {
          // Should fail after 3 retries (4 total attempts)
          await expect(retryWithBackoff(operation, 3, 10)).rejects.toThrow();
          expect(attemptCount).toBe(4); // Initial + 3 retries
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should succeed immediately if operation succeeds on first try', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        let attemptCount = 0;
        const operation = vi.fn(async () => {
          attemptCount++;
          return 'success';
        });

        const result = await retryWithBackoff(operation, 3, 10);
        
        expect(result).toBe('success');
        expect(attemptCount).toBe(1);
        expect(operation).toHaveBeenCalledTimes(1);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should apply exponential backoff between retries', async () => {
    const timestamps: number[] = [];
    let attemptCount = 0;
    
    const operation = vi.fn(async () => {
      timestamps.push(Date.now());
      attemptCount++;
      if (attemptCount <= 3) {
        throw new Error('Retry needed');
      }
      return 'success';
    });

    const initialBackoff = 50;
    await retryWithBackoff(operation, 3, initialBackoff);

    // Verify exponential backoff timing
    // Attempt 1 -> wait 50ms -> Attempt 2 -> wait 100ms -> Attempt 3 -> wait 200ms -> Attempt 4
    expect(timestamps.length).toBe(4);
    
    // Check that delays are approximately correct (with some tolerance)
    const delay1 = timestamps[1] - timestamps[0];
    const delay2 = timestamps[2] - timestamps[1];
    const delay3 = timestamps[3] - timestamps[2];

    // Allow 20ms tolerance for timing variations
    expect(delay1).toBeGreaterThanOrEqual(initialBackoff - 20);
    expect(delay2).toBeGreaterThanOrEqual(initialBackoff * 2 - 20);
    expect(delay3).toBeGreaterThanOrEqual(initialBackoff * 4 - 20);
  }, 60000); // Increase timeout to 60 seconds

  it('should throw the last error after all retries are exhausted', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (errorMessage: string) => {
        const operation = vi.fn(async () => {
          throw new Error(errorMessage);
        });

        try {
          await retryWithBackoff(operation, 3, 10);
          // Should not reach here
          expect(true).toBe(false);
        } catch (error) {
          expect((error as Error).message).toBe(errorMessage);
          expect(operation).toHaveBeenCalledTimes(4); // Initial + 3 retries
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
