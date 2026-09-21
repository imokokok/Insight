import type {
  RwaInstrumentRegistry,
  RwaInstrumentRegistryEntry,
} from '../../../sdk/src/rwa-instrument-registry';

export interface IsoMicRecord {
  mic: string;
  operatingMic: string;
  type: string;
  marketName: string;
  legalEntityName: string;
  lei: string;
  countryCode: string;
  status: string;
  lastValidationDate: string;
}

export interface OpenFigiMappingResult {
  figi?: string;
  shareClassFIGI?: string;
  compositeFIGI?: string;
  ticker?: string;
  name?: string;
  exchCode?: string;
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else field += character;
  }
  if (quoted) throw new TypeError('ISO_MIC_CSV_UNTERMINATED_QUOTE');
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows;
}

export function parseIsoMicCsv(csv: string): IsoMicRecord[] {
  const rows = parseCsvRows(csv);
  const header = rows.shift();
  if (!header) throw new TypeError('ISO_MIC_CSV_EMPTY');
  const positions = new Map(header.map((name, index) => [name, index]));
  const required = [
    'MIC',
    'OPERATING MIC',
    'OPRT/SGMT',
    'MARKET NAME-INSTITUTION DESCRIPTION',
    'LEGAL ENTITY NAME',
    'LEI',
    'ISO COUNTRY CODE (ISO 3166)',
    'STATUS',
    'LAST VALIDATION DATE',
  ];
  for (const name of required) {
    if (!positions.has(name)) throw new TypeError(`ISO_MIC_CSV_MISSING_COLUMN:${name}`);
  }
  const field = (row: string[], name: string) => row[positions.get(name)!] ?? '';
  return rows
    .filter((row) => row.some(Boolean))
    .map((row) => ({
      mic: field(row, 'MIC'),
      operatingMic: field(row, 'OPERATING MIC'),
      type: field(row, 'OPRT/SGMT'),
      marketName: field(row, 'MARKET NAME-INSTITUTION DESCRIPTION'),
      legalEntityName: field(row, 'LEGAL ENTITY NAME'),
      lei: field(row, 'LEI'),
      countryCode: field(row, 'ISO COUNTRY CODE (ISO 3166)'),
      status: field(row, 'STATUS'),
      lastValidationDate: field(row, 'LAST VALIDATION DATE'),
    }));
}

function compactIsoDate(value: string | null): string {
  return value?.replaceAll('-', '') ?? '';
}

export function verifyRegistryMicSnapshot(
  registry: RwaInstrumentRegistry,
  records: IsoMicRecord[]
): void {
  const byMic = new Map(records.map((record) => [record.mic, record]));
  for (const entry of registry.entries) {
    const current = byMic.get(entry.mic.mic);
    if (!current) throw new TypeError(`ISO_MIC_NOT_FOUND:${entry.mic.mic}`);
    const checks: Array<[boolean, string]> = [
      [current.operatingMic === entry.mic.operatingMic, 'OPERATING_MIC'],
      [current.type === entry.mic.type, 'TYPE'],
      [current.marketName === entry.mic.marketName, 'MARKET_NAME'],
      [current.legalEntityName === entry.mic.legalEntityName, 'LEGAL_ENTITY'],
      [current.lei === (entry.mic.lei ?? ''), 'LEI'],
      [current.countryCode === entry.mic.countryCode, 'COUNTRY'],
      [current.status === entry.mic.status, 'STATUS'],
      [
        current.lastValidationDate === compactIsoDate(entry.mic.lastValidationDate),
        'VALIDATION_DATE',
      ],
    ];
    for (const [matches, field] of checks) {
      if (!matches) throw new TypeError(`ISO_MIC_DRIFT:${entry.mic.mic}:${field}`);
    }
  }
}

export function verifyOpenFigiMapping(
  entry: RwaInstrumentRegistryEntry,
  results: OpenFigiMappingResult[]
): void {
  const match = results.some(
    (result) =>
      result.shareClassFIGI === entry.figi.shareClassFigi &&
      result.compositeFIGI === entry.figi.compositeFigi &&
      result.ticker?.toUpperCase() === entry.issuerBinding.symbol
  );
  if (!match) throw new TypeError(`OPENFIGI_MAPPING_DRIFT:${entry.issuerBinding.symbol}`);
}
