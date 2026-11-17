import '@testing-library/jest-dom';

// Polyfill ResizeObserver for Recharts ResponsiveContainer in jsdom
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserver;
  global.ResizeObserver = ResizeObserver;
}

