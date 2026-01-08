# Phase 2.3: Located Variables Architecture

**Status**: PENDING

**Duration**: 2-3 weeks

**Goal**: Implement located variables (AT %IX0.0, %QX0.0, etc.) that map IEC 61131-3 variables to physical I/O addresses, with seamless integration into the OpenPLC runtime's plugin system

## Overview

Located variables are IEC 61131-3 variables that are bound to specific I/O addresses, allowing PLC programs to interact with physical inputs, outputs, and memory locations. This phase defines the architecture for how STruCpp declares, manages, and exposes located variables to the OpenPLC runtime.

The architecture prioritizes simplicity and compatibility with the existing OpenPLC plugin system while leveraging STruCpp's `IECVar<T>` template for consistent forcing behavior across all variable types.

## Design Principles

### Key Design Decisions

1. **Located variables use the same `IECVar<T>` wrapper as regular variables** - No special type needed for located variables. They are declared identically to any other variable, which means forcing works consistently across all variables.

2. **Compiler generates a descriptor array (`locatedVars[]`)** - The compiler produces a static array of descriptors that the runtime can iterate to bind variables to I/O buffers. No text parsing, no glueVars generation, no intermediate files.

3. **Runtime binds image table pointers to variable storage** - The runtime iterates the descriptor array once at initialization and points its image table entries to the raw storage inside each `IECVar<T>` wrapper.

4. **Plugin system remains unchanged** - Plugins continue to read/write raw scalar pointers. The `IECVar<T>` template's `raw_ptr()` method provides access to the underlying storage.

5. **Forcing is handled by the template** - The `IECVar<T>::get()` method returns the forced value when forced, regardless of what drivers write to the raw storage. No runtime intervention needed.

## IEC 61131-3 Located Variable Syntax

### Address Format

Located variables use the `AT` keyword followed by an address:

```
%<area><size><byte_index>.<bit_index>
```

Where:
- **Area**: `I` (Input), `Q` (Output), `M` (Memory)
- **Size**: `X` (Bit), `B` (Byte), `W` (Word/16-bit), `D` (Double word/32-bit), `L` (Long word/64-bit)
- **Byte Index**: The byte offset in the I/O image
- **Bit Index**: For bit-addressed variables (`X`), the bit offset (0-7)

### Examples

```st
VAR
    (* Bit-addressed variables *)
    start_button AT %IX0.0 : BOOL;      (* Input bit 0.0 *)
    motor_running AT %QX2.3 : BOOL;     (* Output bit 2.3 *)
    
    (* Word-addressed variables *)
    temperature AT %IW10 : INT;          (* Input word 10 *)
    speed_setpoint AT %QW5 : INT;        (* Output word 5 *)
    
    (* Memory variables *)
    counter AT %MW100 : INT;             (* Memory word 100 *)
    accumulated AT %MD50 : DINT;         (* Memory double word 50 *)
END_VAR
```

### Compiler Constraints

The compiler enforces the following rules:

1. **No duplicate addresses** - Two variables cannot be declared at the same address. This is invalid IEC 61131-3 code and generates a compiler error.

2. **Located variables only in global scope** - Located variables cannot be declared inside Function Blocks. They may only appear in PROGRAM-level VAR blocks or VAR_GLOBAL blocks. Declaring a located variable inside an FB generates a compiler error.

3. **Type must match size** - The variable type must be compatible with the address size:
   - `%?X` (bit) requires `BOOL`
   - `%?B` (byte) requires `BYTE`, `USINT`, or `SINT`
   - `%?W` (word) requires `WORD`, `INT`, `UINT`
   - `%?D` (double word) requires `DWORD`, `DINT`, `UDINT`
   - `%?L` (long word) requires `LWORD`, `LINT`, `ULINT`

## Architecture

### IECVar<T> Template Enhancement

The `IECVar<T>` template is enhanced with a `raw_ptr()` method that returns a pointer to the underlying storage:

```cpp
template<typename T>
class IECVar {
private:
    T value_;
    bool forced_;
    T forced_value_;
    
public:
    // Existing methods...
    
    T get() const noexcept {
        return forced_ ? forced_value_ : value_;
    }
    
    void set(T v) noexcept {
        if (!forced_) {
            value_ = v;
        }
    }
    
    void force(T v) noexcept {
        forced_ = true;
        forced_value_ = v;
        value_ = v;  // Also update raw value so external readers see forced value
    }
    
    void unforce() noexcept {
        forced_ = false;
    }
    
    bool is_forced() const noexcept {
        return forced_;
    }
    
    // NEW: Raw pointer access for runtime binding
    T* raw_ptr() noexcept { return &value_; }
    const T* raw_ptr() const noexcept { return &value_; }
};
```

