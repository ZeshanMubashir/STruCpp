# STruC++ Implementation Phases

This document outlines the phased development plan for STruC++, breaking the implementation into manageable, testable increments. Each phase delivers a vertical slice of functionality that can be validated independently.

## Table of Contents

1. [Overview](#overview)
2. [Phase 0: Design and Planning](#phase-0-design-and-planning)
3. [Phase 1: Core Frontend and Expression Subset](#phase-1-core-frontend-and-expression-subset)
4. [Phase 2: Functions and Function Calls](#phase-2-functions-and-function-calls)
5. [Phase 3: Function Blocks and Classes](#phase-3-function-blocks-and-classes)
6. [Phase 4: Programs, Configurations, and Resources](#phase-4-programs-configurations-and-resources)
7. [Phase 5: IEC v3 Features and Full Coverage](#phase-5-iec-v3-features-and-full-coverage)
8. [Phase 6: Optimizations and Advanced Debug Support](#phase-6-optimizations-and-advanced-debug-support)
9. [Testing Strategy](#testing-strategy)
10. [Integration with OpenPLC](#integration-with-openplc)

## Overview

### Phasing Philosophy

Each phase follows these principles:

1. **Vertical Slices** - Each phase delivers end-to-end functionality (parsing → semantic analysis → code generation)
2. **Incremental Complexity** - Start simple, add complexity gradually
3. **Always Testable** - Every phase produces a working compiler for a subset of the language
4. **Clear Deliverables** - Each phase has specific, measurable completion criteria
5. **Independent Validation** - Each phase can be validated without completing later phases

### Success Criteria

For each phase to be considered complete:

- ✅ All planned features are implemented
- ✅ Unit tests pass (>90% coverage for new code)
- ✅ Integration tests pass (golden file tests)
- ✅ Line mapping is correct for all generated code
- ✅ Generated C++ compiles without errors
- ✅ Generated C++ produces correct runtime behavior
- ✅ Documentation is updated

## Phase 0: Design and Planning

**Status**: ✅ COMPLETED

**Duration**: 2-3 weeks

**Goal**: Establish project foundation and detailed design

### Deliverables

- ✅ Repository structure created
- ✅ Comprehensive design documentation
  - ✅ README.md with project overview and name origin
  - ✅ ARCHITECTURE.md with detailed compiler design
  - ✅ IMPLEMENTATION_PHASES.md (this document)
  - ✅ IEC61131_COMPLIANCE.md with v3 compliance details
  - ✅ MATIEC_COMPARISON.md with MatIEC analysis
  - ✅ PARSER_SELECTION.md with parser choice rationale
  - ✅ CPP_RUNTIME.md with C++ runtime design
- ✅ Parser library selected (Chevrotain)
- ✅ Technology stack finalized
- ✅ Development environment setup guide

### Success Criteria

- ✅ All design documents reviewed and approved
- ✅ Team alignment on architecture and approach
- ✅ Clear understanding of MatIEC limitations
- ✅ Realistic timeline for implementation

## Phase 1: IEC Types, Runtime, and Library Architecture

**Status**: ⏳ PENDING

**Duration**: 4-6 weeks

**Goal**: Design and implement the foundational C++ runtime architecture that all subsequent phases will build upon

### Scope

**Core Focus**: Establish the C++ runtime foundation before implementing any parsing or compilation logic. This phase is entirely about the *target* architecture (what STruC++ will generate), not the compiler itself.

**Key Deliverables**:
1. **IEC Type System** - C++ wrapper classes for all IEC 61131-3 v3 base types
2. **Variable Forcing** - Forcing/unforcing mechanism integrated into type wrappers
3. **Standard Library Architecture** - Design for ST-based standard library with caching
4. **Standard Functions** - Template-based implementation for variable-argument functions
5. **Type Conversions** - Clean architecture for IEC type conversions
6. **Output Architecture** - Library + project output model

### Detailed Scope

#### 1. IEC Base Type Wrappers

Design and implement `iec_types.hpp` with wrapper classes for all IEC 61131-3 v3 base types:

**Elementary Types**:
- Bit strings: BOOL, BYTE, WORD, DWORD, LWORD
- Integers: SINT, INT, DINT, LINT, USINT, UINT, UDINT, ULINT
- Reals: REAL, LREAL
- Durations: TIME, LTIME
- Date/Time: DATE, TIME_OF_DAY (TOD), DATE_AND_TIME (DT), LDATE, LTIME_OF_DAY (LTOD), LDATE_AND_TIME (LDT)
- Strings: STRING, WSTRING, CHAR, WCHAR

**Wrapper Design**:
```cpp
template<typename T>
class IECVar {
private:
    T value_;
    bool forced_;
    T forced_value_;
    
public:
    IECVar() : value_(T()), forced_(false), forced_value_(T()) {}
    explicit IECVar(T val) : value_(val), forced_(false), forced_value_(T()) {}
    
    // Get value (respects forcing)
    T get() const { return forced_ ? forced_value_ : value_; }
    
    // Set value (only if not forced)
    void set(T val) { if (!forced_) value_ = val; }
    
    // Forcing API
    void force(T val) { forced_ = true; forced_value_ = val; }
    void unforce() { forced_ = false; }
    bool is_forced() const { return forced_; }
    
    // Operators for natural syntax
    IECVar& operator=(T val) { set(val); return *this; }
    operator T() const { return get(); }
    
    // Arithmetic operators (for numeric types)
    // ... template specializations for different type categories
};

// Type aliases for IEC types
using IEC_BOOL = IECVar<bool>;
using IEC_INT = IECVar<int16_t>;
using IEC_DINT = IECVar<int32_t>;
using IEC_REAL = IECVar<float>;
using IEC_LREAL = IECVar<double>;
// ... etc for all IEC types
```

**Type Categories and Traits**:
```cpp
// Category tags for IEC type system
struct AnyBitTag {};
struct AnyIntTag {};
struct AnyRealTag {};
struct AnyNumTag {};
struct AnyDateTag {};
struct AnyStringTag {};

// Type traits to map IEC types to categories
template<typename T> struct IECCategory;
template<> struct IECCategory<IEC_BOOL> { using type = AnyBitTag; };
template<> struct IECCategory<IEC_INT> { using type = AnyIntTag; };
template<> struct IECCategory<IEC_REAL> { using type = AnyRealTag; };
// ... etc

// Concepts for type constraints (C++20)
template<typename T>
concept IECAnyInt = std::is_same_v<typename IECCategory<T>::type, AnyIntTag>;

template<typename T>
concept IECAnyReal = std::is_same_v<typename IECCategory<T>::type, AnyRealTag>;

template<typename T>
concept IECAnyNum = IECAnyInt<T> || IECAnyReal<T>;
```

#### 2. Standard Library Architecture

**Library Source Structure**:
```
lib/
├── iec_std/              # IEC 61131-3 standard library (ST source)
│   ├── numeric.st        # Numeric functions (ABS, SQRT, etc.)
│   ├── bitwise.st        # Bit string functions (SHL, SHR, etc.)
│   ├── selection.st      # Selection functions (SEL, MAX, MIN, etc.)
│   ├── comparison.st     # Comparison functions
│   ├── string.st         # String functions (LEN, CONCAT, etc.)
│   ├── conversion.st     # Type conversion functions
│   ├── timers.st         # Standard timer FBs (TON, TOF, TP)
│   ├── counters.st       # Standard counter FBs (CTU, CTD, CTUD)
│   └── edge.st           # Edge detection FBs (R_TRIG, F_TRIG)
└── openplc/              # OpenPLC-specific extensions (optional)
    └── ...
```

**Compilation Strategy**:
- Standard library is maintained as **canonical ST source**
- STruC++ compiles the library ST to C++ (`iec_stdlib.hpp` / `iec_stdlib.cpp`)
- Compiled library is **cached** based on:
  - Hash of library ST source files
  - STruC++ compiler version
  - Target platform / compile flags (if relevant)
- Cache invalidation triggers:
  - Library ST source changes
  - Compiler version changes
  - Manual cache clear

**Cache Location** (conceptual):
```
~/.strucpp/cache/
└── iec_stdlib/
    ├── {hash}/
    │   ├── iec_stdlib.hpp
    │   ├── iec_stdlib.cpp
    │   └── metadata.json
    └── ...
```

**Shipped Artifacts** (optional for bootstrap speed):
- STruC++ may ship precompiled C++ for the standard library
- But the ST source remains the authoritative source of truth
- Users can rebuild from ST if needed

#### 3. Standard Functions Without Macros

**Challenge**: IEC standard functions like `ADD`, `SUB`, `MAX`, `MIN` are:
- Overloaded on many types (INT, DINT, REAL, LREAL, TIME, etc.)
- Variadic (can take 2..N arguments)

**MatIEC's Approach**: Complex preprocessor macros (avoid this!)

**STruC++ Approach**: C++ variadic templates with type constraints

**Example: ADD Function**:
```cpp
// Base case: 2 arguments
template<IECAnyNum T>
T ADD(const T& a, const T& b) {
    return T(a.get() + b.get());
}

// Variadic extension: 3+ arguments
template<IECAnyNum T, typename... Rest>
T ADD(const T& a, const T& b, const Rest&... rest) {
    return ADD(ADD(a, b), rest...);
}
```

**Example: MAX Function**:
```cpp
template<IECAnyNum T>
T MAX(const T& a, const T& b) {
    return T(std::max(a.get(), b.get()));
}

template<IECAnyNum T, typename... Rest>
T MAX(const T& a, const T& b, const Rest&... rest) {
    return MAX(MAX(a, b), rest...);
}
```

**Integration Options**:
1. **Option A**: Implement these as C++ intrinsics, expose to ST as external functions
2. **Option B**: Define ST wrapper functions that call C++ templates
3. **Hybrid**: Core operations in C++, higher-level functions in ST

**Decision for Phase 1**: Implement core variable-argument functions (ADD, SUB, MUL, DIV, MAX, MIN, etc.) as C++ templates. Higher-level functions can be defined in ST library.

#### 4. Type Conversion Functions

**IEC Type Conversions**: `INT_TO_REAL`, `REAL_TO_INT`, `TIME_TO_DINT`, etc.

**Approach**:
```cpp
// Generic conversion helper
template<typename To, typename From>
To iec_convert(const From& src) {
    // Handle range checking, saturation, rounding per IEC rules
    return To(static_cast<typename To::value_type>(src.get()));
}

// Specific conversion functions
IEC_REAL INT_TO_REAL(const IEC_INT& val) {
    return iec_convert<IEC_REAL>(val);
}

IEC_INT REAL_TO_INT(const IEC_REAL& val) {
    // IEC specifies truncation toward zero
    return IEC_INT(static_cast<int16_t>(std::trunc(val.get())));
}

// Time conversions
IEC_DINT TIME_TO_DINT(const IEC_TIME& val) {
    // Convert time duration to milliseconds
    return IEC_DINT(val.get().count());
}
```

**ST Library Wrappers** (optional):
```st
FUNCTION INT_TO_REAL : REAL
    VAR_INPUT IN : INT; END_VAR
    INT_TO_REAL := REAL(IN);  (* Uses cast syntax, maps to C++ helper *)
END_FUNCTION
```

#### 5. Output Architecture

**Fixed Runtime Headers** (ship with STruC++):
```
include/
├── iec_types.hpp         # All IEC type wrappers
├── iec_traits.hpp        # Type categories and traits
├── iec_runtime.hpp       # Core runtime functions (time, etc.)
└── iec_intrinsics.hpp    # Intrinsic functions (ADD, MAX, etc.)
```

**Cached Standard Library** (compiled from ST):
```
~/.strucpp/cache/iec_stdlib/{hash}/
├── iec_stdlib.hpp        # Declarations of all standard functions/FBs
└── iec_stdlib.cpp        # Implementations
```

**Per-Project Output**:
```
project.cpp               # Generated from user's ST code
```

**Compilation Model**:
```bash
# STruC++ generates project.cpp from user's ST
strucpp compile program.st -o project.cpp

# User compiles with:
g++ -I/path/to/strucpp/include \
    -I~/.strucpp/cache/iec_stdlib/{hash} \
    project.cpp \
    ~/.strucpp/cache/iec_stdlib/{hash}/iec_stdlib.cpp \
    -o program
```

**Benefits**:
- No duplicate IEC type declarations
- Standard library compiled once, reused across projects
- Clean separation: runtime (fixed) vs library (cached) vs project (generated)
- Easy to integrate with build systems

### Deliverables

**Infrastructure**:
- Project structure (src/ directory with TypeScript modules)
- Build system (package.json, tsconfig.json)
- Testing framework (Vitest configuration)
- CI/CD pipeline (GitHub Actions)

**C++ Runtime Headers**:
- `iec_types.hpp` - All IEC type wrappers with forcing support
- `iec_traits.hpp` - Type categories and traits
- `iec_runtime.hpp` - Core runtime functions
- `iec_intrinsics.hpp` - Variable-argument standard functions

**Standard Library (ST Source)**:
- Directory structure under `lib/iec_std/`
- ST source files for standard functions and FBs
- Documentation of library organization

**Library Cache Design**:
- Cache directory structure
- Metadata format (JSON)
- Cache invalidation logic (documented, not necessarily implemented)

**Documentation**:
- Detailed design document for IEC types (extend CPP_RUNTIME.md)
- Library architecture document
- Standard function implementation guide
- Type conversion rules and semantics

**Testing**:
- Unit tests for IEC type wrappers
- Tests for forcing/unforcing behavior
- Tests for standard functions (ADD, MAX, etc.)
- Tests for type conversions
- Compilation tests (generated C++ compiles)

### Success Criteria

- ✅ All IEC 61131-3 v3 base types have C++ wrapper classes
- ✅ Forcing/unforcing mechanism works correctly
- ✅ Variable-argument functions (ADD, MAX, etc.) work with templates
- ✅ Type conversions follow IEC semantics
- ✅ Standard library directory structure is established
- ✅ Cache design is documented and validated
- ✅ Generated C++ compiles with g++/clang++
- ✅ Test coverage >90% for implemented features
- ✅ Documentation is comprehensive and clear

### Validation Examples

**Test 1: IEC Type Wrapper**
```cpp
// Test forcing behavior
IEC_INT x(10);
assert(x.get() == 10);

x.force(99);
assert(x.get() == 99);
assert(x.is_forced());

x.set(20);  // Should have no effect
assert(x.get() == 99);

x.unforce();
assert(x.get() == 10);  // Back to original value
```

**Test 2: Variable-Argument Function**
```cpp
// Test ADD with different argument counts
IEC_INT a(10), b(20), c(30), d(40);

auto result2 = ADD(a, b);
assert(result2.get() == 30);

auto result3 = ADD(a, b, c);
assert(result3.get() == 60);

auto result4 = ADD(a, b, c, d);
assert(result4.get() == 100);
```

**Test 3: Type Conversion**
```cpp
// Test INT_TO_REAL conversion
IEC_INT i(42);
IEC_REAL r = INT_TO_REAL(i);
assert(r.get() == 42.0f);

// Test REAL_TO_INT conversion (truncation)
IEC_REAL r2(3.7f);
IEC_INT i2 = REAL_TO_INT(r2);
assert(i2.get() == 3);  // Truncates toward zero
```

**Test 4: Library Cache Concept**
```python
# Conceptual test (implementation in later phase)
def test_library_cache():
    # Compile standard library from ST
    lib_hash = compile_stdlib("lib/iec_std/")
    
    # Check cache exists
    assert cache_exists(lib_hash)
    
    # Recompile should use cache
    lib_hash2 = compile_stdlib("lib/iec_std/")
    assert lib_hash == lib_hash2
    assert cache_was_used()
    
    # Modify library, should invalidate cache
    modify_file("lib/iec_std/numeric.st")
    lib_hash3 = compile_stdlib("lib/iec_std/")
    assert lib_hash3 != lib_hash
```

### Notes

**What Phase 1 Does NOT Include**:
- ❌ No Lark parser or grammar
- ❌ No AST or semantic analysis
- ❌ No code generation from ST
- ❌ No actual compilation of ST programs

**Why This Order?**:
1. The runtime is the **foundation** - we need to know what we're generating before we can generate it
2. Decisions about type wrappers, forcing, and standard functions affect the compiler design
3. Having the runtime lets us write **manual C++ tests** to validate behavior before the compiler exists
4. The standard library architecture must be designed before we implement library compilation

**Relationship to Phase 2**:
- Phase 2 will parse the IEC project structure (Config/Resource/Task/Instance) and generate C++ skeleton classes
- Phase 2 will NOT compile ST code yet - that comes in Phase 3+
- Phase 2 establishes the structural foundation that Phase 3+ will fill in with behavior

## Phase 2: Project Structure and Scheduling Model

**Status**: ⏳ PENDING

**Duration**: 3-4 weeks

**Goal**: Parse IEC 61131-3 project structure (CONFIGURATION, RESOURCE, TASK, program instances) and generate C++ class hierarchy for runtime scheduling, WITHOUT compiling ST program bodies yet

### Scope

**Core Focus**: Build the project model and generate C++ skeleton for the structural and scheduling aspects of an IEC project. This phase is purely about the *shape* of the project (what configs, resources, tasks, and instances exist), not the *behavior* (ST code inside programs).

**Key Deliverables**:
1. **Project Structure Parser** - Parse CONFIGURATION, RESOURCE, TASK, program instance declarations
2. **Project Model** - Internal representation of project structure
3. **C++ Class Hierarchy** - Generate Config/Resource/Task/Program classes
4. **Global Variable Handling** - VAR_GLOBAL and VAR_EXTERNAL resolution
5. **Program Instance Wiring** - Connect program instances to tasks with proper references
6. **Empty Program Stubs** - Generate program classes with empty .run() methods

### Rationale: Why This Phase Comes Before ST Compilation

**Foundation-First Approach**: The IEC project structure (Config → Resource → Task → Instance) is declarative and predictable. We can parse and generate this structure independently from the ST code compilation, which provides several benefits:

1. **Testability** - Can validate project structure generation even with empty .run() methods
2. **Clear Separation** - Structure (Phase 2) vs. Behavior (Phase 3+)
3. **Runtime Integration** - Runtime can iterate over configs/resources/tasks without knowing ST details
4. **Incremental Development** - Smaller, focused phases are easier to implement and test

### Detailed Scope

#### 1. Project Structure Parsing

**Use Chevrotain Parser** (same parser as later phases, but only for structural constructs):
- Parse CONFIGURATION declarations
- Parse RESOURCE declarations (with ON clause)
- Parse TASK declarations (INTERVAL, PRIORITY)
- Parse PROGRAM instance declarations (WITH clause binding to tasks)
- Parse VAR_GLOBAL blocks
- Parse PROGRAM headers (name, VAR declarations) but **ignore** program bodies

**Build ProjectModel** from parsed AST:
```typescript
interface ProjectModel {
    configurations: ConfigurationDecl[];
    programs: Map<string, ProgramDecl>;  // Program definitions (types)
    functions: Map<string, FunctionDecl>;  // For later phases
    functionBlocks: Map<string, FunctionBlockDecl>;  // For later phases
}

interface ConfigurationDecl {
    name: string;
    globalVars: VarDeclaration[];
    resources: ResourceDecl[];
}

interface ResourceDecl {
    name: string;
    processor: string;  // "PLC", "CPU", etc. from ON clause
    tasks: TaskDecl[];
}

interface TaskDecl {
    name: string;
    interval?: TimeValue;  // T#20ms, etc.
    priority?: number;
    programInstances: ProgramInstanceDecl[];
}

interface ProgramInstanceDecl {
    instanceName: string;
    programType: string;  // References a ProgramDecl
    taskName: string;  // Which task this instance runs on
}

interface ProgramDecl {
    name: string;
    varDeclarations: VarDeclaration[];
    varExternal: VarExternalDeclaration[];
    body?: StatementList;  // Phase 2: undefined (ignored)
                           // Phase 3+: Parsed and compiled
}
```

#### 2. C++ Class Generation for Project Structure

**Generate Configuration Classes**:

For each CONFIGURATION, generate a C++ class that:
- Inherits from `ConfigurationInstance` (Phase 1 runtime base)
- Contains VAR_GLOBAL variables as IECVar<T> members
- Contains program instance objects as members
- Contains task descriptor arrays
- Contains resource descriptor arrays
- Wires everything together in constructor

**Generate Program Classes**:

For each PROGRAM definition, generate a C++ class that:
- Inherits from `ProgramBase` (Phase 1 runtime base)
- Contains VAR variables as IECVar<T> members
- Contains VAR_EXTERNAL variables as IECVar<T>& references (injected via constructor)
- Has empty `void run() override` method (filled in by Phase 3+)

**Example: User's Sample Project**

Original ST:
```st
PROGRAM main
  VAR
    hello : BOOL;
    world : BOOL;
  END_VAR
  hello := world;  (* Body ignored in Phase 2 *)
END_PROGRAM

PROGRAM another
  VAR
    LocalVar : DINT;
  END_VAR
  VAR_EXTERNAL
    my_global_var : DINT;
  END_VAR
  LocalVar := my_global_var;  (* Body ignored in Phase 2 *)
END_PROGRAM

CONFIGURATION Config0
  VAR_GLOBAL
    my_global_var : DINT;
  END_VAR

  RESOURCE Res0 ON PLC
    TASK task0(INTERVAL := T#20ms,PRIORITY := 1);
    TASK task1(INTERVAL := T#50ms,PRIORITY := 0);
    PROGRAM instance0 WITH task0 : main;
    PROGRAM instance1 WITH task1 : another;
  END_RESOURCE
END_CONFIGURATION
```

Generated C++ (Phase 2):
```cpp
// Program class for "main"
class Program_main : public ProgramBase {
public:
    IEC_BOOL hello;
    IEC_BOOL world;
    
    Program_main() : hello(false), world(false) {}
    
    void run() override {
        // Phase 2: Empty stub
        // Phase 3+: Will contain compiled ST code
    }
};

// Program class for "another"
class Program_another : public ProgramBase {
public:
    IEC_DINT LocalVar;
    IEC_DINT& my_global_var;  // Reference to configuration global
    
    explicit Program_another(IEC_DINT& global_var)
        : LocalVar(0), my_global_var(global_var) {}
    
    void run() override {
        // Phase 2: Empty stub
        // Phase 3+: Will contain compiled ST code
    }
};

// Configuration class
class Configuration_Config0 : public ConfigurationInstance {
public:
    // VAR_GLOBAL variables
    IEC_DINT my_global_var;
    
    // Program instances
    Program_main instance0;
    Program_another instance1;
    
    // Task descriptors (backing storage)
    TaskInstance tasks_storage[2];
    ResourceInstance resources_storage[1];
    
    Configuration_Config0()
        : my_global_var(0),
          instance0(),
          instance1(my_global_var)  // Inject global reference
    {
        // Wire up task0
        tasks_storage[0] = TaskInstance{
            "task0", IEC_TIME::from_ms(20), 1, &instance0
        };
        
        // Wire up task1
        tasks_storage[1] = TaskInstance{
            "task1", IEC_TIME::from_ms(50), 0, &instance1
        };
        
        // Wire up resource
        resources_storage[0] = ResourceInstance{
            "Res0", std::span<TaskInstance>(tasks_storage, 2)
        };
        
        // Initialize base
        name = "Config0";
        resources = std::span<ResourceInstance>(resources_storage, 1);
    }
};

// Top-level configuration array
Configuration_Config0 g_config0;
ConfigurationInstance* g_configurations[] = { &g_config0 };
const size_t g_num_configurations = 1;
```

See `docs/project_structure_example.cpp` for a complete, annotated example.

#### 3. VAR_GLOBAL and VAR_EXTERNAL Handling

**VAR_GLOBAL Resolution**:
- Global variables are members of the Configuration class
- Type: `IEC_<TYPE>` wrappers (from Phase 1)
- Initialized in configuration constructor

**VAR_EXTERNAL Resolution**:
- External variables are references (`IEC_<TYPE>&`) in program classes
- Passed to program constructor from configuration
- Validated: external variable must exist in configuration's VAR_GLOBAL

**Validation**:
- Check that all VAR_EXTERNAL declarations reference existing VAR_GLOBAL variables
- Check type compatibility between external and global declarations
- Report clear errors for missing or mismatched externals

#### 4. Task and Program Instance Wiring

**Task Descriptors**:
```cpp
struct TaskInstance {
    const char* name;
    IEC_TIME interval;
    int priority;
    ProgramBase* program;  // Points to program instance
};
```

**Wiring Process**:
1. For each TASK declaration, create a `TaskInstance` in configuration constructor
2. For each PROGRAM instance WITH task, set the task's `program` pointer to the instance
3. Store tasks in resource's task array
4. Store resources in configuration's resource array

**Runtime Access**:
```cpp
// Runtime can iterate over all configurations
for (size_t i = 0; i < g_num_configurations; i++) {
    ConfigurationInstance* config = g_configurations[i];
    
    // Iterate over resources
    for (auto& resource : config->resources) {
        
        // Iterate over tasks
        for (auto& task : resource.tasks) {
            
            // Execute program instance
            task.program->run();
        }
    }
}
```

### Deliverables

**Parser Extensions**:
- Chevrotain grammar rules for CONFIGURATION, RESOURCE, TASK syntax
- Chevrotain grammar rules for VAR_GLOBAL, VAR_EXTERNAL
- Chevrotain grammar rules for PROGRAM headers (without bodies)
- AST nodes for configuration elements

**Project Model**:
- TypeScript interfaces for ProjectModel, ConfigurationDecl, ResourceDecl, TaskDecl, etc.
- Builder that constructs ProjectModel from parsed CST
- Validation logic for project structure

**Code Generator (Structural)**:
- Generate Configuration classes with global variables
- Generate Program classes with empty .run() stubs
- Generate task and resource descriptor arrays
- Generate top-level configuration array
- Wire up program instances with task references

**Documentation**:
- Project structure design document
- Example showing generated code for sample project
- Integration guide for runtime

**Testing**:
- Parse configuration declarations
- Validate VAR_GLOBAL and VAR_EXTERNAL resolution
- Generate C++ for sample projects
- Compile generated C++ (even with empty .run() methods)
- Verify task/resource/config structure is correct

### Success Criteria

- ✅ Can parse CONFIGURATION, RESOURCE, TASK, program instance declarations
- ✅ VAR_GLOBAL and VAR_EXTERNAL resolution works correctly
- ✅ Generated C++ compiles successfully
- ✅ Configuration class hierarchy matches IEC structure
- ✅ Task descriptors correctly reference program instances
- ✅ Runtime can iterate over configs/resources/tasks
- ✅ Program classes have empty .run() stubs ready for Phase 3+
- ✅ Test coverage >90% for project structure parsing and generation

### Validation Examples

**Test 1: Simple Configuration**
```st
CONFIGURATION Config0
  RESOURCE Res0 ON PLC
    TASK task0(INTERVAL := T#100ms, PRIORITY := 0);
    PROGRAM instance0 WITH task0 : MyProgram;
  END_RESOURCE
END_CONFIGURATION
```

Expected: Generate `Configuration_Config0` class with one resource, one task, one program instance. Verify task descriptor points to program instance.

**Test 2: Global Variables**
```st
CONFIGURATION Config0
  VAR_GLOBAL
    counter : INT := 0;
    flag : BOOL;
  END_VAR
  
  RESOURCE Res0 ON PLC
    TASK task0(INTERVAL := T#50ms, PRIORITY := 1);
    PROGRAM instance0 WITH task0 : MyProgram;
  END_RESOURCE
END_CONFIGURATION
```

Expected: Configuration class has `IEC_INT counter` and `IEC_BOOL flag` members, initialized in constructor.

**Test 3: External Variables**
```st
PROGRAM MyProgram
  VAR_EXTERNAL
    counter : INT;
  END_VAR
  (* Body ignored in Phase 2 *)
END_PROGRAM

CONFIGURATION Config0
  VAR_GLOBAL
    counter : INT;
  END_VAR
  
  RESOURCE Res0 ON PLC
    TASK task0(INTERVAL := T#50ms, PRIORITY := 1);
    PROGRAM instance0 WITH task0 : MyProgram;
  END_RESOURCE
END_CONFIGURATION
```

Expected: `Program_MyProgram` class has `IEC_INT& counter` reference, passed from configuration's global `counter` in constructor.

**Test 4: Multiple Tasks and Instances**
```st
CONFIGURATION Config0
  RESOURCE Res0 ON PLC
    TASK fast_task(INTERVAL := T#10ms, PRIORITY := 2);
    TASK slow_task(INTERVAL := T#100ms, PRIORITY := 1);
    PROGRAM fast_prog WITH fast_task : FastProgram;
    PROGRAM slow_prog WITH slow_task : SlowProgram;
  END_RESOURCE
END_CONFIGURATION
```

Expected: Configuration has 2 tasks in resource, each pointing to correct program instance. Verify intervals and priorities are correct.

### Notes

**What Phase 2 Does NOT Include**:
- ❌ No ST code compilation (expressions, statements, control flow)
- ❌ No semantic analysis of program bodies
- ❌ No type checking of ST expressions
- ❌ No code generation for .run() method bodies
- ❌ No function or function block compilation

**What Phase 2 DOES Include**:
- ✅ Parse project structure (Config/Resource/Task/Instance)
- ✅ Parse VAR_GLOBAL and VAR_EXTERNAL declarations
- ✅ Parse PROGRAM headers (name, VAR declarations)
- ✅ Generate C++ class hierarchy for project structure
- ✅ Generate empty .run() method stubs
- ✅ Wire up program instances with tasks

**Why This Order?**:
1. Project structure is **declarative** - simpler to parse than ST logic
2. Can test structure generation **independently** from ST compilation
3. Runtime needs the structure **before** it needs the behavior
4. Clear **separation of concerns**: structure (Phase 2) vs. behavior (Phase 3+)

**Relationship to Phase 3**:
- Phase 3 will parse ST code inside PROGRAM bodies
- Phase 3 will compile expressions, assignments, and simple statements
- Phase 3 will fill in the .run() method implementations
- Phase 3 will use the program classes and structure created in Phase 2

**Parsing Strategy**:
- Use same Chevrotain parser for everything (no second parser)
- Phase 2: Only parse structural constructs, ignore program bodies
- Phase 3+: Extend to parse program bodies and compile ST code
- Single grammar, incremental implementation

## Phase 3: Core ST Translation (Expressions and Statements)

**Status**: ⏳ PENDING

**Duration**: 4-6 weeks

**Goal**: Implement parser and code generator for basic ST expressions, assignments, and simple statements to fill in program .run() methods

### Scope

**Language Features**:
- Elementary data types: BOOL, INT, DINT, REAL, LREAL
- Literals: integer, real, boolean
- Simple expressions: arithmetic (+, -, *, /), comparison (=, <>, <, >, <=, >=), logical (AND, OR, NOT)
- Assignment statements
- Variable references (local VAR and VAR_EXTERNAL)

**Example ST Program Body**:
```st
PROGRAM Test
    VAR
        x : INT;
        y : INT;
        result : BOOL;
    END_VAR
    
    x := 10;
    y := 20;
    result := x < y;
END_PROGRAM
```

This phase fills in the `.run()` method for programs created in Phase 2.

### Deliverables

**Frontend**:
- Chevrotain grammar rules for expression subset
- Lexer and parser implementation for ST expressions and assignments
- AST node interfaces for expressions and statements
- Source location tracking

**Semantic Analysis**:
- Symbol table implementation for local scopes
- Type inference for literals and expressions
- Type checking for assignments and operators
- Basic error reporting with source locations

**Code Generation**:
- C++ code generator for expressions and assignments
- Fill in .run() method bodies in program classes
- Line mapping implementation
- Use Phase 1 IEC type wrappers and Phase 2 program structure

**Testing**:
- Unit tests for parser, type checker, code generator
- Golden file tests (ST input → expected C++ output)
- Runtime tests (compile and execute generated C++)

### Success Criteria

- ✅ Can parse simple program bodies with expressions and assignments
- ✅ Type checking correctly identifies type errors
- ✅ Generated C++ compiles with g++/clang++
- ✅ Generated C++ produces correct results when executed
- ✅ Line mapping is accurate (1:1 for simple statements)
- ✅ Test coverage >90% for implemented features
- ✅ All golden file tests pass

### Notes

**Relationship to Phase 2**:
- Uses program classes and structure created in Phase 2
- Fills in empty .run() method bodies
- Accesses VAR and VAR_EXTERNAL variables from program class members

**Relationship to Phase 4**:
- Phase 4 will add function calls and user-defined functions
- Phase 3 focuses only on expressions and assignments (no function calls yet)

## Phase 4: Functions and Function Calls

**Status**: ⏳ PENDING

**Duration**: 4-6 weeks

**Goal**: Add support for user-defined functions and standard library functions

### Scope

**Language Features**:
- FUNCTION declarations with return type
- VAR_INPUT, VAR_OUTPUT, VAR_IN_OUT parameters
- Function calls in expressions
- Standard library functions (ADD, SUB, MUL, DIV, ABS, SQRT, etc.)
- Function overloading (same name, different parameter types)
- Extensible functions (variable argument count)

**Example ST Code**:
```
FUNCTION ADD_THREE : INT
    VAR_INPUT
        a : INT;
        b : INT;
        c : INT;
    END_VAR
    ADD_THREE := a + b + c;
END_FUNCTION

PROGRAM Main
    VAR
        result : INT;
    END_VAR
    result := ADD_THREE(10, 20, 30);
END_PROGRAM
```

### Deliverables

**Frontend**:
- Grammar extensions for FUNCTION declarations
- AST nodes for function declarations and calls
- Parameter list parsing

**Semantic Analysis**:
- Function signature extraction
- Overload resolution
- Parameter type checking
- Return type validation

**IR and Backend**:
- IR nodes for function calls
- C++ function generation
- Standard library function mapping
- Parameter passing (by value, by reference)

**Standard Library**:
- Implement IEC 61131-3 standard functions
- Numeric functions (ABS, SQRT, LN, EXP, SIN, COS, etc.)
- Bit string functions (SHL, SHR, ROL, ROR, etc.)
- Selection functions (SEL, MAX, MIN, LIMIT, MUX)
- Comparison functions

**Testing**:
- Function declaration and call tests
- Overload resolution tests
- Standard library function tests
- Parameter passing tests (value, reference)

### Success Criteria

- ✅ Can declare and call user-defined functions
- ✅ Overload resolution works correctly
- ✅ Standard library functions are available
- ✅ Parameter passing is correct (value vs. reference)
- ✅ Generated C++ is efficient (inline where appropriate)
- ✅ All tests pass

### Validation Examples

**Test 1: User-Defined Function**
```
FUNCTION SQUARE : INT
    VAR_INPUT x : INT; END_VAR
    SQUARE := x * x;
END_FUNCTION

PROGRAM Main
    VAR result : INT; END_VAR
    result := SQUARE(5);
END_PROGRAM
```
Expected: result = 25

**Test 2: Function Overloading**
```
(* Standard library provides ADD for different types *)
PROGRAM Main
    VAR
        int_result : INT;
        real_result : REAL;
    END_VAR
    int_result := ADD(10, 20);        (* INT version *)
    real_result := ADD(1.5, 2.5);     (* REAL version *)
END_PROGRAM
```
Expected: int_result = 30, real_result = 4.0

**Test 3: VAR_IN_OUT Parameters**
```
FUNCTION SWAP
    VAR_IN_OUT a, b : INT; END_VAR
    VAR temp : INT; END_VAR
    temp := a;
    a := b;
    b := temp;
END_FUNCTION

PROGRAM Main
    VAR x, y : INT; END_VAR
    x := 10;
    y := 20;
    SWAP(a := x, b := y);
END_PROGRAM
```
Expected: x = 20, y = 10

## Phase 5: Function Blocks and Classes

**Status**: ⏳ PENDING

**Duration**: 6-8 weeks

**Goal**: Implement function blocks as C++ classes with state and methods

### Scope

**Language Features**:
- FUNCTION_BLOCK declarations
- FB instance declarations
- FB method calls (invocations)
- VAR_INPUT, VAR_OUTPUT, VAR_IN_OUT, VAR (local) variables
- FB state persistence between calls
- Standard function blocks (TON, TOF, TP, CTU, CTD, CTUD, R_TRIG, F_TRIG)

**Example ST Code**:
```
FUNCTION_BLOCK TON
    VAR_INPUT
        IN : BOOL;
        PT : TIME;
    END_VAR
    VAR_OUTPUT
        Q : BOOL;
        ET : TIME;
    END_VAR
    VAR
        start_time : TIME;
        running : BOOL;
    END_VAR
    
    IF IN AND NOT running THEN
        running := TRUE;
        start_time := CURRENT_TIME();
    END_IF
    
    IF running THEN
        ET := CURRENT_TIME() - start_time;
        Q := ET >= PT;
    END_IF
    
    IF NOT IN THEN
        running := FALSE;
        Q := FALSE;
        ET := T#0s;
    END_IF
END_FUNCTION_BLOCK

PROGRAM Main
    VAR
        timer : TON;
        trigger : BOOL;
        output : BOOL;
    END_VAR
    
    timer(IN := trigger, PT := T#5s);
    output := timer.Q;
END_PROGRAM
```

### Deliverables

**Frontend**:
- Grammar for FUNCTION_BLOCK declarations
- AST nodes for FB declarations and invocations
- FB instance declarations

**Semantic Analysis**:
- FB type checking
- FB instance resolution
- Input/output parameter validation
- State variable tracking

**IR and Backend**:
- IR nodes for FB invocations
- C++ class generation for FBs
- Constructor/destructor generation
- operator() method for FB execution
- Member variable initialization

**Variable Forcing**:
- Implement forcing support in IECVar wrapper
- Force/unforce methods
- Forced value storage
- Integration with OpenPLC forcing mechanism

**Standard Function Blocks**:
- Timers: TON, TOF, TP
- Counters: CTU, CTD, CTUD
- Edge detection: R_TRIG, F_TRIG
- Bistables: SR, RS

**Testing**:
- FB declaration and instantiation tests
- FB invocation tests
- State persistence tests
- Standard FB behavior tests
- Variable forcing tests

### Success Criteria

- ✅ Can declare and instantiate function blocks
- ✅ FB state persists between invocations
- ✅ Input/output parameters work correctly
- ✅ Standard FBs behave per IEC 61131-3 specification
- ✅ Variable forcing works correctly
- ✅ Generated C++ classes are efficient
- ✅ All tests pass

### Validation Examples

**Test 1: Timer Function Block**
```
PROGRAM TimerTest
    VAR
        timer : TON;
        elapsed : TIME;
    END_VAR
    
    timer(IN := TRUE, PT := T#2s);
    elapsed := timer.ET;
    
    (* After 2 seconds, timer.Q should be TRUE *)
END_PROGRAM
```

**Test 2: Counter Function Block**
```
PROGRAM CounterTest
    VAR
        counter : CTU;
        count : INT;
    END_VAR
    
    counter(CU := TRUE, PV := 10);
    count := counter.CV;
    
    (* After 10 rising edges, counter.Q should be TRUE *)
END_PROGRAM
```

**Test 3: Variable Forcing**
```
PROGRAM ForcingTest
    VAR
        fb : TON;
    END_VAR
    
    fb(IN := FALSE, PT := T#5s);
    
    (* Runtime can force fb.Q to TRUE regardless of logic *)
    (* Generated C++ must support: fb.Q.force(true) *)
END_PROGRAM
```

## Phase 6: Located Variables and OpenPLC Integration

**Status**: ⏳ PENDING

**Duration**: 3-4 weeks

**Goal**: Add support for located variables (I/O mapping) and integrate with OpenPLC runtime

### Scope

**Language Features**:
- Located variables (AT %IX0.0, %QX0.0, etc.)
- I/O mapping and addressing
- Direct representation access

**Note**: PROGRAM, CONFIGURATION, RESOURCE, TASK, VAR_GLOBAL, and VAR_EXTERNAL are already handled in Phase 2. This phase focuses on the remaining features needed for full OpenPLC integration.

**Example ST Code**:
```
VAR_GLOBAL
    emergency_stop : BOOL;
END_VAR

PROGRAM Main
    VAR_EXTERNAL
        emergency_stop : BOOL;
    END_VAR
    VAR
        counter : INT;
    END_VAR
    
    IF NOT emergency_stop THEN
        counter := counter + 1;
    END_IF
END_PROGRAM

CONFIGURATION Config
    RESOURCE Resource1 ON PLC
        TASK MainTask(INTERVAL := T#100ms, PRIORITY := 1);
        PROGRAM Prog1 WITH MainTask : Main;
    END_RESOURCE
END_CONFIGURATION
```

### Deliverables

**Frontend**:
- Grammar for CONFIGURATION, RESOURCE, TASK
- Grammar for global and external variables
- Grammar for located variables
- AST nodes for configuration elements

**Semantic Analysis**:
- Global variable resolution
- External variable validation
- Located variable address validation
- Task configuration validation
- Program instance resolution

**IR and Backend**:
- Configuration structure generation
- Resource and task management
- Global variable storage
- Located variable mapping
- OpenPLC runtime integration hooks

**OpenPLC Integration**:
- Generate code compatible with OpenPLC runtime
- Implement glue code for OpenPLC API
- Support OpenPLC's execution model
- Integration with OpenPLC Editor build system

**Testing**:
- Configuration parsing tests
- Global variable access tests
- Located variable tests
- Multi-program tests
- OpenPLC runtime integration tests

### Success Criteria

- ✅ Can parse full IEC 61131-3 configurations
- ✅ Global variables work correctly
- ✅ Located variables map to I/O correctly
- ✅ Generated code integrates with OpenPLC runtime
- ✅ Multiple programs can run in same configuration
- ✅ Task scheduling information is preserved
- ✅ All tests pass

### Validation Examples

**Test 1: Global Variables**
```
VAR_GLOBAL
    system_mode : INT := 0;
END_VAR

PROGRAM Prog1
    VAR_EXTERNAL system_mode : INT; END_VAR
    system_mode := 1;
END_PROGRAM

PROGRAM Prog2
    VAR_EXTERNAL system_mode : INT; END_VAR
    (* Should see system_mode = 1 *)
END_PROGRAM
```

**Test 2: Located Variables**
```
PROGRAM IOTest
    VAR
        input_button AT %IX0.0 : BOOL;
        output_led AT %QX0.0 : BOOL;
    END_VAR
    
    output_led := input_button;
END_PROGRAM
```

## Phase 7: IEC v3 Features and Full Coverage

**Status**: ⏳ PENDING

**Duration**: 6-8 weeks

**Goal**: Implement IEC 61131-3 Edition 3 features and complete language coverage

### Scope

**IEC v3 Features**:
- References (REF_TO, REF, DREF, ^, NULL)
- Nested comments (* (* nested *) *)
- Additional data types (LWORD, etc.)
- Enhanced type system features

**Additional Language Features**:
- User-defined structures (STRUCT...END_STRUCT)
- User-defined enumerations (TYPE...END_TYPE)
- Arrays (single and multi-dimensional)
- Subranges
- Strings (STRING, WSTRING)
- Time types (TIME, DATE, TIME_OF_DAY, DATE_AND_TIME)
- Control structures (IF, CASE, FOR, WHILE, REPEAT, EXIT)
- Instruction List (IL) support (optional)
- Sequential Function Chart (SFC) support (optional)

**Example ST Code with v3 Features**:
```
TYPE
    Status : (IDLE, RUNNING, STOPPED, ERROR);
    
    Config : STRUCT
        mode : Status;
        setpoint : REAL;
        limits : ARRAY[1..2] OF REAL;
    END_STRUCT;
END_TYPE

FUNCTION ProcessData
    VAR_INPUT
        data_ref : REF_TO ARRAY[1..100] OF INT;
    END_VAR
    VAR
        i : INT;
        sum : INT := 0;
    END_VAR
    
    IF data_ref <> NULL THEN
        FOR i := 1 TO 100 DO
            sum := sum + data_ref^[i];
        END_FOR;
    END_IF;
    
    ProcessData := sum;
END_FUNCTION
```

### Deliverables

**Frontend**:
- Grammar extensions for all remaining features
- AST nodes for complex types and structures
- Reference syntax support

**Semantic Analysis**:
- Structure type checking
- Array bounds checking
- Reference validation
- Enumeration value checking
- Subrange validation

**IR and Backend**:
- C++ struct generation for ST structs
- C++ enum generation for ST enums
- Array access code generation
- Reference/pointer handling
- String operations

**Standard Library Extensions**:
- String functions (LEN, LEFT, RIGHT, MID, CONCAT, INSERT, DELETE, REPLACE, FIND)
- Type conversion functions
- Time/date functions
- Bit string functions

**Testing**:
- Comprehensive test suite for all features
- Edge case tests
- Compliance tests against IEC 61131-3 v3 specification

### Success Criteria

- ✅ All IEC 61131-3 v3 features implemented
- ✅ Full language coverage (ST, IL if included, SFC if included)
- ✅ All standard library functions available
- ✅ Compliance with IEC 61131-3 v3 specification
- ✅ Comprehensive test coverage (>95%)
- ✅ All tests pass

### Validation Examples

**Test 1: References**
```
FUNCTION ModifyValue
    VAR_IN_OUT value_ref : REF_TO INT; END_VAR
    IF value_ref <> NULL THEN
        value_ref^ := value_ref^ + 1;
    END_IF
END_FUNCTION

PROGRAM Main
    VAR x : INT := 10; END_VAR
    ModifyValue(REF(x));
    (* x should now be 11 *)
END_PROGRAM
```

**Test 2: Structures and Arrays**
```
TYPE
    Point : STRUCT
        x : REAL;
        y : REAL;
    END_STRUCT;
END_TYPE

PROGRAM Main
    VAR
        points : ARRAY[1..10] OF Point;
        i : INT;
    END_VAR
    
    FOR i := 1 TO 10 DO
        points[i].x := REAL(i);
        points[i].y := REAL(i * 2);
    END_FOR;
END_PROGRAM
```

**Test 3: Control Structures**
```
PROGRAM ControlFlow
    VAR
        value : INT;
        result : STRING;
    END_VAR
    
    CASE value OF
        1..10:
            result := 'Low';
        11..50:
            result := 'Medium';
        51..100:
            result := 'High';
    ELSE
        result := 'Out of range';
    END_CASE;
END_PROGRAM
```

## Phase 8: Optimizations and Advanced Debug Support

**Status**: ⏳ PENDING

**Duration**: 4-6 weeks

**Goal**: Optimize generated code and enhance debugging capabilities

### Scope

**Optimizations**:
- Constant folding
- Dead code elimination
- Common subexpression elimination
- Loop optimizations
- Inline expansion of small functions
- Strength reduction

**Debug Support**:
- Enhanced line mapping with column information
- Source-level debugging integration
- Variable watch support
- Breakpoint mapping
- Call stack reconstruction
- Optional #line directives

**Code Quality**:
- Generated code formatting and readability
- Compiler warnings for suspicious code
- Static analysis integration
- Performance profiling support

**Documentation**:
- User manual
- API documentation
- Integration guide for OpenPLC
- Migration guide from MatIEC

### Deliverables

**Optimization Passes**:
- Constant folding pass
- Dead code elimination pass
- CSE pass
- Optimization level control (-O0, -O1, -O2)

**Debug Infrastructure**:
- Enhanced mapping file format
- GDB/LLDB integration scripts
- Debug symbol generation
- Source map generation

**Tooling**:
- Compiler driver with full CLI
- Build system integration
- IDE integration support

**Documentation**:
- Complete user documentation
- Developer documentation
- API reference
- Examples and tutorials

**Testing**:
- Optimization correctness tests
- Performance benchmarks
- Debug integration tests
- End-to-end system tests

### Success Criteria

- ✅ Optimizations improve performance without breaking correctness
- ✅ Debug support enables source-level debugging
- ✅ Generated code is readable and maintainable
- ✅ Complete documentation available
- ✅ Performance meets or exceeds MatIEC
- ✅ All tests pass

### Validation Examples

**Test 1: Constant Folding**
```
PROGRAM ConstantFolding
    VAR result : INT; END_VAR
    result := 2 + 3 * 4;  (* Should compile to: result := 14; *)
END_PROGRAM
```

**Test 2: Dead Code Elimination**
```
PROGRAM DeadCode
    VAR x, y : INT; END_VAR
    x := 10;
    y := 20;  (* Dead: y never used *)
    (* Optimizer should remove y assignment *)
END_PROGRAM
```

**Test 3: Debug Integration**
```
(* User sets breakpoint on line 5 in ST source *)
(* Debugger should break at corresponding C++ line *)
(* User can inspect ST variables by name *)
```

## Testing Strategy

### Unit Testing

Each compiler component has comprehensive unit tests:

- **Frontend**: Parser tests for each grammar rule
- **Semantic Analysis**: Type checking tests, symbol resolution tests
- **IR Generation**: AST-to-IR transformation tests
- **Code Generation**: IR-to-C++ generation tests

**Tools**: pytest, unittest

**Coverage Target**: >90% for all modules

### Integration Testing

Golden file tests compare generated C++ against expected output:

```
tests/golden/
├── expressions/
│   ├── arithmetic.st
│   ├── arithmetic.expected.cpp
│   ├── boolean.st
│   └── boolean.expected.cpp
├── functions/
│   ├── simple_function.st
│   └── simple_function.expected.cpp
└── ...
```

**Process**:
1. Compile .st file with STruC++
2. Compare generated .cpp with .expected.cpp
3. Compile generated .cpp with g++
4. Execute and verify output

### Runtime Testing

Execute generated C++ and verify behavior:

```python
def test_runtime_arithmetic():
    st_code = """
    PROGRAM Test
        VAR result : INT; END_VAR
        result := 10 + 20;
    END_PROGRAM
    """
    
    # Compile ST to C++
    cpp_code = compile_st(st_code)
    
    # Compile C++ to executable
    exe = compile_cpp(cpp_code)
    
    # Execute and check result
    output = execute(exe)
    assert output['result'] == 30
```

### Performance Testing

Benchmark generated code against MatIEC:

- Compilation speed
- Generated code size
- Runtime performance
- Memory usage

### Compliance Testing

Validate against IEC 61131-3 specification:

- Standard library function behavior
- Type system rules
- Semantic constraints
- Edge cases and corner cases

## Integration with OpenPLC

### OpenPLC Editor Integration

STruC++ must integrate with OpenPLC Editor's build system:

1. **Compiler Invocation**: OpenPLC Editor calls STruC++ instead of MatIEC
2. **File Locations**: Generated files placed in expected locations
3. **Error Reporting**: Errors formatted for IDE display
4. **Build Configuration**: Support OpenPLC's build options

### OpenPLC Runtime Integration

Generated C++ must work with OpenPLC Runtime:

1. **API Compatibility**: Use OpenPLC runtime API
2. **Execution Model**: Support OpenPLC's scan cycle model
3. **I/O Mapping**: Integrate with OpenPLC's I/O system
4. **Variable Forcing**: Support OpenPLC's forcing mechanism

### Migration Path

Provide smooth migration from MatIEC:

1. **Compatibility Mode**: Support MatIEC-style output (optional)
2. **Migration Tool**: Convert MatIEC-specific code
3. **Testing**: Validate existing OpenPLC programs compile correctly
4. **Documentation**: Clear migration guide

## Timeline Summary

| Phase | Duration | Cumulative | Status |
|-------|----------|------------|--------|
| Phase 0: Design | 2-3 weeks | 3 weeks | ✅ COMPLETED |
| Phase 1: IEC Types & Runtime | 4-6 weeks | 9 weeks | ⏳ PENDING |
| Phase 2: Project Structure | 3-4 weeks | 13 weeks | ⏳ PENDING |
| Phase 3: Core ST Translation | 4-6 weeks | 19 weeks | ⏳ PENDING |
| Phase 4: Functions | 4-6 weeks | 25 weeks | ⏳ PENDING |
| Phase 5: Function Blocks | 6-8 weeks | 33 weeks | ⏳ PENDING |
| Phase 6: Located Variables & OpenPLC | 3-4 weeks | 37 weeks | ⏳ PENDING |
| Phase 7: IEC v3 & Full Coverage | 6-8 weeks | 45 weeks | ⏳ PENDING |
| Phase 8: Optimizations | 4-6 weeks | 51 weeks | ⏳ PENDING |

**Total Estimated Duration**: 10-12 months

**Note**: Phases may overlap, and timeline may be adjusted based on progress and priorities.

## Risk Management

### Technical Risks

1. **Grammar Complexity**: IEC 61131-3 grammar is complex
   - **Mitigation**: Start with subset, iterate
   
2. **Performance**: Generated code must be real-time capable
   - **Mitigation**: Benchmark early and often
   
3. **OpenPLC Integration**: Must work seamlessly with existing toolchain
   - **Mitigation**: Early integration testing

### Schedule Risks

1. **Scope Creep**: Feature requests may expand scope
   - **Mitigation**: Strict phase boundaries, defer non-essential features
   
2. **Dependencies**: Blocked by external factors
   - **Mitigation**: Identify dependencies early, have contingency plans

## Conclusion

This phased approach ensures STruC++ is developed systematically with continuous validation. Each phase delivers working functionality that can be tested and demonstrated, reducing risk and enabling early feedback.

The implementation plan balances ambition with pragmatism, starting with a solid foundation and building up to full IEC 61131-3 v3 compliance. By the end of Phase 6, STruC++ will be a production-ready compiler that significantly improves upon MatIEC while maintaining compatibility with the OpenPLC ecosystem.
