import { create } from "xmlbuilder2";
import { Project, DossierConfig, ProjectDocument } from "../db/schema";

export interface UaeManifestHelpers {
  sanitizeFileNameFn?: (fileName: string) => string;
  sanitizeSequenceFn: (rawSeq?: string | null) => string;
}

export interface UaeResolvedDocumentPath {
  cleanNodeId: string;
  moduleNumber: string;
  effectiveDocName: string;
  relativeZipPath: string;
}

const GCC_M1_FOLDER_MAP: Record<string, string> = {
  // 1.0 Cover Letter
  "1.0": "m1/ae/10-cover",
  // 1.2 Application Form & Administrative Certificates
  "1.2": "m1/ae/12-form",
  "1.2.1": "m1/ae/12-form",
  "1.2.2": "m1/ae/12-form",
  "1.2.3": "m1/ae/12-form",
  "1.2.4": "m1/ae/12-form",
  "1.2.5": "m1/ae/12-form",
  "1.2.6": "m1/ae/12-form",
  "1.2.7": "m1/ae/12-form",
  "1.2.8": "m1/ae/12-form",
  "1.2.9": "m1/ae/12-form",
  "1.2.10": "m1/ae/12-form",
  "1.2.11": "m1/ae/12-form",
  "1.2.12": "m1/ae/12-form",
  // 1.3 Product Information
  "1.3": "m1/ae/13-pi",
  "1.3.1": "m1/ae/13-pi/131-spc",
  "1.3.2": "m1/ae/13-pi/132-pil",
  "1.3.2.1": "m1/ae/13-pi/132-pil/en",
  "1.3.2.2": "m1/ae/13-pi/132-pil/ar",
  "1.3.3": "m1/ae/13-pi/133-mockup",
  "1.3.3.1": "m1/ae/13-pi/133-mockup",
  "1.3.3.2": "m1/ae/13-pi/133-mockup",
  "1.3.4": "m1/ae/13-pi/134-ref-pi",
  // 1.4 Information about the Experts
  "1.4": "m1/ae/14-expert",
  "1.4.1": "m1/ae/14-expert/141-quality",
  "1.4.2": "m1/ae/14-expert/142-nonclinical",
  "1.4.3": "m1/ae/14-expert/143-clinical",
  // 1.5 Specific Requirements for Different Types of Applications
  "1.5": "m1/ae/15-specific",
  "1.5.1": "m1/ae/15-specific/151-biblio",
  "1.5.2": "m1/ae/15-specific/152-generic",
  "1.5.3": "m1/ae/15-specific/153-exclusivity",
  // 1.6 Environmental Risk Assessment
  "1.6": "m1/ae/16-environrisk",
  "1.6.1": "m1/ae/16-environrisk/161-non-gmo",
  "1.6.2": "m1/ae/16-environrisk/162-gmo",
  // 1.7 Pharmacovigilance
  "1.7": "m1/ae/17-phvig",
  "1.7.1": "m1/ae/17-phvig/171-psmf",
  "1.7.2": "m1/ae/17-phvig/172-rmp",
  "1.7.3": "m1/ae/17-phvig/173-qppv",
  // 1.8 Responses to Questions
  "1.8": "m1/ae/18-responses",
};

