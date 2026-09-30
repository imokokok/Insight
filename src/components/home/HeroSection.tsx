import Image from 'next/image';
import Link from 'next/link';

import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section
      className="ice-hero home-hero relative isolate overflow-hidden"
      aria-labelledby="home-title"
    >
      <Image
        src="/design-concepts/insight-blue-glacier-home-sample-v5.png"
        alt="A translucent blue glacier sculpture revealing deep layers beneath its surface"
        fill
        priority
        sizes="100vw"
        className="ice-hero-object object-cover"
      />
      <div className="ice-hero-wash absolute inset-0" />
      <div className="ice-hero-grain absolute inset-0" />

      <div className="home-hero-inner relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="home-hero-topline home-hero-reveal home-hero-reveal-1">
          <span>INSIGHT / ORACLE INTELLIGENCE</span>
          <span>FIELD NOTE 001 — BENEATH THE PRICE</span>
        </div>

        <div className="home-hero-main">
          <div className="home-hero-copy">
            <p className="home-hero-overline home-hero-reveal home-hero-reveal-1">
              Transparency for decisions that matter
            </p>
            <h1 id="home-title" className="home-hero-reveal home-hero-reveal-2">
              Go beneath
              <br />
              <span>the price.</span>
            </h1>
            <p className="home-hero-description home-hero-reveal home-hero-reveal-3">
              A price is a surface. Insight reveals the oracle sources, their agreement, their
              freshness, and the risk of acting on them.
            </p>
            <div className="home-hero-actions home-hero-reveal home-hero-reveal-4">
              <Link href="#live-evidence" className="home-hero-primary">
                Explore live evidence <ArrowRight aria-hidden="true" />
              </Link>
              <Link href="/safety-check" className="home-hero-secondary">
                Run a safety check <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="home-hero-artnote home-hero-reveal home-hero-reveal-4" aria-hidden="true">
            <span>FIG. 01 / PRICE ANATOMY</span>
            <i />
            <strong>
              What lies below
              <br />
              is what matters.
            </strong>
          </div>
        </div>

        <a className="home-hero-scroll" href="#live-evidence">
          SCROLL TO EXAMINE <ArrowDown aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
