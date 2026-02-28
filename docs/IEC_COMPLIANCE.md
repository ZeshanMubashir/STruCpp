# IEC 61131-3 Compliance

STruC++ implements the Structured Text (ST) language from IEC 61131-3. This document lists supported features and known gaps. The compiler also supports common CODESYS extensions where noted.

## Data Types

| Type | Status | Notes |
|------|--------|-------|
| BOOL | Supported | |
| BYTE, WORD, DWORD, LWORD | Supported | |
| SINT, INT, DINT, LINT | Supported | |
| USINT, UINT, UDINT, ULINT | Supported | |
| REAL, LREAL | Supported | |
| TIME | Supported | Nanosecond precision, int64_t storage |
| DATE | Supported | |
| TIME_OF_DAY | Supported | |
| DATE_AND_TIME | Supported | |
| STRING | Supported | Parameterized length: STRING(N), default 254 |
| WSTRING | Supported | Parameterized length: WSTRING(N) |
| CHAR, WCHAR | Supported | |

### Derived Types

| Type | Status | Notes |
|------|--------|-------|
| TYPE ... END_TYPE | Supported | Type aliases |
| STRUCT ... END_STRUCT | Supported | With nested structs |
| Enumerations | Supported | With optional base type |
| ARRAY (1D) | Supported | Arbitrary bounds: ARRAY[1..10] OF INT |
| ARRAY (2D) | Supported | ARRAY[1..3, 1..4] OF REAL |
| ARRAY[*] (VLA) | Supported | Variable-length array parameters |
| Subranges | Supported | Runtime validation |
| REF_TO | Supported | IEC reference type |
| REFERENCE_TO | Supported | CODESYS implicit dereference variant |

### Pending Types

| Type | Status | Notes |
|------|--------|-------|
| POINTER TO | Pending | CODESYS extension (Phase 6) |
| UNION | Pending | CODESYS extension (Phase 6) |
| LTIME, LDATE, LTOD, LDT | Pending | 64-bit time types (Phase 6) |

## Program Organization Units

| POU | Status | Notes |
|-----|--------|-------|
| PROGRAM | Supported | With CONFIGURATION/RESOURCE/TASK structure |
| FUNCTION | Supported | With return type, all parameter modes |
| FUNCTION_BLOCK | Supported | Instantiation, invocation, member access |
| INTERFACE | Supported | Method/property signatures |

## Variable Declarations

| Feature | Status | Notes |
|---------|--------|-------|
| VAR | Supported | Local variables |
| VAR_INPUT | Supported | Input parameters |
| VAR_OUTPUT | Supported | Output parameters |
| VAR_IN_OUT | Supported | Pass-by-reference parameters |
| VAR_EXTERNAL | Supported | External references to VAR_GLOBAL |
| VAR_GLOBAL | Supported | Global variables |
| CONSTANT | Supported | Compile-time constants |
| RETAIN | Supported | Persistent variables |
| NON_RETAIN | Supported | |
| AT %IX0.0 | Supported | Located variables (I/Q/M areas, all sizes) |
| Multiple names | Supported | `a, b, c : INT := 0;` |
| Initialization | Supported | `:= expression` |

## Operators and Expressions

| Category | Operators | Status |
|----------|-----------|--------|
| Arithmetic | `+`, `-`, `*`, `/`, `MOD`, `**` | Supported |
| Comparison | `=`, `<>`, `<`, `>`, `<=`, `>=` | Supported |
| Logical | `AND`, `OR`, `XOR`, `NOT` | Supported |
| Bitwise | `AND`, `OR`, `XOR`, `NOT` (on bit types) | Supported |
| Bit shift | `SHL`, `SHR`, `ROL`, `ROR` | Supported |
| Assignment | `:=` | Supported |
| Reference assign | `REF=` | Supported |
| Dereference | `^`, `DREF()` | Supported |
| Reference | `REF()` | Supported |
| Parentheses | `( )` | Supported |
| Function call | `name(args)` | Supported (positional + named) |
| Method call | `obj.method(args)` | Supported |
| Array access | `arr[i]`, `arr[i, j]` | Supported |
| Field access | `struct.field` | Supported |
| NEW | `__NEW(type)` | Supported (CODESYS extension) |
| DELETE | `__DELETE(ptr)` | Supported (CODESYS extension) |

