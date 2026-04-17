import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { ProfilePanel } from '../ProfilePanel';

jest.mock('@/lib/supabase/auth', () => ({
  updateUserProfile: jest.fn(),
}));

jest.mock('@/stores/authStore', () => ({
  useUser: () => ({
    id: 'test-user-id',
    email: 'test@example.com',
  }),
  useProfile: () => ({
    display_name: 'Test User',
    avatar_url: null,
  }),
  useAuthActions: () => ({
    refreshProfile: jest.fn(),
  }),
}));

describe('ProfilePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render profile settings title', () => {
    render(<ProfilePanel />);

    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    expect(screen.getByText('Manage your profile information')).toBeInTheDocument();
  });

  it('should render display name input', () => {
    render(<ProfilePanel />);

    expect(screen.getByLabelText('Display Name')).toBeInTheDocument();
  });

  it('should render email input as disabled', () => {
    render(<ProfilePanel />);

    const emailInput = screen.getByLabelText('Text');
    expect(emailInput).toBeDisabled();
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('should render save button', () => {
    render(<ProfilePanel />);

    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('should render password management section', () => {
    render(<ProfilePanel />);

    expect(screen.getByText('Password Management')).toBeInTheDocument();
    expect(screen.getByText('Change Password')).toBeInTheDocument();
  });

  it('should show password form when change password button is clicked', () => {
    render(<ProfilePanel />);

    const changePasswordBtn = screen.getByRole('button', { name: /change password/i });
    fireEvent.click(changePasswordBtn);

    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
  });

  it('should hide password form when cancel is clicked', () => {
    render(<ProfilePanel />);

    const changePasswordBtn = screen.getByRole('button', { name: /change password/i });
    fireEvent.click(changePasswordBtn);

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByLabelText('New Password')).not.toBeInTheDocument();
  });

  it('should allow display name input change', () => {
    render(<ProfilePanel />);

    const displayNameInput = screen.getByLabelText('Display Name') as HTMLInputElement;
    fireEvent.change(displayNameInput, { target: { value: 'New Name' } });

    expect(displayNameInput.value).toBe('New Name');
  });

  it('should show password validation error for short password', async () => {
    render(<ProfilePanel />);

    const changePasswordBtn = screen.getByRole('button', { name: /change password/i });
    fireEvent.click(changePasswordBtn);

    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');

    fireEvent.change(newPasswordInput, { target: { value: '123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: '123' } });

    const updateBtn = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
  });

  it('should show password mismatch error', async () => {
    render(<ProfilePanel />);

    const changePasswordBtn = screen.getByRole('button', { name: /change password/i });
    fireEvent.click(changePasswordBtn);

    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');

    fireEvent.change(newPasswordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } });

    const updateBtn = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('should render upload avatar button', () => {
    render(<ProfilePanel />);

    expect(screen.getByText('Upload Avatar')).toBeInTheDocument();
  });
});
