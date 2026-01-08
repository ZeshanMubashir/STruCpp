# Phase 2.6: Variable Modifiers (RETAIN, CONSTANT)

**Status**: PENDING

**Duration**: TBD

**Goal**: Complete implementation of variable modifiers RETAIN and CONSTANT with proper code generation

## Overview

IEC 61131-3 defines variable modifiers that affect storage and mutability:

- **RETAIN** - Variables that preserve their values across power cycles
- **CONSTANT** - Variables that cannot be modified after initialization

The lexer and parser already recognize these keywords and set AST flags (`isRetain`, `isConstant`), but the code generator does not yet use them.

## Scope

### Current Implementation Status

**Implemented:**
- Lexer tokens: `RETAIN`, `CONSTANT`
- Parser rules for VAR blocks with modifiers
- AST flags: `isRetain`, `isConstant` on variable blocks

**Not implemented:**
- Code generation for CONSTANT (should generate `const` qualifier)
- Code generation for RETAIN (should generate retain markers/attributes)
- Semantic validation (e.g., CONSTANT variables must have initializers)

### Example Syntax

```st
VAR CONSTANT
    PI : REAL := 3.14159;
    MAX_SIZE : INT := 100;
END_VAR

VAR RETAIN
    total_count : DINT;
    last_state : BOOL;
END_VAR
```

### Expected C++ Output

```cpp
// CONSTANT variables
const IEC_REAL PI = 3.14159f;
const IEC_INT MAX_SIZE = 100;

// RETAIN variables (with attribute for runtime)
[[strucpp::retain]] IEC_DINT total_count;
[[strucpp::retain]] IEC_BOOL last_state;
```

## Deliverables

*To be defined*

## Success Criteria

*To be defined*

## Notes

RETAIN behavior depends on the target runtime. For OpenPLC, retain variables need to be persisted to non-volatile storage and restored on startup.
