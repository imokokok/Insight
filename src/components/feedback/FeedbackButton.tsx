'use client';

import { useEffect, useState } from 'react';

import { Check, Copy, Github, Mail, MessageCircle, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const CONTACT_EMAIL = 'contact@oracleinsight.xyz';
const GITHUB_ISSUES_URL = 'https://github.com/imokokok/Insight/issues';
const INTRO_SEEN_KEY = 'insight-feedback-intro-seen';

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem(INTRO_SEEN_KEY);
  });

  useEffect(() => {
    if (!showIntro) return;
    const timer = setTimeout(() => {
      setShowIntro(false);
      localStorage.setItem(INTRO_SEEN_KEY, 'true');
    }, 5000);
    return () => clearTimeout(timer);
  }, [showIntro]);

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
    setShowIntro(false);
    localStorage.setItem(INTRO_SEEN_KEY, 'true');
  };

  const handleClose = () => {
    setIsOpen(false);
    setCopied(false);
  };

  return (
    <>
      {/* First-time intro tooltip */}
      <div
        className={cn(
          'fixed bottom-[4.5rem] left-4 z-40 max-w-[calc(100vw-2rem)]',
          'bg-gray-900 text-white text-sm rounded-lg px-3 py-2 shadow-lg',
          'transition-all duration-300 ease-out',
          showIntro ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        )}
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 shrink-0" />
          <span>Have feedback or found an issue? Click here.</span>
        </div>
        <div className="absolute -bottom-1 left-5 w-2 h-2 bg-gray-900 rotate-45" />
      </div>

      {/* Floating trigger button */}
      <Button
        onClick={handleOpen}
        size="sm"
        leftIcon={<MessageCircle className="w-4 h-4" />}
        aria-label="Open feedback"
        className={cn(
          'fixed bottom-4 left-4 z-40 h-10 pl-3 pr-4 rounded-full shadow-lg',
          'bg-primary-600 text-white hover:bg-primary-700',
          'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2'
        )}
      >
        Feedback
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Modal panel */}
      <div
        className={cn(
          'fixed bottom-20 left-4 z-50 w-[calc(100vw-2rem)] max-w-sm',
          'bg-white rounded-2xl shadow-2xl border border-gray-200',
          'transition-all duration-200 ease-out',
          isOpen
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        )}
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
                something is unclear, or you simply have an idea — we&apos;d genuinely love to hear
                it.
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
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 text-primary-600 shrink-0">
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
                'text-sm font-medium text-white bg-primary-600 rounded-lg',
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
                'text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg',
                'hover:bg-gray-50 hover:border-gray-400 transition-colors'
              )}
            >
              <Github className="w-4 h-4" />
              Open a GitHub issue
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
