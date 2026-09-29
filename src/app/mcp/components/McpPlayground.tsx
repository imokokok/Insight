'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { AlertCircle, FileJson, Loader2, Play, Terminal, Wrench } from 'lucide-react';

import { CodeBlock } from '@/components/shared/CodeBlock';
import { Button } from '@/components/ui/Button';
import { useSession } from '@/stores/authStore';

import { useMcpClient } from '../hooks/useMcpClient';

import { McpToolParamsForm, type ToolInputSchema } from './McpToolParamsForm';
import { parseToolsList, type McpTool } from './mcpToolValidation';

interface McpPlaygroundProps {
  apiKey?: string;
}

function getSchemaDefaults(schema?: ToolInputSchema): Record<string, unknown> {
  if (!schema?.properties) return {};
  const defaults: Record<string, unknown> = {};
  Object.entries(schema.properties).forEach(([key, prop]) => {
    if (prop.default !== undefined) {
      defaults[key] = prop.default;
    }
  });
  return defaults;
}

function parseToolParams(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // The editor keeps invalid JSON while the user is still typing.
  }
  return null;
}

export function McpPlayground({ apiKey }: McpPlaygroundProps) {
  const session = useSession();
  const normalizedApiKey = apiKey?.trim() || undefined;
  const { call, loading, error, rateLimit, quota, clearError } = useMcpClient({
    apiKey: normalizedApiKey,
  });
  const [tools, setTools] = useState<McpTool[]>([]);
  const [toolsCredential, setToolsCredential] = useState('');
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [jsonValues, setJsonValues] = useState<string>('{}');
  const [useJsonMode, setUseJsonMode] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const toolCallIdRef = useRef(0);
  const [loadError, setLoadError] = useState<{ credential: string; message: string } | null>(null);
  const [paramError, setParamError] = useState<string | null>(null);
  const credential = normalizedApiKey || session?.access_token || '';
  const isAuthenticated = Boolean(credential);
  const visibleTools = isAuthenticated && toolsCredential === credential ? tools : [];
  const visibleSelectedTool = visibleTools.some((tool) => tool.name === selectedTool)
    ? selectedTool
    : '';
  const visibleLoadError = loadError?.credential === credential ? loadError.message : null;
  const visibleParamError = visibleSelectedTool ? paramError : null;
  const visibleRequestError = isAuthenticated && toolsCredential === credential ? error : null;

  const applyTool = useCallback(
    (toolName: string, toolList: McpTool[]) => {
      const tool = toolList.find((t) => t.name === toolName);
      const defaults = getSchemaDefaults(tool?.inputSchema);
      setSelectedTool(toolName);
      setFormValues(defaults);
      setJsonValues(JSON.stringify(defaults, null, 2));
      setResult(null);
      toolCallIdRef.current += 1;
      setParamError(null);
      clearError();
    },
    [clearError]
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    call('tools/list')
      .then((res) => {
        if (cancelled) return;
        const list = parseToolsList(res);
        setTools(list);
        setToolsCredential(credential);
        setLoadError(null);
        if (list.length > 0) {
          applyTool(list[0].name, list);
        } else {
          setSelectedTool('');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError({
          credential,
          message: err instanceof Error ? err.message : 'Failed to load tool list',
        });
      });
    return () => {
      cancelled = true;
      toolCallIdRef.current += 1;
    };
  }, [call, credential, isAuthenticated, applyTool]);

  const selectedToolDef = visibleTools.find((tool) => tool.name === visibleSelectedTool);

  const handleCall = async () => {
    const params = useJsonMode ? parseToolParams(jsonValues) : formValues;
    if (!params) {
      setParamError('Parameters must be a JSON object.');
      return;
    }
    setParamError(null);
    setResult(null);
    const callId = ++toolCallIdRef.current;

    // Strip undefined values to keep the request clean.
    const cleanedParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined)
    );

    try {
      const res = await call('tools/call', {
        name: visibleSelectedTool,
        arguments: cleanedParams,
      });
      if (toolCallIdRef.current === callId) setResult(res);
    } catch {
      // useMcpClient exposes the failure through its error state.
    }
  };

  const toggleInputMode = () => {
    if (useJsonMode) {
      const parsed = parseToolParams(jsonValues);
      if (!parsed) {
        setParamError('Parameters must be a JSON object before switching to form mode.');
        return;
      }
      setFormValues(parsed);
    } else {
      setJsonValues(JSON.stringify(formValues, null, 2));
    }
    setParamError(null);
    setUseJsonMode((current) => !current);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <label htmlFor="tool-select" className="block text-sm font-medium text-slate-700 mb-1.5">
            Select a tool
          </label>
          <select
            id="tool-select"
            value={visibleSelectedTool}
            onChange={(e) => applyTool(e.target.value, visibleTools)}
            className="w-full border border-slate-900/20 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            disabled={!isAuthenticated}
          >
            {visibleTools.map((tool) => (
              <option key={tool.name} value={tool.name}>
                {tool.name}
              </option>
            ))}
          </select>
          {selectedToolDef?.description && (
            <p className="mt-1.5 text-sm text-slate-500">{selectedToolDef.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <UsageBadge rateLimit={rateLimit} quota={quota} />
        </div>
      </div>

      {!isAuthenticated && (
        <div className="flex items-start gap-2 border-l-2 border-amber-500 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          Sign in or add an API key in the config generator above to load and call MCP tools.
        </div>
      )}

      {(visibleRequestError || visibleLoadError || visibleParamError) && (
        <div className="flex items-start gap-2 border-l-2 border-red-500 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {visibleParamError || visibleRequestError || visibleLoadError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Parameters
            </h4>
            <button
              type="button"
              onClick={toggleInputMode}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              <FileJson className="w-3.5 h-3.5" />
              {useJsonMode ? 'Switch to form mode' : 'Switch to JSON mode'}
            </button>
          </div>

          {useJsonMode ? (
            <textarea
              aria-label="Tool parameters as JSON"
              value={jsonValues}
              onChange={(e) => {
                setJsonValues(e.target.value);
                setParamError(null);
              }}
              rows={14}
              className="w-full border border-slate-900/20 bg-white px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          ) : (
            <McpToolParamsForm
              schema={selectedToolDef?.inputSchema}
              value={formValues}
              onChange={setFormValues}
            />
          )}

          <Button
            onClick={handleCall}
            isLoading={loading}
            disabled={!isAuthenticated || !visibleSelectedTool}
            leftIcon={loading ? <Loader2 className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          >
            Call Tool
          </Button>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Response
          </h4>
          {result && visibleSelectedTool ? (
            <CodeBlock code={JSON.stringify(result, null, 2)} label="JSON response" />
          ) : (
            <div className="flex h-64 items-center justify-center border-y border-dashed border-slate-300 text-sm text-slate-400">
              Call the tool on the left to see results
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UsageBadge({
  rateLimit,
  quota,
}: {
  rateLimit: { limit: number; remaining: number; resetAt: number } | null;
  quota: { limit: number; remaining: number; resetAt: number } | null;
}) {
  if (!rateLimit || rateLimit.limit <= 0) return null;

  return (
    <div className="inline-flex flex-col gap-1 border-l-2 border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
      <span>
        Rate limit: <strong className="text-slate-900">{rateLimit.remaining}</strong> /{' '}
        {rateLimit.limit}
      </span>
      {quota && quota.remaining >= 0 && (
        <span>
          Credit balance: <strong className="text-slate-900">{quota.remaining}</strong> cr
        </span>
      )}
    </div>
  );
}
