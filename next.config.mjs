/** @type {import('next').NextConfig} */
const nextConfig = {
  // Where the build output goes. Defaults to .next, exactly as before, so
  // Vercel and every normal `npm run dev` / `npm run build` are unchanged.
  //
  // The override exists because two processes sharing one .next destroy each
  // other: a `next build` rewrites the folder while a running `next dev` still
  // holds the old module map, and the dev server starts returning 500s and
  // MODULE_NOT_FOUND for chunks it compiled a minute ago. That is survivable
  // when it is your own build, and not survivable when something else in the
  // repo builds while you are looking at a preview. A long-lived preview server
  // can set NEXT_DIST_DIR to keep its output out of the way.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    domains: [
      'xrmzdxogbwcbyeiarhux.supabase.co',
    ],
  },
};

export default nextConfig;
