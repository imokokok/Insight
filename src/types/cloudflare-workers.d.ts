// Keep local Node-based type checks independent from generated Wrangler types.
// Cloudflare's runtime module is available in Workers, while CI may run without
// the generated `.cloudflare/types` directory.
declare module 'cloudflare:workers';
