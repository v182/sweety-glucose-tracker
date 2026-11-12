import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReadingForm } from './ReadingForm.jsx';

const today = '2026-10-15';
function setup(props = {}) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();
  render(<ReadingForm today={today} onSave={onSave} onCancel={onCancel} {...props} />);
  return { onSave, onCancel, user: userEvent.setup() };
}

describe('Reading form', () => {
  it('explains a missing value and does not send a request', async () => {
    const { onSave, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Save reading' }));
    expect(screen.getByText('Please enter a glucose value.')).toBeVisible();
    expect(screen.getByLabelText('Blood glucose')).toHaveAttribute('aria-invalid', 'true');
    expect(onSave).not.toHaveBeenCalled();
  });

  it.each(['39', '601', '99.5', '1e2', '-50', 'hello'])(
    'rejects invalid value %s',
    async (value) => {
      const { onSave, user } = setup();
      await user.type(screen.getByLabelText('Blood glucose'), value);
      await user.click(screen.getByRole('button', { name: 'Save reading' }));
      expect(
        screen.getByText('Value must be a whole number between 40 and 600 mg/dl.'),
      ).toBeVisible();
      expect(onSave).not.toHaveBeenCalled();
    },
  );

  it.each([40, 600])('sends boundary %i as a number with the selected slot', async (value) => {
    const { onSave, user } = setup();
    await user.type(screen.getByLabelText('Blood glucose'), String(value));
    await user.selectOptions(screen.getByLabelText('Time slot'), 'after_lunch');
    await user.click(screen.getByRole('button', { name: 'Save reading' }));
    expect(onSave).toHaveBeenCalledWith({ date: today, slot: 'after_lunch', value });
  });

  it('rejects a future date even if the date input restriction is bypassed', async () => {
    const { onSave, user } = setup();
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-16' } });
    await user.type(screen.getByLabelText('Blood glucose'), '120');
    await user.click(screen.getByRole('button', { name: 'Save reading' }));
    expect(screen.getByText('Date cannot be in the future.')).toBeVisible();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows a server duplicate error, keeps entered data, and permits correction', async () => {
    const message = 'You already have an After lunch reading for this date.';
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error(message), { fields: { slot: message } }))
      .mockResolvedValueOnce(undefined);
    const { user } = setup({ onSave, initial: { date: today, slot: 'after_lunch', value: 123 } });
    await user.click(screen.getByRole('button', { name: 'Save reading' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByLabelText('Blood glucose')).toHaveValue('123');
    expect(screen.getByLabelText('Time slot')).toHaveAttribute('aria-invalid', 'true');
    await user.selectOptions(screen.getByLabelText('Time slot'), 'after_dinner');
    await user.click(screen.getByRole('button', { name: 'Save reading' }));
    expect(onSave).toHaveBeenLastCalledWith({ date: today, slot: 'after_dinner', value: 123 });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('loads an existing reading and submits its edited value', async () => {
    const { onSave, user } = setup({
      initial: { id: 'existing', date: '2026-10-10', slot: 'after_breakfast', value: 144 },
    });
    expect(screen.getByLabelText('Date')).toHaveValue('2026-10-10');
    expect(screen.getByLabelText('Time slot')).toHaveValue('after_breakfast');
    await user.clear(screen.getByLabelText('Blood glucose'));
    await user.type(screen.getByLabelText('Blood glucose'), '135');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSave).toHaveBeenCalledWith({
      date: '2026-10-10',
      slot: 'after_breakfast',
      value: 135,
    });
  });

  it('prevents a second save and cancellation while a request is pending', async () => {
    let resolve;
    const onSave = vi.fn(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const { user } = setup({ onSave, initial: { value: 120 } });
    await user.click(screen.getByRole('button', { name: 'Save reading' }));
    expect(screen.getByRole('button', { name: /Saving/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Saving/ }));
    expect(onSave).toHaveBeenCalledTimes(1);
    await act(async () => resolve());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save reading' })).toBeEnabled());
  });

  it('cancels without saving', async () => {
    const { onSave, onCancel, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });
});