### Located Variable Descriptor

The compiler generates a descriptor for each located variable:

```cpp
// Enums for address components
enum LocatedVarType : uint8_t {
    LOC_INPUT  = 0,  // %I
    LOC_OUTPUT = 1,  // %Q
    LOC_MEMORY = 2   // %M
};

enum LocatedVarSize : uint8_t {
    LOC_BIT    = 0,  // X - single bit
    LOC_BYTE   = 1,  // B - 8 bits
    LOC_WORD   = 2,  // W - 16 bits
    LOC_DWORD  = 3,  // D - 32 bits
    LOC_LWORD  = 4   // L - 64 bits
};

// Descriptor for a single located variable
struct LocatedVar {
    uint8_t  type;         // LocatedVarType (I, Q, M)
    uint8_t  size;         // LocatedVarSize (X, B, W, D, L)
    uint16_t major_index;  // Byte index in I/O image
    uint8_t  minor_index;  // Bit index (0-7 for X, 0 otherwise)
    uint8_t  _reserved[3]; // Padding for alignment
    void*    pointer;      // Pointer to raw storage (via raw_ptr())
};
```

### Generated Code Example

**Original ST:**
```st
PROGRAM main
    VAR
        start_button AT %IX0.0 : BOOL;
        motor_running AT %QX2.3 : BOOL;
        speed_setpoint AT %QW10 : INT;
        sensor_value AT %IW5 : INT;
    END_VAR
    
    motor_running := start_button;
    speed_setpoint := sensor_value * 2;
END_PROGRAM
```

**Generated C++:**
```cpp
#include "iec_runtime.h"

// ============================================
// Located Variable Descriptors
// ============================================

// Forward declarations of located variables
extern IEC_BOOL start_button;
extern IEC_BOOL motor_running;
extern IEC_INT speed_setpoint;
extern IEC_INT sensor_value;

// Located variables descriptor array
extern "C" __attribute__((visibility("default")))
LocatedVar locatedVars[] = {
    { LOC_INPUT,  LOC_BIT,  0,  0, {0,0,0}, nullptr },  // start_button AT %IX0.0
    { LOC_OUTPUT, LOC_BIT,  2,  3, {0,0,0}, nullptr },  // motor_running AT %QX2.3
    { LOC_OUTPUT, LOC_WORD, 10, 0, {0,0,0}, nullptr },  // speed_setpoint AT %QW10
    { LOC_INPUT,  LOC_WORD, 5,  0, {0,0,0}, nullptr },  // sensor_value AT %IW5
};

extern "C" __attribute__((visibility("default")))
const uint32_t locatedVarsCount = 4;

// ============================================
// Program Class
// ============================================

class Program_main : public ProgramBase {
public:
    // Located variables (declared as normal IECVar)
    IEC_BOOL start_button;
    IEC_BOOL motor_running;
    IEC_INT speed_setpoint;
    IEC_INT sensor_value;
    
    Program_main() 
        : start_button(false)
        , motor_running(false)
        , speed_setpoint(0)
        , sensor_value(0)
    {
        // Initialize descriptor pointers
        locatedVars[0].pointer = start_button.raw_ptr();
        locatedVars[1].pointer = motor_running.raw_ptr();
        locatedVars[2].pointer = speed_setpoint.raw_ptr();
        locatedVars[3].pointer = sensor_value.raw_ptr();
    }
    
    void run() override {
        // motor_running := start_button;
        motor_running.set(start_button.get());
        
        // speed_setpoint := sensor_value * 2;
        speed_setpoint.set(sensor_value.get() * 2);
    }
};
```

### Runtime Binding

The OpenPLC runtime binds located variables to its image tables at initialization:

