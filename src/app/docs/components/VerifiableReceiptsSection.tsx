import Link from 'next/link';

import { VerifyExecutionPairWidget } from '@/components/verifiability/VerifyExecutionPairWidget';
import { VerifyReceiptWidget } from '@/components/verifiability/VerifyReceiptWidget';

const ANCHORS = [
  {
    block: 964367,
    txid: '750937dacd0e381a72901cd6084e47c4aab4b4b98c70834a24f3f2c845bd72b5',
  },
  {
    block: 964407,
    txid: '47762185c15e166f16a010cde32c682300ebc8d2eacca8d0b1f5776aefbe7f71',
  },
  {
    block: 964535,
    txid: 'b338174f10e992b05157aae1f60e704ac1ec997b949ae8ea002acae77f0a0272',
  },
];

export function VerifiableReceiptsSection() {
  return (
    <section id="verifiable-receipts" className="py-16 scroll-mt-20 border-t border-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-2">
            Verifiable receipts
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">
            Every receipt can be verified by anyone, without trusting Insight
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Each pre-trade check is signed as an EIP-712 attestation (v1 11 fields, v2 26, v3 27).
            The public verify endpoint checks the signature against the published attester key and
            routes by the attestation&apos;s own schemaVersion. At v3 both safety gates are
            recomputable from the bytes alone, because both policy constants are inside the signed
            struct; the constants are also pinned in a machine-readable declaration.
          </p>
        </div>

        <VerifyReceiptWidget />

        <VerifyExecutionPairWidget />

        <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">
            Verify locally, without calling Insight
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            For agents and protocols that need an independent verification path, the repository
            includes a standalone npm package. It recomputes the EIP-712 hash and recovers the
            signer locally; it does not need an API key, database access, or a network request.
          </p>
          <pre className="text-xs leading-relaxed text-slate-700 font-mono overflow-x-auto whitespace-pre rounded-lg bg-white border border-blue-100 p-4">
            {`# From the Insight repository
npm install ./verifier

# After npm publication
npm install verify-insight-receipt

import { verifyReceipt } from 'verify-insight-receipt';

const result = await verifyReceipt(receipt, { keyRegistry });
if (result.code !== 'ok') {
  throw new Error(result.code);
}`}
          </pre>
          <p className="text-xs text-slate-500 mt-3">
            Verification is not endorsement. A valid result proves the signed bytes and signer
            relationship, not that the underlying trade or verdict was correct.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Verify from the command line
            </h3>
            <pre className="text-xs leading-relaxed text-slate-700 font-mono overflow-x-auto whitespace-pre">
              {`# fetch a real signed sample
curl -s https://www.oracleinsight.xyz/api/v1/safety/attestation/sample \\
  | jq .data.attestation > receipt.json

# verify it (public, no API key)
curl -s https://www.oracleinsight.xyz/api/v1/safety/attestation/verify \\
  -H 'Content-Type: application/json' \\
  -d "{\\"attestation\\": $(cat receipt.json | jq -c)}"

# cross-check the pinned declaration (sha256 035144d0...)
curl -s https://www.oracleinsight.xyz/.well-known/vrt1-scale-declaration.json \\
  | shasum -a 256`}
            </pre>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Where the evidence lives</h3>
            <ul className="text-sm text-slate-600 space-y-2.5">
              <li>
                <span className="font-semibold text-slate-900">Published keys</span> —{' '}
                <Link
                  className="text-blue-600 hover:underline"
                  href="/.well-known/oracle-keys.json"
                  target="_blank"
                >
                  .well-known/oracle-keys.json
                </Link>
              </li>
              <li>
                <span className="font-semibold text-slate-900">Scale declaration</span> —{' '}
                <Link
                  className="text-blue-600 hover:underline"
                  href="/.well-known/vrt1-scale-declaration.json"
                  target="_blank"
                >
                  .well-known/vrt1-scale-declaration.json
                </Link>{' '}
                (27 field scales + both policy constants; sha256 035144d0…594d, mirrored at the
                pinned revision)
              </li>
              <li>
                <span className="font-semibold text-slate-900">Vendor registry</span> —{' '}
                <a
                  className="text-blue-600 hover:underline"
                  href="https://github.com/Ifasola34/vrt1-spec/blob/main/registry/vendor-action-types.json"
                  target="_blank"
                  rel="noreferrer"
                >
                  VRT1 spec §8.6
                </a>{' '}
                lists the type as a pointer to the declaration. Listing records that a type exists
                and where its declaration is; it is not an endorsement of verdicts.
              </li>
              <li>
                <span className="font-semibold text-slate-900">Bitcoin anchors</span> — records were
                anchored at blocks{' '}
                {ANCHORS.map((a, i) => (
                  <span key={a.block}>
                    {i > 0 && ', '}
                    <a
                      className="text-blue-600 hover:underline font-mono"
                      href={`https://mempool.space/tx/${a.txid}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {a.block}
                    </a>
                  </span>
                ))}
                . An anchor proves the record existed in that form before that block; it does not
                prove a verdict was correct or that the check is still fresh.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
