# STruC++ - Structured Text to C++ Compiler

**STruC++** is a modern, maintainable compiler for IEC 61131-3 Structured Text (ST) programs that generates efficient, real-time capable C++ code. It is designed to replace MatIEC in the OpenPLC toolchain, providing a cleaner architecture, better maintainability, and compliance with IEC 61131-3 version 3.

## Name Origin

The name **STruC++** is a portmanteau that reflects the compiler's purpose and design philosophy:

- **ST** - Structured Text, the primary IEC 61131-3 programming language this compiler targets
- **ru** - From the root word "stru" meaning "to build" or "construct," found in English words like "structure," "construct," and "instruct"
- **C++** - The target language for code generation

The name embodies the compiler's mission: to bridge Structured Text and C++, two powerful tools for building industrial automation systems. Just as "structure" and "construct" relate to building and arranging things systematically, STruC++ builds a bridge between the high-level expressiveness of ST and the performance and flexibility of C++.

## Project Goals

STruC++ aims to overcome the limitations of MatIEC while maintaining compatibility with the OpenPLC ecosystem:

### Primary Objectives

1. **Modern Architecture** - Clean, maintainable TypeScript codebase with clear separation of concerns
2. **IEC 61131-3 v3 Compliance** - Full support for version 3 features including references, nested comments, and modern type system
3. **Line-by-Line Mapping** - Generate C++ code that maintains 1:1 correspondence with ST source for debugging
4. **C++ Native** - Generate idiomatic C++ code leveraging classes, inheritance, and polymorphism
5. **Real-Time Performance** - Produce efficient, deterministic code suitable for PLC applications
6. **Maintainability** - Straightforward implementation that is easy to understand, extend, and debug
7. **Browser-Ready** - Designed to run in both Node.js and browser environments for seamless editor integration

### Key Improvements Over MatIEC

- **Simpler Architecture** - Multi-pass pipeline with explicit data structures instead of complex visitor patterns
- **Better Type System** - C++ wrapper classes for IEC types instead of heavy macro-based access
- **Modern Language** - TypeScript implementation enabling type-safe development, browser compatibility, and seamless integration with OpenPLC Editor
- **Enhanced Debugging** - Built-in support for source-level debugging with line mapping
- **Cleaner Output** - Readable C++ code without excessive macro usage
- **Extensibility** - Modular design allowing easy addition of new features and optimizations

## Architecture Overview

STruC++ follows a multi-pass compilation pipeline:

1. **Frontend** - Lexical analysis and parsing to produce an Abstract Syntax Tree (AST)
2. **Symbol Table Building** - Global indexing of POUs, types, and constants
3. **Semantic Analysis** - Type checking, overload resolution, and semantic validation
4. **IR Generation** - Lowering to a statement-level Intermediate Representation
5. **Code Generation** - Emission of C++ code with line mapping metadata

For detailed architecture information, see [ARCHITECTURE.md](ARCHITECTURE.md).

## IEC 61131-3 Compliance

STruC++ targets full compliance with IEC 61131-3 Edition 3.0 **Structured Text (ST) language**, including:

- **Structured Text (ST) only** - STruC++ compiles ST programs exclusively
  - Other IEC languages (IL, FBD, LD, SFC) are supported via OpenPLC Editor's translation to ST
  - The editor converts graphical and other textual languages to ST before compilation
- Modern type system with references (REF_TO, REF, DREF, ^, NULL)
- Nested comments
- Function blocks, functions, and programs
- User-defined types (structures, enumerations, arrays)
- All standard data types and functions
- Full project structure (CONFIGURATION, RESOURCE, TASK, program instances)

For detailed compliance information, see [IEC61131_COMPLIANCE.md](IEC61131_COMPLIANCE.md).

## Implementation Status

STruC++ is currently in the **design phase**. This repository contains comprehensive design documentation to guide implementation.

### Current Phase: Phase 0 - Design and Planning

- ✅ Architecture design
- ✅ Parser library selection
- ✅ Implementation roadmap
- ⏳ Initial implementation (pending)