const ICH_M2_TO_M5_FOLDER_MAP: Record<string, string> = {
  // Module 2 — CTD Summaries
  "2.1": "m2/21-toc",
  "2.2": "m2/22-intro",
  "2.3": "m2/23-qos",
  "2.3.S": "m2/23-qos",
  "2.3.S.1": "m2/23-qos",
  "2.3.S.2": "m2/23-qos",
  "2.3.S.3": "m2/23-qos",
  "2.3.S.4": "m2/23-qos",
  "2.3.S.5": "m2/23-qos",
  "2.3.S.6": "m2/23-qos",
  "2.3.S.7": "m2/23-qos",
  "2.3.P": "m2/23-qos",
  "2.3.P.1": "m2/23-qos",
  "2.3.P.2": "m2/23-qos",
  "2.3.P.3": "m2/23-qos",
  "2.3.P.4": "m2/23-qos",
  "2.3.P.5": "m2/23-qos",
  "2.3.P.6": "m2/23-qos",
  "2.3.P.7": "m2/23-qos",
  "2.3.P.8": "m2/23-qos",
  "2.3.A": "m2/23-qos",
  "2.3.A.1": "m2/23-qos",
  "2.3.A.2": "m2/23-qos",
  "2.3.A.3": "m2/23-qos",
  "2.3.R": "m2/23-qos",
  "2.4": "m2/24-nonclin-over",
  "2.5": "m2/25-clin-over",
  "2.6": "m2/26-nonclin-sum",
  "2.6.1": "m2/26-nonclin-sum",
  "2.6.2": "m2/26-nonclin-sum",
  "2.6.3": "m2/26-nonclin-sum",
  "2.6.4": "m2/26-nonclin-sum",
  "2.6.5": "m2/26-nonclin-sum",
  "2.6.6": "m2/26-nonclin-sum",
  "2.6.7": "m2/26-nonclin-sum",
  "2.7": "m2/27-clin-sum",
  "2.7.1": "m2/27-clin-sum",
  "2.7.2": "m2/27-clin-sum",
  "2.7.3": "m2/27-clin-sum",
  "2.7.4": "m2/27-clin-sum",
  "2.7.5": "m2/27-clin-sum",
  "2.7.6": "m2/27-clin-sum",

  // Module 3 — Quality
  "3.1": "m3/31-toc",
  "3.2": "m3/32-body-data",
  "3.2.S": "m3/32-body-data/32s-drug-sub",
  "3.2.S.1": "m3/32-body-data/32s-drug-sub/32s1-gen-info",
  "3.2.S.1.1": "m3/32-body-data/32s-drug-sub/32s1-gen-info",
  "3.2.S.1.2": "m3/32-body-data/32s-drug-sub/32s1-gen-info",
  "3.2.S.1.3": "m3/32-body-data/32s-drug-sub/32s1-gen-info",
  "3.2.S.2": "m3/32-body-data/32s-drug-sub/32s2-manuf",
  "3.2.S.2.1": "m3/32-body-data/32s-drug-sub/32s2-manuf",
  "3.2.S.2.2": "m3/32-body-data/32s-drug-sub/32s2-manuf",
  "3.2.S.2.3": "m3/32-body-data/32s-drug-sub/32s2-manuf",
  "3.2.S.2.4": "m3/32-body-data/32s-drug-sub/32s2-manuf",
  "3.2.S.2.5": "m3/32-body-data/32s-drug-sub/32s2-manuf",
  "3.2.S.2.6": "m3/32-body-data/32s-drug-sub/32s2-manuf",
  "3.2.S.3": "m3/32-body-data/32s-drug-sub/32s3-charac",
  "3.2.S.3.1": "m3/32-body-data/32s-drug-sub/32s3-charac",
  "3.2.S.3.2": "m3/32-body-data/32s-drug-sub/32s3-charac",
  "3.2.S.4": "m3/32-body-data/32s-drug-sub/32s4-contr-drug-sub",
  "3.2.S.4.1": "m3/32-body-data/32s-drug-sub/32s4-contr-drug-sub",
  "3.2.S.4.2": "m3/32-body-data/32s-drug-sub/32s4-contr-drug-sub",
  "3.2.S.4.3": "m3/32-body-data/32s-drug-sub/32s4-contr-drug-sub",
  "3.2.S.4.4": "m3/32-body-data/32s-drug-sub/32s4-contr-drug-sub",
  "3.2.S.4.5": "m3/32-body-data/32s-drug-sub/32s4-contr-drug-sub",
  "3.2.S.5": "m3/32-body-data/32s-drug-sub/32s5-ref-stand",
  "3.2.S.6": "m3/32-body-data/32s-drug-sub/32s6-cont-clos-sys",
  "3.2.S.7": "m3/32-body-data/32s-drug-sub/32s7-stab",
  "3.2.S.7.1": "m3/32-body-data/32s-drug-sub/32s7-stab",
  "3.2.S.7.2": "m3/32-body-data/32s-drug-sub/32s7-stab",
  "3.2.S.7.3": "m3/32-body-data/32s-drug-sub/32s7-stab",
  "3.2.P": "m3/32-body-data/32p-drug-prod",
  "3.2.P.1": "m3/32-body-data/32p-drug-prod/32p1-desc-comp",
  "3.2.P.2": "m3/32-body-data/32p-drug-prod/32p2-pharm-dev",
  "3.2.P.2.1": "m3/32-body-data/32p-drug-prod/32p2-pharm-dev",
  "3.2.P.2.1.1": "m3/32-body-data/32p-drug-prod/32p2-pharm-dev",
  "3.2.P.2.1.2": "m3/32-body-data/32p-drug-prod/32p2-pharm-dev",
  "3.2.P.2.2": "m3/32-body-data/32p-drug-prod/32p2-pharm-dev",
  "3.2.P.2.2.1": "m3/32-body-data/32p-drug-prod/32p2-pharm-dev",
  "3.2.P.2.2.2": "m3/32-body-data/32p-drug-prod/32p2-pharm-dev",
  "3.2.P.2.2.3": "m3/32-body-data/32p-drug-prod/32p2-pharm-dev",
  "3.2.P.2.3": "m3/32-body-data/32p-drug-prod/32p2-pharm-dev",
  "3.2.P.2.4": "m3/32-body-data/32p-drug-prod/32p2-pharm-dev",
  "3.2.P.2.5": "m3/32-body-data/32p-drug-prod/32p2-pharm-dev",
  "3.2.P.2.6": "m3/32-body-data/32p-drug-prod/32p2-pharm-dev",
  "3.2.P.3": "m3/32-body-data/32p-drug-prod/32p3-manuf",
  "3.2.P.3.1": "m3/32-body-data/32p-drug-prod/32p3-manuf",
  "3.2.P.3.2": "m3/32-body-data/32p-drug-prod/32p3-manuf",
  "3.2.P.3.3": "m3/32-body-data/32p-drug-prod/32p3-manuf",
  "3.2.P.3.4": "m3/32-body-data/32p-drug-prod/32p3-manuf",
  "3.2.P.3.5": "m3/32-body-data/32p-drug-prod/32p3-manuf",
  "3.2.P.4": "m3/32-body-data/32p-drug-prod/32p4-contr-excip",
  "3.2.P.4.1": "m3/32-body-data/32p-drug-prod/32p4-contr-excip",
  "3.2.P.4.2": "m3/32-body-data/32p-drug-prod/32p4-contr-excip",
  "3.2.P.4.3": "m3/32-body-data/32p-drug-prod/32p4-contr-excip",
  "3.2.P.4.4": "m3/32-body-data/32p-drug-prod/32p4-contr-excip",
  "3.2.P.4.5": "m3/32-body-data/32p-drug-prod/32p4-contr-excip",
  "3.2.P.4.6": "m3/32-body-data/32p-drug-prod/32p4-contr-excip",
  "3.2.P.5": "m3/32-body-data/32p-drug-prod/32p5-contr-drug-prod",
  "3.2.P.5.1": "m3/32-body-data/32p-drug-prod/32p5-contr-drug-prod",
  "3.2.P.5.2": "m3/32-body-data/32p-drug-prod/32p5-contr-drug-prod",
  "3.2.P.5.3": "m3/32-body-data/32p-drug-prod/32p5-contr-drug-prod",
  "3.2.P.5.4": "m3/32-body-data/32p-drug-prod/32p5-contr-drug-prod",
  "3.2.P.5.5": "m3/32-body-data/32p-drug-prod/32p5-contr-drug-prod",
  "3.2.P.5.6": "m3/32-body-data/32p-drug-prod/32p5-contr-drug-prod",
  "3.2.P.6": "m3/32-body-data/32p-drug-prod/32p6-ref-stand",
  "3.2.P.7": "m3/32-body-data/32p-drug-prod/32p7-cont-clos-sys",
  "3.2.P.8": "m3/32-body-data/32p-drug-prod/32p8-stab",
  "3.2.P.8.1": "m3/32-body-data/32p-drug-prod/32p8-stab",
  "3.2.P.8.2": "m3/32-body-data/32p-drug-prod/32p8-stab",
  "3.2.P.8.3": "m3/32-body-data/32p-drug-prod/32p8-stab",
  "3.2.A": "m3/32-body-data/32a-app",
  "3.2.A.1": "m3/32-body-data/32a-app/32a1-fac-equip",
  "3.2.A.2": "m3/32-body-data/32a-app/32a2-adv-ag",
  "3.2.A.3": "m3/32-body-data/32a-app/32a3-excip",
  "3.2.R": "m3/32-body-data/32r-reg-info",
  "3.3": "m3/33-lit-ref",

  // Module 4 — Non-Clinical Study Reports
  "4.1": "m4/41-toc",
  "4.2": "m4/42-stud-rep",
  "4.2.1": "m4/42-stud-rep/421-pharmacol",
  "4.2.1.1": "m4/42-stud-rep/421-pharmacol/4211-prim-pd",
  "4.2.1.2": "m4/42-stud-rep/421-pharmacol/4212-sec-pd",
  "4.2.1.3": "m4/42-stud-rep/421-pharmacol/4213-safety-pharmacol",
  "4.2.1.4": "m4/42-stud-rep/421-pharmacol/4214-pd-drug-int",
  "4.2.2": "m4/42-stud-rep/422-pk",
  "4.2.2.1": "m4/42-stud-rep/422-pk/4221-analyt-meth",
  "4.2.2.2": "m4/42-stud-rep/422-pk/4222-absorp",
  "4.2.2.3": "m4/42-stud-rep/422-pk/4223-distrib",
  "4.2.2.4": "m4/42-stud-rep/422-pk/4224-metab",
  "4.2.2.5": "m4/42-stud-rep/422-pk/4225-excr",
  "4.2.2.6": "m4/42-stud-rep/422-pk/4226-pk-drug-int",
  "4.2.2.7": "m4/42-stud-rep/422-pk/4227-oth-pk-stud",
  "4.2.3": "m4/42-stud-rep/423-tox",
  "4.2.3.1": "m4/42-stud-rep/423-tox/4231-single-dose-tox",
  "4.2.3.2": "m4/42-stud-rep/423-tox/4232-rep-dose-tox",
  "4.2.3.3": "m4/42-stud-rep/423-tox/4233-genotox",
  "4.2.3.3.1": "m4/42-stud-rep/423-tox/4233-genotox/42331-in-vitro",
  "4.2.3.3.2": "m4/42-stud-rep/423-tox/4233-genotox/42332-in-vivo",
  "4.2.3.4": "m4/42-stud-rep/423-tox/4234-carcigen",
  "4.2.3.4.1": "m4/42-stud-rep/423-tox/4234-carcigen/42341-lt-stud",
  "4.2.3.4.2": "m4/42-stud-rep/423-tox/4234-carcigen/42342-smt-stud",
  "4.2.3.4.3": "m4/42-stud-rep/423-tox/4234-carcigen/42343-oth-stud",
  "4.2.3.5": "m4/42-stud-rep/423-tox/4235-repro-dev-tox",
  "4.2.3.5.1": "m4/42-stud-rep/423-tox/4235-repro-dev-tox/42351-fert-embryo-dev",
  "4.2.3.5.2": "m4/42-stud-rep/423-tox/4235-repro-dev-tox/42352-embryo-fetal-dev",
  "4.2.3.5.3": "m4/42-stud-rep/423-tox/4235-repro-dev-tox/42353-pre-postnatal-dev",
  "4.2.3.5.4": "m4/42-stud-rep/423-tox/4235-repro-dev-tox/42354-juv-stud",
  "4.2.3.6": "m4/42-stud-rep/423-tox/4236-loc-tol",
  "4.2.3.7": "m4/42-stud-rep/423-tox/4237-oth-tox-stud",
  "4.2.3.7.1": "m4/42-stud-rep/423-tox/4237-oth-tox-stud/42371-antigen",
  "4.2.3.7.2": "m4/42-stud-rep/423-tox/4237-oth-tox-stud/42372-immunotox",
  "4.2.3.7.3": "m4/42-stud-rep/423-tox/4237-oth-tox-stud/42373-mech-stud",
  "4.2.3.7.4": "m4/42-stud-rep/423-tox/4237-oth-tox-stud/42374-depend",
  "4.2.3.7.5": "m4/42-stud-rep/423-tox/4237-oth-tox-stud/42375-metab",
  "4.2.3.7.6": "m4/42-stud-rep/423-tox/4237-oth-tox-stud/42376-impur",
  "4.2.3.7.7": "m4/42-stud-rep/423-tox/4237-oth-tox-stud/42377-oth",
  "4.3": "m4/43-lit-ref",

  // Module 5 — Clinical Study Reports
  "5.1": "m5/51-toc",
  "5.2": "m5/52-tab-list",
  "5.3": "m5/53-clin-stud-rep",
  "5.3.1": "m5/53-clin-stud-rep/531-rep-biopharm-stud",
  "5.3.1.1": "m5/53-clin-stud-rep/531-rep-biopharm-stud/5311-ba-stud-rep",
  "5.3.1.2": "m5/53-clin-stud-rep/531-rep-biopharm-stud/5312-compar-ba-be-stud-rep",
  "5.3.1.3": "m5/53-clin-stud-rep/531-rep-biopharm-stud/5313-in-vitro-in-vivo-corr-stud-rep",
  "5.3.1.4": "m5/53-clin-stud-rep/531-rep-biopharm-stud/5314-bioanalyt-analyt-meth",
  "5.3.2": "m5/53-clin-stud-rep/532-rep-stud-pk-hum-biomat",
  "5.3.2.1": "m5/53-clin-stud-rep/532-rep-stud-pk-hum-biomat/5321-plasm-prot-bind-stud-rep",
  "5.3.2.2": "m5/53-clin-stud-rep/532-rep-stud-pk-hum-biomat/5322-hep-metab-drug-int-stud-rep",
  "5.3.2.3": "m5/53-clin-stud-rep/532-rep-stud-pk-hum-biomat/5323-stud-oth-hum-biomat",
  "5.3.3": "m5/53-clin-stud-rep/533-rep-hum-pk-stud",
  "5.3.3.1": "m5/53-clin-stud-rep/533-rep-hum-pk-stud/5331-hlthy-subj-pk-init-tol-stud-rep",
  "5.3.3.2": "m5/53-clin-stud-rep/533-rep-hum-pk-stud/5332-pat-pk-init-tol-stud-rep",
  "5.3.3.3": "m5/53-clin-stud-rep/533-rep-hum-pk-stud/5333-intrin-fact-pk-stud-rep",
  "5.3.3.4": "m5/53-clin-stud-rep/533-rep-hum-pk-stud/5334-extrin-fact-pk-stud-rep",
  "5.3.3.5": "m5/53-clin-stud-rep/533-rep-hum-pk-stud/5335-pop-pk-stud-rep",
  "5.3.4": "m5/53-clin-stud-rep/534-rep-hum-pd-stud",
  "5.3.4.1": "m5/53-clin-stud-rep/534-rep-hum-pd-stud/5341-hlthy-subj-pd-pk-pd-stud-rep",
  "5.3.4.2": "m5/53-clin-stud-rep/534-rep-hum-pd-stud/5342-pat-pd-pk-pd-stud-rep",
  "5.3.5": "m5/53-clin-stud-rep/535-rep-effic-safety-stud",
  "5.3.5.1": "m5/53-clin-stud-rep/535-rep-effic-safety-stud/5351-stud-rep-contr",
  "5.3.5.2": "m5/53-clin-stud-rep/535-rep-effic-safety-stud/5352-stud-rep-uncontr",
  "5.3.5.3": "m5/53-clin-stud-rep/535-rep-effic-safety-stud/5353-rep-analys-data-more-one-stud",
  "5.3.5.4": "m5/53-clin-stud-rep/535-rep-effic-safety-stud/5354-oth-stud-rep",
  "5.3.6": "m5/53-clin-stud-rep/536-rep-postmark-exp",
  "5.3.7": "m5/53-clin-stud-rep/537-crf-ipl",
  "5.3.7.1": "m5/53-clin-stud-rep/537-crf-ipl",
  "5.3.7.2": "m5/53-clin-stud-rep/537-crf-ipl",
  "5.4": "m5/54-lit-ref",
};

