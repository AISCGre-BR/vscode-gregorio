/**
 * GABC Parser Types
 * Types for parsing GABC (Gregorio) notation files
 */

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface ParsedDocument {
  headers: Map<string, string>;
  notation: NotationSection;
  comments: Comment[];
  errors: ParseError[];
}

export interface Comment {
  text: string;
  range: Range;
}

export interface ParseError {
  message: string;
  range: Range;
  severity: 'error' | 'warning' | 'info';
  code?: string;
}

export interface NotationSection {
  syllables: Syllable[];
  range: Range;
}

export interface Syllable {
  text: string;
  textWithStyles?: string; // Text including style tags like <b>, <i>, etc.
  notes: NoteGroup[];
  range: Range;
  clef?: Clef;
  bar?: Bar;
  lineBreak?: LineBreak;
}

export interface NoteGroup {
  gabc: string;
  nabc?: string[];
  nabcParsed?: NABCGlyphDescriptor[];
  range: Range;
  notes: Note[];
  custos?: Custos;
  attributes?: GabcAttribute[];
}

export interface Note {
  pitch: string;
  shape: NoteShape;
  modifiers: NoteModifier[];
  range: Range;
  fusion?: boolean; // Indicates this note is part of a fusion (@)
}

export interface Custos {
  type: 'auto' | 'explicit'; // z0 or +pitch
  pitch?: string;
  range: Range;
}

export interface GabcAttribute {
  name: string;
  value?: string;
  range: Range;
}

export enum NoteShape {
  Punctum = 'punctum',
  PunctumInclinatum = 'punctum_inclinatum',
  Virga = 'virga',
  VirgaReversa = 'virga_reversa',
  Oriscus = 'oriscus',
  Quilisma = 'quilisma',
  Stropha = 'stropha',
  Liquescent = 'liquescent',
  Cavum = 'cavum',
  Linea = 'linea',
  Flat = 'flat',
  Sharp = 'sharp',
  Natural = 'natural'
}

export interface NoteModifier {
  type: ModifierType;
  value?: string;
}

export enum ModifierType {
  InitioDebilis = 'initio_debilis',
  PunctumMora = 'punctum_mora',
  HorizontalEpisema = 'horizontal_episema',
  VerticalEpisema = 'vertical_episema',
  Liquescent = 'liquescent',
  Oriscus = 'oriscus',
  OriscusScapus = 'oriscus_scapus',
  Quilisma = 'quilisma',
  Fusion = 'fusion',
  Cavum = 'cavum',
  Strata = 'strata',
  Quadratum = 'quadratum'
}

export interface Clef {
  type: 'c' | 'f';
  line: number;
  hasFlat: boolean;
  range: Range;
}

export interface Bar {
  type: 'virgula' | 'divisio_minima' | 'divisio_minor' | 'divisio_maior' | 'divisio_finalis' | 'dominican';
  range: Range;
}

export interface LineBreak {
  type: 'manual' | 'suggested';
  range: Range;
}

export interface StyleTag {
  type: 'bold' | 'italic' | 'color' | 'small_caps' | 'teletype' | 'underline';
  range: Range;
}

// ========================================
// NABC (St. Gall Notation) Types
// ========================================

export interface NABCGlyphDescriptor {
  basicGlyph: NABCBasicGlyph;
  modifiers?: NABCGlyphModifier[];
  pitch?: string;
  subpunctis?: NABCSubpunctis;
  prepunctis?: NABCPrepunctis;
  significantLetters?: NABCSignificantLetter[];
  range?: Range;
  fusion?: NABCGlyphDescriptor; // Right side of fusion (!)
}

export enum NABCBasicGlyph {
  // Single notes
  Virga = 'vi',
  Punctum = 'pu',
  Tractulus = 'ta',
  Gravis = 'gr',
  
  // Two-note neumes
  Clivis = 'cl',
  Pes = 'pe',
  
