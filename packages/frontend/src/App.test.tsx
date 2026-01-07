import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  it('should render the application title', () => {
    render(<App />);
    expect(screen.getByText('Architecture Review System')).toBeDefined();
  });

  it('should render the application description', () => {
    render(<App />);
    expect(screen.getByText('Document upload and preview application')).toBeDefined();
  });
});
