'use client';

import { useState } from 'react';

import { Check, Copy, Github, Mail, MessageCircle, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const CONTACT_EMAIL = 'contact@oracleinsight.xyz';
const GITHUB_ISSUES_URL = 'https://github.com/imokokok/Insight/issues';
export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing if clipboard is unavailable
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setCopied(false);
  };

  return (
    <>
      {/* Floating trigger button */}
      <Button
        onClick={handleOpen}
        size="sm"
        leftIcon={<MessageCircle className="w-4 h-4" />}
        aria-label="Open feedback"
        className={cn(
          'fixed bottom-3 left-3 z-40 h-10 w-10 rounded-sm px-0 sm:bottom-4 sm:left-4 sm:w-auto sm:pl-3 sm:pr-4',
          'border-primary-700 bg-primary-700 text-white hover:bg-slate-950',
          'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2'
        )}
      >
        <span className="hidden sm:inline">Feedback</span>
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Modal panel stays out of the accessibility tree until opened. */}
      {isOpen && (
        <div
          className="fixed bottom-20 left-4 z-50 w-[calc(100vw-2rem)] max-w-sm border border-slate-900/20 bg-[#f8f7f4]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
        >
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 id="feedback-title" className="text-lg font-semibold text-gray-900">
                  Help us improve
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Your feedback shapes Insight. If a workflow feels confusing, a feature is missing,
                  something is unclear, or you simply have an idea — we&apos;d genuinely love to
                  hear it.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                aria-label="Close feedback"
                className="shrink-0 -mr-2 -mt-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {/* Email card */}
              <div className="flex items-center gap-3 border-y border-slate-900/15 bg-white/55 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary-200 bg-primary-50 text-primary-700">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{CONTACT_EMAIL}</p>
                  <p className="text-xs text-gray-500">Reach us directly</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyEmail}
                  aria-label="Copy email address"
                  className="shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="sr-only">{copied ? 'Copied' : 'Copy'}</span>
                </Button>
              </div>

              {/* Action buttons */}
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=Insight Feedback`}
                className={cn(
                  'flex items-center justify-center gap-2 w-full px-4 py-2.5',
                  'border border-primary-700 bg-primary-700 text-sm font-medium text-white',
                  'hover:bg-primary-700 active:bg-primary-800 transition-colors'
                )}
              >
                <Mail className="w-4 h-4" />
                Email us your thoughts
              </a>

              <a
                href={GITHUB_ISSUES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center justify-center gap-2 w-full px-4 py-2.5',
                  'border border-gray-300 bg-white text-sm font-medium text-gray-700',
                  'hover:bg-gray-50 hover:border-gray-400 transition-colors'
                )}
              >
                <Github className="w-4 h-4" />
                Open a GitHub issue
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
