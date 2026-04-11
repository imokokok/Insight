import { act } from '@testing-library/react';

import type { CrossChainState, CrossChainTransfer, BridgeProvider } from '@/types/crossChain';

import { useCrossChainStore } from '../crossChainStore';

const mockTransfer: CrossChainTransfer = {
  id: 'transfer-1',
  sourceChain: 'ethereum',
  destinationChain: 'polygon',
  sourceToken: 'USDC',
  destinationToken: 'USDC',
  amount: '1000',
  status: 'pending',
  sourceTxHash: '0x123',
  destinationTxHash: undefined,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const mockProvider: BridgeProvider = {
  id: 'stargate',
  name: 'Stargate',
  logo: '/logos/stargate.png',
  supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
  supportedTokens: ['USDC', 'USDT', 'ETH'],
  fee: 0.001,
  estimatedTime: 15,
};

const mockState: CrossChainState = {
  transfers: [],
  providers: [],
  isLoading: false,
  error: null,
  selectedProvider: null,
  selectedSourceChain: null,
  selectedDestinationChain: null,
  selectedToken: null,
  amount: '',
  estimatedFee: null,
  estimatedTime: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  useCrossChainStore.setState(mockState);
});

describe('crossChainStore - 初始状态', () => {
  it('应该有正确的初始状态', () => {
    const state = useCrossChainStore.getState();
    expect(state.transfers).toEqual([]);
    expect(state.providers).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.selectedProvider).toBeNull();
    expect(state.selectedSourceChain).toBeNull();
    expect(state.selectedDestinationChain).toBeNull();
    expect(state.selectedToken).toBeNull();
    expect(state.amount).toBe('');
    expect(state.estimatedFee).toBeNull();
    expect(state.estimatedTime).toBeNull();
  });
});

describe('crossChainStore - setProviders', () => {
  it('setProviders 应该更新 providers 列表', () => {
    const providers = [mockProvider];
    act(() => {
      useCrossChainStore.getState().setProviders(providers);
    });
    expect(useCrossChainStore.getState().providers).toEqual(providers);
  });

  it('setProviders 应该能够设置为空数组', () => {
    act(() => {
      useCrossChainStore.getState().setProviders([mockProvider]);
    });
    expect(useCrossChainStore.getState().providers).toHaveLength(1);

    act(() => {
      useCrossChainStore.getState().setProviders([]);
    });
    expect(useCrossChainStore.getState().providers).toHaveLength(0);
  });
});

describe('crossChainStore - addTransfer', () => {
  it('addTransfer 应该添加新的转账记录', () => {
    act(() => {
      useCrossChainStore.getState().addTransfer(mockTransfer);
    });
    expect(useCrossChainStore.getState().transfers).toHaveLength(1);
    expect(useCrossChainStore.getState().transfers[0]).toEqual(mockTransfer);
  });

  it('addTransfer 应该添加到现有列表', () => {
    const existingTransfer = { ...mockTransfer, id: 'transfer-0' };
    useCrossChainStore.setState({ transfers: [existingTransfer] });

    act(() => {
      useCrossChainStore.getState().addTransfer(mockTransfer);
    });
    expect(useCrossChainStore.getState().transfers).toHaveLength(2);
  });
});

describe('crossChainStore - updateTransfer', () => {
  it('updateTransfer 应该更新现有转账记录', () => {
    useCrossChainStore.setState({ transfers: [mockTransfer] });

    act(() => {
      useCrossChainStore.getState().updateTransfer('transfer-1', {
        status: 'completed',
        destinationTxHash: '0x456',
      });
    });

    const transfer = useCrossChainStore.getState().transfers[0];
    expect(transfer.status).toBe('completed');
    expect(transfer.destinationTxHash).toBe('0x456');
  });

  it('updateTransfer 不应该影响不存在的转账', () => {
    act(() => {
      useCrossChainStore.getState().updateTransfer('non-existent', { status: 'completed' });
    });
    expect(useCrossChainStore.getState().transfers).toHaveLength(0);
  });
});

describe('crossChainStore - removeTransfer', () => {
  it('removeTransfer 应该删除转账记录', () => {
    useCrossChainStore.setState({ transfers: [mockTransfer] });

    act(() => {
      useCrossChainStore.getState().removeTransfer('transfer-1');
    });
    expect(useCrossChainStore.getState().transfers).toHaveLength(0);
  });

  it('removeTransfer 不应该影响不存在的转账', () => {
    useCrossChainStore.setState({ transfers: [mockTransfer] });

    act(() => {
      useCrossChainStore.getState().removeTransfer('non-existent');
    });
    expect(useCrossChainStore.getState().transfers).toHaveLength(1);
  });
});

