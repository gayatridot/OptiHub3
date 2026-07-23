// NOTE: These constants are also inlined directly into worker.js
// because relative imports fail when worker.js is loaded as a blob: URL.
// Keep this file and worker.js in sync.

export const MIME_TYPE_JAVASCRIPT = "text/javascript";
export const MIME_TYPE_WASM = "application/wasm";
export const CORE_VERSION = "0.12.6";
export const CORE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm/ffmpeg-core.js`;

export const FFMessageType = {
    LOAD:        "LOAD",
    EXEC:        "EXEC",
    WRITE_FILE:  "WRITE_FILE",
    READ_FILE:   "READ_FILE",
    DELETE_FILE: "DELETE_FILE",
    RENAME:      "RENAME",
    CREATE_DIR:  "CREATE_DIR",
    LIST_DIR:    "LIST_DIR",
    DELETE_DIR:  "DELETE_DIR",
    ERROR:       "ERROR",
    DOWNLOAD:    "DOWNLOAD",
    PROGRESS:    "PROGRESS",
    LOG:         "LOG",
};
