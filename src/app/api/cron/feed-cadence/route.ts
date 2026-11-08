// Manual authenticated fallback only; the scheduled run executes on GitHub
// Actions. Cap the Vercel default (300s on Hobby) so an accidental or stuck
// invocation cannot hold a 2 GB Fluid instance for five minutes.
export const maxDuration = 60;

export { GET } from './runner';
