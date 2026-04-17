import LoginContent from './LoginContent';

export async function generateMetadata() {
  return {
    title: 'Login - Insight',
    description: 'Sign in to your Insight account',
  };
}

export default function LoginPage() {
  return <LoginContent />;
}