  // Three-note neumes
  Porrectus = 'po',
  Torculus = 'to',
  Climacus = 'ci',
  Scandicus = 'sc',
  
  // Four-note neumes
  PorrectusFlexus = 'pf',
  ScandicusFlexus = 'sf',
  TorculusResupinus = 'tr',
  
  // Stropha variants
  Stropha = 'st',
  Distropha = 'ds',
  Tristropha = 'ts',
  
  // Other neumes
  Trigonus = 'tg',
  Bivirga = 'bv',
  Trivirga = 'tv',
  PressusMainor = 'pr',
  PressusMinor = 'pi',
  VirgaStrata = 'vs',
  Oriscus = 'or',
  Salicus = 'sa',
  PesQuassus = 'pq',
  Quilisma3Loops = 'ql',
  Quilisma2Loops = 'qi',
  PesStratus = 'pt',
  Nihil = 'ni',
  Uncinus = 'un',
  OriscusClivis = 'oc'
}

export enum NABCGlyphModifier {
  MarkModification = 'S',
  GroupingModification = 'G',
  MelodicModification = 'M',
  Episema = '-',
  AugmentiveLiquescence = '>',
  DiminutiveLiquescence = '~'
}

export interface NABCSubpunctis {
  count: number; // Mandatory positive number
  modifier?: 't' | 'u' | 'v' | 'w' | 'x' | 'y'; // St. Gall modifiers
  range?: Range;
}

export interface NABCPrepunctis {
  count: number; // Mandatory positive number
  modifier?: 't' | 'u' | 'v' | 'w' | 'x' | 'y'; // St. Gall modifiers
  range?: Range;
}

// ========================================
// NABC Significant Letters and Tironian Notes
// ========================================

/**
 * St. Gall significant letter codes (ls prefix)
 * These codes represent performance instructions in St. Gall notation:
 * - al/am: altius (higher), altius mediocriter
 * - c/cm/cw: celeriter (quickly), celeriter mediocriter, celeriter wide
 * - e/eq/ew: equaliter (equally), equaliter, equaliter wide
 * - i/im/iv: iusum (downward), iusum mediocriter, iusum valde
 * - l/lb/lc/len/lm/lp/lt: levare (raise) variations
 * - s/sb/sc/simil/simul/sm/st/sta: sursum (upward) variations and similar
 * - t/tb/tm/tw: tenere (hold) variations
 * - And many others representing nuanced performance indications
 */
export type NABCStGallCode = 
  | 'al' | 'am' | 'b' | 'c' | 'cm' | 'co' | 'cw' | 'd' | 'e' | 'eq' | 'ew'
  | 'fid' | 'fr' | 'g' | 'i' | 'im' | 'iv' | 'k' | 'l' | 'lb' | 'lc' | 'len'
  | 'lm' | 'lp' | 'lt' | 'm' | 'moll' | 'p' | 'par' | 'pfec' | 'pm' | 'pulcre'
  | 's' | 'sb' | 'sc' | 'simil' | 'simul' | 'sm' | 'st' | 'sta' | 't' | 'tb'
  | 'tm' | 'tw' | 'v' | 'vol' | 'x';

/**
 * Laon significant letter codes (ls prefix)
 * Laon notation uses some overlapping codes with St. Gall but with distinct meanings:
 * - a: augete (increase)
 * - c: celeriter (quickly)
 * - eq/eq-/equ: equaliter (equally) variations
 * - f: fastigium (peak)
 * - h/hn/hp: humiliter (humbly) variations
 * - n/nl/nt: non (not), non levare, non tenere
 * - And other performance indications specific to Laon tradition
 */
export type NABCLaonCode = 
  | 'a' | 'c' | 'eq' | 'eq-' | 'equ' | 'f' | 'h' | 'hn' | 'hp' | 'l' | 'n'
  | 'nl' | 'nt' | 'm' | 'md' | 's' | 'simp' | 'simpl' | 'sp' | 'st' | 't' | 'th';

