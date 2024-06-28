export function cleanSearchTerm(searchTerm: string) {
  const whiteSpaceNormalized = searchTerm.replace(/\s+/g, ' ');
  return whiteSpaceNormalized.trim();
}
