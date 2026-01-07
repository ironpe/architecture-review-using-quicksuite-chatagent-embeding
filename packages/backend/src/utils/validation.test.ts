import { describe, it, expect } from 'vitest';
import { validateFileExtension, validateFileSize, validateFile } from './validation';
import { MAX_FILE_SIZE_BYTES } from '../types';

describe('Testing Framework Setup', () => {
  it('should run unit tests with Vitest', () => {
    expect(true).toBe(true);
  });

  it('should support TypeScript', () => {
    const message: string = 'TypeScript is working';
    expect(message).toBe('TypeScript is working');
  });
});

describe('File Validation Edge Cases', () => {
  describe('validateFileExtension', () => {
    it('should reject empty filename', () => {
      expect(validateFileExtension('')).toBe(false);
    });

    it('should reject filename without extension', () => {
      expect(validateFileExtension('document')).toBe(false);
      expect(validateFileExtension('myfile')).toBe(false);
    });

    it('should reject filename ending with dot only', () => {
      expect(validateFileExtension('document.')).toBe(false);
    });

    it('should accept valid extensions with various cases', () => {
      expect(validateFileExtension('file.PDF')).toBe(true);
      expect(validateFileExtension('file.Pdf')).toBe(true);
      expect(validateFileExtension('file.pdf')).toBe(true);
    });
  });

  describe('validateFileSize', () => {
    it('should accept zero-byte file', () => {
      expect(validateFileSize(0)).toBe(true);
    });

    it('should accept exactly 50MB file', () => {
      expect(validateFileSize(MAX_FILE_SIZE_BYTES)).toBe(true);
    });

    it('should reject file one byte over 50MB', () => {
      expect(validateFileSize(MAX_FILE_SIZE_BYTES + 1)).toBe(false);
    });

    it('should reject negative file size', () => {
      expect(validateFileSize(-1)).toBe(false);
    });
  });

  describe('validateFile', () => {
    it('should return error for invalid extension', () => {
      const result = validateFile('document.txt', 1000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File type not supported. Please upload PPT, PDF, Word, PNG, or JPG files.');
    });

    it('should return error for file too large', () => {
      const result = validateFile('document.pdf', MAX_FILE_SIZE_BYTES + 1);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File size exceeds 50MB limit.');
    });

    it('should return valid for correct file', () => {
      const result = validateFile('document.pdf', 1000);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});
