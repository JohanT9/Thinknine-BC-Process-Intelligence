"use strict";
// Reads the string resources embedded in a .NET assembly or satellite assembly (.resources.dll):
// each embedded resource set (".resources", magic 0xBEEFCACE) gives name -> string. Other value
// types are skipped. Used by scripts/build-error-labels.js for Business Central's platform
// messages; nothing in the extension runs this.
const MAGIC = Buffer.from([0xce, 0xca, 0xef, 0xbe]);

function reader(buffer, start) {
  let position = start;
  const int32 = () => { const value = buffer.readInt32LE(position); position += 4; return value; };
  const varint = () => {
    let value = 0, shift = 0, byte;
    do { byte = buffer[position++]; value |= (byte & 0x7f) << shift; shift += 7; } while (byte & 0x80);
    return value;
  };
  const utf8 = () => { const length = varint(); const text = buffer.toString("utf8", position, position + length); position += length; return text; };
  return { int32, varint, utf8, get position() { return position; }, set position(value) { position = value; } };
}

function readSet(buffer, start) {
  const read = reader(buffer, start);
  if (read.int32() !== -1091581234) return null;
  read.int32(); // header version
  const skip = read.int32();
  read.position += skip;
  const version = read.int32();
  if (version !== 1 && version !== 2) return null;
  const count = read.int32();
  const typeCount = read.int32();
  for (let index = 0; index < typeCount; index += 1) read.utf8();
  // Padding to an 8-byte boundary ("PAD" bytes) from the start of the set.
  while ((read.position - start) % 8 !== 0) read.position += 1;
  read.position += 4 * count; // name hashes
  const namePositions = Array.from({ length: count }, () => read.int32());
  const dataStart = start + read.int32();
  const namesStart = read.position;
  const result = new Map();
  for (const offset of namePositions) {
    read.position = namesStart + offset;
    const length = read.varint();
    const name = buffer.toString("utf16le", read.position, read.position + length);
    read.position += length;
    const dataOffset = read.int32();
    read.position = dataStart + dataOffset;
    const type = read.varint();
    if (type === 1) result.set(name, read.utf8()); // ResourceTypeCode.String
  }
  return result;
}

// Every string resource in the file, by name. A name found in several sets keeps the first value.
function readStrings(buffer) {
  const result = new Map();
  let index = buffer.indexOf(MAGIC);
  while (index >= 0) {
    try {
      const set = readSet(buffer, index);
      if (set) for (const [name, value] of set) if (!result.has(name)) result.set(name, value);
    } catch { /* not a resource set */ }
    index = buffer.indexOf(MAGIC, index + 4);
  }
  return result;
}

module.exports = { readStrings };
