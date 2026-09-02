// Netlify Dev doesn't inject NETLIFY_BLOBS_CONTEXT into functions running in
// "Lambda compatibility mode" (classic `exports.handler` functions) on some
// setups, which makes getStore() throw MissingBlobsEnvironmentError even
// though the site has Blobs enabled. Production Netlify always injects the
// context automatically, so this fallback only kicks in locally, using the
// site id / auth token already present in .env for `netlify dev`.
const { getStore } = require("@netlify/blobs");

function getBlobStore(name) {
  if (process.env.NETLIFY_DEV === "true" && process.env.NETLIFY_SITE_ID && process.env.NETLIFY_AUTH_TOKEN) {
    return getStore({
      name,
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN
    });
  }
  return getStore(name);
}

module.exports = { getBlobStore };
