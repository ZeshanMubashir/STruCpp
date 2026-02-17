/**
 * STruC++ End-to-End Tests for PR #27 Compile-Time Checks
 *
 * These tests verify compile-time error detection for OOP modifier
 * combinations and parser modifier handling.
 *
 * Behavioral tests from PR #27 have been migrated to st-validation/:
 * - Fix 1 (enterScope) → function_blocks/test_fb_deep_method.st
 * - Fix 3 (method collision) → function_blocks/test_fb_method_collision.st
 * - Fix 5 (string escaping) → data_types/test_strings.st
 * - FB state persistence → function_blocks/test_fb_accumulator.st
 * - Inheritance override → function_blocks/test_fb_inheritance.st
 * - Property access → function_blocks/test_fb_properties.st
 */

import { describe, it, expect } from "vitest";
import { compile } from "../../src/index.js";

describe("OOP modifier semantic validation (Fix 4)", () => {
  it("should reject ABSTRACT FINAL on same FB at compile time", () => {
    const st = `
FUNCTION_BLOCK ABSTRACT FINAL BrokenFB
  VAR x : INT; END_VAR
END_FUNCTION_BLOCK
PROGRAM Main END_PROGRAM
`;
    const result = compile(st);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const msg = result.errors.map((e) => e.message).join(" ");
    expect(msg).toContain("ABSTRACT");
    expect(msg).toContain("FINAL");
  });

  it("should reject ABSTRACT method in non-abstract FB at compile time", () => {
    const st = `
FUNCTION_BLOCK Motor
  METHOD PUBLIC ABSTRACT Brake
  END_METHOD
END_FUNCTION_BLOCK
PROGRAM Main END_PROGRAM
`;
    const result = compile(st);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const msg = result.errors.map((e) => e.message).join(" ");
    expect(msg).toContain("ABSTRACT");
  });
});

describe("Parser modifier combinations (Fix 7)", () => {
  it("should compile method with OVERRIDE FINAL (any order)", () => {
    const st = `
FUNCTION_BLOCK Base
  METHOD PUBLIC Start
  END_METHOD
END_FUNCTION_BLOCK
FUNCTION_BLOCK Child EXTENDS Base
  METHOD PUBLIC OVERRIDE FINAL Start
  END_METHOD
END_FUNCTION_BLOCK
PROGRAM Main END_PROGRAM
`;
    const result = compile(st);
    expect(result.success).toBe(true);
  });

  it("should compile method with FINAL OVERRIDE (reversed order)", () => {
    const st = `
FUNCTION_BLOCK Base
  METHOD PUBLIC Start
  END_METHOD
END_FUNCTION_BLOCK
FUNCTION_BLOCK Child EXTENDS Base
  METHOD PUBLIC FINAL OVERRIDE Start
  END_METHOD
END_FUNCTION_BLOCK
PROGRAM Main END_PROGRAM
`;
    const result = compile(st);
    expect(result.success).toBe(true);
  });
});
