// Unit tests for ProfessionalSummarySection — S2-020 changes.
// Covers dirty detection (revert-to-original disables Save) and
// the navigate-away guard (beforeunload listener lifecycle).

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfessionalSummarySection } from '@/components/profile/ProfessionalSummarySection';
import { EMPTY_PROFILE } from '@/types/profile.types';

const MOCK_PROFILE = {
  ...EMPTY_PROFILE,
  first_name: 'Jane',
  last_name: 'Smith',
  email: 'jane@example.com',
  headline: 'Full Stack Engineer',
  summary: 'Experienced developer with 5 years.',
};

describe('ProfessionalSummarySection', () => {
  let onSave: jest.Mock;

  beforeEach(() => {
    onSave = jest.fn().mockResolvedValue(undefined);
  });

  describe('dirty detection — Save button state', () => {
    it('is disabled when no fields have been changed', () => {
      render(<ProfessionalSummarySection initialData={MOCK_PROFILE} onSave={onSave} />);
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
    });

    it('enables after the headline is edited', async () => {
      const user = userEvent.setup();
      render(<ProfessionalSummarySection initialData={MOCK_PROFILE} onSave={onSave} />);
      const input = screen.getByLabelText(/headline/i);
      await user.clear(input);
      await user.type(input, 'Backend Engineer');
      expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled();
    });

    it('disables again when the headline is reverted to its original value', async () => {
      const user = userEvent.setup();
      render(<ProfessionalSummarySection initialData={MOCK_PROFILE} onSave={onSave} />);
      const input = screen.getByLabelText(/headline/i);
      await user.clear(input);
      await user.type(input, 'Backend Engineer');
      expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled();
      await user.clear(input);
      await user.type(input, 'Full Stack Engineer');
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
    });
  });

  describe('navigate-away guard — beforeunload listener', () => {
    it('adds a beforeunload listener when there are unsaved changes', async () => {
      const addSpy = jest.spyOn(window, 'addEventListener');
      const user = userEvent.setup();
      render(<ProfessionalSummarySection initialData={MOCK_PROFILE} onSave={onSave} />);
      const input = screen.getByLabelText(/headline/i);
      await user.clear(input);
      await user.type(input, 'Backend Engineer');
      expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      addSpy.mockRestore();
    });

    it('removes the beforeunload listener when changes are reverted', async () => {
      const removeSpy = jest.spyOn(window, 'removeEventListener');
      const user = userEvent.setup();
      render(<ProfessionalSummarySection initialData={MOCK_PROFILE} onSave={onSave} />);
      const input = screen.getByLabelText(/headline/i);
      await user.clear(input);
      await user.type(input, 'Backend Engineer');
      await user.clear(input);
      await user.type(input, 'Full Stack Engineer');
      expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      removeSpy.mockRestore();
    });
  });
});
