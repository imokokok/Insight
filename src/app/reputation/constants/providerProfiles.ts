import {
  Activity,
  Clock,
  Cpu,
  Database,
  Globe,
  Layers,
  Radio,
  Shield,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import { type OracleProvider } from '@/types/oracle';

export type ProviderType = 'onchain' | 'api' | 'hybrid';

export interface ProviderFeature {
  icon: LucideIcon;
  label: string;
  value: string;
}

export interface ProviderProfile {
  tagline: string;
  description: string;
  highlights: string[];
  features: ProviderFeature[];
}

// ------------------------------------------------------------------
// Provider marketing/profile metadata
// ------------------------------------------------------------------
// NOTE: TVS / chain / protocol counts are curated marketing figures
// (not live data) used to illustrate each provider's footprint on the
// reputation directory and detail pages. Update these manually when
// figures become stale.
// ------------------------------------------------------------------

export const PROVIDER_PROFILES: Record<OracleProvider, ProviderProfile> = {
  chainlink: {
    tagline: 'Industry Standard Oracle',
    description:
      'The most widely adopted decentralized oracle network, powering the majority of DeFi protocols with battle-tested price feeds across 22+ blockchains.',
    highlights: [
      'Largest oracle network by TVS ($75B+)',
      'Decentralized node operator network',
      'On-chain verified price aggregation',
      'Extensive multi-chain coverage',
    ],
    features: [
      { icon: Globe, label: 'Chains', value: '22+' },
      { icon: Layers, label: 'Protocols', value: '1,200+' },
      { icon: Shield, label: 'TVS', value: '$75B+' },
      { icon: Database, label: 'Data Sources', value: '350+' },
    ],
  },
  api3: {
    tagline: 'First-Party Oracle',
    description:
      'Airnode-powered oracle delivering data directly from API providers without middleware, reducing attack surface and improving data authenticity.',
    highlights: [
      'First-party data via Airnode',
      'No middleware or intermediary',
      'On-chain verifiable data feeds',
      'QRNG for random number generation',
    ],
    features: [
      { icon: Globe, label: 'Chains', value: '8+' },
      { icon: Layers, label: 'Protocols', value: '80+' },
      { icon: Shield, label: 'TVS', value: '$2B+' },
      { icon: Cpu, label: 'Model', value: 'Airnode' },
    ],
  },
  redstone: {
    tagline: 'Modular Oracle Infrastructure',
    description:
      'Flexible oracle supporting both push and pull models with custom data feeds, enabling innovative token-gated pricing and modular integration patterns.',
    highlights: [
      'Push & pull model support',
      'Custom data feed creation',
      'Token-gated pricing model',
      'Rapid integration for new chains',
    ],
    features: [
      { icon: Globe, label: 'Chains', value: '8+' },
      { icon: Layers, label: 'Protocols', value: '60+' },
      { icon: Shield, label: 'TVS', value: '$1.5B+' },
      { icon: Zap, label: 'Update', value: '<1s' },
    ],
  },
  dia: {
    tagline: 'Open-Source Oracle',
    description:
      'Transparent and customizable oracle sourcing data from 80+ on-chain and off-chain sources with open methodology and configurable data feeds.',
    highlights: [
      'Fully open-source methodology',
      'Customizable data feeds',
      'Multi-source aggregation',
      'Wide cross-chain support',
    ],
    features: [
      { icon: Globe, label: 'Chains', value: '15+' },
      { icon: Layers, label: 'Protocols', value: '40+' },
      { icon: Shield, label: 'TVS', value: '$500M+' },
      { icon: Database, label: 'Sources', value: '80+' },
    ],
  },
  winklink: {
    tagline: 'TRON Native Oracle',
    description:
      'Purpose-built oracle for the TRON ecosystem, providing reliable price feeds for TRON-based DeFi applications with native TRC-20 token support.',
    highlights: [
      'Native TRON ecosystem integration',
      'TRC-20 token price feeds',
      'TRON-specific smart contracts',
      'Low-latency for TRON DeFi',
    ],
    features: [
      { icon: Globe, label: 'Chains', value: '1' },
      { icon: Layers, label: 'Protocols', value: '10+' },
      { icon: Shield, label: 'TVS', value: '$100M+' },
      { icon: Radio, label: 'Ecosystem', value: 'TRON' },
    ],
  },
  supra: {
    tagline: 'Cross-Chain Oracle & VRF',
    description:
      'High-performance cross-chain oracle providing verifiable randomness and price data with fast finality across 20+ blockchains via native cross-chain communication.',
    highlights: [
      'Native cross-chain communication',
      'Verifiable Random Function (VRF)',
      'Fast finality price feeds',
      'DfMM automation layer',
    ],
    features: [
      { icon: Globe, label: 'Chains', value: '20+' },
      { icon: Layers, label: 'Protocols', value: '50+' },
      { icon: Shield, label: 'TVS', value: '$800M+' },
      { icon: Activity, label: 'Update', value: '~60s' },
    ],
  },
  twap: {
    tagline: 'DEX-Based Price Oracle',
    description:
      'Derives prices from on-chain DEX trading activity using time-weighted average pricing, providing manipulation-resistant and transparent price discovery.',
    highlights: [
      'Manipulation-resistant TWAP',
      'On-chain DEX price discovery',
      'No external data dependency',
      'Transparent price derivation',
    ],
    features: [
      { icon: Globe, label: 'Chains', value: '6+' },
      { icon: Layers, label: 'Protocols', value: '25+' },
      { icon: Shield, label: 'TVS', value: '$300M+' },
      { icon: Clock, label: 'Update', value: '~10min' },
    ],
  },
  reflector: {
    tagline: 'Stellar Ecosystem Oracle',
    description:
      'Purpose-built oracle for the Stellar network, providing price data for Stellar-based DeFi applications and cross-border payment use cases.',
    highlights: [
      'Native Stellar integration',
      'Cross-border payment support',
      'Stellar-specific data feeds',
      'Lightweight architecture',
    ],
    features: [
      { icon: Globe, label: 'Chains', value: '1' },
      { icon: Layers, label: 'Protocols', value: '5+' },
      { icon: Shield, label: 'TVS', value: '$50M+' },
      { icon: Radio, label: 'Ecosystem', value: 'Stellar' },
    ],
  },
  flare: {
    tagline: 'FTSO Decentralized Oracle',
    description:
      'Flare Time Series Oracle (FTSO) leveraging decentralized data submission from a network of data providers, with native on-chain verification and consensus.',
    highlights: [
      'Decentralized FTSO consensus',
      'Native on-chain verification',
      'Delegation-based participation',
      'Fast 90-second update cycle',
    ],
    features: [
      { icon: Globe, label: 'Chains', value: '1' },
      { icon: Layers, label: 'Protocols', value: '30+' },
      { icon: Shield, label: 'TVS', value: '$400M+' },
      { icon: Activity, label: 'Update', value: '~90s' },
    ],
  },
  switchboard: {
    tagline: 'On-Demand Multichain Oracle',
    description:
      'Switchboard On-Demand oracle aggregating multi-source prices into signed Surge feeds, served via the public Crossbar gateway with deterministic feed hashes and free off-chain reads.',
    highlights: [
      'Free off-chain reads via Crossbar',
      'Multi-source aggregated Surge feeds',
      'Deterministic feed hashes',
      'Cross-chain signed updates',
    ],
    features: [
      { icon: Globe, label: 'Chains', value: '16+' },
      { icon: Layers, label: 'Feeds', value: '80+' },
      { icon: Shield, label: 'TVS', value: '$300M+' },
      { icon: Zap, label: 'Update', value: '~1s' },
    ],
  },
};

// ------------------------------------------------------------------
// Provider type visual configuration
// ------------------------------------------------------------------
// `color` (hex) is retained as a single accent value for the
// ProviderIdentity type label (which consumes it via an inline style
// in ReputationShared.tsx). All pill/badge styling uses the Tailwind
// class tuples below, keeping the new code free of alpha-concatenated
// inline styles.

export interface ProviderTypeStyle {
  label: string;
  icon: LucideIcon;
  /** Accent hex used by ProviderIdentity's type label. */
  color: string;
  /** Tailwind text color class for pills/badges. */
  textClass: string;
  /** Tailwind background class for pills/badges. */
  bgClass: string;
  /** Tailwind border class for pills/badges. */
  borderClass: string;
}

export const TYPE_CONFIG: Record<ProviderType, ProviderTypeStyle> = {
  onchain: {
    label: 'On-chain',
    icon: Shield,
    color: '#059669',
    textClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
  },
  api: {
    label: 'API',
    icon: Zap,
    color: '#2563eb',
    textClass: 'text-blue-700',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
  },
  hybrid: {
    label: 'Hybrid',
    icon: Layers,
    color: '#7c3aed',
    textClass: 'text-blue-700',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
  },
};
