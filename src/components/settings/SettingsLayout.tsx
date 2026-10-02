'use client';

import { type KeyboardEvent, type ReactNode } from 'react';

import { ArrowUpRight } from 'lucide-react';

import { SettingsHero } from './SettingsHero';
import { getSettingsSection, settingsSections, type SettingsTab } from './settingsSections';

export type { SettingsTab } from './settingsSections';

interface SettingsLayoutProps {
  children: ReactNode;
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

export function SettingsLayout({ children, activeTab, onTabChange }: SettingsLayoutProps) {
  const activeSection = getSettingsSection(activeTab);
  const activeIndex = settingsSections.indexOf(activeSection);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (index + 1) % settingsSections.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (index - 1 + settingsSections.length) % settingsSections.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = settingsSections.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextTab = settingsSections[nextIndex];
    onTabChange(nextTab.id);
    document.getElementById(`settings-tab-${nextTab.id}`)?.focus();
  };

  return (
    <div className="editorial-workspace evidence-workbench commercial-workbench settings-surface settings-control-workbench min-h-screen">
      <SettingsHero activeTab={activeTab} />

      <div className="editorial-frame mx-auto max-w-[1440px] px-5 pb-16 pt-8 sm:px-8 lg:px-12 lg:pb-24 lg:pt-12">
        <div className="settings-control-grid">
          <nav className="settings-control-nav" aria-label="Account settings">
            <div className="settings-nav-heading">
              <span>Control index</span>
              <span>01 — 05</span>
            </div>
            <div
              className="settings-tab-list"
              role="tablist"
              aria-label="Account settings sections"
            >
              {settingsSections.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    id={`settings-tab-${tab.id}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls="settings-panel"
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => onTabChange(tab.id)}
                    onKeyDown={(event) => handleTabKeyDown(event, index)}
                    className={`settings-tab-record ${isActive ? 'is-active' : ''}`}
                  >
                    <span className="settings-tab-index">{String(index + 1).padStart(2, '0')}</span>
                    <Icon className="settings-tab-icon" aria-hidden="true" />
                    <span className="settings-tab-copy">
                      <strong>{tab.label}</strong>
                      <small>{tab.navDescription}</small>
                    </span>
                    <ArrowUpRight className="settings-tab-arrow" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            <p className="settings-nav-note">
              Five clear controls. One place to manage your account.
            </p>
          </nav>

          <main className="settings-account-ledger" role="main">
            <div className="settings-panel-intro">
              <div>
                <p className="settings-panel-kicker">
                  Account state / {String(activeIndex + 1).padStart(2, '0')}
                </p>
                <h2>{activeSection.navDescription}</h2>
              </div>
              <span>{activeSection.detail}</span>
            </div>
            <div
              id="settings-panel"
              role="tabpanel"
              aria-labelledby={`settings-tab-${activeTab}`}
              tabIndex={0}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
