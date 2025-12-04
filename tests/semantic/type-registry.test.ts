/**
 * STruC++ Type Registry Tests
 *
 * Tests for the type registry used to manage user-defined types.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TypeRegistry,
  isElementaryType,
} from '../../src/semantic/type-registry.js';
import type {
  TypeDeclaration,
  StructDefinition,
  EnumDefinition,
  ArrayDefinition,
  SubrangeDefinition,
  TypeReference,
  EnumMember,
  VarDeclaration,
  ArrayDimension,
  LiteralExpression,
} from '../../src/frontend/ast.js';

const createSourceSpan = () => ({
  file: '',
  startLine: 1,
  endLine: 1,
  startCol: 1,
  endCol: 1,
});

const createLiteral = (value: number): LiteralExpression => ({
  kind: 'LiteralExpression',
  sourceSpan: createSourceSpan(),
  literalType: 'INT',
  value,
  rawValue: String(value),
});

const createTypeRef = (name: string): TypeReference => ({
  kind: 'TypeReference',
  sourceSpan: createSourceSpan(),
  name,
  isReference: false,
});

const createEnumMember = (name: string, value?: number): EnumMember => ({
  kind: 'EnumMember',
  sourceSpan: createSourceSpan(),
  name,
  ...(value !== undefined ? { value: createLiteral(value) } : {}),
});

const createVarDecl = (name: string, typeName: string): VarDeclaration => ({
  kind: 'VarDeclaration',
  sourceSpan: createSourceSpan(),
  names: [name],
  type: createTypeRef(typeName),
});

const createArrayDim = (start: number, end: number): ArrayDimension => ({
  kind: 'ArrayDimension',
  sourceSpan: createSourceSpan(),
  start: createLiteral(start),
  end: createLiteral(end),
});

describe('isElementaryType', () => {
  it('should recognize elementary types', () => {
    expect(isElementaryType('BOOL')).toBe(true);
    expect(isElementaryType('INT')).toBe(true);
    expect(isElementaryType('REAL')).toBe(true);
    expect(isElementaryType('STRING')).toBe(true);
    expect(isElementaryType('TIME')).toBe(true);
    expect(isElementaryType('DATE')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isElementaryType('int')).toBe(true);
    expect(isElementaryType('Bool')).toBe(true);
    expect(isElementaryType('REAL')).toBe(true);
  });

  it('should return false for user-defined types', () => {
    expect(isElementaryType('MyStruct')).toBe(false);
    expect(isElementaryType('TrafficLight')).toBe(false);
    expect(isElementaryType('IntArray')).toBe(false);
  });
});

describe('TypeRegistry', () => {
  let registry: TypeRegistry;

  beforeEach(() => {
    registry = new TypeRegistry();
  });

  describe('registerType', () => {
    it('should register a simple type alias', () => {
      const type: TypeDeclaration = {
        kind: 'TypeDeclaration',
        sourceSpan: createSourceSpan(),
        name: 'MyInt',
        definition: createTypeRef('INT'),
      };

      registry.registerType(type);
      expect(registry.hasType('MyInt')).toBe(true);
    });

    it('should register multiple types', () => {
      const type1: TypeDeclaration = {
        kind: 'TypeDeclaration',
        sourceSpan: createSourceSpan(),
        name: 'Type1',
        definition: createTypeRef('INT'),
      };
      const type2: TypeDeclaration = {
        kind: 'TypeDeclaration',
        sourceSpan: createSourceSpan(),
        name: 'Type2',
        definition: createTypeRef('REAL'),
      };

      registry.registerTypes([type1, type2]);
      expect(registry.size).toBe(2);
    });
  });

  describe('lookupType', () => {
    it('should find registered types', () => {
      const type: TypeDeclaration = {
        kind: 'TypeDeclaration',
        sourceSpan: createSourceSpan(),
        name: 'MyInt',
        definition: createTypeRef('INT'),
      };

      registry.registerType(type);
      const found = registry.lookupType('MyInt');
      expect(found).toBe(type);
    });

    it('should return undefined for unknown types', () => {
      const found = registry.lookupType('Unknown');
      expect(found).toBeUndefined();
    });
  });

  describe('getAllTypes', () => {
    it('should return all registered types', () => {
      const type1: TypeDeclaration = {
        kind: 'TypeDeclaration',
        sourceSpan: createSourceSpan(),
        name: 'Type1',
        definition: createTypeRef('INT'),
      };
      const type2: TypeDeclaration = {
        kind: 'TypeDeclaration',
        sourceSpan: createSourceSpan(),
        name: 'Type2',
        definition: createTypeRef('REAL'),
      };

      registry.registerTypes([type1, type2]);
      const all = registry.getAllTypes();
      expect(all).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('should remove all types', () => {
      const type: TypeDeclaration = {
        kind: 'TypeDeclaration',
        sourceSpan: createSourceSpan(),
        name: 'MyInt',
        definition: createTypeRef('INT'),
      };

      registry.registerType(type);
      expect(registry.size).toBe(1);

      registry.clear();
      expect(registry.size).toBe(0);
    });
  });

  describe('getTypesInDependencyOrder', () => {
    it('should return types with no dependencies in any order', () => {
      const type1: TypeDeclaration = {
        kind: 'TypeDeclaration',
        sourceSpan: createSourceSpan(),
        name: 'Type1',
        definition: createTypeRef('INT'),
      };
      const type2: TypeDeclaration = {
        kind: 'TypeDeclaration',
        sourceSpan: createSourceSpan(),
        name: 'Type2',
        definition: createTypeRef('REAL'),
      };

      registry.registerTypes([type1, type2]);
      const ordered = registry.getTypesInDependencyOrder();
      expect(ordered).toHaveLength(2);
    });

    it('should order types by dependencies', () => {
      const innerStruct: StructDefinition = {
        kind: 'StructDefinition',
        sourceSpan: createSourceSpan(),
        fields: [createVarDecl('x', 'INT')],
      };
      const innerType: TypeDeclaration = {
        kind: 'TypeDeclaration',
        sourceSpan: createSourceSpan(),
        name: 'Inner',
        definition: innerStruct,
      };

      const outerStruct: StructDefinition = {
        kind: 'StructDefinition',
        sourceSpan: createSourceSpan(),
        fields: [createVarDecl('inner', 'Inner')],
      };
      const outerType: TypeDeclaration = {
        kind: 'TypeDeclaration',
        sourceSpan: createSourceSpan(),
        name: 'Outer',
        definition: outerStruct,
      };

      registry.registerTypes([outerType, innerType]);
      const ordered = registry.getTypesInDependencyOrder();

      const innerIndex = ordered.findIndex((t) => t.name === 'Inner');
      const outerIndex = ordered.findIndex((t) => t.name === 'Outer');
      expect(innerIndex).toBeLessThan(outerIndex);
    });
  });

  describe('getTypeDependencies', () => {
    it('should return dependencies for struct types', () => {
      const structDef: StructDefinition = {
        kind: 'StructDefinition',
        sourceSpan: createSourceSpan(),
        fields: [
          createVarDecl('x', 'INT'),
          createVarDecl('other', 'OtherType'),
        ],
      };
      const type: TypeDeclaration = {
        kind: 'TypeDeclaration',
        sourceSpan: createSourceSpan(),
        name: 'MyStruct',
        definition: structDef,
      };

      const deps = registry.getTypeDependencies(type);
      expect(deps).toContain('OtherType');
      expect(deps).not.toContain('INT');
    });

    it('should return dependencies for array types', () => {
      const arrayDef: ArrayDefinition = {
        kind: 'ArrayDefinition',
        sourceSpan: createSourceSpan(),
        dimensions: [createArrayDim(0, 9)],
        elementType: createTypeRef('MyElement'),
      };
      const type: TypeDeclaration = {
        kind: 'TypeDeclaration',
        sourceSpan: createSourceSpan(),
        name: 'MyArray',
        definition: arrayDef,
      };

      const deps = registry.getTypeDependencies(type);
      expect(deps).toContain('MyElement');
    });

    it('should return dependencies for typed enums', () => {
      const enumDef: EnumDefinition = {
        kind: 'EnumDefinition',
        sourceSpan: createSourceSpan(),
        baseType: createTypeRef('MyBaseType'),
        members: [createEnumMember('A'), createEnumMember('B')],
      };
      const type: TypeDeclaration = {
        kind: 'TypeDeclaration',
        sourceSpan: createSourceSpan(),
        name: 'MyEnum',
        definition: enumDef,
      };

      const deps = registry.getTypeDependencies(type);
      expect(deps).toContain('MyBaseType');
    });

    it('should return dependencies for subrange types', () => {
      const subrangeDef: SubrangeDefinition = {
        kind: 'SubrangeDefinition',
        sourceSpan: createSourceSpan(),
        baseType: createTypeRef('MyBaseType'),
        lowerBound: createLiteral(0),
        upperBound: createLiteral(100),
      };
      const type: TypeDeclaration = {
        kind: 'TypeDeclaration',
        sourceSpan: createSourceSpan(),
        name: 'MySubrange',
        definition: subrangeDef,
      };

      const deps = registry.getTypeDependencies(type);
      expect(deps).toContain('MyBaseType');
    });
  });

  describe('validate', () => {
    it('should pass for valid types', () => {
      const structDef: StructDefinition = {
        kind: 'StructDefinition',
        sourceSpan: createSourceSpan(),
        fields: [createVarDecl('x', 'INT')],
      };
      const type: TypeDeclaration = {
        kind: 'TypeDeclaration',
        sourceSpan: createSourceSpan(),
        name: 'MyStruct',
        definition: structDef,
      };

      registry.registerType(type);
      const result = registry.validate();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect undefined type references', () => {
      const structDef: StructDefinition = {
        kind: 'StructDefinition',
        sourceSpan: createSourceSpan(),
        fields: [createVarDecl('x', 'UndefinedType')],
      };
      const type: TypeDeclaration = {
        kind: 'TypeDeclaration',
        sourceSpan: createSourceSpan(),
        name: 'MyStruct',
        definition: structDef,
      };

      registry.registerType(type);
      const result = registry.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]?.message).toContain('UndefinedType');
    });

    it('should detect empty structs', () => {
      const structDef: StructDefinition = {
        kind: 'StructDefinition',
        sourceSpan: createSourceSpan(),
        fields: [],
      };
      const type: TypeDeclaration = {
        kind: 'TypeDeclaration',
        sourceSpan: createSourceSpan(),
        name: 'EmptyStruct',
        definition: structDef,
      };

      registry.registerType(type);
      const result = registry.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors[0]?.message).toContain('no fields');
    });

    it('should detect empty enums', () => {
      const enumDef: EnumDefinition = {
        kind: 'EnumDefinition',
        sourceSpan: createSourceSpan(),
        members: [],
      };
      const type: TypeDeclaration = {
        kind: 'TypeDeclaration',
        sourceSpan: createSourceSpan(),
        name: 'EmptyEnum',
        definition: enumDef,
      };

      registry.registerType(type);
      const result = registry.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors[0]?.message).toContain('no members');
    });

    it('should detect circular dependencies', () => {
      const structA: StructDefinition = {
        kind: 'StructDefinition',
        sourceSpan: createSourceSpan(),
        fields: [createVarDecl('b', 'TypeB')],
      };
      const typeA: TypeDeclaration = {
        kind: 'TypeDeclaration',
        sourceSpan: createSourceSpan(),
        name: 'TypeA',
        definition: structA,
      };

      const structB: StructDefinition = {
        kind: 'StructDefinition',
        sourceSpan: createSourceSpan(),
        fields: [createVarDecl('a', 'TypeA')],
      };
      const typeB: TypeDeclaration = {
        kind: 'TypeDeclaration',
        sourceSpan: createSourceSpan(),
        name: 'TypeB',
        definition: structB,
      };

      registry.registerTypes([typeA, typeB]);
      const result = registry.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Circular'))).toBe(
        true,
      );
    });
  });
});
