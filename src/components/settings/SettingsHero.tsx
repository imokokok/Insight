import { getSettingsSection, settingsSections, type SettingsTab } from './settingsSections';

export function SettingsHero({ activeTab }: { activeTab: SettingsTab }) {
  const section = getSettingsSection(activeTab);
  const sectionNumber = String(settingsSections.indexOf(section) + 1).padStart(2, '0');

  return (
    <section className="settings-hero editorial-frame mx-auto max-w-[1440px] px-5 pt-5 sm:px-8 lg:px-12 lg:pt-9">
      <div className="settings-hero-grid">
        <div className="settings-hero-copy" key={activeTab}>
          <div className="settings-hero-meta">
            <span>Insight / Account</span>
            <span>Control surface — 14</span>
          </div>

          <p className="settings-hero-chapter">
            <span>{sectionNumber}</span>
            <i aria-hidden="true" />
            {section.label}
          </p>
          <h1 id="settings-heading" className="font-display">
            {section.title}
          </h1>
          <p className="settings-hero-description">{section.description}</p>

          <div className="settings-hero-footer" aria-hidden="true">
            <span>Account / Control</span>
            <span>Identity → Capacity</span>
          </div>
        </div>

        <aside className="settings-hero-aside" aria-label={`Current control: ${section.label}`}>
          <div className="settings-hero-aside-meta">
            <span>Current control</span>
            <span>0{settingsSections.length} total</span>
          </div>
          <div className="settings-hero-number" aria-hidden="true">
            {sectionNumber}
            <span>/ {String(settingsSections.length).padStart(2, '0')}</span>
          </div>
          <div className="settings-hero-aside-detail">
            <strong>{section.label}</strong>
            <span>{section.detail}</span>
          </div>
          <div className="settings-hero-meter" aria-hidden="true">
            {settingsSections.map((item) => (
              <span key={item.id} className={item.id === activeTab ? 'is-active' : ''} />
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
