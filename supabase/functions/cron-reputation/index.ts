import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const APP_URL = Deno.env.get('NEXT_PUBLIC_APP_URL') ?? '';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!APP_URL) {
    return new Response(JSON.stringify({ error: 'NEXT_PUBLIC_APP_URL not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch(`${APP_URL}/api/reputation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CRON_SECRET ? { Authorization: `Bearer ${CRON_SECRET}` } : {}),
      },
    });

    const data = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        triggered: true,
        result: data,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
