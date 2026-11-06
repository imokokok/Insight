import { render } from '@testing-library/react';

import { McpConfigGenerator } from './McpConfigGenerator';

jest.mock('@/hooks/useAppUrl', () => ({
  useAppUrl: () => 'https://staging.example.com',
}));

interface GeneratedConfig {
  mcpServers?: Record<
    string,
    {
      command?: string;
      args?: string[];
      env?: Record<string, string>;
      url?: string;
      headers?: Record<string, string>;
    }
  >;
}

function configsIn(container: HTMLElement): GeneratedConfig[] {
  return Array.from(container.querySelectorAll('pre code')).map(
    (code) => JSON.parse(code.textContent ?? '{}') as GeneratedConfig
  );
}

function findStdio(configs: GeneratedConfig[]): GeneratedConfig | undefined {
  return configs.find((config) => config.mcpServers?.['insight-oracle']?.command === 'npx');
}

describe('McpConfigGenerator', () => {
  it('generates a stdio config that uses the branded MCP launcher', () => {
    const { container } = render(<McpConfigGenerator />);
    const stdio = findStdio(configsIn(container));

    expect(stdio?.mcpServers?.['insight-oracle']?.args).toEqual([
      '-y',
      '--package=oracle-insight-mcp',
      'insight-mcp',
    ]);
    expect(JSON.stringify(stdio)).not.toContain('mcp-remote');
  });

  it('pins the endpoint to the current origin and never puts the key in argv', () => {
    const { container } = render(<McpConfigGenerator defaultApiKey="ins_example_key" />);
    const stdio = findStdio(configsIn(container));

    expect(stdio?.mcpServers?.['insight-oracle']?.env).toEqual({
      INSIGHT_MCP_URL: 'https://staging.example.com/api/mcp',
      INSIGHT_API_KEY: 'ins_example_key',
    });
    expect(JSON.stringify(stdio?.mcpServers?.['insight-oracle']?.args)).not.toContain(
      'ins_example_key'
    );
  });

  it('omits the credit-wallet key when none is supplied', () => {
    const { container } = render(<McpConfigGenerator />);
    const stdio = findStdio(configsIn(container));

    expect(stdio?.mcpServers?.['insight-oracle']?.env).toEqual({
      INSIGHT_MCP_URL: 'https://staging.example.com/api/mcp',
    });
  });

  it('keeps the HTTP config on the current origin with MCP attribution', () => {
    const { container } = render(<McpConfigGenerator />);
    const http = configsIn(container).find(
      (config) => config.mcpServers?.['insight-oracle']?.url !== undefined
    );

    expect(http?.mcpServers?.['insight-oracle']?.url).toBe('https://staging.example.com/api/mcp');
    expect(http?.mcpServers?.['insight-oracle']?.headers).toEqual({
      'x-insight-entry-source': 'mcp',
    });
  });
});
