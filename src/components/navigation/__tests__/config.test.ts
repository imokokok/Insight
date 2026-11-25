import { navigationConfig } from '../config';
import { type NavGroup } from '../types';

const groups = navigationConfig.filter((item): item is NavGroup => 'items' in item);

describe('navigationConfig', () => {
  it('puts the product workflow first and keeps Pricing directly visible', () => {
    const directItems = navigationConfig.filter((item) => !('items' in item));

    expect(directItems.slice(0, 2).map((item) => item.href)).toEqual([
      '/decision-integrity',
      '/pricing',
    ]);
  });

  it('groups focused assessments under Risk Tools', () => {
    const riskGroup = groups.find((group) => group.id === 'risk-tools');

    expect(riskGroup).toBeDefined();
    expect(riskGroup?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: '/risk-intelligence', label: 'Risk Tools Overview' }),
        expect.objectContaining({ href: '/safety-check', label: 'Position Stress Test' }),
        expect.objectContaining({
          href: '/polymarket',
          label: 'Polymarket Positions',
        }),
        expect.objectContaining({ href: '/peg-risk', label: 'Peg Risk' }),
      ])
    );
  });

  it('keeps Observe, Compare, and receipt verification in the Oracle Evidence journey', () => {
    const oracleEvidenceGroup = groups.find((group) => group.id === 'oracle-evidence');

    expect(oracleEvidenceGroup?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: '/price-insight?stage=observe', label: 'Observe' }),
        expect.objectContaining({ href: '/price-insight?stage=compare', label: 'Compare' }),
        expect.objectContaining({ href: '/verify', label: 'Verify a receipt' }),
      ])
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
