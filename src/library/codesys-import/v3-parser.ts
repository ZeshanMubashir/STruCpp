/**
 * CODESYS V3 .library file parser.
 *
 * Extracts POU source code from CODESYS V3 .library files (ZIP archives).
 *
 * The V3 .library format:
 * - ZIP archive containing GUID-named .meta/.object pairs + auxiliary files
 * - String table: __shared_data_storage_string_table__.auxiliary
 *   Contains all source text as sequential UTF-8 entries with LEB128 encoding.
 * - Object files: UUID.object — compiled POU representations (binary).
 * - Meta files: UUID.meta — 64-byte binary metadata per object.
 *
 * Strategy: Parse the string table and group strings into POUs based on
 * declaration keyword boundaries. Within each group, classify strings into
 * declaration (variable names/types) vs implementation (code) vs documentation.
 *
 * Note: The V3 format stores variable declarations WITHOUT VAR_INPUT/VAR_OUTPUT
 * wrappers, and implementation code may be incomplete for some POUs (the
 * full source is encoded in the binary .object files which use a proprietary
 * format). The V2.3 (.lib) format preserves complete source and is preferred.
 */

import { inflateRawSync } from "zlib";
import type { ExtractedPOU, POUType } from "./types.js";

/** String table magic bytes: 0xFA 0x53. */
const STRING_TABLE_MAGIC = Buffer.from([0xfa, 0x53]);

/** String table filename within the ZIP archive. */
const STRING_TABLE_NAME = "__shared_data_storage_string_table__.auxiliary";

/** Regex to identify POU declaration strings. */
const POU_DECL_RE = /^\s*(FUNCTION_BLOCK|FUNCTION|PROGRAM)\s+(\w+)/;

/** Regex to identify TYPE declarations. */
const TYPE_DECL_RE = /^TYPE\s+(\w+)/;

/** Regex to identify Global Variable Lists. */
const GVL_DECL_RE = /^VAR_GLOBAL/;

/** Regex for variable declaration lines: `name : TYPE` or `\tname : TYPE` */
const VAR_DECL_LINE_RE =
  /^\t?([A-Za-z_]\w*)\s*:\s*([A-Za-z_]\w+(?:\s*\(.*\))?(?:\s*:=\s*.+)?)\s*;?\s*$/;

/** Regex for code lines (contain assignment, control flow, or function calls). */
const CODE_LINE_RE =
  /(:=|IF\s|THEN|ELSIF|ELSE|END_IF|FOR\s|TO\s|BY\s|END_FOR|WHILE\s|END_WHILE|REPEAT|UNTIL|END_REPEAT|CASE\s|OF\s|END_CASE|RETURN|EXIT|;$|\(\*.*\*\))/;

/** Metadata strings to filter out. */
const METADATA_HEX_RE = /^[0-9A-Fa-f]{1,4}$/;
const METADATA_SKIP = new Set(["None", "Standard"]);

/**
 * Read a LEB128 (unsigned) variable-length integer from a buffer.
 * Returns the decoded value and the new offset.
 */
export function readLEB128(data: Buffer, offset: number): [number, number] {
  let value = 0;
  let shift = 0;
  while (offset < data.length) {
    const byte = data[offset]!;
    offset++;
    value |= (byte & 0x7f) << shift;
    shift += 7;
    if (!(byte & 0x80)) break;
  }
  return [value, offset];
}

/**
 * Parse the string table auxiliary file.
 *
 * Format:
 *   [0xFA 0x53] [flag byte] [GUID length byte] [GUID ASCII string]
 *   Repeated: [LEB128 index] [LEB128 length] [UTF-8 string bytes]
 *
 * @returns Map of string index → text, plus the library GUID.
 */
export function parseStringTable(data: Buffer): {
  strings: Map<number, string>;
  guid: string;
} {
  if (data.length < 4 || !data.subarray(0, 2).equals(STRING_TABLE_MAGIC)) {
    throw new Error(
      `Invalid string table magic: ${data.subarray(0, 2).toString("hex")}`,
    );
  }

  // Read header: flag byte + GUID
  const guidLen = data[3]!;
  const guid = data.subarray(4, 4 + guidLen).toString("ascii");
  let offset = 4 + guidLen;

  const strings = new Map<number, string>();
  while (offset < data.length) {
    const [idx, o1] = readLEB128(data, offset);
    const [length, o2] = readLEB128(data, o1);
    offset = o2;

    if (offset + length > data.length) break;

    const text = data.subarray(offset, offset + length).toString("utf-8");
    strings.set(idx, text);
    offset += length;
  }

  return { strings, guid };
}

/**
 * Decode all LEB128-encoded values from a binary buffer.
 */
export function decodeObjectIndices(data: Buffer): number[] {
  const indices: number[] = [];
  let offset = 0;
  while (offset < data.length) {
    const [value, newOffset] = readLEB128(data, offset);
    indices.push(value);
    offset = newOffset;
  }
  return indices;
}

/**
 * Check if a string is metadata/noise that should be skipped.
 */
