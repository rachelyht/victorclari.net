import { uid } from './util.js'

const DB_NAME = 'excerpt-deck'
const DB_VERSION = 1
const PROJECTS = 'projects'
const BLOBS = 'blobs'
const SETTINGS = 'settings'

let dbPromise = null

function open() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(PROJECTS)) db.createObjectStore(PROJECTS, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS)
      if (!db.objectStoreNames.contains(SETTINGS)) db.createObjectStore(SETTINGS)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return dbPromise
}

function run(storeName, mode, action) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode)
        const request = action(tx.objectStore(storeName))
        tx.onabort = () => reject(tx.error)
        tx.oncomplete = () => resolve(request ? request.result : undefined)
        if (request) request.onerror = () => reject(request.error)
      })
  )
}

export const listProjects = () =>
  run(PROJECTS, 'readonly', (store) => store.getAll()).then((rows) =>
    rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  )

export const getProject = (id) => run(PROJECTS, 'readonly', (store) => store.get(id))

export const putProject = (project) =>
  run(PROJECTS, 'readwrite', (store) => store.put(project)).then(() => project)

export const deleteProject = (id) => run(PROJECTS, 'readwrite', (store) => store.delete(id))

export const getBlob = (key) => run(BLOBS, 'readonly', (store) => store.get(key))

export async function putBlob(blob) {
  const key = uid('blob')
  await run(BLOBS, 'readwrite', (store) => store.put(blob, key))
  return key
}

export const deleteBlob = (key) => run(BLOBS, 'readwrite', (store) => store.delete(key))

export const getSetting = (key) => run(SETTINGS, 'readonly', (store) => store.get(key))

export const setSetting = (key, value) =>
  run(SETTINGS, 'readwrite', (store) => store.put(value, key))

/** Ask the browser not to evict our drafts. Safari clears non-persisted storage aggressively. */
export async function requestPersistence() {
  if (!navigator.storage?.persist) return null
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return null
  }
}

export async function estimateUsage() {
  if (!navigator.storage?.estimate) return null
  try {
    return await navigator.storage.estimate()
  } catch {
    return null
  }
}
