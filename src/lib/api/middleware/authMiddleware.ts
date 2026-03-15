import { NextRequest, NextResponse } from 'next/server';
import { AuthenticationError, AuthorizationError } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';
import { ApiResponseBuilder } from '../response';

const logger = createLogger('auth-middleware');

export interface AuthContext {
  userId: string;
  email?: string;
  role?: string;
}

export interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: string[];
}

export type AuthMiddlewareResult =
  | { success: true; context: AuthContext }
  | { success: false; response: NextResponse };

export async function extractAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.warn('Supabase configuration missing');
    return null;
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error,
    } = await client.auth.getUser(token);

    if (error || !user) {
      logger.debug('Token validation failed', { error: error?.message });
      return null;
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.user_metadata?.role,
    };
  } catch (error) {
    logger.error(
      'Auth extraction failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  const { required = true, roles = [] } = options;

  return async (request: NextRequest): Promise<AuthMiddlewareResult> => {
    const authContext = await extractAuthContext(request);

    if (!authContext) {
      if (required) {
        logger.warn('Authentication required but no valid auth context found');
        return {
          success: false,
          response: NextResponse.json(
            ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required', {
              i18nKey: 'errors.authentication',
            }),
            { status: 401 }
          ),
        };
      }
      return { success: true, context: { userId: '' } };
    }

    if (roles.length > 0) {
      const userRole = authContext.role;
      if (!userRole || !roles.includes(userRole)) {
        logger.warn('Authorization failed', {
          userId: authContext.userId,
          requiredRoles: roles,
          userRole,
        });
        return {
          success: false,
          response: NextResponse.json(
            ApiResponseBuilder.error('FORBIDDEN', 'Insufficient permissions', {
              i18nKey: 'errors.authorization',
              details: { requiredRoles: roles },
            }),
            { status: 403 }
          ),
        };
      }
    }

    logger.debug('Authentication successful', { userId: authContext.userId });
    return { success: true, context: authContext };
  };
}

export const requireAuth = createAuthMiddleware({ required: true });
export const optionalAuth = createAuthMiddleware({ required: false });

export function requireRoles(...roles: string[]) {
  return createAuthMiddleware({ required: true, roles });
}

export async function getUserId(request: NextRequest): Promise<string | null> {
  const authContext = await extractAuthContext(request);
  return authContext?.userId ?? null;
}
