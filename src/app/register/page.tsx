import RegisterContent from './RegisterContent';

export async function generateMetadata() {
  return {
    title: 'Register - Insight',
    description: 'Create your Insight account',
  };
}

export default function RegisterPage() {
  return <RegisterContent />;
}
