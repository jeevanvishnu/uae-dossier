import { ZipArchive } from "archiver";
import * as archiverModule from "archiver";
import { Writable } from "stream";
import { downloadBufferFromR2 } from "./r2.service";
import axios from "axios";
import { calculateMD5 } from "../utils/crypto.util";
import { ProjectDocument, Project, DossierConfig } from "../db/schema";
import {
  resolveUaeDocumentPaths,
  generateUaeRegionalXml,
  generateUaeEctdIndexXml,
  getUaeEctdFolderPath,
  sanitizeEctdFileName,
} from "./uae-manifest.service";
import {
  ICH_ECTD_3_2_DTD,
  GCC_REGIONAL_DTD,
  GCC_REGIONAL_XSL,
} from "../constants/ectdUtilFiles";

/**
 * Concurrency helper to download files without pulling in ESM-only limiters
 */
async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Helper to escape special XML characters.
 */
function xmlEscape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Sanitizes file names for file system and XML output while preserving Cyrillic and original characters.
 * Removes invalid path characters like < > : " / \ | ? *.
 * E.g., "Сорбит ОХЛП ЕАЭС_18.04.2025.pdf" -> "Сорбит ОХЛП ЕАЭС_18.04.2025.pdf"
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return "";
  return fileName.trim().replace(/[<>:"/\\|?*]+/g, "");
}

/**
 * Sanitizes sequence input into a strict 4-digit integer string (e.g., "0000").
 * Strips out text like "Sequence 0000" or raw numbers like "1" -> "0001".
 */
export function sanitizeSequence(rawSeq?: string | null): string {
  if (!rawSeq) return "0000";
  const digits = rawSeq.replace(/\D/g, "");
  if (!digits) return "0000";
  return digits.slice(-4).padStart(4, "0");
}

import { findCtdDocCodeEntry } from "../constants/ctdDocCodes";

/**
 * Maps a document's eCTD nodeId (or docCode) to verbatim Windows-style eCTD directory path (e.g. 'm1\1.3\1.3.1').
 * Returns exact folderPath WITHOUT a trailing backslash.
 */
export function getEctdFolderPath(nodeId: string, _countryStr?: string | null, _docCode?: string): string {
  return getUaeEctdFolderPath(nodeId);
}

export interface CompilationResult {
  zipBuffer: Buffer;
  xmlChecksum: string;
  zipChecksum: string;
  fullName: string;
  size: number;
}

function createZipArchive(options?: any) {
  if (typeof ZipArchive === "function") {
    return new ZipArchive(options);
  }
  const mod = archiverModule as any;
  if (mod && typeof mod.ZipArchive === "function") {
    return new mod.ZipArchive(options);
  }
  if (typeof mod === "function") {
    return mod("zip", options);
  }
  if (mod && mod.default && typeof mod.default === "function") {
    return mod.default("zip", options);
  }
  throw new Error("Unable to instantiate archiver ZipArchive instance.");
}

/**
 * Compiles active project documents and generated UAE MOHAP / GCC eCTD index.xml & ae-regional.xml into an in-memory ZIP archive.
 */
export async function compileEctdPackage(
  project: Project,
  config: DossierConfig | null,
  documents: ProjectDocument[]
): Promise<CompilationResult> {
  const sequenceStr = sanitizeSequence(config?.dossierSequence);

  // Filter valid documents (sequence 0000 only includes active documents)
  const validDocs = sequenceStr === "0000"
    ? documents.filter((d) => d.status === "active")
    : documents.filter((d) => d.status === "active" || (d.status === "deleted" && d.sequence !== "0000"));

  // 1. Concurrently download physical document buffers (filtering out 'delete' tombstones)
  const docsToDownload = validDocs.filter(
    (d) => d.status !== "deleted" && d.operation !== "delete" && (!!d.storageKey || !!d.storageUrl)
  );

  const downloadedDocs = await mapConcurrent(docsToDownload, 5, async (doc) => {
    try {
      const keyOrUrl = doc.storageKey || doc.storageUrl!;
      let buffer: Buffer;
      if (keyOrUrl.startsWith("http://") || keyOrUrl.startsWith("https://")) {
        const response = await axios.get(keyOrUrl, { responseType: "arraybuffer", timeout: 30000 });
        buffer = Buffer.from(response.data);
      } else {
        buffer = await downloadBufferFromR2(keyOrUrl);
      }
      const realMd5 = calculateMD5(buffer);
      return { doc: { ...doc, md5Checksum: realMd5 }, buffer };
    } catch (err: any) {
      throw new Error(`Failed to download document "${doc.originalName}" (${doc.nodeId}): ${err.message}`);
    }
  });

  // Map updated documents with their real computed MD5 checksums
  const updatedDocuments = validDocs.map((d) => {
    const downloaded = downloadedDocs.find((item) => item.doc.id === d.id);
    return downloaded ? downloaded.doc : d;
  });

  // 2. Resolve UAE eCTD paths and generate ae-regional.xml + index.xml with verified file checksums
  const resolvedPaths = resolveUaeDocumentPaths(updatedDocuments, sanitizeEctdFileName);
  const regionalXmlContent = generateUaeRegionalXml(project, config, updatedDocuments, resolvedPaths, {
    sanitizeSequenceFn: sanitizeSequence,
  });
  const regionalXmlChecksum = calculateMD5(regionalXmlContent);

  const indexXmlContent = generateUaeEctdIndexXml(
    project,
    config,
    updatedDocuments,
    resolvedPaths,
    regionalXmlChecksum
  );
  const xmlChecksum = calculateMD5(indexXmlContent);

  // 3. Construct ZIP Archive entirely in memory under <sequence>/
  const archive = createZipArchive({ zlib: { level: 9 } });
  const chunks: Buffer[] = [];

  const bufferStream = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      callback();
    },
  });

  const streamFinished = new Promise<void>((resolve, reject) => {
    bufferStream.on("finish", resolve);
    bufferStream.on("error", reject);
  });

  // Pipe zip archive stream into buffer stream
  archive.pipe(bufferStream);

  // Append UAE eCTD backbone XMLs, index-md5.txt, and util/ DTD & stylesheet files
  archive.append(Buffer.from(indexXmlContent, "utf-8"), { name: `${sequenceStr}/index.xml` });
  archive.append(Buffer.from(xmlChecksum, "utf-8"), { name: `${sequenceStr}/index-md5.txt` });
  archive.append(Buffer.from(regionalXmlContent, "utf-8"), { name: `${sequenceStr}/m1/ae/ae-regional.xml` });
  archive.append(Buffer.from(ICH_ECTD_3_2_DTD, "utf-8"), { name: `${sequenceStr}/util/dtd/ich-ectd-3-2.dtd` });
  archive.append(Buffer.from(GCC_REGIONAL_DTD, "utf-8"), { name: `${sequenceStr}/util/dtd/gcc-regional.dtd` });
  archive.append(Buffer.from(GCC_REGIONAL_XSL, "utf-8"), { name: `${sequenceStr}/util/style/gcc-regional.xsl` });

  // Append physical documents into their respective UAE eCTD folders
  for (let i = 0; i < downloadedDocs.length; i++) {
    const { doc, buffer } = downloadedDocs[i];
    const resolved = resolvedPaths.get(doc.id || String(i));
    if (!resolved) continue;
    archive.append(buffer, { name: `${sequenceStr}/${resolved.relativeZipPath}` });
  }

  await archive.finalize();
  await streamFinished;

  // Wait for stream write completion
  const zipBuffer = Buffer.concat(chunks);
  const zipChecksum = calculateMD5(zipBuffer);
  const fullName = `${project.projectCode}_${sequenceStr}_${Date.now()}.zip`;

  return {
    zipBuffer,
    xmlChecksum,
    zipChecksum,
    fullName,
    size: zipBuffer.length,
  };
}


