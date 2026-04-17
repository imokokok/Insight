import { act, renderHook } from '@testing-library/react';

import {
  signUp as authSignUp,
  signIn as authSignIn,
  signInWithOAuth as authSignInWithOAuth,
  signOut as authSignOut,
  resetPassword as authResetPassword,
  getSession,
  onAuthStateChange,
  createUserProfile,
  getUserProfile,
} from '@/lib/supabase/auth';

import { useAuthStore } from '../authStore';

import type { User, Session, AuthError } from '@supabase/supabase-js';

jest.mock('@/lib/supabase/auth', () => ({
  signUp: jest.fn(),
  signIn: jest.fn(),
  signInWithOAuth: jest.fn(),
  signOut: jest.fn(),
  resetPassword: jest.fn(),
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(),
  createUserProfile: jest.fn(),
  getUserProfile: jest.fn(),
}));

const mockUser: User = {
  id: 'test-user-id',
  app_metadata: {},
  user_metadata: { display_name: 'Test User' },
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
  email: 'test@example.com',
  email_confirmed_at: '2024-01-01T00:00:00Z',
  phone: '',
  confirmed_at: '2024-01-01T00:00:00Z',
  last_sign_in_at: '2024-01-01T00:00:00Z',
  role: 'authenticated',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: mockUser,
};

const mockProfile = {
  id: 'test-user-id',
  display_name: 'Test User',
  avatar_url: null,
  preferences: {},
  notification_settings: {
    email_alerts: true,
  },
};

const mockAuthError: AuthError = {
  name: 'AuthError',
  message: 'Invalid credentials',
  status: 400,
};

let mockSubscription: { unsubscribe: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();

  mockSubscription = {
    unsubscribe: jest.fn(),
  };

  useAuthStore.setState({
    user: null,
    session: null,
    profile: null,
    loading: true,
    error: null,
    initialized: false,
    subscription: null,
  });

  (onAuthStateChange as jest.Mock).mockReturnValue(mockSubscription);
});

afterEach(() => {
  const state = useAuthStore.getState();
  if (state.subscription) {
    state.cleanup();
  }
});

describe('authStore - 初始状态', () => {
  it('应该有正确的初始状态', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
    expect(state.initialized).toBe(false);
  });
});

describe('authStore - initialize 基础功能', () => {
  it('initialize 应该成功初始化并获取会话', async () => {
    (getSession as jest.Mock).mockResolvedValue({
      session: mockSession,
      error: null,
    });
    (getUserProfile as jest.Mock).mockResolvedValue({
      profile: mockProfile,
      error: null,
    });

    await act(async () => {
      await useAuthStore.getState().initialize();
    });

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.session).toEqual(mockSession);
    expect(state.profile).toEqual(mockProfile);
    expect(state.loading).toBe(false);
    expect(state.initialized).toBe(true);
    expect(state.error).toBeNull();
  });

  it('initialize 应该处理无会话的情况', async () => {
    (getSession as jest.Mock).mockResolvedValue({
      session: null,
      error: null,
    });

    await act(async () => {
      await useAuthStore.getState().initialize();
    });

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.initialized).toBe(true);
  });

  it('initialize 应该处理错误情况', async () => {
    const error = new Error('Network error');
    (getSession as jest.Mock).mockRejectedValue(error);

    await act(async () => {
      await useAuthStore.getState().initialize();
    });

    const state = useAuthStore.getState();
    expect(state.error).toEqual(error);
    expect(state.loading).toBe(false);
    expect(state.initialized).toBe(true);
  });
});

describe('authStore - initialize 订阅管理', () => {
  it('initialize 应该注册认证状态变化监听器', async () => {
    (getSession as jest.Mock).mockResolvedValue({
      session: null,
      error: null,
    });
    (onAuthStateChange as jest.Mock).mockReturnValue(mockSubscription);

    await act(async () => {
      await useAuthStore.getState().initialize();
    });

    expect(onAuthStateChange).toHaveBeenCalled();
    expect(useAuthStore.getState().subscription).toEqual(mockSubscription);
  });

  it('initialize 应该清理之前的订阅', async () => {
    const oldSubscription = { unsubscribe: jest.fn() };
    useAuthStore.setState({
      subscription: oldSubscription as unknown as typeof mockSubscription,
    });

    (getSession as jest.Mock).mockResolvedValue({
      session: null,
      error: null,
    });

    await act(async () => {
      await useAuthStore.getState().initialize();
    });

    expect(oldSubscription.unsubscribe).toHaveBeenCalled();
  });

  it('cleanup 应该取消订阅', () => {
    useAuthStore.setState({
      subscription: mockSubscription as unknown as typeof mockSubscription,
    });

    act(() => {
      useAuthStore.getState().cleanup();
    });

    expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    expect(useAuthStore.getState().subscription).toBeNull();
  });
});

