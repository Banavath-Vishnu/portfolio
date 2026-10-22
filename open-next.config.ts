// OpenNext adapter config for Cloudflare Workers.
// Pages that read the database render on each request (`dynamic = 'force-dynamic'`), so no
// incremental cache bucket is needed. See https://opennext.js.org/cloudflare/caching to add one later.
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig({});
