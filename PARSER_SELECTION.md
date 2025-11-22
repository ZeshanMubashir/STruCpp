# Parser Library Selection

This document explains the rationale for selecting Lark as the parsing library for STruC++, including a detailed comparison of alternatives.

## Table of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [Candidate Libraries](#candidate-libraries)
4. [Detailed Comparison](#detailed-comparison)
5. [Decision: Lark](#decision-lark)
6. [Implementation Plan](#implementation-plan)

## Overview

Selecting the right parser library is crucial for STruC++'s success. The parser must handle the complex IEC 61131-3 grammar while remaining maintainable and providing good error messages.

### Key Considerations

- **Grammar Complexity**: IEC 61131-3 has ~424 grammar rules and context-sensitive elements
- **Maintainability**: Grammar should be readable and easy to modify
- **Error Handling**: Must provide clear, actionable error messages
- **Performance**: Must handle typical PLC program sizes efficiently
- **Python Integration**: Should integrate naturally with Python codebase
- **Toolchain Simplicity**: Minimize external dependencies and build complexity

## Requirements

### Functional Requirements

1. **Grammar Support**
   - LALR(1) or more powerful parsing algorithm
   - Support for complex grammars (400+ rules)
   - Handle context-sensitive elements (with workarounds if needed)
   - Support for operator precedence
   - Support for left/right recursion

2. **Error Handling**
   - Clear error messages with line/column information
   - Error recovery (continue parsing after errors)
   - Ability to report multiple errors
   - Helpful suggestions for common mistakes

3. **Output**
   - Generate Abstract Syntax Tree (AST)
   - Preserve source location information
   - Support for custom AST node types

4. **Performance**
   - Parse typical PLC programs (<10,000 lines) in <1 second
   - Memory efficient
   - Incremental parsing (nice to have)

### Non-Functional Requirements

1. **Maintainability**
   - Declarative grammar specification
   - Separate grammar from code
   - Clear documentation
   - Active community support

2. **Integration**
   - Pure Python (no external binaries)
   - Compatible with Python 3.8+
   - Easy to install (pip)
   - Minimal dependencies

3. **Development Experience**
   - Good debugging tools
   - Clear error messages during grammar development
   - Fast iteration cycle
   - Good documentation and examples

## Candidate Libraries

We evaluated four major Python parsing libraries:

1. **Lark** - Modern parsing toolkit with multiple algorithms
2. **PLY** (Python Lex-Yacc) - Python implementation of lex/yacc
3. **ANTLR4** - Powerful parser generator with Python target
4. **pyparsing** - Pure Python parsing library

### Quick Comparison Matrix

| Feature | Lark | PLY | ANTLR4 | pyparsing |
|---------|------|-----|--------|-----------|
| Algorithm | LALR/Earley | LALR(1) | LL(*) | PEG |
| Grammar Format | EBNF-like | Python docstrings | ANTLR grammar | Python code |
| Pure Python | ✅ | ✅ | ⚠️ Runtime only | ✅ |
| External Tools | ❌ | ❌ | ✅ Java required | ❌ |
| Error Recovery | ✅ Excellent | ⚠️ Basic | ✅ Excellent | ⚠️ Limited |
| Performance | ✅ Fast | ✅ Fast | ✅ Very Fast | ⚠️ Slower |
| Learning Curve | Easy | Medium | Steep | Easy |
| Documentation | ✅ Good | ✅ Good | ✅ Excellent | ✅ Good |
| Community | ✅ Active | ✅ Stable | ✅ Very Active | ✅ Active |
| Maintenance | ✅ Active | ⚠️ Stable | ✅ Very Active | ✅ Active |

## Detailed Comparison

### 1. Lark

**Website**: https://github.com/lark-parser/lark

**Description**: Modern parsing toolkit for Python with support for multiple parsing algorithms (LALR, Earley, CYK).

#### Pros

✅ **Declarative Grammar**: Clean EBNF-like syntax in separate `.lark` files
```lark
assignment: variable ":=" expression ";"

expression: term (("+" | "-") term)*

term: factor (("*" | "/") factor)*

factor: NUMBER
      | variable
      | "(" expression ")"
```

✅ **Multiple Algorithms**: Can use LALR for speed or Earley for ambiguous grammars

✅ **Pure Python**: No external dependencies or build tools

✅ **Excellent Error Messages**: Clear, helpful error reporting
```
Unexpected token Token('IDENTIFIER', 'END_IF') at line 10, column 5.
Expected one of: 
  * SEMICOLON
  * END_VAR
```

✅ **Good Performance**: LALR mode is fast enough for PLC programs

✅ **Active Development**: Regular updates and responsive maintainers

✅ **Tree Construction**: Automatic AST building with customizable transformers

✅ **Good Documentation**: Clear docs with many examples

#### Cons

⚠️ **Less Mature than ANTLR**: Younger project (started 2017)

⚠️ **Smaller Ecosystem**: Fewer third-party tools and grammars

#### Example Grammar

```lark
// IEC 61131-3 Structured Text subset
start: program

program: "PROGRAM" identifier
         variable_declarations
         statement_list
         "END_PROGRAM"

variable_declarations: "VAR" var_decl+ "END_VAR"

var_decl: identifier ":" type_name ";"

statement_list: statement+

statement: assignment
         | if_statement
         | for_loop

assignment: variable ":=" expression ";"

// ... more rules
```

#### Verdict for STruC++

**Score: 9/10** - Excellent fit for STruC++

### 2. PLY (Python Lex-Yacc)

**Website**: https://github.com/dabeaz/ply

**Description**: Python implementation of lex and yacc, closely following the original Unix tools.

#### Pros

✅ **Familiar to C Developers**: Same concepts as flex/bison (like MatIEC uses)

✅ **Pure Python**: No external dependencies

✅ **Stable**: Mature, well-tested codebase

✅ **Good Performance**: LALR(1) parser is fast

✅ **Detailed Control**: Fine-grained control over parsing

#### Cons

❌ **Grammar in Python Code**: Grammar rules embedded in docstrings
```python
def p_assignment(p):
    '''assignment : variable ASSIGN expression SEMICOLON'''
    p[0] = Assignment(p[1], p[3])
```

❌ **Verbose**: Requires more boilerplate than Lark

❌ **Limited Error Recovery**: Basic error handling

❌ **Less Readable**: Grammar harder to understand than declarative format

❌ **Maintenance Status**: No longer actively developed (stable but not evolving)

#### Example Grammar

```python
# Lexer
tokens = ('PROGRAM', 'END_PROGRAM', 'VAR', 'END_VAR', 
          'IDENTIFIER', 'ASSIGN', 'SEMICOLON', ...)

def t_PROGRAM(t):
    r'PROGRAM'
    return t

def t_IDENTIFIER(t):
    r'[a-zA-Z_][a-zA-Z0-9_]*'
    return t

# Parser
def p_program(p):
    '''program : PROGRAM IDENTIFIER variable_declarations statement_list END_PROGRAM'''
    p[0] = Program(p[2], p[3], p[4])

def p_assignment(p):
    '''assignment : variable ASSIGN expression SEMICOLON'''
    p[0] = Assignment(p[1], p[3])
```

#### Verdict for STruC++

**Score: 6/10** - Workable but not ideal

### 3. ANTLR4

**Website**: https://www.antlr.org/

**Description**: Powerful parser generator with support for multiple target languages including Python.

#### Pros

✅ **Very Powerful**: LL(*) algorithm handles complex grammars

✅ **Excellent Error Recovery**: Best-in-class error handling

✅ **Rich Tooling**: ANTLRWorks IDE, grammar debugger, visualizers

✅ **Large Ecosystem**: Many existing grammars available

✅ **Excellent Documentation**: Comprehensive docs and books

✅ **Production Ready**: Used by major projects (Hibernate, Presto, etc.)

#### Cons

❌ **Java Dependency**: Requires Java to generate parser (build-time dependency)

❌ **Complex Toolchain**: Multi-step build process
```bash
# Generate parser (requires Java)
antlr4 -Dlanguage=Python3 IEC61131.g4

# Then use in Python
from IEC61131Lexer import IEC61131Lexer
from IEC61131Parser import IEC61131Parser
```

❌ **Python Target Less Mature**: Python runtime is secondary to Java

❌ **Steep Learning Curve**: More complex than simpler tools

❌ **Heavier Weight**: More dependencies and complexity

#### Example Grammar

```antlr
grammar IEC61131;

program
    : PROGRAM identifier
      variable_declarations
      statement_list
      END_PROGRAM
    ;

variable_declarations
    : VAR var_decl+ END_VAR
    ;

var_decl
    : identifier COLON type_name SEMICOLON
    ;

assignment
    : variable ASSIGN expression SEMICOLON
    ;

// Lexer rules
PROGRAM : 'PROGRAM' ;
END_PROGRAM : 'END_PROGRAM' ;
VAR : 'VAR' ;
END_VAR : 'END_VAR' ;
ASSIGN : ':=' ;
SEMICOLON : ';' ;
```

#### Verdict for STruC++

**Score: 7/10** - Powerful but adds complexity

### 4. pyparsing

**Website**: https://github.com/pyparsing/pyparsing

**Description**: Pure Python parsing library using Parsing Expression Grammars (PEG).

#### Pros

✅ **Pure Python**: No external dependencies

✅ **Pythonic API**: Natural Python code

✅ **Easy to Learn**: Simple concepts

✅ **Flexible**: Can handle many grammar types

#### Cons

❌ **Performance**: Slower than LALR parsers for large inputs

❌ **Grammar in Code**: Parser defined in Python code
```python
identifier = Word(alphas, alphanums + "_")
assignment = identifier + Literal(":=") + expression + Literal(";")
```

❌ **Scalability**: Can become unwieldy for large grammars (400+ rules)

❌ **Limited Error Recovery**: Basic error handling

❌ **PEG Limitations**: Ordered choice can hide grammar issues

#### Example Grammar

```python
from pyparsing import *

# Tokens
PROGRAM = Keyword("PROGRAM")
END_PROGRAM = Keyword("END_PROGRAM")
VAR = Keyword("VAR")
END_VAR = Keyword("END_VAR")
ASSIGN = Literal(":=")
SEMICOLON = Literal(";")

identifier = Word(alphas, alphanums + "_")

# Grammar rules
var_decl = identifier + Literal(":") + identifier + SEMICOLON

variable_declarations = VAR + OneOrMore(var_decl) + END_VAR

assignment = identifier + ASSIGN + expression + SEMICOLON

statement_list = OneOrMore(assignment)

program = (PROGRAM + identifier + 
           variable_declarations + 
           statement_list + 
           END_PROGRAM)
```

#### Verdict for STruC++

**Score: 5/10** - Too limited for this use case

## Decision: Lark

After careful evaluation, **Lark** is selected as the parser library for STruC++.

### Rationale

#### 1. Optimal Balance

Lark provides the best balance of:
- **Power**: LALR(1) sufficient for IEC 61131-3, Earley available if needed
- **Simplicity**: Clean, declarative grammar syntax
- **Performance**: Fast enough for PLC programs
- **Maintainability**: Easy to read and modify grammar

#### 2. Pure Python Toolchain

- No external build tools required (unlike ANTLR)
- Simple installation: `pip install lark`
- No Java dependency
- Fits naturally in Python project

#### 3. Excellent Developer Experience

- Clear, readable grammar files
- Good error messages during development
- Fast iteration cycle (no generate step)
- Good debugging support

#### 4. Maintainability

- Grammar separate from code
- Easy for contributors to understand
- Well-documented
- Active community

#### 5. Flexibility

- Can start with Earley (more forgiving) during development
- Switch to LALR (faster) for production
- Easy to experiment with grammar changes

### Addressing Concerns

#### Concern: Less Mature than ANTLR

**Response**: Lark is mature enough for production use:
- Used in several production projects
- Active development and maintenance
- Responsive to issues
- Good test coverage

#### Concern: Smaller Ecosystem

**Response**: Not a significant issue:
- We're writing our own grammar anyway
- Don't need third-party IEC 61131-3 grammars
- Lark's features are sufficient

#### Concern: Performance

**Response**: Performance is adequate:
- LALR mode is fast (comparable to PLY)
- Typical PLC programs are small (<10,000 lines)
- Parsing is not the bottleneck (semantic analysis and codegen take more time)

### Comparison to MatIEC's Approach

**MatIEC**: Flex + Bison (C++ tools)
- Pros: Very fast, mature
- Cons: Complex integration, grammar in C++ code, difficult to maintain

**STruC++**: Lark (Python library)
- Pros: Pure Python, maintainable, good errors
- Cons: Slightly slower (acceptable tradeoff)

**Verdict**: Lark's maintainability benefits outweigh the minor performance difference.

## Implementation Plan

### Phase 1: Grammar Development

1. **Start with Earley Parser**
   - More forgiving during development
   - Handles ambiguous grammars
   - Easier to debug

2. **Develop Grammar Incrementally**
   - Start with expression subset
   - Add statements
   - Add declarations
   - Add POUs
   - Add configurations

3. **Test Continuously**
   - Unit tests for each grammar rule
   - Golden file tests with real ST code
   - Test error cases

### Phase 2: Optimization

1. **Resolve Ambiguities**
   - Identify and fix ambiguous rules
   - Add precedence declarations
   - Refactor grammar for clarity

2. **Switch to LALR**
   - Convert to LALR mode for performance
   - Verify all tests still pass
   - Benchmark performance

3. **Optimize Performance**
   - Profile parsing
   - Optimize hot paths
   - Cache parser instance

### Grammar Organization

```
grammars/
├── iec61131.lark           # Main grammar (imports others)
├── common.lark             # Common elements (identifiers, literals)
├── types.lark              # Type declarations
├── expressions.lark        # Expressions and operators
├── statements.lark         # ST statements
├── pou.lark               # POUs (functions, FBs, programs)
└── configuration.lark      # Configurations and resources
```

### Example: Main Grammar File

```lark
// iec61131.lark - Main grammar file

%import common (IDENTIFIER, NUMBER, STRING, COMMENT, WS)
%import types (type_declaration, type_name)
%import expressions (expression)
%import statements (statement_list)
%import pou (function_declaration, function_block_declaration, program_declaration)

start: library_element+

library_element: function_declaration
               | function_block_declaration
               | program_declaration
               | type_declaration
               | configuration_declaration

// ... more rules

%ignore WS
%ignore COMMENT
```

### Lark Configuration

```python
from lark import Lark

# Development mode (Earley parser)
parser = Lark.open(
    'grammars/iec61131.lark',
    parser='earley',
    propagate_positions=True,
    maybe_placeholders=False
)

# Production mode (LALR parser)
parser = Lark.open(
    'grammars/iec61131.lark',
    parser='lalr',
    propagate_positions=True,
    cache='parser_cache.lark'  # Cache compiled parser
)
```

### AST Transformation

```python
from lark import Transformer, v_args

class ASTBuilder(Transformer):
    @v_args(inline=True)
    def assignment(self, target, value):
        return Assignment(target, value)
    
    @v_args(inline=True)
    def program_declaration(self, name, var_decls, statements):
        return Program(name, var_decls, statements)
    
    # ... more transformations
```

## Conclusion

Lark is the optimal choice for STruC++ because it provides:

✅ **Clean, maintainable grammar** in declarative EBNF format
✅ **Pure Python** with no external toolchain dependencies  
✅ **Good performance** sufficient for PLC programs
✅ **Excellent error messages** for better user experience
✅ **Flexibility** to use Earley or LALR as needed
✅ **Active development** and responsive community

This choice aligns with STruC++'s goals of maintainability, clarity, and ease of contribution while providing sufficient power to handle the complex IEC 61131-3 grammar.

### Next Steps

1. Install Lark: `pip install lark`
2. Create initial grammar files
3. Implement AST node classes
4. Write parser tests
5. Iterate on grammar development

The parser selection is complete, and we can proceed with confidence that Lark will serve STruC++ well throughout its development and maintenance lifecycle.
