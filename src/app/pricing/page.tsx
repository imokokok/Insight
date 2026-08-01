import { redirect } from 'next/navigation';

/**
 * Pricing has been integrated into the API page. This route now redirects so
 * that existing links (footer, billing panel, API-key manager, middleware
 * upgrade URLs, payment-provider review links, etc.) continue to land users on
 * the pricing content hosted at /api#pricing instead of 404'ing.
 */
export default function PricingPage() {
  redirect('/api#pricing');
}