/**
 * Normalizes country strings to 2-letter ISO code, defaulting to "AE" (United Arab Emirates).
 */
export function normalizeUaeCountryCode(countryStr?: string | null): string {
  if (!countryStr) return "AE";
  const cleaned = countryStr.trim().toUpperCase();
  if (cleaned.includes("UNITED ARAB EMIRATES") || cleaned === "AE" || cleaned === "UAE") return "AE";
  if (cleaned.includes("SAUDI") || cleaned === "SA") return "SA";
  if (cleaned.includes("KUWAIT") || cleaned === "KW") return "KW";
  if (cleaned.includes("QATAR") || cleaned === "QA") return "QA";
  if (cleaned.includes("BAHRAIN") || cleaned === "BH") return "BH";
  if (cleaned.includes("OMAN") || cleaned === "OM") return "OM";
  return cleaned.length >= 2 ? cleaned.slice(0, 2) : "AE";
}

/**
 * Maps database document status to ICH/UAE eCTD operation attribute.
 */
export function mapUaeOperationAttribute(status?: string | null): "new" | "replace" | "delete" {
  if (status === "superseded") return "replace";
  if (status === "deleted") return "delete";
  return "new";
}

/**
 * Sanitizes an uploaded filename to strict ICH/GCC eCTD lowercase ASCII format:
 * - Only `a-z`, `0-9`, and `-` in the stem
 * - No spaces, parentheses, or uppercase letters
 * - E.g. "XML_Website_Plan (4).pdf" -> "xml-website-plan-4.pdf"
 */
