import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobForm } from '@/components/dashboard/JobForm';
import { JobFormModal } from '@/components/dashboard/JobFormModal';

describe('SCRUM-25 - JobForm', () => {
  it('happy path: submits valid form data', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onCancel = jest.fn();

    const { container } = render(<JobForm onSubmit={onSubmit} onCancel={onCancel} />);

    await user.type(screen.getByPlaceholderText(/software engineer/i), 'Frontend Engineer');
    await user.type(screen.getByPlaceholderText(/acme corp/i), 'Acme');
    await user.type(screen.getByPlaceholderText(/new york, ny/i), 'Remote');

    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;

    expect(submitButton).toBeTruthy();

    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Frontend Engineer',
      company: 'Acme',
      location: 'Remote',
      pipelineStage: 'Interested',
      deadline: '',
      deadlineTime: '08:00',
      priorityFlag: false,
    });
  });

  it('validation failure: blocks submit when required fields are empty', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const onCancel = jest.fn();

    const { container } = render(<JobForm onSubmit={onSubmit} onCancel={onCancel} />);

    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;

    await user.click(submitButton);

    expect(await screen.findByText(/job title is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/company is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('loading state: disables controls while submitting', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();

    let resolveSubmit!: () => void;
    const onSubmit = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );

    const { container } = render(<JobForm onSubmit={onSubmit} onCancel={onCancel} />);

    const titleInput = screen.getByPlaceholderText(/software engineer/i);
    const companyInput = screen.getByPlaceholderText(/acme corp/i);
    const locationInput = screen.getByPlaceholderText(/new york, ny/i);
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;

    await user.type(titleInput, 'Frontend Engineer');
    await user.type(companyInput, 'Acme');
    await user.type(locationInput, 'Remote');

    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(titleInput).toBeDisabled();
    expect(companyInput).toBeDisabled();
    expect(locationInput).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(submitButton).toBeDisabled();

    resolveSubmit();
  });
});

describe('SCRUM-25 - JobFormModal', () => {
  it('cancel: closes the modal when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(<JobFormModal onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /add job/i }));

    expect(screen.getByPlaceholderText(/software engineer/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/software engineer/i)).not.toBeInTheDocument();
    });
  });
});