describe('crossChainStore - clearTransfers', () => {
  it('clearTransfers 应该清除所有转账记录', () => {
    useCrossChainStore.setState({ transfers: [mockTransfer] });

    act(() => {
      useCrossChainStore.getState().clearTransfers();
    });
    expect(useCrossChainStore.getState().transfers).toHaveLength(0);
  });
});

describe('crossChainStore - setSelectedProvider', () => {
  it('setSelectedProvider 应该更新选中的提供商', () => {
    act(() => {
      useCrossChainStore.getState().setSelectedProvider(mockProvider);
    });
    expect(useCrossChainStore.getState().selectedProvider).toEqual(mockProvider);
  });

  it('setSelectedProvider 应该能够设置为 null', () => {
    act(() => {
      useCrossChainStore.getState().setSelectedProvider(mockProvider);
    });
    expect(useCrossChainStore.getState().selectedProvider).not.toBeNull();

    act(() => {
      useCrossChainStore.getState().setSelectedProvider(null);
    });
    expect(useCrossChainStore.getState().selectedProvider).toBeNull();
  });
});

describe('crossChainStore - setSelectedSourceChain', () => {
  it('setSelectedSourceChain 应该更新选中的源链', () => {
    act(() => {
      useCrossChainStore.getState().setSelectedSourceChain('ethereum');
    });
    expect(useCrossChainStore.getState().selectedSourceChain).toBe('ethereum');
  });

  it('setSelectedSourceChain 应该能够设置为 null', () => {
    act(() => {
      useCrossChainStore.getState().setSelectedSourceChain('ethereum');
    });
    expect(useCrossChainStore.getState().selectedSourceChain).not.toBeNull();

    act(() => {
      useCrossChainStore.getState().setSelectedSourceChain(null);
    });
    expect(useCrossChainStore.getState().selectedSourceChain).toBeNull();
  });
});

describe('crossChainStore - setSelectedDestinationChain', () => {
  it('setSelectedDestinationChain 应该更新选中的目标链', () => {
    act(() => {
      useCrossChainStore.getState().setSelectedDestinationChain('polygon');
    });
    expect(useCrossChainStore.getState().selectedDestinationChain).toBe('polygon');
  });

  it('setSelectedDestinationChain 应该能够设置为 null', () => {
    act(() => {
      useCrossChainStore.getState().setSelectedDestinationChain('polygon');
    });
    expect(useCrossChainStore.getState().selectedDestinationChain).not.toBeNull();

    act(() => {
      useCrossChainStore.getState().setSelectedDestinationChain(null);
    });
    expect(useCrossChainStore.getState().selectedDestinationChain).toBeNull();
  });
});

describe('crossChainStore - setSelectedToken', () => {
  it('setSelectedToken 应该更新选中的代币', () => {
    act(() => {
      useCrossChainStore.getState().setSelectedToken('USDC');
    });
    expect(useCrossChainStore.getState().selectedToken).toBe('USDC');
  });

  it('setSelectedToken 应该能够设置为 null', () => {
    act(() => {
      useCrossChainStore.getState().setSelectedToken('USDC');
    });
    expect(useCrossChainStore.getState().selectedToken).not.toBeNull();

    act(() => {
      useCrossChainStore.getState().setSelectedToken(null);
    });
    expect(useCrossChainStore.getState().selectedToken).toBeNull();
  });
});

describe('crossChainStore - setAmount', () => {
  it('setAmount 应该更新金额', () => {
    act(() => {
      useCrossChainStore.getState().setAmount('1000');
    });
    expect(useCrossChainStore.getState().amount).toBe('1000');
  });

  it('setAmount 应该能够设置为空字符串', () => {
    act(() => {
      useCrossChainStore.getState().setAmount('1000');
    });
    expect(useCrossChainStore.getState().amount).toBe('1000');

    act(() => {
      useCrossChainStore.getState().setAmount('');
    });
    expect(useCrossChainStore.getState().amount).toBe('');
  });
});

