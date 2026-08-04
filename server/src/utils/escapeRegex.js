/**
 * Escapes user input so it is safe to embed in a RegExp.
 */
export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