export function sanitizeEctdFileName(fileName: string): string {
  if (!fileName || !fileName.trim()) return "document.pdf";
  const trimmed = fileName.trim();
  const extMatch = trimmed.match(/\.[a-zA-Z0-9]+$/);
  const rawExt = extMatch ? extMatch[0].toLowerCase() : ".pdf";
  const rawStem = extMatch ? trimmed.slice(0, -extMatch[0].length) : trimmed;

  const cleanStem = rawStem
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return `${cleanStem || "document"}${rawExt}`;
}

/**
 * Maps a CTD nodeId to GCC / UAE eCTD folder paths.
 * - Module 1 uses GCC regional names (e.g. `m1/ae/10-cover`, `m1/ae/12-admin-info/121-app-form`)
 * - Modules 2-5 use clean lowercase dot-free eCTD folders (e.g. `m2/23-qos/23s-drug-sub/23s1`)
 */
export function getUaeEctdFolderPath(nodeId: string): string {
  if (!nodeId) return "m1/ae/10-cover";
  const cleanCode = nodeId.replace(/-\d{5}$/, "").replace(/\.+$/, "").trim();

  if (GCC_M1_FOLDER_MAP[cleanCode]) {
    return GCC_M1_FOLDER_MAP[cleanCode];
  }

  if (ICH_M2_TO_M5_FOLDER_MAP[cleanCode]) {
    return ICH_M2_TO_M5_FOLDER_MAP[cleanCode];
  }

  const segments = cleanCode.split(".").filter(Boolean);
  if (segments.length === 0) return "m1/ae/10-cover";

  const moduleNum = segments[0];
  if (moduleNum === "1") {
    const slug = cleanCode.replace(/\./g, "").toLowerCase();
    return `m1/ae/${slug}`;
  }

  const prefix = `m${moduleNum}`;
  if (segments.length === 1) return prefix;

  const cumulativePaths: string[] = [];
  for (let i = 1; i < segments.length; i++) {
    cumulativePaths.push(
      segments
        .slice(0, i + 1)
        .join("")
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
    );
  }

  return `${prefix}/${cumulativePaths.join("/")}`;
}

