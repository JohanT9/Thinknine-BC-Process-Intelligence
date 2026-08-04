(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9Export = root.T9Export || {};
  root.T9Export.zipWriter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const encoder = new TextEncoder();

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);

    for (let n = 0; n < 256; n += 1) {
      let value = n;

      for (let k = 0; k < 8; k += 1) {
        value = (value & 1)
          ? 0xedb88320 ^ (value >>> 1)
          : value >>> 1;
      }

      table[n] = value >>> 0;
    }

    return table;
  })();

  function bytes(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    return encoder.encode(String(value ?? ""));
  }

  function crc32(data) {
    let crc = 0xffffffff;

    for (const value of data) {
      crc = CRC_TABLE[(crc ^ value) & 0xff] ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
  }

  function dosTime(value) {
    const date = new Date(value || Date.now());
    const year = Math.max(1980, date.getFullYear());

    return {
      time:
        (date.getHours() << 11) |
        (date.getMinutes() << 5) |
        Math.floor(date.getSeconds() / 2),
      date:
        ((year - 1980) << 9) |
        ((date.getMonth() + 1) << 5) |
        date.getDate()
    };
  }

  function u16(view, offset, value) {
    view.setUint16(offset, value, true);
  }

  function u32(view, offset, value) {
    view.setUint32(offset, value >>> 0, true);
  }

  function create(files) {
    const locals = [];
    const centrals = [];
    let offset = 0;

    for (const file of files) {
      const name = bytes(file.name);
      const data = bytes(file.data);
      const crc = crc32(data);
      const date = dosTime(file.modifiedAt);

      const local = new Uint8Array(30 + name.length + data.length);
      const localView = new DataView(local.buffer);

      u32(localView, 0, 0x04034b50);
      u16(localView, 4, 20);
      u16(localView, 6, 0x0800);
      u16(localView, 8, 0);
      u16(localView, 10, date.time);
      u16(localView, 12, date.date);
      u32(localView, 14, crc);
      u32(localView, 18, data.length);
      u32(localView, 22, data.length);
      u16(localView, 26, name.length);
      u16(localView, 28, 0);
      local.set(name, 30);
      local.set(data, 30 + name.length);
      locals.push(local);

      const central = new Uint8Array(46 + name.length);
      const centralView = new DataView(central.buffer);

      u32(centralView, 0, 0x02014b50);
      u16(centralView, 4, 20);
      u16(centralView, 6, 20);
      u16(centralView, 8, 0x0800);
      u16(centralView, 10, 0);
      u16(centralView, 12, date.time);
      u16(centralView, 14, date.date);
      u32(centralView, 16, crc);
      u32(centralView, 20, data.length);
      u32(centralView, 24, data.length);
      u16(centralView, 28, name.length);
      u16(centralView, 30, 0);
      u16(centralView, 32, 0);
      u16(centralView, 34, 0);
      u16(centralView, 36, 0);
      u32(centralView, 38, 0);
      u32(centralView, 42, offset);
      central.set(name, 46);
      centrals.push(central);

      offset += local.length;
    }

    const centralSize = centrals.reduce(
      (sum, value) => sum + value.length,
      0
    );
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);

    u32(endView, 0, 0x06054b50);
    u16(endView, 4, 0);
    u16(endView, 6, 0);
    u16(endView, 8, files.length);
    u16(endView, 10, files.length);
    u32(endView, 12, centralSize);
    u32(endView, 16, offset);
    u16(endView, 20, 0);

    const total =
      locals.reduce((sum, value) => sum + value.length, 0) +
      centralSize +
      end.length;
    const output = new Uint8Array(total);
    let cursor = 0;

    for (const part of [...locals, ...centrals, end]) {
      output.set(part, cursor);
      cursor += part.length;
    }

    return output;
  }

  return { create, bytes, crc32 };
});