For the complete implementation roadmap, see [IMPLEMENTATION_PHASES.md](IMPLEMENTATION_PHASES.md).

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - Detailed compiler architecture and design decisions
- [IMPLEMENTATION_PHASES.md](IMPLEMENTATION_PHASES.md) - Phased development plan with milestones
- [IEC61131_COMPLIANCE.md](IEC61131_COMPLIANCE.md) - IEC 61131-3 v3 compliance details
- [MATIEC_COMPARISON.md](MATIEC_COMPARISON.md) - Comparison with MatIEC and improvement analysis
- [PARSER_SELECTION.md](PARSER_SELECTION.md) - Parser library evaluation and selection rationale
- [CPP_RUNTIME.md](CPP_RUNTIME.md) - C++ runtime library design

## Technology Stack

- **Implementation Language**: TypeScript 5.0+
- **Parser**: Chevrotain - see [PARSER_SELECTION.md](PARSER_SELECTION.md) for rationale
- **Target Language**: C++17 or later
- **Build System**: npm/pnpm for compiler, CMake for C++ runtime
- **Testing**: Vitest for compiler tests, Google Test for C++ runtime tests
- **Runtime**: Node.js 18+ or modern browsers (Chrome, Firefox, Safari, Edge)

## Getting Started

### Prerequisites

- Node.js 18 or later
- C++17 compatible compiler (for testing generated code)
- Git

### Installation (Future)

```bash
# Clone the repository
git clone https://github.com/Autonomy-Logic/strucpp.git
cd strucpp

# Install dependencies
npm install

# Build the compiler
npm run build
```

### Usage (Future)

```bash
# Compile an ST program to C++ (CLI)
npx strucpp input.st -o output.cpp

# Compile with debug information
npx strucpp input.st -o output.cpp --debug --line-mapping

# Show help
npx strucpp --help
```

```typescript
// Programmatic usage (Browser or Node.js)
import { compile } from 'strucpp';

const stSource = `
PROGRAM Main
  VAR counter : INT; END_VAR
  counter := counter + 1;
END_PROGRAM
`;

const result = compile(stSource, { debug: true, lineMapping: true });
console.log(result.cppCode);
console.log(result.lineMap);
```

## Project Structure

```
strucpp/
├── README.md                    # This file
├── ARCHITECTURE.md              # Detailed architecture documentation
├── IMPLEMENTATION_PHASES.md     # Phased development plan
├── IEC61131_COMPLIANCE.md       # IEC 61131-3 v3 compliance details
├── MATIEC_COMPARISON.md         # MatIEC comparison and improvements
├── PARSER_SELECTION.md          # Parser library selection rationale
├── CPP_RUNTIME.md               # C++ runtime library design
├── LICENSE                      # License file
├── package.json                 # Node.js package configuration
├── tsconfig.json                # TypeScript configuration
├── src/                         # Main compiler source
│   ├── index.ts                 # Main entry point
│   ├── frontend/                # Lexer and parser
│   ├── semantic/                # Semantic analysis passes
│   ├── ir/                      # Intermediate representation
│   ├── backend/                 # C++ code generation
│   └── runtime/                 # C++ runtime library templates
├── tests/                       # Test suite
│   ├── frontend/
│   ├── semantic/
│   ├── backend/
│   └── integration/
└── examples/                    # Example ST programs
```

## Contributing

STruC++ is part of the OpenPLC project. Contributions are welcome! Please see the OpenPLC contribution guidelines.

## License

STruC++ is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

This is free software: you are free to change and redistribute it. There is NO WARRANTY, to the extent permitted by law.

## Acknowledgments

- **MatIEC** - The original IEC 61131-3 compiler that inspired this project
- **OpenPLC Project** - For providing the ecosystem and use case
- **IEC 61131-3 Standard** - For defining the programming languages and semantics

## Contact

For questions, issues, or contributions, please use the GitHub issue tracker or contact the OpenPLC development team.

---

**Note**: This is a design document repository. Implementation is planned in phases as described in [IMPLEMENTATION_PHASES.md](IMPLEMENTATION_PHASES.md).
