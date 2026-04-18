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

jest.mock('@/lib/supabase/auth',  => ({
 signUp: jest.fn,
 signIn: jest.fn,
 signInWithOAuth: jest.fn,
 signOut: jest.fn,
 resetPassword: jest.fn,
 getSession: jest.fn,
 onAuthStateChange: jest.fn,
 createUserProfile: jest.fn,
 getUserProfile: jest.fn,
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
 expires_at: Date.now / 1000 + 3600,
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

beforeEach( => {
 jest.clearAllMocks;

 mockSubscription = {
 unsubscribe: jest.fn,
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

afterEach( => {
 const state = useAuthStore.getState;
 if (state.subscription) {
 state.cleanup;
 }
});

describe('authStore - Initial state',  => {
 it('shouldhaveInitial state',  => {
 const state = useAuthStore.getState;
 expect(state.user).toBeNull;
 expect(state.session).toBeNull;
 expect(state.profile).toBeNull;
 expect(state.loading).toBe(true);
 expect(state.error).toBeNull;
 expect(state.initialized).toBe(false);
 });
});

describe('authStore - initialize basic functionality',  => {
 it('initialize should successfully initialize and get session', async  => {
 (getSession as jest.Mock).mockResolvedValue({
 session: mockSession,
 error: null,
 });
 (getUserProfile as jest.Mock).mockResolvedValue({
 profile: mockProfile,
 error: null,
 });

 await act(async  => {
 await useAuthStore.getState.initialize;
 });

 const state = useAuthStore.getState;
 expect(state.user).toEqual(mockUser);
 expect(state.session).toEqual(mockSession);
 expect(state.profile).toEqual(mockProfile);
 expect(state.loading).toBe(false);
 expect(state.initialized).toBe(true);
 expect(state.error).toBeNull;
 });

 it('initialize should handle no session case', async  => {
 (getSession as jest.Mock).mockResolvedValue({
 session: null,
 error: null,
 });

 await act(async  => {
 await useAuthStore.getState.initialize;
 });

 const state = useAuthStore.getState;
 expect(state.user).toBeNull;
 expect(state.session).toBeNull;
 expect(state.profile).toBeNull;
 expect(state.loading).toBe(false);
 expect(state.initialized).toBe(true);
 });

 it('initialize should handle error case', async  => {
 const error = new Error('Network error');
 (getSession as jest.Mock).mockRejectedValue(error);

 await act(async  => {
 await useAuthStore.getState.initialize;
 });

 const state = useAuthStore.getState;
 expect(state.error).toEqual(error);
 expect(state.loading).toBe(false);
 expect(state.initialized).toBe(true);
 });
});

describe('authStore - initialize subscription management',  => {
 it('initialize should register auth state change listener', async  => {
 (getSession as jest.Mock).mockResolvedValue({
 session: null,
 error: null,
 });
 (onAuthStateChange as jest.Mock).mockReturnValue(mockSubscription);

 await act(async  => {
 await useAuthStore.getState.initialize;
 });

 expect(onAuthStateChange).toHaveBeenCalled;
 expect(useAuthStore.getState.subscription).toEqual(mockSubscription);
 });

 it('initialize should clean up previous subscription', async  => {
 const oldSubscription = { unsubscribe: jest.fn };
 useAuthStore.setState({
 subscription: oldSubscription as unknown as typeof mockSubscription,
 });

 (getSession as jest.Mock).mockResolvedValue({
 session: null,
 error: null,
 });

 await act(async  => {
 await useAuthStore.getState.initialize;
 });

 expect(oldSubscription.unsubscribe).toHaveBeenCalled;
 });

 it('cleanup shouldUnsubscribe',  => {
 useAuthStore.setState({
 subscription: mockSubscription as unknown as typeof mockSubscription,
 });

 act( => {
 useAuthStore.getState.cleanup;
 });

 expect(mockSubscription.unsubscribe).toHaveBeenCalled;
 expect(useAuthStore.getState.subscription).toBeNull;
 });
});

describe('authStore - setSession',  => {
 it('setSession shouldupdatesessionstate',  => {
 act( => {
 useAuthStore.getState.setSession(mockSession);
 });

 expect(useAuthStore.getState.session).toEqual(mockSession);
 });

 it('setSession shouldsettingsas null',  => {
 act( => {
 useAuthStore.getState.setSession(mockSession);
 });
 expect(useAuthStore.getState.session).toEqual(mockSession);

 act( => {
 useAuthStore.getState.setSession(null);
 });
 expect(useAuthStore.getState.session).toBeNull;
 });
});

describe('authStore - session token ',  => {
 it('sessionshouldinclude token ', async  => {
 (getSession as jest.Mock).mockResolvedValue({
 session: mockSession,
 error: null,
 });
 (getUserProfile as jest.Mock).mockResolvedValue({
 profile: mockProfile,
 error: null,
 });

 await act(async  => {
 await useAuthStore.getState.initialize;
 });

 const session = useAuthStore.getState.session;
 expect(session?.access_token).toBe('mock-access-token');
 expect(session?.refresh_token).toBe('mock-refresh-token');
 expect(session?.token_type).toBe('bearer');
 });
});

describe('authStore - setUser',  => {
 it('setUser shouldupdateuserstate',  => {
 act( => {
 useAuthStore.getState.setUser(mockUser);
 });

 expect(useAuthStore.getState.user).toEqual(mockUser);
 });

 it('setUser shouldsettingsas null',  => {
 act( => {
 useAuthStore.getState.setUser(mockUser);
 });
 expect(useAuthStore.getState.user).toEqual(mockUser);

 act( => {
 useAuthStore.getState.setUser(null);
 });
 expect(useAuthStore.getState.user).toBeNull;
 });
});

describe('authStore - setProfile',  => {
 it('setProfile shouldupdateuserstate',  => {
 act( => {
 useAuthStore.getState.setProfile(mockProfile);
 });

 expect(useAuthStore.getState.profile).toEqual(mockProfile);
 });

 it('setProfile shouldsettingsas null',  => {
 act( => {
 useAuthStore.getState.setProfile(mockProfile);
 });
 expect(useAuthStore.getState.profile).toEqual(mockProfile);

 act( => {
 useAuthStore.getState.setProfile(null);
 });
 expect(useAuthStore.getState.profile).toBeNull;
 });
});

describe('authStore - refreshProfile',  => {
 it('refreshProfile shouldrefreshuser', async  => {
 (getUserProfile as jest.Mock).mockResolvedValue({
 profile: mockProfile,
 error: null,
 });

 useAuthStore.setState({
 user: mockUser,
 session: mockSession,
 });

 await act(async  => {
 await useAuthStore.getState.refreshProfile;
 });

 expect(getUserProfile).toHaveBeenCalledWith(mockUser.id);
 expect(useAuthStore.getState.profile).toEqual(mockProfile);
 });

 it('refreshProfile notshouldinusernotinuse', async  => {
 useAuthStore.setState({ user: null });

 await act(async  => {
 await useAuthStore.getState.refreshProfile;
 });

 expect(getUserProfile).not.toHaveBeenCalled;
 });

 it('usernotinshouldcreatenew', async  => {
 (getUserProfile as jest.Mock).mockResolvedValue({
 profile: null,
 error: { message: 'No rows found' },
 });
 (createUserProfile as jest.Mock).mockResolvedValue({
 profile: mockProfile,
 error: null,
 });

 useAuthStore.setState({ user: mockUser, session: mockSession });

 await act(async  => {
 await useAuthStore.getState.refreshProfile;
 });

 expect(createUserProfile).toHaveBeenCalled;
 });
});

describe('authStore - signUp',  => {
 it('signUp shouldsuccessregisteruser', async  => {
 (authSignUp as jest.Mock).mockResolvedValue({
 user: mockUser,
 session: mockSession,
 error: null,
 });
 (getUserProfile as jest.Mock).mockResolvedValue({
 profile: mockProfile,
 error: null,
 });

 const result = await act(async  => {
 return useAuthStore.getState.signUp('test@example.com', 'password123', 'Test User');
 });

 expect(result.error).toBeNull;
 expect(useAuthStore.getState.user).toEqual(mockUser);
 expect(useAuthStore.getState.session).toEqual(mockSession);
 expect(useAuthStore.getState.loading).toBe(false);
 });

 it('signUp shouldhandleregistererror', async  => {
 (authSignUp as jest.Mock).mockResolvedValue({
 user: null,
 session: null,
 error: mockAuthError,
 });

 const result = await act(async  => {
 return useAuthStore.getState.signUp('test@example.com', 'password123');
 });

 expect(result.error).toEqual(mockAuthError);
 expect(useAuthStore.getState.error).toEqual(mockAuthError);
 });
});

describe('authStore - signIn',  => {
 it('signIn shouldsuccessloginuser', async  => {
 (authSignIn as jest.Mock).mockResolvedValue({
 user: mockUser,
 session: mockSession,
 error: null,
 });
 (getUserProfile as jest.Mock).mockResolvedValue({
 profile: mockProfile,
 error: null,
 });

 const result = await act(async  => {
 return useAuthStore.getState.signIn('test@example.com', 'password123');
 });

 expect(result.error).toBeNull;
 expect(useAuthStore.getState.user).toEqual(mockUser);
 expect(useAuthStore.getState.session).toEqual(mockSession);
 expect(useAuthStore.getState.profile).toEqual(mockProfile);
 });

 it('signIn shouldhandleloginerror', async  => {
 (authSignIn as jest.Mock).mockResolvedValue({
 user: null,
 session: null,
 error: mockAuthError,
 });

 const result = await act(async  => {
 return useAuthStore.getState.signIn('test@example.com', 'wrong-password');
 });

 expect(result.error).toEqual(mockAuthError);
 expect(useAuthStore.getState.error).toEqual(mockAuthError);
 });
});

describe('authStore - signInWithOAuth',  => {
 it('signInWithOAuth shouldsuccess OAuth login', async  => {
 (authSignInWithOAuth as jest.Mock).mockResolvedValue({
 error: null,
 });

 const result = await act(async  => {
 return useAuthStore.getState.signInWithOAuth('google');
 });

 expect(result.error).toBeNull;
 expect(authSignInWithOAuth).toHaveBeenCalledWith('google');
 });

 it('signInWithOAuth shouldhandle OAuth error', async  => {
 const oauthError = { ...mockAuthError, message: 'OAuth failed' };
 (authSignInWithOAuth as jest.Mock).mockResolvedValue({
 error: oauthError,
 });

 const result = await act(async  => {
 return useAuthStore.getState.signInWithOAuth('github');
 });

 expect(result.error).toEqual(oauthError);
 });
});

describe('authStore - signOut',  => {
 it('signOut shouldsuccessuser', async  => {
 useAuthStore.setState({
 user: mockUser,
 session: mockSession,
 profile: mockProfile,
 });

 (authSignOut as jest.Mock).mockResolvedValue({
 error: null,
 });

 const result = await act(async  => {
 return useAuthStore.getState.signOut;
 });

 expect(result.error).toBeNull;
 expect(useAuthStore.getState.user).toBeNull;
 expect(useAuthStore.getState.session).toBeNull;
 expect(useAuthStore.getState.profile).toBeNull;
 expect(useAuthStore.getState.loading).toBe(false);
 });

 it('signOut shouldhandleerror', async  => {
 useAuthStore.setState({
 user: mockUser,
 session: mockSession,
 });

 (authSignOut as jest.Mock).mockResolvedValue({
 error: mockAuthError,
 });

 const result = await act(async  => {
 return useAuthStore.getState.signOut;
 });

 expect(result.error).toEqual(mockAuthError);
 expect(useAuthStore.getState.error).toEqual(mockAuthError);
 });
});

describe('authStore - resetPassword',  => {
 it('resetPassword shouldsuccesssendreset', async  => {
 (authResetPassword as jest.Mock).mockResolvedValue({
 error: null,
 });

 const result = await act(async  => {
 return useAuthStore.getState.resetPassword('test@example.com');
 });

 expect(result.error).toBeNull;
 expect(authResetPassword).toHaveBeenCalledWith('test@example.com');
 });

 it('resetPassword shouldhandlereseterror', async  => {
 const resetError = { ...mockAuthError, message: 'Email not found' };
 (authResetPassword as jest.Mock).mockResolvedValue({
 error: resetError,
 });

 const result = await act(async  => {
 return useAuthStore.getState.resetPassword('nonexistent@example.com');
 });

 expect(result.error).toEqual(resetError);
 });
});

describe('authStore - errorhandle',  => {
 it('setError shouldsettingserror',  => {
 const error = new Error('Test error');
 act( => {
 useAuthStore.getState.setError(error);
 });

 expect(useAuthStore.getState.error).toEqual(error);
 });

 it('clearError shoulderror',  => {
 useAuthStore.setState({ error: mockAuthError });

 act( => {
 useAuthStore.getState.clearError;
 });

 expect(useAuthStore.getState.error).toBeNull;
 });

 it('setLoading shouldsettingsloadstate',  => {
 act( => {
 useAuthStore.getState.setLoading(false);
 });
 expect(useAuthStore.getState.loading).toBe(false);

 act( => {
 useAuthStore.getState.setLoading(true);
 });
 expect(useAuthStore.getState.loading).toBe(true);
 });
});

describe('authStore - authenticationstatelisten',  => {
 it('shouldresponse SIGNED_IN event', async  => {
 let authCallback: (event: string, session: Session | null) => void =  => {};
 (onAuthStateChange as jest.Mock).mockImplementation(
 (callback: (event: string, session: Session | null) => void) => {
 authCallback = callback;
 return mockSubscription;
 }
 );
 (getSession as jest.Mock).mockResolvedValue({ session: null, error: null });
 (getUserProfile as jest.Mock).mockResolvedValue({ profile: mockProfile, error: null });

 await act(async  => {
 await useAuthStore.getState.initialize;
 });

 await act(async  => {
 authCallback('SIGNED_IN', mockSession);
 });

 expect(useAuthStore.getState.user).toEqual(mockUser);
 expect(useAuthStore.getState.session).toEqual(mockSession);
 });

 it('shouldresponse SIGNED_OUT event', async  => {
 let authCallback: (event: string, session: Session | null) => void =  => {};
 (onAuthStateChange as jest.Mock).mockImplementation(
 (callback: (event: string, session: Session | null) => void) => {
 authCallback = callback;
 return mockSubscription;
 }
 );
 (getSession as jest.Mock).mockResolvedValue({ session: mockSession, error: null });
 (getUserProfile as jest.Mock).mockResolvedValue({ profile: mockProfile, error: null });

 await act(async  => {
 await useAuthStore.getState.initialize;
 });

 expect(useAuthStore.getState.user).not.toBeNull;

 await act(async  => {
 authCallback('SIGNED_OUT', null);
 });

 expect(useAuthStore.getState.user).toBeNull;
 expect(useAuthStore.getState.session).toBeNull;
 expect(useAuthStore.getState.profile).toBeNull;
 });
});

describe('authStore - Hooks test',  => {
 it('useUser hook shouldreturnuserstate',  => {
 const { result } = renderHook( => useAuthStore((state) => state.user));
 expect(result.current).toBeNull;
 });

 it('useSession hook shouldreturnsessionstate',  => {
 const { result } = renderHook( => useAuthStore((state) => state.session));
 expect(result.current).toBeNull;
 });

 it('useProfile hook shouldreturnuserstate',  => {
 const { result } = renderHook( => useAuthStore((state) => state.profile));
 expect(result.current).toBeNull;
 });

 it('useAuthLoading hook shouldreturnloadstate',  => {
 const { result } = renderHook( => useAuthStore((state) => state.loading));
 expect(result.current).toBe(true);
 });

 it('useAuthError hook shouldreturnerrorstate',  => {
 const { result } = renderHook( => useAuthStore((state) => state.error));
 expect(result.current).toBeNull;
 });

 it('useAuthInitialized hook shouldreturninitializestate',  => {
 const { result } = renderHook( => useAuthStore((state) => state.initialized));
 expect(result.current).toBe(false);
 });

 it('useIsAuthenticated hook shouldinuserloginreturn false',  => {
 const { result } = renderHook( => useAuthStore((state) => !!state.user));
 expect(result.current).toBe(false);
 });

 it('useIsAuthenticated hook shouldinuserloginafterreturn true',  => {
 useAuthStore.setState({ user: mockUser });

 const { result } = renderHook( => useAuthStore((state) => !!state.user));
 expect(result.current).toBe(true);
 });
});

describe('authStore - configuration',  => {
 it('profile as null notshould',  => {
 useAuthStore.setState({ profile: null });

 const state = useAuthStore.getState;
 expect(state.profile).toBeNull;
 });

 it('profile shouldwithbesettingsandget',  => {
 const profileWithDates = {
 ...mockProfile,
 created_at: new Date('2024-01-01T00:00:00Z'),
 updated_at: new Date('2024-01-01T00:00:00Z'),
 };

 useAuthStore.setState({ profile: profileWithDates });

 const state = useAuthStore.getState;
 expect(state.profile).toEqual(profileWithDates);
 expect(state.profile?.created_at).toBeInstanceOf(Date);
 expect(state.profile?.updated_at).toBeInstanceOf(Date);
 });

 it('session notshould setSession （ Supabase cookie ）',  => {
 useAuthStore.setState({
 session: mockSession,
 profile: mockProfile,
 });

 const state = useAuthStore.getState;
 expect(state.session).toEqual(mockSession);
 expect(state.profile).toEqual(mockProfile);
 });

 it('user notshouldbe（from session ）',  => {
 useAuthStore.setState({
 user: mockUser,
 session: mockSession,
 profile: mockProfile,
 });

 const state = useAuthStore.getState;
 expect(state.user).toEqual(mockUser);
 });
});
