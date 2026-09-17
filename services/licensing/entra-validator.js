const crypto = require("node:crypto");
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function decode(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}
function createEntraValidator({ audience, requiredScope = "License.Check",
  fetcher = fetch, now = Date.now }) {
  if (!audience) return async () => { const error = new Error("consultant-auth-not-configured"); error.status = 503; throw error; };
  let keys = null, refreshAt = 0;
  async function jwks() {
    if (keys && refreshAt > now()) return keys;
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
    if (header.alg !== "RS256" || !header.kid || claims.aud !== audience ||
        !GUID.test(claims.tid || "") || !GUID.test(claims.oid || "") ||
        claims.iss !== `https://login.microsoftonline.com/${claims.tid}/v2.0` ||
        Number(claims.exp) * 1000 <= now() || Number(claims.nbf || 0) * 1000 > now() + 60000 ||
        !String(claims.scp || "").split(" ").includes(requiredScope)) {
      const error = new Error("unauthorized"); error.status = 401; throw error;
    }
    const key = (await jwks()).find(item => item.kid === header.kid && item.kty === "RSA");
    if (!key || !crypto.verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`),
      crypto.createPublicKey({ key, format: "jwk" }), Buffer.from(parts[2], "base64url"))) {
      const error = new Error("unauthorized"); error.status = 401; throw error;
    }
    return { tid: claims.tid.toLowerCase(), oid: claims.oid.toLowerCase(),
      name: String(claims.name || ""), preferredUsername: String(claims.preferred_username || "") };
  };
}
module.exports = { createEntraValidator };
