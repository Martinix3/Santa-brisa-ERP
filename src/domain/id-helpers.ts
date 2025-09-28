export function safeIdPart(s?: string | null) {
  if (!s) return '';
  return String(s).replaceAll("/", "~");
}

export function makeOnHandId(itemId: string, lotNumber: string | undefined | null, locationId: string | undefined | null) {
  return `${itemId}|${safeIdPart(lotNumber)}|${safeIdPart(locationId)}`;
}
