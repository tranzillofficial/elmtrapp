// Documents stay in IndexedDB in demo mode; never in localStorage.
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("elmtrapp-documents", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function localFile(
  key: string,
  file?: Blob,
): Promise<Blob | undefined> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("files", file ? "readwrite" : "readonly");
    const s = tx.objectStore("files");
    const r = file ? s.put(file, key) : s.get(key);
    r.onsuccess = () => {
      if (!file) resolve(r.result);
    };
    tx.oncomplete = () => {
      d.close();
      if (file) resolve(file);
    };
    tx.onerror = () => {
      d.close();
      reject(tx.error);
    };
  });
}
export async function removeLocalFile(key: string) {
  const d = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction("files", "readwrite");
    tx.objectStore("files").delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  d.close();
}
