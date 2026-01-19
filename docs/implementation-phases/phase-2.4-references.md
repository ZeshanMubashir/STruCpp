# Phase 2.4: References and Pointers

**Status**: PARTIAL (Parser & Runtime Complete, Code Generation Pending Phase 3)

**Duration**: 2-3 weeks

**Goal**: Implement IEC 61131-3 reference types (REF_TO, REF, DREF, ^, NULL) with CODESYS compatibility

## Overview

References in IEC 61131-3 provide pointer-like semantics for indirect access to variables. This phase implements the parsing, semantic analysis, and code generation for reference types, following CODESYS implementation patterns for maximum compatibility.

## Design Decisions

### Key Architectural Choices

1. **References are NOT forceable** - Unlike regular `IECVar<T>` variables, references themselves cannot be forced. This simplifies the design and matches expected behavior.

2. **Writes through references respect target forcing** - When writing through a dereferenced reference, if the target variable is forced, the write is silently ignored (consistent with `IECVar<T>` behavior).

3. **Null dereference throws exception** - Dereferencing a NULL reference throws a `NullReferenceException`. The runtime catches this exception, stops the POU execution, and logs an error.

4. **Build on existing `IEC_REF_TO<T>`** - The current implementation in `iec_pointer.hpp` provides a solid foundation. We'll refactor it to remove forcing support and add null-check exceptions.

## Scope

### Standard IEC 61131-3 Reference Features

- `REF_TO <type>` - Reference type declaration (pointer semantics)
- `REF(<variable>)` - Get reference to a variable
- `DREF(<ref>)` / `<ref>^` - Dereference a reference
- `NULL` - Null reference value

### CODESYS Compatibility Features

#### 1. REFERENCE_TO Data Type

CODESYS supports `REFERENCE_TO` as an alias type with **implicit dereferencing**:

```st
VAR
    my_int : INT;
    my_ref : REFERENCE_TO INT;  // Implicit dereference on access
END_VAR

my_ref REF= my_int;   // Bind reference (special assignment)
my_ref := 42;         // Implicit dereference - assigns to my_int
x := my_ref;          // Implicit dereference - reads from my_int
```

Key differences from `REF_TO`:
- No need for `^` or `DREF()` to access value
- Uses `REF=` operator for binding (assignment changes the target, not the reference)
- Cannot be NULL (must always be bound)

#### 2. Reference to References

Support nested references for advanced use cases:

```st
VAR
    value : INT := 100;
    ref1 : REF_TO INT;
    ref2 : REF_TO REF_TO INT;  // Reference to a reference
END_VAR

ref1 := REF(value);
ref2 := REF(ref1);
ref2^^  := 42;  // Double dereference to access value
```

#### 3. Reference to Array Elements

Support references to specific array elements:

```st
VAR
    arr : ARRAY[1..10] OF INT;
    elem_ref : REF_TO INT;
END_VAR

elem_ref := REF(arr[5]);  // Reference to 5th element
elem_ref^ := 100;         // Modify arr[5]
```

#### 4. Reference to Structure Fields

Support references to structure members:

```st
TYPE
    MyStruct : STRUCT
        x : INT;
        y : REAL;
    END_STRUCT;
END_TYPE

VAR
    s : MyStruct;
    field_ref : REF_TO INT;
END_VAR

field_ref := REF(s.x);  // Reference to struct field
field_ref^ := 42;       // Modify s.x
```

## C++ Runtime Implementation

### Null Reference Exception

```cpp
namespace strucpp {

/**
 * Exception thrown when dereferencing a NULL reference.
 * The runtime catches this and stops execution of the affected POU.
 */
class NullReferenceException : public std::runtime_error {
public:
    NullReferenceException()
        : std::runtime_error("Null reference dereference") {}

    explicit NullReferenceException(const char* context)
        : std::runtime_error(std::string("Null reference dereference in ") + context) {}
};

}  // namespace strucpp
```

### Refactored IEC_REF_TO Template

