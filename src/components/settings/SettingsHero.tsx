import { EditorialWorkspaceHeader } from '@/components/editorial';

export function SettingsHero() {
  return (
    <section className="editorial-frame mx-auto max-w-[1440px] px-5 pt-4 sm:px-8 lg:px-12">
      <EditorialWorkspaceHeader
        index="13"
        stage="Account"
        eyebrow="Personal control surface · Identity, preferences, stored data, API access, and billing"
        title="Keep access, usage, and preferences under your control."
        description="Manage the account state that follows you across Insight—from interface defaults to production API credentials and credit capacity."
        evidence={['Profile ownership', 'API key control', 'Usage visibility']}
      />
    </section>
  );
}
