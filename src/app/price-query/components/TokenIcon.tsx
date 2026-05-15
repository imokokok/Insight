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
  // Forex
  EUR: '/logos/forex/eur.svg',
  GBP: '/logos/forex/gbp.svg',
  JPY: '/logos/forex/jpy.svg',
  CHF: '/logos/forex/chf.svg',
  AUD: '/logos/forex/aud.svg',
  CAD: '/logos/forex/cad.svg',
  NZD: '/logos/forex/nzd.svg',
  SGD: '/logos/forex/sgd.svg',
  HKD: '/logos/forex/hkd.svg',
  CNY: '/logos/forex/cny.svg',
  KRW: '/logos/forex/krw.svg',
  INR: '/logos/forex/inr.svg',
  MXN: '/logos/forex/mxn.svg',
  BRL: '/logos/forex/brl.svg',
  SEK: '/logos/forex/sek.svg',
  NOK: '/logos/forex/nok.svg',
  TRY: '/logos/forex/try.svg',
  ZAR: '/logos/forex/zar.svg',
  PHP: '/logos/forex/php.svg',
  IDR: '/logos/forex/idr.svg',
  // Commodities
  XAU: '/logos/commodities/xau.svg',
  XAG: '/logos/commodities/xag.svg',
  XPT: '/logos/commodities/xpt.svg',
  XPD: '/logos/commodities/xpd.svg',
  USOILSPOT: '/logos/commodities/usoilspot.svg',
  UKOILSPOT: '/logos/commodities/ukoilspot.svg',
  // US Equities
  AAPL: '/logos/equities/aapl.svg',
  AMZN: '/logos/equities/amzn.svg',
  TSLA: '/logos/equities/tsla.svg',
  GOOGL: '/logos/equities/googl.svg',
  MSFT: '/logos/equities/msft.svg',
  META: '/logos/equities/meta.svg',
  NVDA: '/logos/equities/nvda.svg',
  COIN: '/logos/equities/coin.svg',
  LMT: '/logos/equities/lmt.svg',
  PANW: '/logos/equities/panw.svg',
  PFE: '/logos/equities/pfe.svg',
  TMUS: '/logos/equities/tmus.svg',
  PLD: '/logos/equities/pld.svg',
  SCHW: '/logos/equities/schw.svg',
  WM: '/logos/equities/wm.svg',
  GLW: '/logos/equities/glw.svg',
  FDX: '/logos/equities/fdx.svg',
  WDAY: '/logos/equities/wday.svg',
  TROW: '/logos/equities/trow.svg',
  PH: '/logos/equities/ph.svg',
  VRT: '/logos/equities/vrt.svg',
  BRO: '/logos/equities/bro.svg',
  IFF: '/logos/equities/iff.svg',
  EQR: '/logos/equities/eqr.svg',
  HUM: '/logos/equities/hum.svg',
  FLUT: '/logos/equities/flut.svg',
  // ETFs
  ARKK: '/logos/etfs/arkk.svg',
  SGOV: '/logos/etfs/sgov.svg',
  VEA: '/logos/etfs/vea.svg',
  DIVB: '/logos/etfs/divb.svg',
  FBCG: '/logos/etfs/fbcg.svg',
  ICSH: '/logos/etfs/icsh.svg',
  IVW: '/logos/etfs/ivw.svg',
  XLE: '/logos/etfs/xle.svg',
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