```cpp
/**
 * REF_TO pointer type for IEC 61131-3.
 * Wraps a pointer to an IECVar<T> with null checking.
 *
 * Note: References themselves are NOT forceable.
 * Writes through references respect the target's forcing state.
 *
 * @tparam T The underlying value type (e.g., INT_t, REAL_t)
 */
template<typename T>
class IEC_REF_TO {
public:
    using value_type = T;
    using pointer_type = IECVar<T>*;

private:
    pointer_type ptr_;

public:
    IEC_REF_TO() noexcept : ptr_(nullptr) {}
    explicit IEC_REF_TO(pointer_type p) noexcept : ptr_(p) {}
    IEC_REF_TO(std::nullptr_t) noexcept : ptr_(nullptr) {}

    // Copy/move - default is fine
    IEC_REF_TO(const IEC_REF_TO&) = default;
    IEC_REF_TO(IEC_REF_TO&&) = default;
    IEC_REF_TO& operator=(const IEC_REF_TO&) = default;
    IEC_REF_TO& operator=(IEC_REF_TO&&) = default;

    pointer_type get() const noexcept { return ptr_; }
    void set(pointer_type p) noexcept { ptr_ = p; }
    bool is_null() const noexcept { return ptr_ == nullptr; }

    /**
     * Dereference - throws NullReferenceException if NULL
     */
    IECVar<T>& deref() {
        if (ptr_ == nullptr) {
            throw NullReferenceException();
        }
        return *ptr_;
    }

    const IECVar<T>& deref() const {
        if (ptr_ == nullptr) {
            throw NullReferenceException();
        }
        return *ptr_;
    }

    // Operators
    IEC_REF_TO& operator=(pointer_type p) noexcept { set(p); return *this; }
    IEC_REF_TO& operator=(std::nullptr_t) noexcept { set(nullptr); return *this; }
    IECVar<T>& operator*() { return deref(); }
    const IECVar<T>& operator*() const { return deref(); }
    pointer_type operator->() { return &deref(); }  // Also throws if null

    bool operator==(std::nullptr_t) const noexcept { return is_null(); }
    bool operator!=(std::nullptr_t) const noexcept { return !is_null(); }
    bool operator==(const IEC_REF_TO& other) const noexcept { return ptr_ == other.ptr_; }
    bool operator!=(const IEC_REF_TO& other) const noexcept { return ptr_ != other.ptr_; }
    explicit operator bool() const noexcept { return !is_null(); }
};
```

### REFERENCE_TO Implementation

```cpp
/**
 * REFERENCE_TO type with implicit dereferencing (CODESYS compatibility).
 * Unlike REF_TO, this type automatically dereferences on value access.
 *
 * Cannot be NULL - must always be bound to a valid variable.
 * Uses REF= operator (implemented as bind() method) for assignment.
 */
template<typename T>
class IEC_REFERENCE_TO {
public:
    using value_type = T;
    using pointer_type = IECVar<T>*;

private:
    pointer_type ptr_;

public:
    // Must be initialized with a valid reference
    explicit IEC_REFERENCE_TO(IECVar<T>& var) noexcept : ptr_(&var) {}

    // No default constructor - must be bound
    IEC_REFERENCE_TO() = delete;

    // Bind to a new variable (REF= operator)
    void bind(IECVar<T>& var) noexcept { ptr_ = &var; }

    // Implicit value access (get)
    T get() const { return ptr_->get(); }

    // Implicit value assignment (set) - respects target's forcing
    void set(const T& value) { ptr_->set(value); }

    // Assignment operator writes through to target
    IEC_REFERENCE_TO& operator=(const T& value) {
        set(value);
        return *this;
    }

    // Implicit conversion to value type for reading
    operator T() const { return get(); }

    // Get underlying IECVar reference
    IECVar<T>& target() noexcept { return *ptr_; }
    const IECVar<T>& target() const noexcept { return *ptr_; }
};

template<typename T>
using REFERENCE_TO = IEC_REFERENCE_TO<T>;
```

### REF() Function Overloads

```cpp
// Standard REF() for IECVar
template<typename T>
inline IEC_REF_TO<T> REF(IECVar<T>& var) noexcept {
    return IEC_REF_TO<T>(&var);
}

// REF() for references (reference to reference)
template<typename T>
inline IEC_REF_TO<IEC_REF_TO<T>> REF(IEC_REF_TO<T>& ref) noexcept {
    return IEC_REF_TO<IEC_REF_TO<T>>(&ref);
}

// Note: REF() for array elements and struct fields works automatically
// because they return IECVar<T>& from operator[] and member access
```

