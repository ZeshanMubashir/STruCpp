# Phase 2.5: Nested Comments

**Status**: PENDING

**Duration**: TBD

**Goal**: Implement support for nested comments in IEC 61131-3 Structured Text

## Overview

IEC 61131-3 Edition 3 introduced support for nested comments, allowing comment blocks to contain other comment blocks. This is useful for commenting out code that already contains comments.

## Scope

### Comment Syntax

**Standard comments (already supported):**
```st
(* This is a comment *)
// This is a single-line comment
```

**Nested comments (to be implemented):**
```st
(* Outer comment
   (* Inner comment *)
   Still in outer comment
*)
```

### Current Limitation

The current lexer treats `(* ... *)` as a simple token without tracking nesting depth. This means:

```st
(*
   (* This breaks *)
   because the first *) closes the comment
*)
```

## Deliverables

*To be defined*

## Success Criteria

*To be defined*

## Notes

This requires modifications to the Chevrotain lexer to track comment nesting depth rather than using a simple regex pattern.
