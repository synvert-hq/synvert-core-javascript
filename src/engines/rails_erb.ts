const convertMatchToSpaces = (match: string) => " ".repeat(match.length);

/**
 * Encode erb string, leave only javascript code, replace other erb code with whitespace.
 * @param str {string} html string
 * @returns {string} encoded string
 */
export function encode(str: string): string {
  return str
    .replace(
      /(<\/script>|<%.*?end.*?>).*?(<script.*?>|<%=.*?javascript_tag.*?%>)/gis,
      convertMatchToSpaces
    )
    .replace(
      /^.*?(<script.*?>|<%=.*?javascript_tag.*?%>)/is,
      convertMatchToSpaces
    )
    .replace(/(<\/script>|<%.*?end.*?>).*?$/is, convertMatchToSpaces);
}
