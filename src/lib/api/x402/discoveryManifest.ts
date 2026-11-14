import {
  X402_PAYMENT_SCOPE,
  X402_REST_PAYMENT_SCOPE_BY_PATH,
  x402ConfigForPaymentScope,
  type X402PaymentScope,
} from './capabilityPayment';
import { X402_MULTICHAIN_EVM_LENDING_GUARD_ROUTE } from './config';
import {
  getX402PaymentOptions,
  tokenDecimalsForNetwork,
  type X402Config,
  type X402PaymentOption,
  type X402NetworkId,
  X402_MCP_ROUTE,
} from './config';
import template from './discoveryManifest.template.json';
import { paidRestRouteAmountOverride } from './paidRouteAmounts';

type TemplateAcceptance = { amount: string };
type TemplateResource = {
  accepts: TemplateAcceptance[];
  description: string;
  method: string;
  url: string;
};
type TemplateManifest = {
  attestation: { type: string };
  description: string;
  docs: string;
  kind: string;
  name: string;
  resources: TemplateResource[];
  updated: string;
  x402Version: number;
};

export type DiscoveryAcceptance = {
  amount: string;
  asset: string;
  assetDecimals: number;
  assetSymbol: 'USDC' | 'USDT';
  extra?: { name: string; version: '2' };
  maxTimeoutSeconds: number;
  network: string;
  payTo: string;
  scheme: 'exact';
};

type DiscoveryResource = Omit<TemplateResource, 'accepts'> & { accepts: DiscoveryAcceptance[] };

export type X402DiscoveryManifest = Omit<TemplateManifest, 'resources'> & {
  dynamicPaymentOptions: Array<{
    asset: 'USDC';
    method: string;
    network: string;
    payTo: string;
    quoteRequired: true;
    resourceUrl: string;
    scheme: 'exact';
  }>;
  requestBoundResources: Array<{
    acceptsByChainId: Record<string, DiscoveryAcceptance[]>;
    description: string;
    method: string;
    paymentScope: 'validated-request-chain';
    url: string;
  }>;
  resources: DiscoveryResource[];
};

const manifestTemplate = template as TemplateManifest;

function pathFromUrl(url: string): string {
  return new URL(url).pathname;
}

function staticScopeForPath(path: string): X402PaymentScope {
  return X402_REST_PAYMENT_SCOPE_BY_PATH[path] ?? X402_PAYMENT_SCOPE.configured;
}

function symbolFor(option: X402PaymentOption): 'USDC' | 'USDT' {
  return option.tokenName === 'Tether USD' ? 'USDT' : 'USDC';
}

function toAcceptance(option: X402PaymentOption, cfg: X402Config): DiscoveryAcceptance {
  const isEvm = option.family === 'evm';
  return {
    amount: option.amountAtomic,
    asset: option.asset,
    assetDecimals: isEvm ? tokenDecimalsForNetwork(option.network as X402NetworkId) : 6,
    assetSymbol: symbolFor(option),
    ...(isEvm && option.tokenName
      ? { extra: { name: option.tokenName, version: '2' as const } }
      : {}),
    maxTimeoutSeconds: cfg.maxTimeoutSeconds,
    network: option.network,
    payTo: option.payTo,
    scheme: 'exact',
  };
}

function acceptsForScope(
  cfg: X402Config,
  scope: X402PaymentScope,
  amountAtomic: string
): DiscoveryAcceptance[] {
  const scoped = x402ConfigForPaymentScope(cfg, scope);
  return scoped
    ? getX402PaymentOptions(scoped, amountAtomic).map((option) => toAcceptance(option, scoped))
    : [];
}

function isRequestBoundResource(path: string): boolean {
  return path === X402_MULTICHAIN_EVM_LENDING_GUARD_ROUTE;
}

function amountForPath(cfg: X402Config, path: string): string {
  return paidRestRouteAmountOverride(path) ?? cfg.amountAtomic;
}

function mayIssueHypercoreQuote(path: string, scope: X402PaymentScope): boolean {
  // MCP uses its separate x402 bridge. Fixed-chain scopes intentionally clear
  // HyperCore, and a multichain request obtains a payment realm from its input.
  return path !== X402_MCP_ROUTE && scope.kind === 'configured';
}

const MULTICHAIN_SCOPES: ReadonlyArray<readonly [string, X402PaymentScope]> = [
  ['56', X402_PAYMENT_SCOPE.bnb],
  ['137', X402_PAYMENT_SCOPE.polygon],
  ['8453', X402_PAYMENT_SCOPE.base],
  ['42161', X402_PAYMENT_SCOPE.arbitrum],
];

/**
 * Produce the public discovery document from the same route scope resolver
 * used by the live payment guards. This prevents a generic merchant rail from
 * being published for a fixed-chain or request-derived endpoint.
 *
 * HyperCore requirements deliberately remain outside `accepts`: the merchant
 * facilitator issues a short-lived, request-bound `quoteId`, so a discovery
 * document cannot honestly provide a reusable payment requirement. Consumers
 * must retrieve that option from the live unpaid 402 response.
 */
export function buildX402DiscoveryManifest(cfg: X402Config): X402DiscoveryManifest {
  const resources: DiscoveryResource[] = [];
  const requestBoundResources: X402DiscoveryManifest['requestBoundResources'] = [];
  const dynamicPaymentOptions: X402DiscoveryManifest['dynamicPaymentOptions'] = [];

  for (const resource of manifestTemplate.resources) {
    const path = pathFromUrl(resource.url);
    const amountAtomic = amountForPath(cfg, path);

    if (isRequestBoundResource(path)) {
      const acceptsByChainId = Object.fromEntries(
        MULTICHAIN_SCOPES.map(([chainId, scope]) => [
          chainId,
          acceptsForScope(cfg, scope, amountAtomic),
        ]).filter(([, accepts]) => accepts.length > 0)
      );
      if (Object.keys(acceptsByChainId).length > 0) {
        requestBoundResources.push({
          acceptsByChainId,
          description: resource.description,
          method: resource.method,
          paymentScope: 'validated-request-chain',
          url: resource.url,
        });
      }
      continue;
    }

    const scope = staticScopeForPath(path);
    const scoped = x402ConfigForPaymentScope(cfg, scope);
    if (!scoped) continue;
    const accepts = getX402PaymentOptions(scoped, amountAtomic).map((option) =>
      toAcceptance(option, scoped)
    );
    if (accepts.length === 0) continue;
    resources.push({ ...resource, accepts });

    if (cfg.hypercore && mayIssueHypercoreQuote(path, scope)) {
      dynamicPaymentOptions.push({
        asset: 'USDC',
        method: resource.method,
        network: cfg.hypercore.network,
        payTo: cfg.hypercore.payTo,
        quoteRequired: true,
        resourceUrl: resource.url,
        scheme: 'exact',
      });
    }
  }

  return {
    ...manifestTemplate,
    description:
      'Decision-input trust for AI agents trading onchain, offered as four product functions: Oracle Evidence (inspect and record what price sources actually report), Risk Intelligence (prepaid continuous monitoring for live positions), Decision Integrity (per-action signed pre-trade verdicts across guard families), and Verify (independent, always-free offline re-verification of signed evidence). Static accepts are generated from the same route-scoped configuration as live x402 challenges. Request-bound and HyperCore options are explicitly identified so callers retrieve their binding terms from the live unpaid 402 response.',
    dynamicPaymentOptions,
    requestBoundResources,
    resources,
  };
}
