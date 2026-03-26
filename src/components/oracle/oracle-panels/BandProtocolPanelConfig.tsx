import { type ReactNode } from 'react';

import {
  ValidatorGeographicMap,
  ValidatorPanel,
  ChainEventMonitor,
  BandCrossChainPriceConsistency,
  DashboardCard,
  BandCrossChainPanel,
  CosmosEcosystemPanel,
  BandRiskAssessmentPanel,
} from '@/components/oracle';
import {
  BandValidatorsPanel,
  BandDataFeedsPanel,
  BandStakingPanel,
} from '@/components/oracle/panels';
import { BandProtocolClient } from '@/lib/oracles/bandProtocol';

import { type PanelConfig, type PanelRenderContext } from './types';

const renderNetworkTab = (context: PanelRenderContext): ReactNode => {
  const { config } = context;

  if (!(config.client instanceof BandProtocolClient)) {
    return null;
  }

  return (
    <>
      <div className="mb-6">
        <ValidatorGeographicMap validators={[]} />
      </div>
      <div className="mb-6">
        <ValidatorPanel client={config.client} />
      </div>
      <div className="mb-6">
        <ChainEventMonitor client={config.client} refreshInterval={30000} />
      </div>
      <div className="mb-6">
        <BandCrossChainPriceConsistency />
      </div>
    </>
  );
};

const renderValidatorsTab = (context: PanelRenderContext): ReactNode => {
  const { config } = context;

  if (!(config.client instanceof BandProtocolClient)) {
    return null;
  }

  return (
    <div className="mb-6">
      <BandValidatorsPanel client={config.client} />
    </div>
  );
};

const renderDataFeedsTab = (context: PanelRenderContext): ReactNode => {
  const { config } = context;

  if (!(config.client instanceof BandProtocolClient)) {
    return null;
  }

  return (
    <div className="mb-6">
      <BandDataFeedsPanel client={config.client} />
    </div>
  );
};

const renderStakingTab = (context: PanelRenderContext): ReactNode => {
  const { config } = context;

  if (!(config.client instanceof BandProtocolClient)) {
    return null;
  }

  return (
    <div className="mb-6">
      <BandStakingPanel client={config.client} />
    </div>
  );
};

const renderCrossChainTab = (context: PanelRenderContext): ReactNode => {
  const { config } = context;

  if (!(config.client instanceof BandProtocolClient)) {
    return null;
  }

  return (
    <div className="mb-6">
      <BandCrossChainPanel client={config.client} />
    </div>
  );
};

const renderRiskTab = (context: PanelRenderContext): ReactNode => {
  const { config } = context;

  if (!(config.client instanceof BandProtocolClient)) {
    return null;
  }

  return (
    <div className="mb-6">
      <BandRiskAssessmentPanel client={config.client} />
    </div>
  );
};

const renderEcosystemTab = (context: PanelRenderContext): ReactNode => {
  const { config } = context;

  if (!(config.client instanceof BandProtocolClient)) {
    return null;
  }

  return (
    <div className="mb-6">
      <CosmosEcosystemPanel client={config.client} />
    </div>
  );
};

export const bandProtocolPanelConfig: PanelConfig = {
  renderNetworkTab,
  renderValidatorsTab,
  renderDataFeedsTab,
  renderStakingTab,
  renderCrossChainTab,
  renderRiskTab,
  renderEcosystemTab,
};

export default bandProtocolPanelConfig;