function isMetadata(s: string): boolean {
  if (METADATA_SKIP.has(s)) return true;
  if (s.length <= 4 && METADATA_HEX_RE.test(s)) return true;
  if (s.startsWith("Standard, ") || s.startsWith("Standard,\t")) return true;
  return false;
}

/**
 * Check if a string is a documentation/version metadata line (not code).
 */
function isDocMetadata(s: string): boolean {
  const stripped = s.trim();
  // Version lines: "version 1.2  date"
  if (/^version\s+\d/i.test(stripped)) return true;
  // Programmer/tester lines
  if (/^programmer\s/i.test(stripped)) return true;
  if (/^tested\s+(by|BY)/i.test(stripped)) return true;
  // Revision entries: "hm  12 jan 2007  rev 1.0"
  if (/^\w{1,4}\s+\d{1,2}[\s.]+\w{3,4}[\s.]+\d{4}\s+rev\s/i.test(stripped))
    return true;
  // Indented revision sub-lines: "\toriginal version", "\timproved code"
  if (/^\t\w/.test(s) && !/^\t\w+\s*:/.test(s) && !CODE_LINE_RE.test(s))
    return false; // could be var or code, don't classify as doc
  return false;
}

/**
 * Raw string group extracted from the string table between POU boundaries.
 */
interface StringGroup {
  type: POUType;
  name: string;
  strings: string[];
  startIdx: number;
}

/**
 * Group sequential strings from the string table into POUs.
 *
 * POU boundaries are defined by declaration keyword strings
 * (FUNCTION, FUNCTION_BLOCK, PROGRAM, TYPE, VAR_GLOBAL).
 */
function groupStringsIntoPOUs(strings: Map<number, string>): StringGroup[] {
  const groups: StringGroup[] = [];
  let current: StringGroup | null = null;

  const sortedIndices = [...strings.keys()].sort((a, b) => a - b);

  for (const idx of sortedIndices) {
    const text = strings.get(idx)!;

    // Check for POU boundary
    const pouMatch = text.match(POU_DECL_RE);
    const typeMatch = text.match(TYPE_DECL_RE);
    const isGVL = GVL_DECL_RE.test(text);

    if (pouMatch || typeMatch || isGVL) {
      // Save previous group
      if (current) {
        groups.push(current);
      }

      if (pouMatch) {
        current = {
          type: pouMatch[1] as POUType,
          name: pouMatch[2]!,
          strings: [text],
          startIdx: idx,
        };
      } else if (typeMatch) {
        current = {
          type: "TYPE",
          name: typeMatch[1]!,
          strings: [text],
          startIdx: idx,
        };
      } else {
        current = {
          type: "GVL",
          name: `GVL_${idx}`,
          strings: [text],
          startIdx: idx,
        };
      }
    } else if (current) {
      current.strings.push(text);
    }
  }

  if (current) {
    groups.push(current);
  }

  return groups;
}

/**
 * Reconstruct a POU's source code from its string group.
 *
 * For FUNCTION/FUNCTION_BLOCK/PROGRAM:
 * - Identifies variable declarations (name : TYPE patterns)
 * - Groups variables into a single VAR block (direction information is lost
 *   in V3 format — the original VAR_INPUT/VAR_OUTPUT structure is only
 *   available in the binary .object files)
 * - Separates implementation code from documentation
 *
 * For TYPE and GVL:
 * - Combines all strings as the declaration body
 */