describe('authStore - setSession', () => {
  it('setSession 应该更新会话状态', () => {
    act(() => {
      useAuthStore.getState().setSession(mockSession);
    });

    expect(useAuthStore.getState().session).toEqual(mockSession);
  });

  it('setSession 应该能够设置为 null', () => {
    act(() => {
      useAuthStore.getState().setSession(mockSession);
    });
    expect(useAuthStore.getState().session).toEqual(mockSession);

    act(() => {
      useAuthStore.getState().setSession(null);
    });
    expect(useAuthStore.getState().session).toBeNull();
  });
});

describe('authStore - 会话 token 信息', () => {
  it('会话应该包含正确的 token 信息', async () => {
    (getSession as jest.Mock).mockResolvedValue({
      session: mockSession,
      error: null,
    });
    (getUserProfile as jest.Mock).mockResolvedValue({
      profile: mockProfile,
      error: null,
    });

    await act(async () => {
      await useAuthStore.getState().initialize();
    });

    const session = useAuthStore.getState().session;
    expect(session?.access_token).toBe('mock-access-token');
    expect(session?.refresh_token).toBe('mock-refresh-token');
    expect(session?.token_type).toBe('bearer');
  });
});

describe('authStore - setUser', () => {
  it('setUser 应该更新用户状态', () => {
    act(() => {
      useAuthStore.getState().setUser(mockUser);
    });

    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('setUser 应该能够设置为 null', () => {
    act(() => {
      useAuthStore.getState().setUser(mockUser);
    });
    expect(useAuthStore.getState().user).toEqual(mockUser);

    act(() => {
      useAuthStore.getState().setUser(null);
    });
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe('authStore - setProfile', () => {
  it('setProfile 应该更新用户资料状态', () => {
    act(() => {
      useAuthStore.getState().setProfile(mockProfile);
    });

    expect(useAuthStore.getState().profile).toEqual(mockProfile);
  });

  it('setProfile 应该能够设置为 null', () => {
    act(() => {
      useAuthStore.getState().setProfile(mockProfile);
    });
    expect(useAuthStore.getState().profile).toEqual(mockProfile);

    act(() => {
      useAuthStore.getState().setProfile(null);
    });
    expect(useAuthStore.getState().profile).toBeNull();
  });
});

describe('authStore - refreshProfile', () => {
  it('refreshProfile 应该刷新用户资料', async () => {
    (getUserProfile as jest.Mock).mockResolvedValue({
      profile: mockProfile,
      error: null,
    });

    useAuthStore.setState({
      user: mockUser,
      session: mockSession,
    });

    await act(async () => {
      await useAuthStore.getState().refreshProfile();
    });

    expect(getUserProfile).toHaveBeenCalledWith(mockUser.id);
    expect(useAuthStore.getState().profile).toEqual(mockProfile);
  });

  it('refreshProfile 不应该在用户不存在时调用', async () => {
    useAuthStore.setState({ user: null });

    await act(async () => {
      await useAuthStore.getState().refreshProfile();
    });

    expect(getUserProfile).not.toHaveBeenCalled();
  });

  it('用户不存在时应该创建新资料', async () => {
    (getUserProfile as jest.Mock).mockResolvedValue({
      profile: null,
      error: { message: 'No rows found' },
    });
    (createUserProfile as jest.Mock).mockResolvedValue({
      profile: mockProfile,
      error: null,
    });

    useAuthStore.setState({ user: mockUser, session: mockSession });

    await act(async () => {
      await useAuthStore.getState().refreshProfile();
    });

    expect(createUserProfile).toHaveBeenCalled();
  });
});

describe('authStore - signUp', () => {
  it('signUp 应该成功注册用户', async () => {
    (authSignUp as jest.Mock).mockResolvedValue({
      user: mockUser,
      session: mockSession,
      error: null,
    });
    (getUserProfile as jest.Mock).mockResolvedValue({
      profile: mockProfile,
      error: null,
    });

    const result = await act(async () => {
      return useAuthStore.getState().signUp('test@example.com', 'password123', 'Test User');
    });

    expect(result.error).toBeNull();
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().session).toEqual(mockSession);
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('signUp 应该处理注册错误', async () => {
    (authSignUp as jest.Mock).mockResolvedValue({
      user: null,
      session: null,
      error: mockAuthError,
    });

    const result = await act(async () => {
      return useAuthStore.getState().signUp('test@example.com', 'password123');
    });

    expect(result.error).toEqual(mockAuthError);
    expect(useAuthStore.getState().error).toEqual(mockAuthError);
  });
});

describe('authStore - signIn', () => {
  it('signIn 应该成功登录用户', async () => {
    (authSignIn as jest.Mock).mockResolvedValue({
      user: mockUser,
      session: mockSession,
      error: null,
    });
    (getUserProfile as jest.Mock).mockResolvedValue({
      profile: mockProfile,
      error: null,
    });

    const result = await act(async () => {
      return useAuthStore.getState().signIn('test@example.com', 'password123');
    });

    expect(result.error).toBeNull();
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().session).toEqual(mockSession);
    expect(useAuthStore.getState().profile).toEqual(mockProfile);
  });

  it('signIn 应该处理登录错误', async () => {
    (authSignIn as jest.Mock).mockResolvedValue({
      user: null,
      session: null,
      error: mockAuthError,
    });

    const result = await act(async () => {
      return useAuthStore.getState().signIn('test@example.com', 'wrong-password');
    });

    expect(result.error).toEqual(mockAuthError);
    expect(useAuthStore.getState().error).toEqual(mockAuthError);
  });
});

describe('authStore - signInWithOAuth', () => {
  it('signInWithOAuth 应该成功发起 OAuth 登录', async () => {
    (authSignInWithOAuth as jest.Mock).mockResolvedValue({
      error: null,
    });

    const result = await act(async () => {
      return useAuthStore.getState().signInWithOAuth('google');
    });

    expect(result.error).toBeNull();
    expect(authSignInWithOAuth).toHaveBeenCalledWith('google');
  });

  it('signInWithOAuth 应该处理 OAuth 错误', async () => {
    const oauthError = { ...mockAuthError, message: 'OAuth failed' };
    (authSignInWithOAuth as jest.Mock).mockResolvedValue({
      error: oauthError,
    });

    const result = await act(async () => {
      return useAuthStore.getState().signInWithOAuth('github');
    });

    expect(result.error).toEqual(oauthError);
  });
});

describe('authStore - signOut', () => {
  it('signOut 应该成功登出用户', async () => {
    useAuthStore.setState({
      user: mockUser,
      session: mockSession,
      profile: mockProfile,
    });

    (authSignOut as jest.Mock).mockResolvedValue({
      error: null,
    });

    const result = await act(async () => {
      return useAuthStore.getState().signOut();
    });

    expect(result.error).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().profile).toBeNull();
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('signOut 应该处理登出错误', async () => {
    useAuthStore.setState({
      user: mockUser,
      session: mockSession,
    });

    (authSignOut as jest.Mock).mockResolvedValue({
      error: mockAuthError,
    });

    const result = await act(async () => {
      return useAuthStore.getState().signOut();
    });

    expect(result.error).toEqual(mockAuthError);
    expect(useAuthStore.getState().error).toEqual(mockAuthError);
  });
});

describe('authStore - resetPassword', () => {
  it('resetPassword 应该成功发送重置邮件', async () => {
    (authResetPassword as jest.Mock).mockResolvedValue({
      error: null,
    });

    const result = await act(async () => {
      return useAuthStore.getState().resetPassword('test@example.com');
    });

    expect(result.error).toBeNull();
    expect(authResetPassword).toHaveBeenCalledWith('test@example.com');
  });

  it('resetPassword 应该处理重置错误', async () => {
    const resetError = { ...mockAuthError, message: 'Email not found' };
    (authResetPassword as jest.Mock).mockResolvedValue({
      error: resetError,
    });

    const result = await act(async () => {
      return useAuthStore.getState().resetPassword('nonexistent@example.com');
    });

    expect(result.error).toEqual(resetError);
  });
});

describe('authStore - 错误处理', () => {
  it('setError 应该设置错误', () => {
    const error = new Error('Test error');
    act(() => {
      useAuthStore.getState().setError(error);
    });

    expect(useAuthStore.getState().error).toEqual(error);
  });

  it('clearError 应该清除错误', () => {
    useAuthStore.setState({ error: mockAuthError });

    act(() => {
      useAuthStore.getState().clearError();
    });

    expect(useAuthStore.getState().error).toBeNull();
  });

  it('setLoading 应该设置加载状态', () => {
    act(() => {
      useAuthStore.getState().setLoading(false);
    });
    expect(useAuthStore.getState().loading).toBe(false);

    act(() => {
      useAuthStore.getState().setLoading(true);
    });
    expect(useAuthStore.getState().loading).toBe(true);
  });
});

describe('authStore - 认证状态变化监听', () => {
  it('应该响应 SIGNED_IN 事件', async () => {
    let authCallback: (event: string, session: Session | null) => void = () => {};
    (onAuthStateChange as jest.Mock).mockImplementation(
      (callback: (event: string, session: Session | null) => void) => {
        authCallback = callback;
        return mockSubscription;
      }
    );
    (getSession as jest.Mock).mockResolvedValue({ session: null, error: null });
    (getUserProfile as jest.Mock).mockResolvedValue({ profile: mockProfile, error: null });

    await act(async () => {
      await useAuthStore.getState().initialize();
    });

    await act(async () => {
      authCallback('SIGNED_IN', mockSession);
    });

    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().session).toEqual(mockSession);
  });

  it('应该响应 SIGNED_OUT 事件', async () => {
    let authCallback: (event: string, session: Session | null) => void = () => {};
    (onAuthStateChange as jest.Mock).mockImplementation(
      (callback: (event: string, session: Session | null) => void) => {
        authCallback = callback;
        return mockSubscription;
      }
    );
    (getSession as jest.Mock).mockResolvedValue({ session: mockSession, error: null });
    (getUserProfile as jest.Mock).mockResolvedValue({ profile: mockProfile, error: null });

    await act(async () => {
      await useAuthStore.getState().initialize();
    });

    expect(useAuthStore.getState().user).not.toBeNull();

    await act(async () => {
      authCallback('SIGNED_OUT', null);
    });

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().profile).toBeNull();
  });
});

describe('authStore - Hooks 测试', () => {
  it('useUser hook 应该返回用户状态', () => {
    const { result } = renderHook(() => useAuthStore((state) => state.user));
    expect(result.current).toBeNull();
  });

  it('useSession hook 应该返回会话状态', () => {
    const { result } = renderHook(() => useAuthStore((state) => state.session));
    expect(result.current).toBeNull();
  });

  it('useProfile hook 应该返回用户资料状态', () => {
    const { result } = renderHook(() => useAuthStore((state) => state.profile));
    expect(result.current).toBeNull();
  });

  it('useAuthLoading hook 应该返回加载状态', () => {
    const { result } = renderHook(() => useAuthStore((state) => state.loading));
    expect(result.current).toBe(true);
  });

  it('useAuthError hook 应该返回错误状态', () => {
    const { result } = renderHook(() => useAuthStore((state) => state.error));
    expect(result.current).toBeNull();
  });

  it('useAuthInitialized hook 应该返回初始化状态', () => {
    const { result } = renderHook(() => useAuthStore((state) => state.initialized));
    expect(result.current).toBe(false);
  });

  it('useIsAuthenticated hook 应该在用户未登录时返回 false', () => {
    const { result } = renderHook(() => useAuthStore((state) => !!state.user));
    expect(result.current).toBe(false);
  });

  it('useIsAuthenticated hook 应该在用户登录后返回 true', () => {
    useAuthStore.setState({ user: mockUser });

    const { result } = renderHook(() => useAuthStore((state) => !!state.user));
    expect(result.current).toBe(true);
  });
});

describe('authStore - 持久化配置', () => {
  it('profile 为 null 时不应该报错', () => {
    useAuthStore.setState({ profile: null });

    const state = useAuthStore.getState();
    expect(state.profile).toBeNull();
  });

  it('profile 应该可以被设置和获取', () => {
    const profileWithDates = {
      ...mockProfile,
      created_at: new Date('2024-01-01T00:00:00Z'),
      updated_at: new Date('2024-01-01T00:00:00Z'),
    };

    useAuthStore.setState({ profile: profileWithDates });

    const state = useAuthStore.getState();
    expect(state.profile).toEqual(profileWithDates);
    expect(state.profile?.created_at).toBeInstanceOf(Date);
    expect(state.profile?.updated_at).toBeInstanceOf(Date);
  });

  it('session 不应该通过 setSession 持久化（由 Supabase cookie 管理）', () => {
    useAuthStore.setState({
      session: mockSession,
      profile: mockProfile,
    });

    const state = useAuthStore.getState();
    expect(state.session).toEqual(mockSession);
    expect(state.profile).toEqual(mockProfile);
  });

  it('user 不应该被持久化（从 session 派生）', () => {
    useAuthStore.setState({
      user: mockUser,
      session: mockSession,
      profile: mockProfile,
    });

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
  });
});
