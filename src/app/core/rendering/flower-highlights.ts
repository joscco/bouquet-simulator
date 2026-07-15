/**
 * Komponenten werden beim Rendern als `komponente::innerer-knoten`
 * materialisiert. Eine Auswahl des sichtbaren Komponentenknotens markiert
 * deshalb auch alle aus seinen internen Templates erzeugten Geometrien.
 */
export function isFlowerTemplateHighlighted(
  templateId: string,
  highlightedNodeIds: ReadonlySet<string>,
): boolean {
  for (const highlightedId of highlightedNodeIds) {
    if (templateId === highlightedId || templateId.startsWith(`${highlightedId}::`)) {
      return true;
    }
  }
  return false;
}
