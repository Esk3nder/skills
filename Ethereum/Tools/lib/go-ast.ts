/**
 * Go AST patterns for ripgrep-based code search
 *
 * These patterns help find Go language constructs without needing a full parser.
 */

/**
 * Pattern to find a function definition
 * Matches: func Name(...) or func (receiver) Name(...)
 */
export function functionDefPattern(name: string): string {
  // Escape special regex characters in the name
  const escaped = escapeRegex(name);
  return `func\\s+(?:\\([^)]+\\)\\s+)?${escaped}\\s*\\(`;
}

/**
 * Pattern to find a method definition on a specific type
 * Matches: func (r *Type) Name(...) or func (r Type) Name(...)
 */
export function methodDefPattern(typeName: string, methodName: string): string {
  const escapedType = escapeRegex(typeName);
  const escapedMethod = escapeRegex(methodName);
  return `func\\s+\\([^)]*\\*?${escapedType}\\)\\s+${escapedMethod}\\s*\\(`;
}

/**
 * Pattern to find a type definition
 * Matches: type Name struct or type Name interface
 */
export function typeDefPattern(name: string): string {
  const escaped = escapeRegex(name);
  return `type\\s+${escaped}\\s+(?:struct|interface)`;
}

/**
 * Pattern to find an interface definition
 */
export function interfaceDefPattern(name: string): string {
  const escaped = escapeRegex(name);
  return `type\\s+${escaped}\\s+interface\\s*\\{`;
}

/**
 * Pattern to find a struct definition
 */
export function structDefPattern(name: string): string {
  const escaped = escapeRegex(name);
  return `type\\s+${escaped}\\s+struct\\s*\\{`;
}

/**
 * Pattern to find a function call
 * Matches: .Name( or Name(
 */
export function functionCallPattern(name: string): string {
  const escaped = escapeRegex(name);
  return `\\.?${escaped}\\s*\\(`;
}

/**
 * Pattern to find a constant definition
 */
export function constDefPattern(name: string): string {
  const escaped = escapeRegex(name);
  return `const\\s+${escaped}\\s*=`;
}

/**
 * Pattern to find a variable declaration
 */
export function varDefPattern(name: string): string {
  const escaped = escapeRegex(name);
  return `var\\s+${escaped}\\s+`;
}

/**
 * Pattern to find a package declaration
 */
export function packagePattern(name: string): string {
  const escaped = escapeRegex(name);
  return `^package\\s+${escaped}\\s*$`;
}

/**
 * Pattern to find import statements
 */
export function importPattern(pkg: string): string {
  const escaped = escapeRegex(pkg);
  return `"[^"]*${escaped}[^"]*"`;
}

/**
 * Pattern to find struct field
 */
export function structFieldPattern(fieldName: string): string {
  const escaped = escapeRegex(fieldName);
  return `^\\s+${escaped}\\s+\\S`;
}

/**
 * Pattern to find interface method signature
 */
export function interfaceMethodPattern(methodName: string): string {
  const escaped = escapeRegex(methodName);
  return `^\\s+${escaped}\\s*\\([^)]*\\)`;
}

/**
 * Pattern to find type assertion
 */
export function typeAssertionPattern(typeName: string): string {
  const escaped = escapeRegex(typeName);
  return `\\.\\(\\*?${escaped}\\)`;
}

/**
 * Pattern to find embedded struct/interface
 */
export function embeddedTypePattern(typeName: string): string {
  const escaped = escapeRegex(typeName);
  return `^\\s+\\*?${escaped}\\s*$`;
}

/**
 * Helper to escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Common Go type patterns
 */
export const GO_TYPES = {
  // Basic types
  int: "int|int8|int16|int32|int64",
  uint: "uint|uint8|uint16|uint32|uint64|uintptr",
  float: "float32|float64",
  complex: "complex64|complex128",
  string: "string",
  bool: "bool",
  byte: "byte",
  rune: "rune",
  error: "error",

  // Common Ethereum types
  hash: "common\\.Hash",
  address: "common\\.Address",
  bigInt: "\\*?big\\.Int",
  uint256: "\\*?uint256\\.Int",
};

/**
 * EVM-specific function patterns
 */
export const EVM_PATTERNS = {
  // Opcode handler
  opcodeHandler: /^func\s+op(\w+)\s*\(/,

  // Gas function
  gasFunction: /^func\s+gas(\w+)\s*\(/,

  // Make* functions (for dup, swap, push, log)
  makeFunction: /^func\s+make(\w+)\s*\(/,

  // Instruction set initialization
  instructionSet: /func\s+new(\w+)InstructionSet/,

  // Operation definition
  operationDef: /(\w+):\s*{\s*execute:/,
};

/**
 * Get all patterns for a concept
 */
export function getPatternsForConcept(concept: string): string[] {
  const patterns: string[] = [];

  // Try as function name
  patterns.push(functionDefPattern(concept));

  // Try as type name
  patterns.push(typeDefPattern(concept));

  // Try as method call
  patterns.push(functionCallPattern(concept));

  return patterns;
}