/**
 * Returns a human-readable title for `<title>` elements in XML.
 */
export function getUaeDocName(originalName: string, nodeId?: string): string {
  if (originalName && originalName.trim().length > 0) {
    return originalName.trim();
  }
  const cleanNode = (nodeId || "document").replace(/-\d{5}$/, "").replace(/\.+$/, "").trim();
  return `${cleanNode || "document"}.pdf`;
}

/**
 * Resolves unique, strict lowercase-ASCII eCTD paths for all documents in a compilation run.
 */
export function resolveUaeDocumentPaths(
  documents: ProjectDocument[],
  _sanitizeFileNameFn?: (fileName: string) => string
): Map<string, UaeResolvedDocumentPath> {
  const seenPaths = new Set<string>();
  const resolved = new Map<string, UaeResolvedDocumentPath>();

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const docKey = doc.id || String(i);
    const cleanNodeId = (doc.nodeId || "1.0").replace(/-\d{5}$/, "").replace(/\.+$/, "").trim();
    const moduleNumber = cleanNodeId.split(".")[0] || "1";
    const folderPath = getUaeEctdFolderPath(doc.nodeId);

    const displayTitle = getUaeDocName(doc.originalName, doc.nodeId);
    const strictFileName = sanitizeEctdFileName(displayTitle);

    let candidateFileName = strictFileName;
    let candidateZipPath = `${folderPath}/${candidateFileName}`;

    if (seenPaths.has(candidateZipPath)) {
      const extMatch = strictFileName.match(/\.[a-z0-9]+$/);
      const ext = extMatch ? extMatch[0] : ".pdf";
      const stem = strictFileName.slice(0, -ext.length);

      let counter = 2;
      while (seenPaths.has(candidateZipPath)) {
        candidateFileName = `${stem}-${counter}${ext}`;
        candidateZipPath = `${folderPath}/${candidateFileName}`;
        counter++;
      }
    }

    seenPaths.add(candidateZipPath);
    resolved.set(docKey, {
      cleanNodeId,
      moduleNumber,
      effectiveDocName: displayTitle,
      relativeZipPath: candidateZipPath,
    });
  }

  return resolved;
}

