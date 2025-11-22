# STruC++ Architecture

This document describes the detailed architecture of the STruC++ compiler, including the compilation pipeline, data structures, and design decisions.

## Table of Contents

1. [Overview](#overview)
2. [Compilation Pipeline](#compilation-pipeline)
3. [Data Structures](#data-structures)
4. [Frontend: Lexical Analysis and Parsing](#frontend-lexical-analysis-and-parsing)
5. [Symbol Table Building](#symbol-table-building)
6. [Semantic Analysis](#semantic-analysis)
7. [Intermediate Representation](#intermediate-representation)
8. [Backend: C++ Code Generation](#backend-c-code-generation)
9. [Line Mapping and Debug Support](#line-mapping-and-debug-support)
10. [C++ Runtime Library](#c-runtime-library)
11. [Design Patterns and Principles](#design-patterns-and-principles)

## Overview

STruC++ follows a multi-pass compilation architecture that clearly separates concerns and maintains explicit data structures at each stage. The compiler transforms IEC 61131-3 Structured Text source code through several intermediate representations before generating C++ code.

### Design Philosophy

1. **Explicit over Implicit** - All data structures and transformations are explicit, avoiding hidden state
2. **Separation of Concerns** - Each compilation pass has a single, well-defined responsibility
3. **Testability** - Each pass can be tested independently with clear inputs and outputs
4. **Maintainability** - Code is organized into logical modules with clear interfaces
5. **Extensibility** - New features and optimizations can be added without major refactoring

### High-Level Architecture

```
┌─────────────────┐
│   ST Source     │
│   (.st file)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend       │
│  (Lexer+Parser) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Raw AST       │
│  (Syntax Tree)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Symbol Table    │
│    Builder      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Semantic       │
│   Analysis      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Typed AST      │
│ (with metadata) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  IR Generator   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Statement IR   │
│ (C++-oriented)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  C++ Generator  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  C++ Source     │
│  (.cpp/.h)      │
└─────────────────┘
```

## Compilation Pipeline

### Pass 1: Frontend (Lexical Analysis and Parsing)

**Input**: ST source code (text)  
**Output**: Raw Abstract Syntax Tree (AST)  
**Responsibility**: Convert source text into a structured tree representation

The frontend uses the Lark parser library in LALR mode to:
- Tokenize the input (lexical analysis)
- Parse tokens according to IEC 61131-3 grammar (syntax analysis)
- Build an AST that mirrors the grammar structure
- Attach source location metadata (file, line, column) to each node

**Key Features**:
- Pure syntax analysis - no type information or semantic checks
- Preserves all source location information for error reporting and line mapping
- Handles all IEC 61131-3 v3 syntax including nested comments and references

### Pass 2: Symbol Table Building

**Input**: Raw AST  
**Output**: Global symbol tables + annotated AST  
**Responsibility**: Index all globally-visible declarations

This pass walks the AST once to build symbol tables for:
- **Function declarations** - All globally declared functions
- **Function block type declarations** - All FB types
- **Program type declarations** - All program types
- **User-defined types** - Structures, enumerations, arrays, subranges
- **Enumerated values** - All enum identifiers
- **Global constants** - Named constants

**Symbol Table Structure**:
```python
class SymbolTables:
    functions: Dict[str, FunctionDecl]
    function_blocks: Dict[str, FunctionBlockDecl]
    programs: Dict[str, ProgramDecl]
    types: Dict[str, TypeDecl]
    enum_values: Dict[str, EnumValueDecl]
    constants: Dict[str, ConstantDecl]
```

This resolves the identifier ambiguity problem that MatIEC describes in their documentation - by the time we enter semantic analysis, we know whether an identifier refers to a type, variable, function, etc.

### Pass 3: Semantic Analysis

**Input**: Raw AST + Symbol Tables  
**Output**: Typed AST with semantic annotations  
**Responsibility**: Type checking, overload resolution, semantic validation

Semantic analysis consists of multiple sub-passes:

#### 3.1: Type Inference

Walk the AST to determine the possible types of each expression:
- Literal types (42 → INT, TRUE → BOOL, etc.)
- Variable types (from declarations)
- Expression types (from operators and operands)
- Function call return types
- Array element types
- Structure field types

**Output**: Each AST node gains a `candidate_types` attribute listing possible types.

#### 3.2: Type Narrowing

Resolve ambiguous types using context:
- Assignment target types constrain source types
- Function parameter types constrain argument types
- Operator overloading resolution
- Implicit type conversions per IEC 61131-3 rules

**Output**: Each AST node gains a `resolved_type` attribute with the final type.

#### 3.3: Overload Resolution

For overloaded functions and operators:
- Match argument types to parameter types
- Select the most specific overload
- Handle extensible functions (variable argument count)

**Output**: Function call nodes gain `resolved_function` attribute.

#### 3.4: Semantic Validation

Check semantic rules:
- Variable declarations are unique within scope
- Variables are declared before use
- Assignment compatibility
- Array bounds are valid
- CASE statement coverage
- Flow control validity (IL only)
- Reference validity (REF_TO, DREF)
- Access rights (READ_ONLY, etc.)

**Output**: Error messages for violations, or validated AST.

### Pass 4: IR Generation

**Input**: Typed AST  
**Output**: Statement-level Intermediate Representation (IR)  
**Responsibility**: Lower high-level constructs to C++-oriented statements

The IR is a linear sequence of statement nodes that:
- Map 1:1 to ST source statements (where possible)
- Are tagged with source location spans
- Represent operations in a C++-friendly form
- Maintain enough structure for code generation

**IR Node Types**:
```python
class IRNode:
    source_span: SourceSpan  # (file, start_line, end_line, start_col, end_col)
    
class IRAssignment(IRNode):
    target: IRExpression
    value: IRExpression
    
class IRFunctionCall(IRNode):
    function: FunctionDecl
    arguments: List[IRExpression]
    result_var: Optional[IRVariable]
    
class IRFBCall(IRNode):
    fb_instance: IRVariable
    fb_type: FunctionBlockDecl
    inputs: Dict[str, IRExpression]
    outputs: Dict[str, IRVariable]
    
class IRIfStatement(IRNode):
    condition: IRExpression
    then_block: List[IRNode]
    elsif_blocks: List[Tuple[IRExpression, List[IRNode]]]
    else_block: Optional[List[IRNode]]
    
class IRForLoop(IRNode):
    control_var: IRVariable
    start: IRExpression
    end: IRExpression
    step: Optional[IRExpression]
    body: List[IRNode]
    
# ... more IR node types
```

**Lowering Rules**:
- Simple statements (assignments, calls) → single IR nodes
- Compound statements (IF, FOR, WHILE) → structured IR nodes with nested blocks
- Complex expressions → temporary variables if needed for C++ compatibility
- FB invocations → explicit input/output parameter passing

### Pass 5: C++ Code Generation

**Input**: Statement IR  
**Output**: C++ source code (.cpp and .h files)  
**Responsibility**: Emit readable, efficient C++ code

The code generator walks the IR and emits C++ code:

#### 5.1: Header Generation

For each POU (Program, Function Block, Function):
- Generate class/function declarations
- Include necessary headers
- Forward declarations for dependencies

#### 5.2: Implementation Generation

For each IR node:
- Emit corresponding C++ statement(s)
- Maintain line mapping metadata
- Use C++ runtime library types and functions
- Generate comments with ST source for readability

#### 5.3: Line Mapping

Maintain a mapping file that records:
```
ST_line_number → [first_CPP_line, last_CPP_line]
```

This enables debuggers to map between ST source and C++ code.

## Data Structures

### Abstract Syntax Tree (AST)

The AST is a tree of Python objects representing the syntactic structure of the ST program. Each node type corresponds to a grammar production.

**Base AST Node**:
```python
@dataclass
class ASTNode:
    source_span: SourceSpan
    parent: Optional['ASTNode'] = None
    
@dataclass
class SourceSpan:
    file: str
    start_line: int
    end_line: int
    start_col: int
    end_col: int
```

**Example AST Nodes**:
```python
@dataclass
class Program(ASTNode):
    name: str
    var_declarations: List[VarDeclaration]
    body: StatementList
    
@dataclass
class FunctionBlock(ASTNode):
    name: str
    input_vars: List[VarDeclaration]
    output_vars: List[VarDeclaration]
    local_vars: List[VarDeclaration]
    body: StatementList
    
@dataclass
class Assignment(ASTNode):
    target: Expression
    value: Expression
    
@dataclass
class BinaryOp(ASTNode):
    operator: str  # '+', '-', '*', '/', 'AND', 'OR', etc.
    left: Expression
    right: Expression
    
@dataclass
class FunctionCall(ASTNode):
    function_name: str
    arguments: List[Expression]
```

After semantic analysis, nodes gain additional attributes:
```python
# Added by type inference
node.candidate_types: List[IECType]

# Added by type narrowing
node.resolved_type: IECType

# Added by overload resolution (for function calls)
node.resolved_function: FunctionDecl
```

### Type System

STruC++ maintains a rich type system that models IEC 61131-3 types:

```python
class IECType:
    """Base class for all IEC types"""
    pass

class ElementaryType(IECType):
    """BOOL, INT, REAL, TIME, STRING, etc."""
    name: str
    size_bits: int
    
class DerivedType(IECType):
    """User-defined types"""
    name: str
    base_type: IECType
    
class StructType(IECType):
    name: str
    fields: Dict[str, IECType]
    
class ArrayType(IECType):
    element_type: IECType
    dimensions: List[Tuple[int, int]]  # [(start, end), ...]
    
class EnumType(IECType):
    name: str
    values: List[str]
    
class FunctionBlockType(IECType):
    name: str
    input_vars: Dict[str, IECType]
    output_vars: Dict[str, IECType]
    inout_vars: Dict[str, IECType]
    local_vars: Dict[str, IECType]
    
class ReferenceType(IECType):
    """REF_TO <type>"""
    referenced_type: IECType
```

### Symbol Tables

Symbol tables map identifiers to their declarations:

```python
class SymbolTable:
    """Generic symbol table with scoping support"""
    parent: Optional['SymbolTable']
    symbols: Dict[str, Declaration]
    
    def lookup(self, name: str) -> Optional[Declaration]:
        """Look up symbol in this scope and parent scopes"""
        if name in self.symbols:
            return self.symbols[name]
        if self.parent:
            return self.parent.lookup(name)
        return None
    
    def define(self, name: str, decl: Declaration):
        """Define a symbol in this scope"""
        if name in self.symbols:
            raise SemanticError(f"Duplicate declaration: {name}")
        self.symbols[name] = decl
```

## Frontend: Lexical Analysis and Parsing

### Parser Selection: Lark

STruC++ uses **Lark** in LALR mode for parsing. See [PARSER_SELECTION.md](PARSER_SELECTION.md) for detailed rationale.

**Key Benefits**:
- Pure Python implementation (no external toolchain)
- Declarative grammar in EBNF-like syntax
- Good error reporting and recovery
- Sufficient performance for PLC program sizes
- Support for both LALR and Earley parsing

### Grammar Organization

The grammar is organized into modules matching the IEC 61131-3 standard structure:

```
grammars/
├── iec61131.lark           # Main grammar file
├── common.lark             # Common elements (identifiers, literals)
├── types.lark              # Type declarations
├── expressions.lark        # Expressions and operators
├── statements.lark         # ST statements
├── pou.lark               # POUs (functions, FBs, programs)
├── configuration.lark      # Configurations and resources
└── il.lark                # Instruction List (if supported)
```

### Lexical Tokens

Key token types:
- **Keywords**: FUNCTION, FUNCTION_BLOCK, PROGRAM, VAR, END_VAR, IF, THEN, ELSE, etc.
- **Operators**: :=, +, -, *, /, AND, OR, NOT, =, <>, <, >, <=, >=, etc.
- **Identifiers**: Variable names, type names, function names
- **Literals**: Integer, real, boolean, string, time, date literals
- **Delimiters**: (, ), [, ], ;, :, ,, ., etc.
- **Comments**: (* ... *) and // ... (with nesting support for v3)

### Context-Sensitive Parsing

IEC 61131-3 has context-sensitive elements (identifier ambiguity). STruC++ handles this by:

1. **Parse everything as identifiers first** - Don't try to distinguish types/vars/functions during parsing
2. **Resolve in symbol table pass** - Use symbol tables to determine identifier classes
3. **Semantic predicates** - Use Lark's predicate support for truly ambiguous cases

This is simpler than MatIEC's approach of maintaining symbol tables during parsing.

## Symbol Table Building

The symbol table builder is a single-pass visitor over the raw AST:

```python
class SymbolTableBuilder:
    def __init__(self):
        self.global_symbols = SymbolTables()
        
    def build(self, ast: ASTNode) -> SymbolTables:
        """Build symbol tables from AST"""
        self.visit(ast)
        return self.global_symbols
        
    def visit_function_declaration(self, node: FunctionDeclaration):
        """Register function in symbol table"""
        if node.name in self.global_symbols.functions:
            raise SemanticError(f"Duplicate function: {node.name}")
        self.global_symbols.functions[node.name] = node
        
    def visit_function_block_declaration(self, node: FunctionBlockDeclaration):
        """Register function block type in symbol table"""
        if node.name in self.global_symbols.function_blocks:
            raise SemanticError(f"Duplicate function block: {node.name}")
        self.global_symbols.function_blocks[node.name] = node
        
    # ... similar for programs, types, etc.
```

## Semantic Analysis

Semantic analysis is decomposed into focused passes:

### Type Inference Pass

```python
class TypeInferencePass:
    def __init__(self, symbol_tables: SymbolTables):
        self.symbols = symbol_tables
        
    def infer(self, ast: ASTNode):
        """Infer candidate types for all expressions"""
        self.visit(ast)
        
    def visit_literal(self, node: Literal):
        """Literals have obvious types"""
        if isinstance(node, IntLiteral):
            node.candidate_types = [INT, DINT, LINT]  # Could be any integer type
        elif isinstance(node, BoolLiteral):
            node.candidate_types = [BOOL]
        # ... etc
        
    def visit_binary_op(self, node: BinaryOp):
        """Binary operations constrain operand types"""
        self.visit(node.left)
        self.visit(node.right)
        
        # Find compatible types for this operator
        node.candidate_types = self.get_operator_result_types(
            node.operator,
            node.left.candidate_types,
            node.right.candidate_types
        )
```

### Type Narrowing Pass

```python
class TypeNarrowingPass:
    def narrow(self, ast: ASTNode):
        """Narrow candidate types to single resolved type"""
        self.visit(ast)
        
    def visit_assignment(self, node: Assignment):
        """Target type constrains value type"""
        self.visit(node.target)
        self.visit(node.value)
        
        target_type = node.target.resolved_type
        if target_type not in node.value.candidate_types:
            # Check for implicit conversion
            if not self.can_convert(node.value.candidate_types, target_type):
                raise TypeError(f"Cannot assign {node.value.candidate_types} to {target_type}")
        
        node.value.resolved_type = target_type
```

## Intermediate Representation

The IR is designed to be:
1. **C++-oriented** - Maps naturally to C++ constructs
2. **Statement-level** - Each IR node represents a statement or declaration
3. **Annotated** - Carries type and source location information
4. **Linear** - Flat list of statements (with nesting for control structures)

### IR Design Principles

**One ST Statement → One IR Node (where possible)**:
- Simple assignments: `x := y + z;` → `IRAssignment`
- Function calls: `result := ADD(a, b);` → `IRFunctionCall`
- FB calls: `TON1(IN := trigger);` → `IRFBCall`

**Compound Statements → Structured IR Nodes**:
- IF statements → `IRIfStatement` with nested blocks
- FOR loops → `IRForLoop` with body block
- CASE statements → `IRCaseStatement` with case blocks

**Line Mapping Preservation**:
Every IR node has a `source_span` that records the original ST source location. This is preserved through to C++ generation.

## Backend: C++ Code Generation

### Code Generation Strategy

The C++ generator follows these principles:

1. **Readable Output** - Generate code that humans can understand
2. **Minimal Macros** - Use C++ language features instead of preprocessor macros
3. **Type Safety** - Leverage C++ type system
4. **Inline-Friendly** - Structure code for compiler optimization
5. **Debug-Friendly** - Maintain line correspondence where possible

### POU Mapping

**ST Functions → C++ Functions**:
```cpp
// ST: FUNCTION ADD_INT : INT
//       VAR_INPUT a, b : INT; END_VAR
//       ADD_INT := a + b;
//     END_FUNCTION

// C++:
IEC_INT ADD_INT(IEC_INT a, IEC_INT b) {
    return a + b;  // Operators overloaded for IEC types
}
```

**ST Function Blocks → C++ Classes**:
```cpp
// ST: FUNCTION_BLOCK TON
//       VAR_INPUT IN : BOOL; PT : TIME; END_VAR
//       VAR_OUTPUT Q : BOOL; ET : TIME; END_VAR
//       VAR start_time : TIME; END_VAR
//       (* body *)
//     END_FUNCTION_BLOCK

// C++:
class TON {
public:
    // Inputs
    IEC_BOOL IN;
    IEC_TIME PT;
    
    // Outputs
    IEC_BOOL Q;
    IEC_TIME ET;
    
    // Constructor
    TON() = default;
    
    // Execution method (called each scan cycle)
    void operator()() {
        // FB body logic here
    }
    
private:
    // Local variables
    IEC_TIME start_time;
};
```

**ST Programs → C++ Classes**:
```cpp
// ST: PROGRAM Main
//       VAR counter : INT; END_VAR
//       counter := counter + 1;
//     END_PROGRAM

// C++:
class Main {
public:
    Main() = default;
    
    void operator()() {
        counter = counter + 1;
    }
    
private:
    IEC_INT counter;
};
```

### Statement Generation

Each IR node type has a corresponding C++ generation method:

```python
class CppGenerator:
    def generate_assignment(self, node: IRAssignment) -> str:
        """Generate C++ for assignment"""
        target = self.generate_expression(node.target)
        value = self.generate_expression(node.value)
        return f"{target} = {value};"
        
    def generate_if_statement(self, node: IRIfStatement) -> str:
        """Generate C++ for IF statement"""
        lines = []
        
        # IF condition
        cond = self.generate_expression(node.condition)
        lines.append(f"if ({cond}) {{")
        
        # THEN block
        for stmt in node.then_block:
            lines.append("    " + self.generate_statement(stmt))
        
        # ELSIF blocks
        for elsif_cond, elsif_block in node.elsif_blocks:
            cond = self.generate_expression(elsif_cond)
            lines.append(f"}} else if ({cond}) {{")
            for stmt in elsif_block:
                lines.append("    " + self.generate_statement(stmt))
        
        # ELSE block
        if node.else_block:
            lines.append("} else {")
            for stmt in node.else_block:
                lines.append("    " + self.generate_statement(stmt))
        
        lines.append("}")
        return "\n".join(lines)
```

## Line Mapping and Debug Support

### Line Mapping Strategy

STruC++ maintains a mapping between ST source lines and generated C++ lines:

```python
@dataclass
class LineMapping:
    st_file: str
    st_line: int
    cpp_file: str
    cpp_start_line: int
    cpp_end_line: int
```

**Mapping File Format** (JSON):
```json
{
  "version": "1.0",
  "mappings": [
    {
      "st_file": "program.st",
      "st_line": 10,
      "cpp_file": "program.cpp",
      "cpp_start_line": 45,
      "cpp_end_line": 45
    },
    {
      "st_file": "program.st",
      "st_line": 11,
      "cpp_file": "program.cpp",
      "cpp_start_line": 46,
      "cpp_end_line": 49
    }
  ]
}
```

### Debug Information

STruC++ can optionally generate:

1. **#line Directives** - Tell C++ compiler about original source locations
2. **Source Comments** - Include ST source as C++ comments
3. **Mapping Files** - External files for debugger integration

Example with debug info:
```cpp
// ST Line 10: counter := counter + 1;
#line 10 "program.st"
counter = counter + 1;
```

## C++ Runtime Library

The C++ runtime library provides:

1. **IEC Type Wrappers** - Classes for BOOL, INT, REAL, TIME, etc.
2. **Standard Functions** - IEC 61131-3 standard function library
3. **Utility Functions** - Type conversions, string operations, etc.

See [CPP_RUNTIME.md](CPP_RUNTIME.md) for detailed design.

### IEC Type Wrapper Design

```cpp
template<typename T>
class IECVar {
public:
    using value_type = T;
    
    // Constructors
    IECVar() : value_{}, forced_{false} {}
    explicit IECVar(T v) : value_{v}, forced_{false} {}
    
    // Accessors
    T get() const noexcept {
        return forced_ ? forced_value_ : value_;
    }
    
    void set(T v) noexcept {
        if (!forced_) {
            value_ = v;
        }
    }
    
    // Forcing support
    void force(T v) noexcept {
        forced_ = true;
        forced_value_ = v;
    }
    
    void unforce() noexcept {
        forced_ = false;
    }
    
    bool is_forced() const noexcept {
        return forced_;
    }
    
    // Implicit conversion for natural syntax
    operator T() const noexcept {
        return get();
    }
    
    // Assignment operator
    IECVar& operator=(T v) noexcept {
        set(v);
        return *this;
    }
    
    // Arithmetic operators (for numeric types)
    IECVar& operator+=(T v) noexcept {
        set(get() + v);
        return *this;
    }
    // ... other operators
    
private:
    T value_;
    bool forced_;
    T forced_value_;
};

// Type aliases
using IEC_BOOL = IECVar<bool>;
using IEC_INT = IECVar<int16_t>;
using IEC_DINT = IECVar<int32_t>;
using IEC_REAL = IECVar<float>;
using IEC_LREAL = IECVar<double>;
// ... etc
```

## Design Patterns and Principles

### Visitor Pattern

STruC++ uses the visitor pattern extensively for AST traversal:

```python
class ASTVisitor:
    """Base visitor for AST traversal"""
    
    def visit(self, node: ASTNode):
        """Dispatch to appropriate visit method"""
        method_name = f"visit_{node.__class__.__name__}"
        method = getattr(self, method_name, self.generic_visit)
        return method(node)
    
    def generic_visit(self, node: ASTNode):
        """Default: visit all children"""
        for child in node.children():
            self.visit(child)
```

### Builder Pattern

Complex objects (AST, IR) are constructed using builders:

```python
class IRBuilder:
    """Build IR from typed AST"""
    
    def __init__(self):
        self.statements = []
        self.temp_counter = 0
        
    def build_assignment(self, target: Expression, value: Expression) -> IRAssignment:
        """Build IR assignment node"""
        return IRAssignment(
            source_span=target.source_span,
            target=self.build_expression(target),
            value=self.build_expression(value)
        )
    
    def create_temp_var(self, type: IECType) -> IRVariable:
        """Create a temporary variable"""
        name = f"__tmp_{self.temp_counter}"
        self.temp_counter += 1
        return IRVariable(name, type)
```

### Strategy Pattern

Different code generation strategies for different targets:

```python
class CodeGenerator(ABC):
    """Abstract code generator"""
    
    @abstractmethod
    def generate_function(self, func: FunctionDecl) -> str:
        pass
    
    @abstractmethod
    def generate_function_block(self, fb: FunctionBlockDecl) -> str:
        pass

class CppGenerator(CodeGenerator):
    """C++ code generator"""
    
    def generate_function(self, func: FunctionDecl) -> str:
        # Generate C++ function
        pass

# Future: Could add other generators (C, LLVM IR, etc.)
```

### Error Handling

STruC++ uses a hierarchical exception system:

```python
class CompilerError(Exception):
    """Base class for all compiler errors"""
    def __init__(self, message: str, span: Optional[SourceSpan] = None):
        self.message = message
        self.span = span
        super().__init__(self.format_message())
    
    def format_message(self) -> str:
        if self.span:
            return f"{self.span.file}:{self.span.start_line}:{self.span.start_col}: {self.message}"
        return self.message

class SyntaxError(CompilerError):
    """Syntax errors from parser"""
    pass

class SemanticError(CompilerError):
    """Semantic errors (type errors, undefined symbols, etc.)"""
    pass

class CodeGenError(CompilerError):
    """Code generation errors"""
    pass
```

### Configuration

Compiler behavior is controlled by a configuration object:

```python
@dataclass
class CompilerOptions:
    """Compiler configuration"""
    
    # Input/output
    input_file: str
    output_dir: str
    
    # Language features
    allow_nested_comments: bool = True  # IEC v3 feature
    allow_references: bool = True       # IEC v3 feature
    strict_typing: bool = True
    
    # Code generation
    generate_line_directives: bool = False
    generate_source_comments: bool = True
    generate_mapping_file: bool = True
    optimize_level: int = 0  # 0=none, 1=basic, 2=aggressive
    
    # Debug support
    debug_mode: bool = False
    verbose: bool = False
```

## Summary

STruC++ architecture is designed for:

- **Clarity** - Each pass has a clear purpose and well-defined inputs/outputs
- **Testability** - Each component can be tested independently
- **Maintainability** - Code is organized logically with clear interfaces
- **Extensibility** - New features can be added without major refactoring
- **Performance** - Efficient multi-pass design suitable for PLC program sizes
- **Debugging** - Built-in support for source-level debugging with line mapping

The architecture improves upon MatIEC by:
- Using explicit data structures instead of hidden annotations
- Separating concerns into focused passes
- Generating clean C++ code instead of macro-heavy C
- Providing better error messages with source locations
- Supporting modern IEC 61131-3 v3 features from the ground up