## Code Generation

### REF_TO Declaration

```st
VAR
    my_ref : REF_TO INT;
END_VAR
```

Generated C++:
```cpp
REF_TO<INT_t> my_ref;
```

### REFERENCE_TO Declaration

```st
VAR
    target : INT := 10;
    my_ref : REFERENCE_TO INT := target;  // Must be initialized
END_VAR
```

Generated C++:
```cpp
IEC_INT target{10};
REFERENCE_TO<INT_t> my_ref{target};
```

### REF() Operator

```st
my_ref := REF(my_var);
```

Generated C++:
```cpp
my_ref = REF(my_var);
```

### Dereference (^ and DREF)

```st
value := my_ref^;           // Read through reference
my_ref^ := 42;              // Write through reference
value := DREF(my_ref);      // Alternative read syntax
```

Generated C++:
```cpp
value = my_ref.deref().get();    // Read
my_ref.deref().set(42);          // Write (respects forcing on target)
value = my_ref.deref().get();    // DREF same as ^
```

### REFERENCE_TO Implicit Access

```st
VAR
    target : INT := 10;
    ref : REFERENCE_TO INT := target;
END_VAR

ref := 42;      // Implicit write
x := ref;       // Implicit read
ref REF= other; // Rebind to different variable
```

Generated C++:
```cpp
IEC_INT target{10};
REFERENCE_TO<INT_t> ref{target};

ref.set(42);        // Implicit write
x = ref.get();      // Implicit read
ref.bind(other);    // REF= operator
```

### Null Check

```st
IF my_ref <> NULL THEN
    my_ref^ := 42;
END_IF;
```

Generated C++:
```cpp
if (my_ref != IEC_NULL) {
    my_ref.deref().set(42);
}
```

### Reference to Array Element

```st
VAR
    arr : ARRAY[1..10] OF INT;
    elem_ref : REF_TO INT;
END_VAR

elem_ref := REF(arr[5]);
```

Generated C++:
```cpp
Array1D<INT_t, 1, 10> arr;
REF_TO<INT_t> elem_ref;

elem_ref = REF(arr[5]);  // arr[5] returns IECVar<INT_t>&
```

### Reference to Structure Field

```st
VAR
    s : MyStruct;
    field_ref : REF_TO INT;
END_VAR

field_ref := REF(s.x);
```

Generated C++:
```cpp
MyStruct s;
REF_TO<INT_t> field_ref;

field_ref = REF(s.x);  // s.x is IECVar<INT_t>
```

## Parser Changes

### New Tokens

- `REF_TO` - Reference type keyword
- `REFERENCE_TO` - CODESYS implicit-dereference reference type
- `REF` - Get reference operator
- `DREF` - Dereference function
- `NULL` - Null pointer constant
- `REF=` - Reference binding operator (for REFERENCE_TO)

### Grammar Extensions

```
type_specification
    : elementary_type
    | derived_type
    | ref_type
    | reference_type
    ;

ref_type
    : REF_TO type_specification
    ;

reference_type
    : REFERENCE_TO type_specification
    ;

primary_expression
    : ...
    | NULL
    | REF LPAREN variable RPAREN
    | DREF LPAREN expression RPAREN
    ;

unary_expression
    : ...
    | expression CARET   // ^ dereference operator
    ;

assignment_statement
    : variable ASSIGN expression
    | variable REF_ASSIGN variable  // REF= for REFERENCE_TO binding
    ;
```

## Semantic Analysis

### Type Checking Rules

1. `REF()` argument must be a variable (lvalue), not an expression
2. `REF()` argument type must match `REF_TO` target type
3. Dereference (`^`, `DREF`) operand must be `REF_TO` type
4. `REF_TO` variables can be compared with `NULL` and each other
5. `REF_TO` variables cannot be used in arithmetic operations
6. `REFERENCE_TO` variables must be initialized at declaration
7. `REFERENCE_TO` cannot be compared with `NULL` (always valid)

### Error Messages

