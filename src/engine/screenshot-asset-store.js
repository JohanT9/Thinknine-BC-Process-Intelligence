(function (root, factory) {
  const paths = typeof module === "object" && module.exports
    ? require("./screenshot-asset-paths") : root.T9ScreenshotAssetPaths;
  const api = factory(paths);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ScreenshotAssetStore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (paths) {
  "use strict";

  const HASH_PREFIX = "sha256:";

  async function sha256(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), byte =>
      byte.toString(16).padStart(2, "0")).join("");
  }

  function create({ storage, legacyLoad, assetPrefix, blobPrefix, manifestPrefix,
    legacyPrefix = "", digestDataUrl = sha256 } = {}) {
    if (!storage?.get || !storage?.set || !storage?.remove ||
        typeof legacyLoad !== "function" || !assetPrefix || !blobPrefix ||
        !manifestPrefix || typeof digestDataUrl !== "function") {
      throw new TypeError("Screenshot storage and key prefixes are required.");
    }
    let queue = Promise.resolve();
    const legacyCleanupChecked = new Set();

    function enqueue(operation) {
      const result = queue.then(operation);
      queue = result.catch(() => {});
      return result;
    }

    function manifestKey(recordingId) {
      return manifestPrefix + recordingId;
    }
    function assetKey(recordingId, key) {
      return assetPrefix + recordingId + ":" + key;
    }
    function blobKey(recordingId, hash) {
      return blobPrefix + recordingId + ":" + hash;
    }
    function validHash(value) {
      return typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value);
    }

    async function digest(dataUrl) {
      return HASH_PREFIX + await digestDataUrl(dataUrl);
    }

    async function readKeys(recordingId) {
      const key = manifestKey(recordingId);
      const data = await storage.get(key);
      if (Array.isArray(data[key])) {
        // A prior worker may have stopped after writing the new index but
        // before deleting the former monolithic screenshot value.
        if (legacyPrefix && !legacyCleanupChecked.has(recordingId)) {
          await storage.remove(legacyPrefix + recordingId);
          legacyCleanupChecked.add(recordingId);
        }
        return [...new Set(data[key].filter(value =>
          typeof value === "string" && paths.pathForKey(value)))];
      }

      const legacy = await legacyLoad(recordingId) || {};
      const entries = paths.entries(legacy);
      const keys = entries.map(item => item.key);
      const next = { [key]: keys };
      for (const item of entries) {
        const hash = await digest(item.value);
        next[assetKey(recordingId, item.key)] = hash;
        const storedBlobKey = blobKey(recordingId, hash);
        if (!(storedBlobKey in next)) next[storedBlobKey] = item.value;
      }
      await storage.set(next);
      if (legacyPrefix && Object.keys(legacy).length) {
        await storage.remove(legacyPrefix + recordingId);
      }
      if (legacyPrefix) legacyCleanupChecked.add(recordingId);
      return keys;
    }

    function manifest(recordingId) {
      return enqueue(async () => {
        const keys = await readKeys(recordingId);
        return { keys, paths: keys.map(paths.pathForKey).filter(Boolean) };
      });
    }

    function load(recordingId, requestedKeys = null) {
      return enqueue(async () => {
        const keys = await readKeys(recordingId);
        const requested = Array.isArray(requestedKeys)
          ? [...new Set(requestedKeys.filter(key => keys.includes(key)))]: keys;
        if (!requested.length) return { keys, assets: {} };

        const pointers = Object.fromEntries(requested.map(key =>
          [key, assetKey(recordingId, key)]));
        const storedPointers = await storage.get(Object.values(pointers));
        const hashesByKey = {};
        const blobsToMigrate = {};
        for (const [key, pointerKey] of Object.entries(pointers)) {
          const pointer = storedPointers[pointerKey];
          if (validHash(pointer)) hashesByKey[key] = pointer;
          else if (typeof pointer === "string" &&
              pointer.startsWith("data:image/png;base64,")) {
            const hash = await digest(pointer);
            hashesByKey[key] = hash;
            blobsToMigrate[blobKey(recordingId, hash)] = pointer;
          }
        }

        if (Object.keys(blobsToMigrate).length) {
          const updates = { ...blobsToMigrate };
          for (const [key, hash] of Object.entries(hashesByKey)) {
            const oldPointer = storedPointers[pointers[key]];
            if (typeof oldPointer === "string" &&
                oldPointer.startsWith("data:image/png;base64,")) {
              updates[pointers[key]] = hash;
            }
          }
          await storage.set(updates);
        }

        const uniqueBlobKeys = [...new Set(Object.values(hashesByKey)
          .filter(validHash).map(hash => blobKey(recordingId, hash)))];
        const blobs = uniqueBlobKeys.length ? await storage.get(uniqueBlobKeys) : {};
        const assets = {};
        for (const [key, hash] of Object.entries(hashesByKey)) {
          const storedBlob = blobs[blobKey(recordingId, hash)];
          if (typeof storedBlob === "string" &&
              storedBlob.startsWith("data:image/png;base64,")) assets[key] = storedBlob;
        }
        return { keys, assets };
      });
    }

    async function removeAssets(recordingId, keys) {
      if (!keys.length) return;
      const pointerKeys = keys.map(key => assetKey(recordingId, key));
      const pointers = await storage.get(pointerKeys);
      const blobs = [...new Set(Object.values(pointers).filter(validHash)
        .map(hash => blobKey(recordingId, hash)))];
      await storage.remove([...pointerKeys, ...blobs]);
    }

    function save(recordingId, screenshotKey, dataUrl) {
      return enqueue(async () => {
        const key = String(screenshotKey ?? "");
        if (!paths.pathForKey(key) || typeof dataUrl !== "string" ||
            !dataUrl.startsWith("data:image/png;base64,")) {
          throw new TypeError("A valid screenshot key and PNG data URL are required.");
        }
        const keys = await readKeys(recordingId);
        const hash = await digest(dataUrl);
        const storageBlobKey = blobKey(recordingId, hash);
        const stored = await storage.get(storageBlobKey);
        const pointerKey = assetKey(recordingId, key);
        const prior = await storage.get(pointerKey);
        const oldHash = prior[pointerKey];
        const patch = { [pointerKey]: hash,
          [manifestKey(recordingId)]: keys.includes(key) ? keys : [...keys, key] };
        if (typeof stored[storageBlobKey] !== "string") patch[storageBlobKey] = dataUrl;
        await storage.set(patch);
        if (validHash(oldHash) && oldHash !== hash) {
          const otherPointers = keys.filter(value => value !== key)
            .map(value => assetKey(recordingId, value));
          const references = otherPointers.length ? await storage.get(otherPointers) : {};
          if (!Object.values(references).includes(oldHash)) {
            await storage.remove(blobKey(recordingId, oldHash));
          }
        }
        return { key, path: paths.pathForKey(key) };
      });
    }

    function initialize(recordingId) {
      return enqueue(async () => {
        const keys = await readKeys(recordingId);
        await removeAssets(recordingId, keys);
        await storage.set({ [manifestKey(recordingId)]: [] });
        return { keys: [], paths: [] };
      });
    }

    function remove(recordingId) {
      return enqueue(async () => {
        const key = manifestKey(recordingId);
        const before = await storage.get(key);
        const manifestWasValid = Array.isArray(before?.[key]);
        const keys = await readKeys(recordingId);
        await removeAssets(recordingId, keys);
        const toRemove = [manifestKey(recordingId)];
        if (legacyPrefix) toRemove.push(legacyPrefix + recordingId);
        const assetKeyPrefix = `${assetPrefix}${recordingId}:`;
        const blobKeyPrefix = `${blobPrefix}${recordingId}:`;
        if (typeof storage.getKeys === "function") {
          const storedKeys = await storage.getKeys();
          toRemove.push(...storedKeys.filter(itemKey =>
            itemKey.startsWith(assetKeyPrefix) || itemKey.startsWith(blobKeyPrefix)));
        } else if (!manifestWasValid) {
          // A missing manifest can strand pointers and image blobs that cannot
          // be discovered from the normal index. Enumerate keys only on this
          // rare repair path for older Chromium versions.
          const all = await storage.get(null);
          toRemove.push(...Object.keys(all || {}).filter(itemKey =>
            itemKey.startsWith(assetKeyPrefix) || itemKey.startsWith(blobKeyPrefix)));
        }
        await storage.remove(toRemove);
        return keys.length;
      });
    }

    return Object.freeze({ initialize, load, manifest, remove, save });
  }

  return Object.freeze({ create });
});
