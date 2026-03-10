import { DataSourceCredibility } from '@/components/oracle';

const exampleSources = [
  {
    id: 'chainlink-main',
    name: 'Chainlink 主节点',
    accuracy: 95,
    responseSpeed: 88,
    consistency: 92,
    availability: 99,
    contribution: 35.5,
  },
  {
    id: 'pyth-network',
    name: 'Pyth Network',
    accuracy: 92,
    responseSpeed: 95,
    consistency: 88,
    availability: 97,
    contribution: 28.3,
  },
  {
    id: 'band-protocol',
    name: 'Band Protocol',
    accuracy: 88,
    responseSpeed: 75,
    consistency: 85,
    availability: 94,
    contribution: 22.1,
  },
  {
    id: 'api3',
    name: 'API3',
    accuracy: 90,
    responseSpeed: 82,
    consistency: 87,
    availability: 96,
    contribution: 14.1,
  },
];

export default function ExamplePage() {
  return (
    <div className="container mx-auto p-6">
      <DataSourceCredibility sources={exampleSources} />
    </div>
  );
}