/**
 * Tironian note codes (lt prefix)
 * Tironian notes are abbreviations used in Laon manuscripts:
 * - i: iusum (downward)
 * - do: deorsum (downward)
 * - dr/dx: devertit (turns), devexum (sloping)
 * - ps: prode sub eam (trade subtus)
 * - qm: quam mox (as soon as)
 * - sb/se/sj/sl/sn/sp/sr/st: various Latin abbreviations
 * - us: ut supra (as above)
 * 
 * Note: Tironian notes cannot use position 5 (center)
 */
export type NABCTironianCode = 
  | 'i' | 'do' | 'dr' | 'dx' | 'ps' | 'qm' | 'sb' | 'se' | 'sj' | 'sl' | 'sn'
  | 'sp' | 'sr' | 'st' | 'us';

/**
 * All valid significant letter codes (ls prefix)
 * Union of St. Gall and Laon codes
 */
export type NABCSignificantLetterCode = NABCStGallCode | NABCLaonCode;

/**
 * All valid Tironian note codes (lt prefix)
 */
export type NABCTironianNoteCode = NABCTironianCode;

/**
 * NABC Significant Letter or Tironian Note
 * 
 * Format: ls/lt + code + position
 * - ls: St. Gall or Laon significant letter
 * - lt: Tironian note (Laon)
 * - code: one of the valid codes from the types above
 * - position: 1-9 (relative to neume), where:
 *   1 = left upper corner, 2 = above, 3 = right upper corner
 *   4 = left, 5 = center, 6 = right
 *   7 = left bottom corner, 8 = below, 9 = right bottom corner
 * 
 * Examples: lsc2 (celeriter above), lst4 (tenere left), lti2 (iusum above)
 * 
 * Note: Tironian notes (lt) cannot use position 5
 */
export interface NABCSignificantLetter {
  type: 'ls' | 'lt'; // ls = significant letter, lt = Tironian note
  code: string; // Shorthand code - use validation functions to check validity
  position: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; // Position relative to glyph (Tironian: no 5)
  range?: Range;
}

// Valid codes as arrays for runtime validation
export const NABC_ST_GALL_CODES: readonly NABCStGallCode[] = [
  'al', 'am', 'b', 'c', 'cm', 'co', 'cw', 'd', 'e', 'eq', 'ew',
  'fid', 'fr', 'g', 'i', 'im', 'iv', 'k', 'l', 'lb', 'lc', 'len',
  'lm', 'lp', 'lt', 'm', 'moll', 'p', 'par', 'pfec', 'pm', 'pulcre',
  's', 'sb', 'sc', 'simil', 'simul', 'sm', 'st', 'sta', 't', 'tb',
  'tm', 'tw', 'v', 'vol', 'x'
] as const;

export const NABC_LAON_CODES: readonly NABCLaonCode[] = [
  'a', 'c', 'eq', 'eq-', 'equ', 'f', 'h', 'hn', 'hp', 'l', 'n',
  'nl', 'nt', 'm', 'md', 's', 'simp', 'simpl', 'sp', 'st', 't', 'th'
] as const;

export const NABC_TIRONIAN_CODES: readonly NABCTironianCode[] = [
  'i', 'do', 'dr', 'dx', 'ps', 'qm', 'sb', 'se', 'sj', 'sl', 'sn',
  'sp', 'sr', 'st', 'us'
] as const;

// Type guards and validation functions
export function isNABCStGallCode(code: string): code is NABCStGallCode {
  return NABC_ST_GALL_CODES.includes(code as NABCStGallCode);
}

export function isNABCLaonCode(code: string): code is NABCLaonCode {
  return NABC_LAON_CODES.includes(code as NABCLaonCode);
}

export function isNABCTironianCode(code: string): code is NABCTironianCode {
  return NABC_TIRONIAN_CODES.includes(code as NABCTironianCode);
}

export function isNABCSignificantLetterCode(code: string): code is NABCSignificantLetterCode {
  return isNABCStGallCode(code) || isNABCLaonCode(code);
}
