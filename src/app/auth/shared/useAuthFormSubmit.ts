import { useState } from 'react';

interface AuthFormState {
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
}

export function useAuthFormSubmit() {
  const [state, setState] = useState<AuthFormState>({
    isLoading: false,
    isSuccess: false,
    error: null,
  });

  const submit = async (action: () => Promise<{ error?: { message?: string } | null }>) => {
    setState({ isLoading: true, isSuccess: false, error: null });
    try {
      const result = await action();
      if (result.error) {
        setState({
          isLoading: false,
          isSuccess: false,
          error: result.error.message || 'An error occurred',
        });
      } else {
        setState({ isLoading: false, isSuccess: true, error: null });
      }
    } catch (err) {
      setState({
        isLoading: false,
        isSuccess: false,
        error: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    }
  };

  const clearError = () => setState((prev) => ({ ...prev, error: null }));

  const reset = () => setState({ isLoading: false, isSuccess: false, error: null });

  const setError = (message: string) => setState((prev) => ({ ...prev, error: message }));

  return { ...state, submit, clearError, reset, setError };
}