function reconstructPOU(group: StringGroup): ExtractedPOU {
  const { type, name, strings: allStrings } = group;

  // Filter out metadata noise
  const filtered = allStrings.filter((s) => !isMetadata(s));

  if (type === "TYPE") {
    return {
      type: "TYPE",
      name,
      declaration: filtered.join("\n"),
      implementation: "",
      offset: group.startIdx,
    };
  }

  if (type === "GVL") {
    return {
      type: "GVL",
      name,
      declaration: filtered.join("\n"),
      implementation: "",
      offset: group.startIdx,
    };
  }

  // For FUNCTION / FUNCTION_BLOCK / PROGRAM
  const declLines: string[] = [];
  const varLines: string[] = [];
  const docLines: string[] = [];
  const implLines: string[] = [];

  // First string is always the declaration header
  declLines.push(filtered[0] ?? `${type} ${name}`);

  let inComment = false;
  let pastVarSection = false;

  for (let i = 1; i < filtered.length; i++) {
    const s = filtered[i]!;
    const stripped = s.trim();

    // Track multi-line comments
    if (stripped.startsWith("(*") && !stripped.endsWith("*)")) {
      inComment = true;
    }
    if (inComment) {
      if (!pastVarSection) {
        docLines.push(s);
      } else {
        implLines.push(s);
      }
      if (stripped.endsWith("*)") || stripped === "*)") {
        inComment = false;
      }
      continue;
    }

    // Inline comments
    if (stripped.startsWith("(*") && stripped.endsWith("*)")) {
      if (!pastVarSection) {
        docLines.push(s);
      } else {
        implLines.push(s);
      }
      continue;
    }

    // Variable declarations (tab-indented `name : type` pattern)
    if (!pastVarSection && VAR_DECL_LINE_RE.test(s)) {
      varLines.push(s);
      continue;
    }

    // Documentation metadata (version, programmer, etc.)
    if (!pastVarSection && isDocMetadata(s)) {
      docLines.push(s);
      continue;
    }

    // Description text (non-code, non-var, before implementation)
    if (!pastVarSection && !CODE_LINE_RE.test(s) && stripped.length > 0) {
      // Could be a description line — include in doc
      docLines.push(s);
      continue;
    }

    // Everything else is implementation
    pastVarSection = true;
    if (stripped.length > 0) {
      implLines.push(s);
    }
  }

  // Build declaration section
  const declParts = [...declLines];

  if (varLines.length > 0) {
    // V3 format loses VAR_INPUT/VAR_OUTPUT distinction.
    // Wrap all variables in a single VAR block.
    declParts.push("VAR");
    declParts.push(...varLines);
    declParts.push("END_VAR");
  }

  // Add documentation as comment block
  if (docLines.length > 0) {
    declParts.push("");
    // Check if docLines already have comment markers
    const hasMarkers = docLines.some(
      (l) => l.trim() === "(*" || l.trim() === "*)",
    );
    if (!hasMarkers) {
      declParts.push("(*");
    }
    for (const line of docLines) {
      if (line.trim() !== "(*" && line.trim() !== "*)") {
        declParts.push(line);
      }
    }
    if (!hasMarkers) {
      declParts.push("*)");
    }
  }

  return {
    type,
    name,
    declaration: declParts.join("\n"),
    implementation: implLines.join("\n"),
    offset: group.startIdx,
  };
}

/**
 * Unzip entries from a buffer using Node.js built-in zlib.
 *
 * Minimal ZIP parser that handles local file headers.
 * Supports Stored (method 0) and Deflated (method 8) entries.
 */
function* unzipEntries(
  data: Buffer,
): Generator<{ name: string; data: Buffer }> {
  let offset = 0;
  const LOCAL_FILE_HEADER = 0x04034b50;

  while (offset + 30 <= data.length) {
    const sig = data.readUInt32LE(offset);
    if (sig !== LOCAL_FILE_HEADER) break;

    const compressionMethod = data.readUInt16LE(offset + 8);
    const compressedSize = data.readUInt32LE(offset + 18);
    // offset + 22: uncompressed size (not needed for extraction)
    const nameLen = data.readUInt16LE(offset + 26);
    const extraLen = data.readUInt16LE(offset + 28);

    const nameStart = offset + 30;
    const name = data
      .subarray(nameStart, nameStart + nameLen)
      .toString("utf-8");
    const dataStart = nameStart + nameLen + extraLen;

    let entryData: Buffer;
    if (compressionMethod === 0) {
      // Stored (no compression)
      entryData = data.subarray(dataStart, dataStart + compressedSize);
    } else if (compressionMethod === 8) {
      // Deflated
      const compressed = data.subarray(dataStart, dataStart + compressedSize);
      entryData = inflateRawSync(compressed) as Buffer;
    } else {
      // Skip unsupported compression methods
      offset = dataStart + compressedSize;
      continue;
    }

    yield { name, data: entryData };
    offset = dataStart + compressedSize;
  }
}

/**
 * Parse a CODESYS V3 .library buffer and extract all POUs.
 *
 * @param data - Raw binary content of the .library ZIP archive
 * @returns Array of extracted POUs, library GUID, and any warnings
 */
export function parseV3Library(data: Buffer): {
  pous: ExtractedPOU[];
  guid: string;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Extract ZIP entries to find string table
  let stData: Buffer | null = null;
  for (const entry of unzipEntries(data)) {
    if (entry.name === STRING_TABLE_NAME) {
      stData = entry.data;
      break;
    }
  }

  if (!stData) {
    return {
      pous: [],
      guid: "",
      warnings: ["String table not found in ZIP archive."],
    };
  }

  let strings: Map<number, string>;
  let guid: string;
  try {
    const result = parseStringTable(stData);
    strings = result.strings;
    guid = result.guid;
  } catch (e) {
    return {
      pous: [],
      guid: "",
      warnings: [
        `Failed to parse string table: ${e instanceof Error ? e.message : String(e)}`,
      ],
    };
  }

  // Group strings into POUs by declaration boundaries
  const groups = groupStringsIntoPOUs(strings);

  // Reconstruct each POU
  const pous: ExtractedPOU[] = [];
  for (const group of groups) {
    const pou = reconstructPOU(group);
    pous.push(pou);
  }

  // Sort by name for deterministic output
  pous.sort((a, b) => a.name.localeCompare(b.name));

  warnings.push(
    "V3 format: VAR_INPUT/VAR_OUTPUT/VAR direction may not be preserved. " +
      "Implementation code may be incomplete for some POUs. " +
      "For full fidelity, prefer V2.3 (.lib) format.",
  );

  return { pous, guid, warnings };
}
