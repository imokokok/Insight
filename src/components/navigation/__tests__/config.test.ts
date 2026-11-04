import { navigationConfig } from '../config';
import { type NavGroup } from '../types';

const groups = navigationConfig.filter((item): item is NavGroup => 'items' in item);

describe('navigationConfig', () => {
  it('keeps the established oracle-evidence entry first and makes decision integrity directly visible', () => {
    const directItems = navigationConfig.filter((item) => !('items' in item));

    expect(directItems.slice(0, 2).map((item) => item.href)).toEqual([
      '/price-insight?stage=observe',
      '/decision-integrity',
    ]);
  });

  it('keeps position stress as a precise risk tool instead of the generic product entry', () => {
    const riskGroup = groups.find((group) => group.id === 'risk-intelligence');

    expect(riskGroup).toBeDefined();
    expect(riskGroup?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: '/safety-check', label: 'Position Stress Test' }),
        expect.objectContaining({
          href: '/price-insight?stage=compare',
          label: 'Compare & Assess',
        }),
      ])
    );
    expect(groups.map((group) => group.id)).not.toEqual(
      expect.arrayContaining(['safety', 'analysis'])
    );
  });

  it('exposes the Build overview and all three supported integration paths', () => {
    const buildGroup = groups.find((group) => group.id === 'build');

    expect(buildGroup?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: '/build', label: 'Build Overview' }),
        expect.objectContaining({ href: '/api', label: 'REST API' }),
        expect.objectContaining({ href: '/ai', label: 'AI / MCP' }),
        expect.objectContaining({ href: '/sdk', label: 'Guard SDK' }),
      ])
    );
  });
});
