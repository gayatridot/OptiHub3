/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// ─── Inlined constants (formerly ./const.js) ─────────────────────────────────
// These are inlined so this file works correctly when loaded as a blob: URL.
// Relative imports (./const.js, ./errors.js) fail from a blob: origin because
// the browser resolves them against blob:null/... which is unreachable.
const CORE_URL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js";

const FFMessageType = {
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

// ─── Inlined errors (formerly ./errors.js) ───────────────────────────────────
const ERROR_UNKNOWN_MESSAGE_TYPE = new Error("unknown message type");
const ERROR_NOT_LOADED           = new Error("ffmpeg is not loaded, call `await ffmpeg.load()` first");
const ERROR_IMPORT_FAILURE       = new Error("failed to import ffmpeg-core.js");

// ─── Worker logic ─────────────────────────────────────────────────────────────
let ffmpeg;

const load = async ({ coreURL: _coreURL = CORE_URL, wasmURL: _wasmURL, workerURL: _workerURL }) => {
    const first   = !ffmpeg;
    const coreURL = _coreURL;
    const wasmURL = _wasmURL   ? _wasmURL   : _coreURL.replace(/\.js$/g, ".wasm");
    const workerURL = _workerURL ? _workerURL : _coreURL.replace(/\.js$/g, ".worker.js");

    try {
        // Classic worker path — will throw in a module worker context
        importScripts(coreURL);
    } catch {
        // Module worker path
        self.createFFmpegCore = (await import(/* webpackIgnore: true */ coreURL)).default;
        if (!self.createFFmpegCore) {
            throw ERROR_IMPORT_FAILURE;
        }
    }

    ffmpeg = await self.createFFmpegCore({
        // Encode wasmURL + workerURL in the hash so locateFile resolves correctly
        mainScriptUrlOrBlob: `${coreURL}#${btoa(JSON.stringify({ wasmURL, workerURL }))}`,
    });

    ffmpeg.setLogger(  (data) => self.postMessage({ type: FFMessageType.LOG,      data }));
    ffmpeg.setProgress((data) => self.postMessage({ type: FFMessageType.PROGRESS, data }));

    return first;
};

const exec       = ({ args, timeout = -1 }) => { ffmpeg.setTimeout(timeout); ffmpeg.exec(...args); const ret = ffmpeg.ret; ffmpeg.reset(); return ret; };
const writeFile  = ({ path, data })         => { ffmpeg.FS.writeFile(path, data); return true; };
const readFile   = ({ path, encoding })     =>   ffmpeg.FS.readFile(path, { encoding });
const deleteFile = ({ path })               => { ffmpeg.FS.unlink(path); return true; };
const rename     = ({ oldPath, newPath })   => { ffmpeg.FS.rename(oldPath, newPath); return true; };
const createDir  = ({ path })               => { ffmpeg.FS.mkdir(path); return true; };
const deleteDir  = ({ path })               => { ffmpeg.FS.rmdir(path); return true; };
const listDir    = ({ path }) => {
    const names = ffmpeg.FS.readdir(path);
    return names.map(name => {
        const stat  = ffmpeg.FS.stat(`${path}/${name}`);
        const isDir = ffmpeg.FS.isDir(stat.mode);
        return { name, isDir };
    });
};

self.onmessage = async ({ data: { id, type, data: _data } }) => {
    const trans = [];
    let data;
    try {
        if (type !== FFMessageType.LOAD && !ffmpeg) throw ERROR_NOT_LOADED;
        switch (type) {
            case FFMessageType.LOAD:        data = await load(_data);    break;
            case FFMessageType.EXEC:        data = exec(_data);          break;
            case FFMessageType.WRITE_FILE:  data = writeFile(_data);     break;
            case FFMessageType.READ_FILE:   data = readFile(_data);      break;
            case FFMessageType.DELETE_FILE: data = deleteFile(_data);    break;
            case FFMessageType.RENAME:      data = rename(_data);        break;
            case FFMessageType.CREATE_DIR:  data = createDir(_data);     break;
            case FFMessageType.LIST_DIR:    data = listDir(_data);       break;
            case FFMessageType.DELETE_DIR:  data = deleteDir(_data);     break;
            default: throw ERROR_UNKNOWN_MESSAGE_TYPE;
        }
    } catch (e) {
        self.postMessage({ id, type: FFMessageType.ERROR, data: e.toString() });
        return;
    }
    if (data instanceof Uint8Array) trans.push(data.buffer);
    self.postMessage({ id, type, data }, trans);
};
