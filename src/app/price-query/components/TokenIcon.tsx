'use client';

import { useState } from 'react';

import Image from 'next/image';

const cryptoLogoMap: Record<string, string> = {
  BTC: '/logos/cryptos/btc.svg',
  ETH: '/logos/cryptos/eth.svg',
  SOL: '/logos/cryptos/sol.svg',
  AVAX: '/logos/cryptos/avax.svg',
  NEAR: '/logos/cryptos/near.svg',
  MATIC: '/logos/cryptos/matic.svg',
  ARB: '/logos/cryptos/arb.svg',
  OP: '/logos/cryptos/op.svg',
  DOT: '/logos/cryptos/dot.svg',
  ADA: '/logos/cryptos/ada.svg',
  ATOM: '/logos/cryptos/atom.svg',
  FTM: '/logos/cryptos/ftm.svg',
  LINK: '/logos/cryptos/link.svg',
  UNI: '/logos/cryptos/uni.svg',
  AAVE: '/logos/cryptos/aave.svg',
  MKR: '/logos/cryptos/mkr.svg',
  SNX: '/logos/cryptos/snx.svg',
  COMP: '/logos/cryptos/comp.svg',
  YFI: '/logos/cryptos/yfi.svg',
  CRV: '/logos/cryptos/crv.svg',
  LDO: '/logos/cryptos/ldo.svg',
  SUSHI: '/logos/cryptos/sushi.svg',
  '1INCH': '/logos/cryptos/1inch.svg',
  BAL: '/logos/cryptos/bal.svg',
  FXS: '/logos/cryptos/fxs.svg',
  RPL: '/logos/cryptos/rpl.svg',
  GMX: '/logos/cryptos/gmx.svg',
  DYDX: '/logos/cryptos/dydx.svg',
  USDC: '/logos/cryptos/usdc.svg',
  USDT: '/logos/cryptos/usdt.svg',
  DAI: '/logos/cryptos/dai.svg',
};

interface TokenIconProps {
  symbol: string;
  className?: string;
}

export function TokenIcon({ symbol, className = 'w-14 h-14' }: TokenIconProps) {
  const [hasError, setHasError] = useState(false);

  const logoPath = cryptoLogoMap[symbol];

  if (logoPath && !hasError) {
    return (
      <Image
        src={logoPath}
        alt={`${symbol} logo`}
        width={56}
        height={56}
        className={`rounded-full ${className}`}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div
      className={`rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg ${className}`}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}
