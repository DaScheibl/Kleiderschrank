// Meldet lokale Änderungen, damit der Sync sie zeitnah hochlädt – ohne dass die
// Datenschicht den Sync-Dienst kennen muss.
const listeners = new Set<() => void>();

export function notifyLocalChange(): void {
  listeners.forEach((l) => l());
}

export function onLocalChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