- "REF() argument must be a variable, not an expression"
- "Type mismatch: cannot assign REF_TO INT to REF_TO REAL"
- "Cannot dereference non-reference type"
- "REFERENCE_TO variable must be initialized"
- "Cannot use REF= on REF_TO type (use := instead)"

## Deliverables

### Runtime Library
- [x] Add `NullReferenceException` class
- [x] Refactor `IEC_REF_TO<T>` to remove forcing support
- [x] Add null-check exception to `deref()` method
- [x] Implement `IEC_REFERENCE_TO<T>` for CODESYS compatibility
- [x] Add REF() overload for reference-to-reference
- [ ] Update tests for new behavior (pending Phase 3 integration)

### Parser
- [x] Add `REF_TO` type parsing
- [x] Add `REFERENCE_TO` type parsing
- [x] Add `REF()` operator parsing
- [x] Add `DREF()` function parsing
- [x] Add `^` (caret) dereference operator
- [x] Add `NULL` literal
- [x] Add `REF=` binding operator

### AST
- [x] Add `ReferenceKind` type (`none`, `ref_to`, `reference_to`)
- [x] Add `referenceKind` to `TypeReference` node
- [x] Add `RefExpression` node for `REF(variable)`
- [x] Add `DrefExpression` node for `DREF(expression)`
- [x] Add `RefAssignStatement` node for `REF=` binding

### Code Generator (Pending Phase 3)
- [ ] Generate `REF_TO<T>` type declarations
- [ ] Generate `REFERENCE_TO<T>` type declarations
- [ ] Generate `REF()` calls
- [ ] Generate `deref()` calls for `^` and `DREF`
- [ ] Generate null comparisons
- [ ] Generate `REF=` as `bind()` calls

### Testing
- [x] Unit tests for reference type parsing (16 tests passing)
- [ ] Unit tests for `IEC_REF_TO<T>` (without forcing) - pending Phase 3
- [ ] Unit tests for null dereference exception - pending Phase 3
- [ ] Unit tests for `IEC_REFERENCE_TO<T>` - pending Phase 3
- [ ] Unit tests for reference to array elements - pending Phase 3
- [ ] Unit tests for reference to struct fields - pending Phase 3
- [ ] Unit tests for reference to references - pending Phase 3
- [ ] Integration tests (ST to C++ compilation) - pending Phase 3
- [ ] Golden file tests for generated code - pending Phase 3

### Implementation Notes

**Completed in Initial Implementation:**
- Lexer tokens: `REFERENCE_TO`, `DREF`, `RefAssign` (REF=)
- Parser rules: `dataType` extended, `refExpression`, `drefExpression`, `refAssignStatement`
- AST builder methods for all new node types
- GATE function `isRefAssignAhead()` for disambiguation between `refAssignStatement` and `assignmentStatement`

**Skipped/Deferred:**
- Nested `REF_TO REF_TO` types require grammar extension (test skipped)
- Statement-level tests require Phase 3 statement translation

## Success Criteria

- All reference types parse correctly
- Type checking enforces reference semantics
- Generated C++ compiles without errors
- Null dereference throws catchable exception
- Writes through references respect target forcing
- References themselves are not forceable
- CODESYS-style REFERENCE_TO works with implicit dereferencing
- Reference to array elements and struct fields works
- Reference to references (nested) works
- Unit test coverage >90%

## Notes

### Comparison: REF_TO vs REFERENCE_TO

| Feature | REF_TO | REFERENCE_TO |
|---------|--------|--------------|
| Can be NULL | Yes | No |
| Dereferencing | Explicit (^, DREF) | Implicit |
| Assignment | Changes pointer | Changes target value |
| Rebinding | := operator | REF= operator |
| Use case | Nullable pointers | Always-valid aliases |

### Runtime Error Handling

When a `NullReferenceException` is thrown:
1. The runtime catches the exception in the POU execution loop
2. POU execution stops (current scan cycle is aborted for that POU)
3. An error is logged with the POU name and variable context
4. Other POUs continue executing normally
5. The error can be read via runtime diagnostics

### Relationship to Other Phases

- **Phase 1**: Relies on `IECVar<T>` template for forcing semantics
- **Phase 2.2**: User-defined types can be targets of references
- **Phase 3**: Reference expressions in ST statements
- **Phase 5**: Function blocks can have reference parameters
