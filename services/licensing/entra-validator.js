const crypto = require("node:crypto");
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function decode(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}
function createEntraValidator({ audience, requiredScope = "License.Check",
  requiredRole = "", fetcher = fetch, now = Date.now }) {
  if (!audience) return async () => { const error = new Error("consultant-auth-not-configured"); error.status = 503; throw error; };
  // Microsoft rotates its signing keys. A token signed with a key that is not in the cached
  // set fetches the set again, at most once per KEY_RETRY_MS, so new keys are accepted at once
  // without letting made-up key ids trigger a fetch on every request.
  const KEY_RETRY_MS = 5 * 60000;
  let keys = null, refreshAt = 0, forcedAt = -Infinity;
  async function jwks(force = false) {
    if (keys && refreshAt > now() && !force) return keys;
    const metadata = await (await fetcher(
      "https://login.microsoftonline.com/organizations/v2.0/.well-known/openid-configuration")).json();
    const response = await fetcher(metadata.jwks_uri);
    if (!response.ok) throw new Error("entra-keys-unavailable");
    keys = (await response.json()).keys;
    refreshAt = now() + 6 * 3600000;
    return keys;
  }
  return async authorization => {
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    const parts = token.split(".");
    if (parts.length !== 3) { const error = new Error("unauthorized"); error.status = 401; throw error; }
    let header, claims;
    try { header = decode(parts[0]); claims = decode(parts[1]); }
    catch { const error = new Error("unauthorized"); error.status = 401; throw error; }
    const acceptedAudiences = new Set([audience,
      audience.startsWith("api://") ? audience.slice(6) : `api://${audience}`]);
    const issuer = String(claims.iss || "");
    const acceptedIssuer = issuer === `https://login.microsoftonline.com/${claims.tid}/v2.0` ||
      issuer === `https://sts.windows.net/${claims.tid}/`;
    if (header.alg !== "RS256" || !header.kid || !acceptedAudiences.has(claims.aud) ||
        !GUID.test(claims.tid || "") || !GUID.test(claims.oid || "") ||
        !acceptedIssuer ||
        Number(claims.exp) * 1000 <= now() || Number(claims.nbf || 0) * 1000 > now() + 60000 ||
        (requiredScope && !String(claims.scp || "").split(" ").includes(requiredScope)) ||
        (requiredRole && !(Array.isArray(claims.roles) && claims.roles.includes(requiredRole)))) {
      const error = new Error("unauthorized"); error.status = 401; throw error;
    }
    const find = list => list.find(item => item.kid === header.kid && item.kty === "RSA");
    let key = find(await jwks());
    if (!key && now() - forcedAt >= KEY_RETRY_MS) {
      forcedAt = now();
      key = find(await jwks(true));
    }
    if (!key || !crypto.verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`),
      crypto.createPublicKey({ key, format: "jwk" }), Buffer.from(parts[2], "base64url"))) {
      const error = new Error("unauthorized"); error.status = 401; throw error;
    }
    return { tid: claims.tid.toLowerCase(), oid: claims.oid.toLowerCase(),
      name: String(claims.name || ""), preferredUsername: String(claims.preferred_username ||
        claims.email || claims.upn || claims.unique_name || "") };
  };
}
module.exports = { createEntraValidator };