describe('crossChainStore - setEstimatedFee', () => {
  it('setEstimatedFee 应该更新预估费用', () => {
    act(() => {
      useCrossChainStore.getState().setEstimatedFee('0.01');
    });
    expect(useCrossChainStore.getState().estimatedFee).toBe('0.01');
  });

  it('setEstimatedFee 应该能够设置为 null', () => {
    act(() => {
      useCrossChainStore.getState().setEstimatedFee('0.01');
    });
    expect(useCrossChainStore.getState().estimatedFee).not.toBeNull();

    act(() => {
      useCrossChainStore.getState().setEstimatedFee(null);
    });
    expect(useCrossChainStore.getState().estimatedFee).toBeNull();
  });
});

describe('crossChainStore - setEstimatedTime', () => {
  it('setEstimatedTime 应该更新预估时间', () => {
    act(() => {
      useCrossChainStore.getState().setEstimatedTime(15);
    });
    expect(useCrossChainStore.getState().estimatedTime).toBe(15);
  });

  it('setEstimatedTime 应该能够设置为 null', () => {
    act(() => {
      useCrossChainStore.getState().setEstimatedTime(15);
    });
    expect(useCrossChainStore.getState().estimatedTime).not.toBeNull();

    act(() => {
      useCrossChainStore.getState().setEstimatedTime(null);
    });
    expect(useCrossChainStore.getState().estimatedTime).toBeNull();
  });
});

describe('crossChainStore - setLoading', () => {
  it('setLoading 应该更新加载状态', () => {
    act(() => {
      useCrossChainStore.getState().setLoading(true);
    });
    expect(useCrossChainStore.getState().isLoading).toBe(true);

    act(() => {
      useCrossChainStore.getState().setLoading(false);
    });
    expect(useCrossChainStore.getState().isLoading).toBe(false);
  });
});

describe('crossChainStore - setError', () => {
  it('setError 应该更新错误状态', () => {
    const error = new Error('Test error');
    act(() => {
      useCrossChainStore.getState().setError(error);
    });
    expect(useCrossChainStore.getState().error).toEqual(error);
  });

  it('setError 应该能够设置为 null', () => {
    const error = new Error('Test error');
    act(() => {
      useCrossChainStore.getState().setError(error);
    });
    expect(useCrossChainStore.getState().error).not.toBeNull();

    act(() => {
      useCrossChainStore.getState().setError(null);
    });
    expect(useCrossChainStore.getState().error).toBeNull();
  });
});

describe('crossChainStore - clearError', () => {
  it('clearError 应该清除错误状态', () => {
    useCrossChainStore.setState({ error: new Error('Test error') });

    act(() => {
      useCrossChainStore.getState().clearError();
    });
    expect(useCrossChainStore.getState().error).toBeNull();
  });
});

describe('crossChainStore - reset', () => {
  it('reset 应该重置所有状态', () => {
    useCrossChainStore.setState({
      transfers: [mockTransfer],
      providers: [mockProvider],
      isLoading: true,
      error: new Error('Test error'),
      selectedProvider: mockProvider,
      selectedSourceChain: 'ethereum',
      selectedDestinationChain: 'polygon',
      selectedToken: 'USDC',
      amount: '1000',
      estimatedFee: '0.01',
      estimatedTime: 15,
    });

    act(() => {
      useCrossChainStore.getState().reset();
    });

    const state = useCrossChainStore.getState();
    expect(state.transfers).toEqual([]);
    expect(state.providers).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.selectedProvider).toBeNull();
    expect(state.selectedSourceChain).toBeNull();
    expect(state.selectedDestinationChain).toBeNull();
    expect(state.selectedToken).toBeNull();
    expect(state.amount).toBe('');
    expect(state.estimatedFee).toBeNull();
    expect(state.estimatedTime).toBeNull();
  });
});

describe('crossChainStore - getTransferById', () => {
  it('getTransferById 应该返回对应的转账记录', () => {
    useCrossChainStore.setState({ transfers: [mockTransfer] });

    const result = useCrossChainStore.getState().getTransferById('transfer-1');
    expect(result).toEqual(mockTransfer);
  });

  it('getTransferById 应该返回 undefined 当转账不存在时', () => {
    const result = useCrossChainStore.getState().getTransferById('non-existent');
    expect(result).toBeUndefined();
  });
});

describe('crossChainStore - getTransfersByStatus', () => {
  it('getTransfersByStatus 应该返回指定状态的转账记录', () => {
    const completedTransfer = { ...mockTransfer, id: 'transfer-2', status: 'completed' };
    useCrossChainStore.setState({ transfers: [mockTransfer, completedTransfer] });

    const result = useCrossChainStore.getState().getTransfersByStatus('pending');
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('pending');
  });

  it('getTransfersByStatus 应该返回空数组当没有匹配时', () => {
    useCrossChainStore.setState({ transfers: [mockTransfer] });

    const result = useCrossChainStore.getState().getTransfersByStatus('completed');
    expect(result).toHaveLength(0);
  });
});

