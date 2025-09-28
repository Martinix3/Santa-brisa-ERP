export function safeIdPart(s: string) {
  return String(s ?? "").replaceAll("/", "~");
}
export function makeOnHandId(itemId: string, lotNumber: string, locationId: string) {
  return `${itemId}|${lotNumber}|${safeIdPart(locationId)}`;
}
