import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateFileExtension, validateFileSize } from './validation';
import { SUPPORTED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from '../types';

describe('Property Testing Framework Setup', () => {
  it('should run property tests with fast-check', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n + 0 === n;
      }),
      { numRuns: 100 }
    );
  });

  it('should support TypeScript with fast-check', () => {
    fc.assert(
      fc.property(fc.string(), (s: string) => {
        return s.length >= 0;
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: architecture-review-system, Property 1: File Extension Validation
// Validates: Requirements 1.1, 1.2

describe('Property 1: File Extension Validation', () => {
  it('should accept filenames with supported extensions (case-insensitive)', () => {
    // Generator for valid filenames with supported extensions
    const validFilenameArbitrary = fc.tuple(
      fc.stringMatching(/^[a-zA-Z0-9_-]+$/), // base filename
      fc.constantFrom(...SUPPORTED_EXTENSIONS), // supported extension
      fc.constantFrom('lower', 'upper', 'mixed') // case variation
    ).map(([base, ext, caseType]) => {
      if (caseType === 'upper') {
        return base + ext.toUpperCase();
      } else if (caseType === 'mixed') {
        return base + ext.split('').map((c, i) => i % 2 === 0 ? c.toUpperCase() : c).join('');
      }
      return base + ext;
    });

    fc.assert(
      fc.property(validFilenameArbitrary, (filename: string) => {
        const result = validateFileExtension(filename);
        expect(result).toBe(true);
        return result === true;
      }),
      { numRuns: 100 }
    );
  });

  it('should reject filenames with unsupported extensions', () => {
    // Generator for invalid extensions (not in supported list)
    const invalidExtensionArbitrary = fc.stringMatching(/^\.[a-z]{2,5}$/)
      .filter(ext => !SUPPORTED_EXTENSIONS.includes(ext.toLowerCase() as any));

    const invalidFilenameArbitrary = fc.tuple(
      fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
      invalidExtensionArbitrary
    ).map(([base, ext]) => base + ext);

    fc.assert(
      fc.property(invalidFilenameArbitrary, (filename: string) => {
        const result = validateFileExtension(filename);
        expect(result).toBe(false);
        return result === false;
      }),
      { numRuns: 100 }
    );
  });

  it('should reject empty or invalid filenames', () => {
    const invalidInputArbitrary = fc.oneof(
      fc.constant(''),
      fc.constant(null as any),
      fc.constant(undefined as any),
      fc.stringMatching(/^[a-zA-Z0-9_-]+$/), // filename without extension
    );

    fc.assert(
      fc.property(invalidInputArbitrary, (filename: any) => {
        const result = validateFileExtension(filename);
        expect(result).toBe(false);
        return result === false;
      }),
      { numRuns: 100 }
    );
  });
});


// Feature: architecture-review-system, Property 2: File Size Validation
// Validates: Requirements 1.3, 1.4

describe('Property 2: File Size Validation', () => {
  it('should accept file sizes less than or equal to 50MB', () => {
    // Generator for valid file sizes (0 to 50MB)
    const validFileSizeArbitrary = fc.integer({ min: 0, max: MAX_FILE_SIZE_BYTES });

    fc.assert(
      fc.property(validFileSizeArbitrary, (fileSize: number) => {
        const result = validateFileSize(fileSize);
        expect(result).toBe(true);
        return result === true;
      }),
      { numRuns: 100 }
    );
  });

  it('should reject file sizes greater than 50MB', () => {
    // Generator for invalid file sizes (greater than 50MB)
    const invalidFileSizeArbitrary = fc.integer({ 
      min: MAX_FILE_SIZE_BYTES + 1, 
      max: MAX_FILE_SIZE_BYTES * 10 
    });

    fc.assert(
      fc.property(invalidFileSizeArbitrary, (fileSize: number) => {
        const result = validateFileSize(fileSize);
        expect(result).toBe(false);
        return result === false;
      }),
      { numRuns: 100 }
    );
  });

  it('should reject negative file sizes', () => {
    const negativeFileSizeArbitrary = fc.integer({ min: -1000000, max: -1 });

    fc.assert(
      fc.property(negativeFileSizeArbitrary, (fileSize: number) => {
        const result = validateFileSize(fileSize);
        expect(result).toBe(false);
        return result === false;
      }),
      { numRuns: 100 }
    );
  });

  it('should reject invalid file size inputs', () => {
    const invalidInputArbitrary = fc.oneof(
      fc.constant(NaN),
      fc.constant(Infinity),
      fc.constant(-Infinity),
      fc.constant(null as any),
      fc.constant(undefined as any),
      fc.constant('1000' as any),
    );

    fc.assert(
      fc.property(invalidInputArbitrary, (fileSize: any) => {
        const result = validateFileSize(fileSize);
        expect(result).toBe(false);
        return result === false;
      }),
      { numRuns: 100 }
    );
  });
});