```cpp
void bind_located_variables(void* lib_handle) {
    // Import symbols from compiled PLC library
    auto vars = (LocatedVar*)dlsym(lib_handle, "locatedVars");
    auto count = *(uint32_t*)dlsym(lib_handle, "locatedVarsCount");
    
    if (!vars || !count) {
        log_error("Failed to load located variables from PLC library");
        return;
    }
    
    // Iterate descriptors and bind to image tables
    for (uint32_t i = 0; i < count; i++) {
        LocatedVar* v = &vars[i];
        
        switch (v->type) {
            case LOC_INPUT:
                bind_input(v);
                break;
            case LOC_OUTPUT:
                bind_output(v);
                break;
            case LOC_MEMORY:
                bind_memory(v);
                break;
        }
    }
}

void bind_output(LocatedVar* v) {
    switch (v->size) {
        case LOC_BIT:
            // bool_output[byte][bit] points to the variable's raw storage
            bool_output[v->major_index][v->minor_index] = (IEC_BOOL*)v->pointer;
            break;
        case LOC_WORD:
            int_output[v->major_index] = (IEC_UINT*)v->pointer;
            break;
        case LOC_DWORD:
            dint_output[v->major_index] = (IEC_UDINT*)v->pointer;
            break;
        case LOC_LWORD:
            lint_output[v->major_index] = (IEC_ULINT*)v->pointer;
            break;
    }
}

// Similar implementations for bind_input() and bind_memory()
```

## Forcing Behavior

The `IECVar<T>` template handles forcing elegantly without any runtime intervention:

### For Inputs (Drivers Write, PLC Reads)

1. Driver writes raw value to `value_` via the image table pointer
2. PLC code calls `get()` which returns `forced_value_` when forced
3. The driver's write is effectively ignored when the variable is forced

**Example flow:**
```
Driver: *bool_input[0][0] = true;     // Writes to value_
PLC:    if (start_button.get()) ...   // Returns forced_value_ if forced
```

### For Outputs (PLC Writes, Drivers Read)

1. When forcing, `force(v)` sets both `forced_value_` AND `value_`
2. This ensures drivers reading the raw pointer see the forced value
3. PLC code calls `set()` which is ignored when forced (so `value_` stays at forced value)

**Example flow:**
```
Debug:  motor_running.force(true);    // Sets forced_value_ = true, value_ = true
PLC:    motor_running.set(false);     // Ignored because forced_ is true
Driver: val = *bool_output[2][3];     // Reads value_ which is true (forced)
```

### Unforcing

When `unforce()` is called, it simply clears the `forced_` flag. The next PLC scan will compute and write a new value via `set()`, and drivers will see that new value.

## Plugin System Compatibility

The plugin system requires no changes. Plugins continue to receive `plugin_runtime_args_t` with pointers to raw scalars:

```c
typedef struct {
    IEC_BOOL *(*bool_input)[8];
    IEC_BOOL *(*bool_output)[8];
    IEC_UINT **int_input;
    IEC_UINT **int_output;
    // ... etc
} plugin_runtime_args_t;
```

Plugins read/write through these pointers as before:

```c
// Plugin reading an output
IEC_BOOL value = *(args->bool_output[2][3]);

// Plugin writing an input
*(args->bool_input[0][0]) = sensor_value;
```

The pointers now point to `IECVar<T>::value_` storage instead of separate buffer arrays, but this is transparent to plugins.

## Deliverables

### Parser Extensions

- Grammar for `AT %address` syntax in variable declarations
- AST node for located variable declarations
- Address parsing and validation

### Semantic Analysis

- Validate address format and type compatibility
- Detect duplicate address declarations (error)
- Detect located variables inside FBs (error)
- Build located variable registry

### Code Generator

- Generate `LocatedVar` descriptor array
- Generate `locatedVarsCount` constant
- Initialize descriptor pointers in program constructor
- Export symbols with proper visibility attributes

### Runtime Integration

- Define `LocatedVar` struct in shared header
- Implement `bind_located_variables()` function
- Update image table initialization to use located variable pointers

### Testing

- Parse located variable declarations
- Validate address format errors
- Validate duplicate address errors
- Validate FB scope errors
- Generate correct descriptor arrays
- Verify runtime binding works correctly
- Verify forcing behavior for inputs and outputs
- Verify plugin compatibility

## Success Criteria

- Can parse all located variable address formats (%IX, %QX, %IW, %QW, %MD, etc.)
- Compiler errors for duplicate addresses
- Compiler errors for located variables inside FBs
- Generated descriptor array is correct
- Runtime can bind variables to image tables
- Forcing works correctly for both inputs and outputs
- Plugins can read/write located variables without modification
- Test coverage >90% for located variable parsing and generation

