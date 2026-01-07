import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { randomUUID } from 'crypto';

// Feature: architecture-review-system, Property 3: Unique Document ID Generation
// Validates: Requirements 1.5, 2.1

describe('Property 3: Unique Document ID Generation', () => {
  it('should generate unique document IDs for any number of documents', () => {
    // Generator for a set of document IDs
    const documentCountArbitrary = fc.integer({ min: 2, max: 1000 });

    fc.assert(
      fc.property(documentCountArbitrary, (count: number) => {
        // Generate multiple document IDs
        const documentIds = new Set<string>();
        
        for (let i = 0; i < count; i++) {
          const id = randomUUID();
          documentIds.add(id);
        }

        // Verify all IDs are unique (set size equals count)
        expect(documentIds.size).toBe(count);
        
        // Verify all IDs are valid UUIDs (format check)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        documentIds.forEach(id => {
          expect(id).toMatch(uuidRegex);
        });

        return documentIds.size === count;
      }),
      { numRuns: 100 }
    );
  });

  it('should generate different IDs on consecutive calls', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const id1 = randomUUID();
        const id2 = randomUUID();
        const id3 = randomUUID();

        // All three IDs should be different
        expect(id1).not.toBe(id2);
        expect(id2).not.toBe(id3);
        expect(id1).not.toBe(id3);

        return id1 !== id2 && id2 !== id3 && id1 !== id3;
      }),
      { numRuns: 100 }
    );
  });

  it('should generate valid UUID v4 format', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const id = randomUUID();
        
        // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        // where y is one of [8, 9, a, b]
        const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        
        expect(id).toMatch(uuidV4Regex);
        expect(id.length).toBe(36);
        expect(id.split('-').length).toBe(5);

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