describe('crossChainStore - getProviderById', () => {
  it('getProviderById 应该返回对应的提供商', () => {
    useCrossChainStore.setState({ providers: [mockProvider] });

    const result = useCrossChainStore.getState().getProviderById('stargate');
    expect(result).toEqual(mockProvider);
  });

  it('getProviderById 应该返回 undefined 当提供商不存在时', () => {
    const result = useCrossChainStore.getState().getProviderById('non-existent');
    expect(result).toBeUndefined();
  });
});

describe('crossChainStore - getProvidersForRoute', () => {
  it('getProvidersForRoute 应该返回支持指定路由的提供商', () => {
    useCrossChainStore.setState({ providers: [mockProvider] });

    const result = useCrossChainStore.getState().getProvidersForRoute('ethereum', 'polygon');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('stargate');
  });

  it('getProvidersForRoute 应该返回空数组当没有提供商支持时', () => {
    useCrossChainStore.setState({ providers: [mockProvider] });

    const result = useCrossChainStore.getState().getProvidersForRoute('ethereum', 'solana');
    expect(result).toHaveLength(0);
  });
});

describe('crossChainStore - getSupportedTokens', () => {
  it('getSupportedTokens 应该返回支持的代币列表', () => {
    useCrossChainStore.setState({ providers: [mockProvider] });

    const result = useCrossChainStore.getState().getSupportedTokens('ethereum', 'polygon');
    expect(result).toContain('USDC');
    expect(result).toContain('USDT');
    expect(result).toContain('ETH');
  });

  it('getSupportedTokens 应该返回空数组当没有提供商支持时', () => {
    useCrossChainStore.setState({ providers: [mockProvider] });

    const result = useCrossChainStore.getState().getSupportedTokens('ethereum', 'solana');
    expect(result).toHaveLength(0);
  });
});

describe('crossChainStore - isRouteSupported', () => {
  it('isRouteSupported 应该返回 true 当路由支持时', () => {
    useCrossChainStore.setState({ providers: [mockProvider] });

    const result = useCrossChainStore.getState().isRouteSupported('ethereum', 'polygon');
    expect(result).toBe(true);
  });

  it('isRouteSupported 应该返回 false 当路由不支持时', () => {
    useCrossChainStore.setState({ providers: [mockProvider] });

    const result = useCrossChainStore.getState().isRouteSupported('ethereum', 'solana');
    expect(result).toBe(false);
  });
});

describe('crossChainStore - getPendingTransfers', () => {
  it('getPendingTransfers 应该返回所有待处理的转账', () => {
    const completedTransfer = { ...mockTransfer, id: 'transfer-2', status: 'completed' };
    useCrossChainStore.setState({ transfers: [mockTransfer, completedTransfer] });

    const result = useCrossChainStore.getState().getPendingTransfers();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('pending');
  });
});

describe('crossChainStore - getCompletedTransfers', () => {
  it('getCompletedTransfers 应该返回所有已完成的转账', () => {
    const completedTransfer = { ...mockTransfer, id: 'transfer-2', status: 'completed' };
    useCrossChainStore.setState({ transfers: [mockTransfer, completedTransfer] });

    const result = useCrossChainStore.getState().getCompletedTransfers();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('completed');
  });
});

describe('crossChainStore - getTotalTransferred', () => {
  it('getTotalTransferred 应该返回总转账金额', () => {
    const transfer1 = { ...mockTransfer, amount: '1000' };
    const transfer2 = { ...mockTransfer, id: 'transfer-2', amount: '500' };
    useCrossChainStore.setState({ transfers: [transfer1, transfer2] });

    const result = useCrossChainStore.getState().getTotalTransferred();
    expect(result).toBe(1500);
  });

  it('getTotalTransferred 应该返回 0 当没有转账时', () => {
    const result = useCrossChainStore.getState().getTotalTransferred();
    expect(result).toBe(0);
  });
});

describe('crossChainStore - getTransferCount', () => {
  it('getTransferCount 应该返回转账数量', () => {
    useCrossChainStore.setState({ transfers: [mockTransfer] });

    const result = useCrossChainStore.getState().getTransferCount();
    expect(result).toBe(1);
  });

  it('getTransferCount 应该返回 0 当没有转账时', () => {
    const result = useCrossChainStore.getState().getTransferCount();
    expect(result).toBe(0);
  });
});