## Control Structures

| Structure | Status | Notes |
|-----------|--------|-------|
| IF / ELSIF / ELSE / END_IF | Supported | |
| FOR / TO / BY / DO / END_FOR | Supported | With optional BY (step) |
| WHILE / DO / END_WHILE | Supported | |
| REPEAT / UNTIL / END_REPEAT | Supported | |
| CASE / OF / END_CASE | Supported | Integer, bit, and enum selectors |
| EXIT | Supported | Break from loop |
| RETURN | Supported | Early return from POU |

## OOP Extensions

| Feature | Status | Notes |
|---------|--------|-------|
| Methods | Supported | On FUNCTION_BLOCK |
| Properties (GET/SET) | Supported | |
| Inheritance (EXTENDS) | Supported | Single inheritance |
| Interfaces (IMPLEMENTS) | Supported | Multiple interfaces |
| ABSTRACT | Supported | Abstract FB/method |
| FINAL | Supported | Sealed FB/method |
| OVERRIDE | Supported | Method override |
| PUBLIC/PRIVATE/PROTECTED | Supported | Access modifiers |
| THIS | Supported | Self-reference in methods |

## Standard Functions

All IEC 61131-3 standard functions are implemented in the C++ runtime:

| Category | Functions |
|----------|-----------|
| Numeric | ABS, SQRT, LN, LOG, EXP, EXPT |
| Trigonometric | SIN, COS, TAN, ASIN, ACOS, ATAN, ATAN2 |
| Selection | SEL, MIN, MAX, LIMIT, MUX |
| Comparison | GT, GE, EQ, LE, LT, NE |
| Bitwise | AND, OR, XOR, NOT, MOVE |
| Bit Shift | SHL, SHR, ROL, ROR |
| Type Conversion | *_TO_* (INT_TO_REAL, DINT_TO_STRING, etc.) |
| String | LEN, LEFT, RIGHT, MID, CONCAT, FIND, REPLACE, INSERT, DELETE, UPPER, LOWER, TRIM |

## Standard Function Blocks

Bundled as a compiled `.stlib` library (`libs/iec-standard-fb.stlib`):

| FB | Description |
|----|-------------|
| TON | On-delay timer |
| TOF | Off-delay timer |
| TP | Pulse timer |
| CTU | Count-up counter |
| CTD | Count-down counter |
| CTUD | Up/down counter |
| R_TRIG | Rising edge detector |
| F_TRIG | Falling edge detector |
| SR | Set-dominant bistable |
| RS | Reset-dominant bistable |

## Project Structure

| Feature | Status | Notes |
|---------|--------|-------|
| CONFIGURATION | Supported | |
| RESOURCE ... ON | Supported | |
| TASK ... WITH INTERVAL | Supported | |
| Program instances | Supported | `name : programType` with task assignment |
| VAR_GLOBAL in configuration | Supported | |
| Namespace configuration | Supported | Via pragmas |

## Language Extensions

| Feature | Status | Notes |
|---------|--------|-------|
| Nested comments `(* (* *) *)` | Supported | |
| Pragmas `{...}` | Supported | Including `{external}` for inline C++ |
| Inline C++ | Supported | Via `{external ...}` pragma blocks |
| Inline function calls | Supported | Via `{call ...}` pragma |
| Global constants (`-D`) | Supported | CLI `-D NAME=VALUE`, emits `constexpr` |

## Pending Features (Phase 6+)

These features are planned but not yet implemented:

| Feature | Phase | Notes |
|---------|-------|-------|
| POINTER TO | 6 | CODESYS pointer type |
| UNION | 6 | CODESYS union type |
| FB_Init / FB_Exit | 6 | Constructor/destructor lifecycle |
| __QUERYINTERFACE | 6 | Runtime interface query |
| Bit access (var.%X0) | 6 | Individual bit addressing |
| Typed literals (INT#5) | 6 | Explicit type prefix on literals |
| LTIME, LDATE, LTOD, LDT | 6 | 64-bit time types |
| ACTION | 6 | Named action blocks |
| TRY/CATCH/FINALLY | 6 | Exception handling |
| Generics | 6 | Parameterized types |
| Conditional compilation | 6 | Preprocessor-style conditionals |
| OpenPLC runtime integration | 7 | I/O binding, task scheduler |
