import { type NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

import { ApiResponseBuilder } from '../response';

const logger = createLogger('auth-middleware');

export interface AuthContext {
  userId: string | null;
  email?: string;
  role?: string;
}

export interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: string[];
}

type AuthMiddlewareResult =
  | { success: true; context: AuthContext }
  | { success: false; response: NextResponse };

export async function extractAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const client = createServerClient();

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
      role: user.app_metadata?.role,
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
            ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required'),
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
