import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App.jsx';
import * as healthService from '../services/health.service.js';

describe('Client Foundation Smoke Test', () => {
  it('renders application brand and role portals', async () => {
    vi.spyOn(healthService, 'getHealthStatus').mockResolvedValueOnce({
      success: true,
      message: 'HireTrack API is healthy',
      data: {
        status: 'ok',
        uptime: 120,
        timestamp: '2026-11-17T12:00:00.000Z',
        database: { state: 'connected', code: 1, host: '127.0.0.1', name: 'hiretrack' }
      }
    });

    render(<App />);

    expect(screen.getByText('HireTrack')).toBeInTheDocument();
    expect(screen.getByText('Student Portal')).toBeInTheDocument();
    expect(screen.getByText('Recruiter Portal')).toBeInTheDocument();
    expect(screen.getByText('Admin Portal')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('health-success')).toBeInTheDocument();
    });

    expect(screen.getByText(/API Status: OK/i)).toBeInTheDocument();
    expect(screen.getByText(/CONNECTED/i)).toBeInTheDocument();
  });

  it('renders error state when API health check fails', async () => {
    vi.spyOn(healthService, 'getHealthStatus').mockRejectedValueOnce({
      message: 'Network error connecting to backend'
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('health-error')).toBeInTheDocument();
    });

    expect(screen.getByText('API Connection Failed')).toBeInTheDocument();
    expect(screen.getByText('Network error connecting to backend')).toBeInTheDocument();
  });
});