function detectLanguage(text: string): "ar" | "en" {
  return /[\u0600-\u06FF]/.test(text) ? "ar" : "en";
}

/**
 * Generates the UAE Regional Module 1 XML (m1/ae/ae-regional.xml) with DTD & XSL references.
 */
export function generateUaeRegionalXml(
  project: Project,
  config: DossierConfig | null,
  documents: ProjectDocument[],
  resolvedPaths: Map<string, UaeResolvedDocumentPath>,
  helpers: Pick<UaeManifestHelpers, "sanitizeSequenceFn">
): string {
  const sequenceStr = helpers.sanitizeSequenceFn(config?.dossierSequence);
  const countryCode = normalizeUaeCountryCode(config?.submissionCountry);
  const submissionDate = new Date().toISOString().split("T")[0];

  const docBuilder = create({ version: "1.0", encoding: "UTF-8" })
    .ins("xml-stylesheet", 'type="text/xsl" href="../../util/style/gcc-regional.xsl"')
    .dtd({ name: "ae:ae-regional", sysID: "../../util/dtd/gcc-regional.dtd" });

  const root = docBuilder.ele("ae:ae-regional", {
    "xmlns:ae": "urn:ae:mohap:ectd:v1.0",
    "xmlns:xlink": "http://www.w3.org/1999/xlink",
  });

  const admin = root.ele("admin");
  admin.ele("country").txt(countryCode).up();
  admin.ele("procedure-kind").txt(config?.procedureType || "National Procedure").up();
  admin.ele("procedure-type").txt(config?.typeOfProcedure || "New Marketing Authorization (MAA)").up();
  admin.ele("application-number").txt(config?.applicationNumber || "").up();
  admin.ele("submission-sequence").txt(sequenceStr).up();
  admin.ele("submission-date").txt(submissionDate).up();
  admin.ele("product-name").txt(project.productName || "").up();
  admin.ele("dosage-form").txt(project.dosageForm || "").up();
  admin.ele("strength").txt(project.strength || "").up();
  admin.ele("mah-holder").txt(project.mahHolder || "").up();
  admin.ele("uae-local-agent").txt(project.uaeLocalAgent || "").up();
  admin.ele("atc-code").txt(project.atcCode || "").up();

  const m1Ae = root.ele("m1-ae");

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const resolved = resolvedPaths.get(doc.id || String(i));
    if (!resolved || resolved.moduleNumber !== "1") continue;

    const operation = doc.operation || mapUaeOperationAttribute(doc.status);
    const checksum = doc.md5Checksum || "00000000000000000000000000000000";
    const relativeToRegional = resolved.relativeZipPath.replace(/^m1\/ae\//, "");

    const leaf = m1Ae.ele("leaf", {
      ID: `leaf-m1-${i + 1}`,
      "xlink:type": "simple",
      "xlink:href": relativeToRegional,
      checksum,
      "checksum-type": "md5",
      operation,
      section: resolved.cleanNodeId,
      "xml:lang": detectLanguage(resolved.effectiveDocName),
    });
    leaf.ele("title").txt(resolved.effectiveDocName).up();
    leaf.up();
  }

  return docBuilder.end({ prettyPrint: true });
}

