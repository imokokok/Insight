'use client';

import { useEffect, useMemo, useState } from 'react';

import { AlertCircle, FileJson, Loader2, Play, Terminal, Wrench } from 'lucide-react';

import { CodeBlock } from '@/components/shared/CodeBlock';
import { Button } from '@/components/ui/Button';

import { useMcpClient } from '../hooks/useMcpClient';

import { McpToolParamsForm, type ToolInputSchema } from './McpToolParamsForm';

interface Tool {
  name: string;
  description?: string;
  inputSchema?: ToolInputSchema;
}

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

export function McpPlayground({ apiKey }: McpPlaygroundProps) {
  const { call, loading, error, rateLimit, quota, clearError } = useMcpClient({ apiKey });
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [jsonValues, setJsonValues] = useState<string>('{}');
  const [useJsonMode, setUseJsonMode] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const applyTool = (toolName: string, toolList: Tool[] = tools) => {
    const tool = toolList.find((t) => t.name === toolName);
    const defaults = getSchemaDefaults(tool?.inputSchema);
    setSelectedTool(toolName);
    setFormValues(defaults);
    setJsonValues(JSON.stringify(defaults, null, 2));
    setResult(null);
    clearError();
  };

  useEffect(() => {
    let cancelled = false;
    call('tools/list')
      .then((res) => {
        if (cancelled) return;
        const list = (res as { tools: Tool[] }).tools ?? [];
        setTools(list);
        if (list.length > 0) {
          applyTool(list[0].name, list);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load tool list');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call]);

  const selectedToolDef = useMemo(
    () => tools.find((t) => t.name === selectedTool),
    [tools, selectedTool]
  );

  const handleCall = async () => {
    let params: Record<string, unknown>;
    if (useJsonMode) {
      try {
        params = JSON.parse(jsonValues) as Record<string, unknown>;
      } catch {
        alert('Invalid JSON parameters, please check');
        return;
      }
    } else {
      params = formValues;
    }

    // Strip undefined values to keep the request clean.
    const cleanedParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined)
    );

    const res = await call('tools/call', {
      name: selectedTool,
      arguments: cleanedParams,
    });
    setResult(res);
  };

  const isAuthenticated = useMemo(() => {
    // The hook will use session if available; we surface a hint when neither session nor key is present.
    return Boolean(apiKey);
  }, [apiKey]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <label htmlFor="tool-select" className="block text-sm font-medium text-slate-700 mb-1.5">
            Select a tool
          </label>
          <select
            id="tool-select"
            value={selectedTool}
            onChange={(e) => applyTool(e.target.value)}
            className="w-full border border-slate-900/20 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {tools.map((tool) => (
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
          Without signing in or providing an API Key, the Playground may fail due to missing
          authentication. Add a key in the config generator above, or sign in and retry.
        </div>
      )}

      {(error || loadError) && (
        <div className="flex items-start gap-2 border-l-2 border-red-500 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error || loadError}
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
              onClick={() => setUseJsonMode((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              <FileJson className="w-3.5 h-3.5" />
              {useJsonMode ? 'Switch to form mode' : 'Switch to JSON mode'}
            </button>
          </div>

          {useJsonMode ? (
            <textarea
              value={jsonValues}
              onChange={(e) => setJsonValues(e.target.value)}
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
          {result ? (
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
