import { Metadata } from 'next';
import { ChroniclePageContent } from './ChroniclePageContent';

export const metadata: Metadata = {
  title: 'Chronicle Labs - MakerDAO Native Oracle',
  description:
    'Chronicle Labs is the native oracle solution for MakerDAO, providing high-security decentralized price feeds with Scuttlebutt security protocol.',
};

export default function ChroniclePage() {
  return <ChroniclePageContent />;
}