/**
 * Generates the ICH/UAE eCTD Backbone index.xml (DTD 3.2) for a sequence.
 */
export function generateUaeEctdIndexXml(
  _project: Project,
  _config: DossierConfig | null,
  documents: ProjectDocument[],
  resolvedPaths: Map<string, UaeResolvedDocumentPath>,
  regionalXmlChecksum: string
): string {
  const docBuilder = create({ version: "1.0", encoding: "UTF-8" })
    .dtd({ name: "ectd:ectd", sysID: "util/dtd/ich-ectd-3-2.dtd" });

  const root = docBuilder.ele("ectd:ectd", {
    "xmlns:ectd": "http://www.ich.org/ectd",
    "xmlns:xlink": "http://www.w3.org/1999/xlink",
    "dtd-version": "3.2",
  });

  const m1El = root.ele("m1-administrative-information-and-prescribing-information");
  m1El
    .ele("leaf", {
      ID: "leaf-ae-regional",
      "xlink:type": "simple",
      "xlink:href": "m1/ae/ae-regional.xml",
      checksum: regionalXmlChecksum,
      "checksum-type": "md5",
      operation: "new",
    })
    .ele("title")
    .txt("UAE / GCC Regional Information (ae-regional.xml)")
    .up()
    .up();
  m1El.up();

  const moduleContainers: Record<string, ReturnType<typeof root.ele>> = {
    "2": root.ele("m2-common-technical-document-summaries"),
    "3": root.ele("m3-quality"),
    "4": root.ele("m4-nonclinical-study-reports"),
    "5": root.ele("m5-clinical-study-reports"),
  };

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const resolved = resolvedPaths.get(doc.id || String(i));
    if (!resolved || resolved.moduleNumber === "1") continue;

    const container = moduleContainers[resolved.moduleNumber];
    if (!container) continue;

    const operation = doc.operation || mapUaeOperationAttribute(doc.status);
    const checksum = doc.md5Checksum || "00000000000000000000000000000000";

    const leaf = container.ele("leaf", {
      ID: `leaf-m${resolved.moduleNumber}-${i + 1}`,
      "xlink:type": "simple",
      "xlink:href": resolved.relativeZipPath,
      checksum,
      "checksum-type": "md5",
      operation,
      section: resolved.cleanNodeId,
      "xml:lang": detectLanguage(resolved.effectiveDocName),
    });
    leaf.ele("title").txt(resolved.effectiveDocName).up();
    leaf.up();
  }

  return docBuilder.end({ prettyPrint: true });
}
