/**
 * Tests for CODESYS library import functionality.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  importCodesysLibrary,
  detectFormat,
  parseV23Library,
  isV23Library,
  formatPOU,
  pouToSources,
} from "../../dist/library/codesys-import/index.js";
import type { ExtractedPOU } from "../../dist/library/codesys-import/index.js";

// Path to real CODESYS library files for integration tests
const OSCAT_V23_PATH = resolve(
  process.env.HOME ?? "~",
  "Downloads/oscat_experiments/oscat_basic_335.lib",
);
const OSCAT_V3_PATH = resolve(
  process.env.HOME ?? "~",
  "Downloads/oscat_experiments/oscat_basic_335_codesys3.library",
);

describe("detectFormat", () => {
  it("detects V2.3 format from CoDeSys+ magic", () => {
    const data = Buffer.from("CoDeSys+" + "\x00".repeat(100), "ascii");
    expect(detectFormat(data)).toBe("v23");
  });

  it("detects V3 format from ZIP magic (PK header)", () => {
    const data = Buffer.alloc(100);
    data[0] = 0x50; // P
    data[1] = 0x4b; // K
    data[2] = 0x03;
    data[3] = 0x04;
    expect(detectFormat(data)).toBe("v3");
  });

  it("returns null for unknown format", () => {
    const data = Buffer.from("UNKNOWN_FORMAT", "ascii");
    expect(detectFormat(data)).toBeNull();
  });
});

describe("isV23Library", () => {
  it("returns true for valid V2.3 header", () => {
    const data = Buffer.from("CoDeSys+" + "\x00".repeat(10), "ascii");
    expect(isV23Library(data)).toBe(true);
  });

  it("returns false for short buffer", () => {
    const data = Buffer.from("CoDe");
    expect(isV23Library(data)).toBe(false);
  });

  it("returns false for wrong magic", () => {
    const data = Buffer.from("NotCoDeSys", "ascii");
    expect(isV23Library(data)).toBe(false);
  });
});

describe("formatPOU", () => {
  it("formats a FUNCTION with declaration and implementation", () => {
    const pou: ExtractedPOU = {
      type: "FUNCTION",
      name: "ADD_TWO",
      declaration:
        "FUNCTION ADD_TWO : INT\r\nVAR_INPUT\r\n\tA : INT;\r\n\tB : INT;\r\nEND_VAR",
      implementation: "ADD_TWO := A + B;",
      offset: 0,
    };
    const result = formatPOU(pou);
    expect(result).toContain("FUNCTION ADD_TWO : INT");
    expect(result).toContain("ADD_TWO := A + B;");
    expect(result).toContain("END_FUNCTION");
    // Line endings normalized
    expect(result).not.toContain("\r\n");
  });

  it("formats a FUNCTION_BLOCK with END_FUNCTION_BLOCK", () => {
    const pou: ExtractedPOU = {
      type: "FUNCTION_BLOCK",
      name: "MY_FB",
      declaration: "FUNCTION_BLOCK MY_FB\nVAR_INPUT\n\tX : BOOL;\nEND_VAR",
      implementation: "Q := X;",
      offset: 0,
    };
    const result = formatPOU(pou);
    expect(result).toContain("END_FUNCTION_BLOCK");
  });

  it("formats TYPE declarations without adding END marker", () => {
    const pou: ExtractedPOU = {
      type: "TYPE",
      name: "MY_STRUCT",
      declaration:
        "TYPE MY_STRUCT :\nSTRUCT\n\tX : INT;\n\tY : INT;\nEND_STRUCT\nEND_TYPE",
      implementation: "",
      offset: 0,
    };
    const result = formatPOU(pou);
    expect(result).toContain("END_TYPE");
    // Should NOT add another END_TYPE
    expect(result.match(/END_TYPE/g)?.length).toBe(1);
  });

  it("formats GVL declarations without adding END marker", () => {
    const pou: ExtractedPOU = {
      type: "GVL",
      name: "GVL_0",
      declaration: "VAR_GLOBAL CONSTANT\n\tX : INT := 42;\nEND_VAR",
      implementation: "",
      offset: 0,
    };
    const result = formatPOU(pou);
    expect(result).toContain("END_VAR");
    expect(result).not.toContain("END_GVL");
  });
});

describe("pouToSources", () => {
  it("generates correct filenames for different POU types", () => {
    const pous: ExtractedPOU[] = [
      {
        type: "FUNCTION",
        name: "MyFunc",
        declaration: "FUNCTION MyFunc : INT",
        implementation: "",
        offset: 0,
      },
      {
        type: "GVL",
        name: "GVL_0",
        declaration: "VAR_GLOBAL\nEND_VAR",
        implementation: "",
        offset: 100,
      },
    ];
    const sources = pouToSources(pous);
    expect(sources).toHaveLength(2);
    expect(sources[0]!.fileName).toBe("MyFunc.st");
    expect(sources[1]!.fileName).toBe("GVL_0.gvl.st");
  });
});

describe("parseV23Library", () => {
  it("returns warning for non-V2.3 data", () => {
    const data = Buffer.from("NOT_CODESYS_FORMAT", "ascii");
    const result = parseV23Library(data);
    expect(result.pous).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Not a CODESYS V2.3 library");
  });
});

describe("importCodesysLibrary", () => {
  it("returns error for non-existent file", () => {
    const result = importCodesysLibrary("/tmp/nonexistent.lib");
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Cannot read file");
  });

  it("returns error for unrecognized format", () => {
    // Create a temp file with garbage content
    const { writeFileSync, unlinkSync } = require("fs");
    const tmpPath = "/tmp/test_garbage.lib";
    writeFileSync(tmpPath, "GARBAGE_DATA_NOT_CODESYS");
    try {
      const result = importCodesysLibrary(tmpPath);
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain("Unrecognized file format");
    } finally {
      unlinkSync(tmpPath);
    }
  });
});

// Integration tests that require the actual OSCAT binary files
describe("V2.3 integration: OSCAT Basic 335", () => {
  const hasFile = existsSync(OSCAT_V23_PATH);

  it.skipIf(!hasFile)("extracts POUs from real .lib file", () => {
    const data = readFileSync(OSCAT_V23_PATH);
    const { pous, warnings } = parseV23Library(data);

    // OSCAT Basic 335 should have ~555 items
    expect(pous.length).toBeGreaterThan(500);
    expect(pous.length).toBeLessThan(700);

    // Count by type
    const counts: Record<string, number> = {};
    for (const p of pous) {
      counts[p.type] = (counts[p.type] ?? 0) + 1;
    }

    // Should have functions, FBs, types, and GVLs
    expect(counts["FUNCTION"]).toBeGreaterThan(300);
    expect(counts["FUNCTION_BLOCK"]).toBeGreaterThan(100);
    expect(counts["TYPE"]).toBeGreaterThan(10);
    expect(counts["GVL"]).toBeGreaterThan(0);

    // Verify a known function
    const acosh = pous.find((p) => p.name === "ACOSH");
    expect(acosh).toBeDefined();
    expect(acosh!.type).toBe("FUNCTION");
    expect(acosh!.declaration).toContain("FUNCTION ACOSH");
    expect(acosh!.declaration).toContain("REAL");
    expect(acosh!.implementation).toContain("LN");
  });

  it.skipIf(!hasFile)("importCodesysLibrary produces valid sources", () => {
    const result = importCodesysLibrary(OSCAT_V23_PATH);
    expect(result.success).toBe(true);
    expect(result.metadata.format).toBe("v23");
    expect(result.metadata.pouCount).toBeGreaterThan(500);
    expect(result.sources.length).toBeGreaterThan(500);

    // Every source should have a fileName and non-empty source
    for (const src of result.sources) {
      expect(src.fileName).toBeTruthy();
      expect(src.source.length).toBeGreaterThan(0);
    }

    // Check a specific known function
    const acoshSrc = result.sources.find((s) => s.fileName === "ACOSH.st");
    expect(acoshSrc).toBeDefined();
    expect(acoshSrc!.source).toContain("FUNCTION ACOSH");
    expect(acoshSrc!.source).toContain("END_FUNCTION");
  });

  it.skipIf(!hasFile)(
    "extracted source matches previously extracted files",
    () => {
      const result = importCodesysLibrary(OSCAT_V23_PATH);
      expect(result.success).toBe(true);

      // Compare with the Python parser's output for a few known functions
      const expectedDir = resolve(
        process.env.HOME ?? "~",
        "Downloads/oscat_experiments/oscat_basic_v23_extracted",
      );
      if (!existsSync(expectedDir)) return;

      const testNames = ["ACOSH", "ALARM_2", "DAY_OF_YEAR", "FT_AVG"];
      for (const name of testNames) {
        const expected = readFileSync(
          resolve(expectedDir, `${name}.st`),
          "utf-8",
        );
        const actual = result.sources.find((s) => s.fileName === `${name}.st`);
        expect(actual, `Missing ${name}.st`).toBeDefined();
        // Normalize for comparison
        const normExpected = expected.replace(/\r\n/g, "\n").trim();
        const normActual = actual!.source.trim();
        expect(normActual).toBe(normExpected);
      }
    },
  );
});

describe("V3 format detection", () => {
  const hasFile = existsSync(OSCAT_V3_PATH);

  it.skipIf(!hasFile)("detects V3 format from real .library file", () => {
    const data = readFileSync(OSCAT_V3_PATH);
    expect(detectFormat(data)).toBe("v3");
  });

  it.skipIf(!hasFile)(
    "importCodesysLibrary returns not-yet-supported for V3",
    () => {
      const result = importCodesysLibrary(OSCAT_V3_PATH);
      // Phase 1: V3 is not yet supported
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain("V3");
    },
  );
});
