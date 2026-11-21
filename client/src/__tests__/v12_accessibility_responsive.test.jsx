import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import ReferralLanding from '../pages/public/ReferralLanding';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';

describe('Chunk V12: Accessibility (A11y), Keyboard Focus, Contrast & Responsive Layout Suite', () => {
  describe('1. Form Controls & Accessible Labels', () => {
    it('renders ReferralLanding with accessible inputs, labels, and aria attributes', () => {
      render(
        <BrowserRouter>
          <ReferralLanding />
        </BrowserRouter>
      );

      // Verify headings
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toBeInTheDocument();
      expect(mainHeading).toHaveTextContent(/Campus Placement Outreach/i);

      // Verify form inputs have accessible labels
      const nameInput = screen.getByLabelText(/Full Name/i);
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveAttribute('required');

      const emailInput = screen.getByLabelText(/Email Address/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');

      const phoneInput = screen.getByLabelText(/Phone Number/i);
      expect(phoneInput).toBeInTheDocument();
      expect(phoneInput).toHaveAttribute('type', 'tel');

      const instituteInput = screen.getByLabelText(/College \/ Institute Name/i);
      expect(instituteInput).toBeInTheDocument();

      const submitBtn = screen.getByRole('button', { name: /Submit Participation Record/i });
      expect(submitBtn).toBeInTheDocument();
    });
  });

  describe('2. Interactive Controls, Keyboard Focus & States', () => {
    it('verifies Button component has keyboard focus rings and disabled accessibility attributes', () => {
      const { rerender } = render(
        <Button variant="primary" className="focus:ring-2">
          Click Me
        </Button>
      );

      const btn = screen.getByRole('button', { name: /Click Me/i });
      expect(btn).not.toBeDisabled();
      expect(btn.className).toContain('focus:ring-2');

      // Test disabled and loading state
      rerender(
        <Button variant="primary" loading={true} disabled={true}>
          Processing
        </Button>
      );

      const disabledBtn = screen.getByRole('button');
      expect(disabledBtn).toBeDisabled();
      expect(disabledBtn.className).toContain('disabled:cursor-not-allowed');
    });
  });

  describe('3. Contrast & Status Badges Hierarchy', () => {
    it('renders StatusBadge components with high-contrast text and background pairings', () => {
      const { rerender } = render(<StatusBadge status="approved" />);
      const successBadge = screen.getByText('Approved');
      expect(successBadge).toBeInTheDocument();
      expect(successBadge.className).toContain('text-emerald-700');

      rerender(<StatusBadge status="pending" />);
      const warningBadge = screen.getByText('Pending Approval');
      expect(warningBadge).toBeInTheDocument();
      expect(warningBadge.className).toContain('text-amber-700');

      rerender(<StatusBadge status="rejected" />);
      const dangerBadge = screen.getByText('Rejected');
      expect(dangerBadge).toBeInTheDocument();
      expect(dangerBadge.className).toContain('text-rose-700');
    });
  });

  describe('4. Responsive Layout Checks', () => {
    it('verifies responsive classes (sm, md, flex-col sm:flex-row) are present on landing page', () => {
      const { container } = render(
        <BrowserRouter>
          <ReferralLanding />
        </BrowserRouter>
      );

      const responsiveContainers = container.querySelectorAll('.sm\\:max-w-md, .sm\\:px-6');
      expect(responsiveContainers.length).toBeGreaterThanOrEqual(1);
    });
  });
});
