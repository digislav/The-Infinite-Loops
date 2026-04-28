export function buildDuplicateDocumentName(name: string): string {
  const trimmedName = name.trim();
  const copyMatch = trimmedName.match(/^(.*)\s\(Copy(?:\s(\d+))?\)$/);

  if (!copyMatch) {
    return `${trimmedName} (Copy)`;
  }

  const baseName = copyMatch[1].trim();
  const currentCopyNumber = copyMatch[2] ? Number(copyMatch[2]) : 1;

  return `${baseName} (Copy ${currentCopyNumber + 1})`;
}
