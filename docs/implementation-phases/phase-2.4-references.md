# Phase 2.4: References and Pointers

**Status**: PENDING

**Duration**: TBD

**Goal**: Implement IEC 61131-3 reference types (REF_TO, REF, DREF, ^, NULL) for pointer-like semantics

## Overview

References in IEC 61131-3 provide pointer-like semantics for indirect access to variables. This phase implements the parsing, semantic analysis, and code generation for reference types.

## Scope

### IEC 61131-3 Reference Features

- `REF_TO` - Reference type declaration
- `REF()` - Get reference to a variable
- `DREF` / `^` - Dereference a reference
- `NULL` - Null reference value

### Example Syntax

```st
VAR
    my_int : INT;
    my_ref : REF_TO INT;
END_VAR

my_ref := REF(my_int);
my_ref^ := 42;  (* or DREF(my_ref) := 42 *)
```

## Deliverables

*To be defined*

## Success Criteria

*To be defined*

## Notes

This phase covers the structural aspects of references (parsing, type definitions, code generation for declarations). The runtime behavior and expression evaluation will be completed in Phase 3.