## Validation Examples

### Test 1: Basic Located Variables
```st
PROGRAM test
    VAR
        input_bit AT %IX0.0 : BOOL;
        output_bit AT %QX0.0 : BOOL;
    END_VAR
    output_bit := input_bit;
END_PROGRAM
```
**Expected**: Generates 2 descriptors, runtime binds correctly.

### Test 2: Word-Addressed Variables
```st
PROGRAM test
    VAR
        analog_in AT %IW5 : INT;
        analog_out AT %QW10 : INT;
    END_VAR
    analog_out := analog_in;
END_PROGRAM
```
**Expected**: Generates 2 descriptors with LOC_WORD size.

### Test 3: Memory Variables
```st
PROGRAM test
    VAR
        counter AT %MW100 : INT;
        accumulator AT %MD50 : DINT;
    END_VAR
END_PROGRAM
```
**Expected**: Generates 2 descriptors with LOC_MEMORY type.

### Test 4: Duplicate Address Error
```st
PROGRAM test
    VAR
        var1 AT %QX0.0 : BOOL;
        var2 AT %QX0.0 : BOOL;  (* ERROR: Duplicate address *)
    END_VAR
END_PROGRAM
```
**Expected**: Compiler error for duplicate address.

### Test 5: Located Variable in FB Error
```st
FUNCTION_BLOCK MyFB
    VAR
        output AT %QX0.0 : BOOL;  (* ERROR: Not allowed in FB *)
    END_VAR
END_FUNCTION_BLOCK
```
**Expected**: Compiler error for located variable in FB.

### Test 6: Forcing Input Variable
```st
PROGRAM test
    VAR
        sensor AT %IX0.0 : BOOL;
    END_VAR
END_PROGRAM
```
**Test scenario**:
1. Driver writes `true` to `*bool_input[0][0]`
2. Debug forces `sensor` to `false`
3. PLC reads `sensor.get()` -> returns `false` (forced value)
4. Driver writes `true` again
5. PLC reads `sensor.get()` -> still returns `false` (forced)

### Test 7: Forcing Output Variable
```st
PROGRAM test
    VAR
        motor AT %QX0.0 : BOOL;
    END_VAR
    motor := TRUE;
END_PROGRAM
```
**Test scenario**:
1. Debug forces `motor` to `false`
2. PLC executes `motor.set(true)` -> ignored
3. Driver reads `*bool_output[0][0]` -> returns `false` (forced)

## Notes

### What Phase 2.3 Does NOT Include

- No ST code compilation (covered in Phase 3)
- No function block compilation (covered in Phase 5)
- No OpenPLC Editor integration (covered in Phase 6)
- No debug protocol implementation (covered in Phase 6)

### What Phase 2.3 DOES Include

- Located variable syntax parsing
- Address validation and error checking
- Descriptor array generation
- Runtime binding mechanism
- Forcing behavior through IECVar<T> template
- Plugin system compatibility

### Relationship to Other Phases

- **Phase 1.1**: Uses IECVar<T> template with raw_ptr() enhancement
- **Phase 2.1**: Located variables integrate with project structure
- **Phase 2.2**: Located variables can use user-defined types
- **Phase 3**: ST code compilation will use located variables
- **Phase 6**: Full OpenPLC integration builds on this foundation

### IEC Type to C++ Type Mapping

For plugin compatibility, the underlying storage types must match:

| IEC Type | C++ Storage | Size |
|----------|-------------|------|
| BOOL     | uint8_t     | 1 byte |
| BYTE     | uint8_t     | 1 byte |
| SINT     | int8_t      | 1 byte |
| USINT    | uint8_t     | 1 byte |
| INT      | int16_t     | 2 bytes |
| UINT     | uint16_t    | 2 bytes |
| WORD     | uint16_t    | 2 bytes |
| DINT     | int32_t     | 4 bytes |
| UDINT    | uint32_t    | 4 bytes |
| DWORD    | uint32_t    | 4 bytes |
| LINT     | int64_t     | 8 bytes |
| ULINT    | uint64_t    | 8 bytes |
| LWORD    | uint64_t    | 8 bytes |

**Important**: `IEC_BOOL` should use `uint8_t` as the underlying type (not C++ `bool`) to ensure ABI compatibility with the plugin system.
