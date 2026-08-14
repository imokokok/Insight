import { type NextRequest, NextResponse } from 'next/server';

import { createUserClient } from '@/lib/supabase/server';
import { createLogger, normalizeError } from '@/lib/utils/logger';

import { validateApiKey, type ApiKeyValidationResult } from '../apiKey';
import { ApiResponseBuilder } from '../response';

const logger = createLogger('auth-middleware');

export interface AuthContext {
  userId: string | null;
  email?: string;
  role?: string;
  accessToken?: string;
  apiKey?: ApiKeyValidationResult;
}

interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: string[];
  allowApiKey?: boolean;
}

type AuthMiddlewareResult =
  | { success: true; context: AuthContext }
  | { success: false; response: NextResponse };

async function extractBearerAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const client = createUserClient();

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
      accessToken: token,
    };
  } catch (error) {
    logger.error('Auth extraction failed', normalizeError(error));
    return null;
  }
}

async function extractApiKeyAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const apiKeyHeader = request.headers.get('x-api-key');
  if (!apiKeyHeader) {
    return null;
  }

  const validation = await validateApiKey(apiKeyHeader);
  if (!validation) {
    return null;
  }

  return {
    userId: validation.userId,
    apiKey: validation,
  };
}

async function extractAuthContext(
  request: NextRequest,
  allowApiKey = false
): Promise<AuthContext | null> {
  const bearerContext = await extractBearerAuthContext(request);
  if (bearerContext) {
    return bearerContext;
  }

  if (allowApiKey) {
    return extractApiKeyAuthContext(request);
  }

  return null;
}

export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  const { required = true, roles = [], allowApiKey = false } = options;

  return async (request: NextRequest): Promise<AuthMiddlewareResult> => {
    const authContext = await extractAuthContext(request, allowApiKey);

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
      return { success: true, context: { userId: null } };
    }

    if (roles.length > 0) {
      // API Key authentication does not carry role information — skip role
      // checks for API Key requests.  Role-based access control only applies
      // to Bearer token (user session) authentication.
      if (!authContext.apiKey) {
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
              ApiResponseBuilder.error('FORBIDDEN', 'Insufficient permissions'),
              { status: 403 }
            ),
          };
        }
      }
    }

    logger.debug('Authentication successful', { userId: authContext.userId });
    return { success: true, context: authContext };
  };
}
