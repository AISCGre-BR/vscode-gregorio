"use strict";
/**
 * GABC Parser Types
 * Types for parsing GABC (Gregorio) notation files
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NABC_TIRONIAN_CODES = exports.NABC_LAON_CODES = exports.NABC_ST_GALL_CODES = exports.NABCGlyphModifier = exports.NABCBasicGlyph = exports.ModifierType = exports.NoteShape = void 0;
exports.isNABCStGallCode = isNABCStGallCode;
exports.isNABCLaonCode = isNABCLaonCode;
exports.isNABCTironianCode = isNABCTironianCode;
exports.isNABCSignificantLetterCode = isNABCSignificantLetterCode;
var NoteShape;
(function (NoteShape) {
    NoteShape["Punctum"] = "punctum";
    NoteShape["PunctumInclinatum"] = "punctum_inclinatum";
    NoteShape["Virga"] = "virga";
    NoteShape["VirgaReversa"] = "virga_reversa";
    NoteShape["Oriscus"] = "oriscus";
    NoteShape["Quilisma"] = "quilisma";
    NoteShape["Stropha"] = "stropha";
    NoteShape["Liquescent"] = "liquescent";
    NoteShape["Cavum"] = "cavum";
    NoteShape["Linea"] = "linea";
    NoteShape["Flat"] = "flat";
    NoteShape["Sharp"] = "sharp";
    NoteShape["Natural"] = "natural";
})(NoteShape || (exports.NoteShape = NoteShape = {}));
var ModifierType;
(function (ModifierType) {
    ModifierType["InitioDebilis"] = "initio_debilis";
    ModifierType["PunctumMora"] = "punctum_mora";
    ModifierType["HorizontalEpisema"] = "horizontal_episema";
    ModifierType["VerticalEpisema"] = "vertical_episema";
    ModifierType["Liquescent"] = "liquescent";
    ModifierType["Oriscus"] = "oriscus";
    ModifierType["OriscusScapus"] = "oriscus_scapus";
    ModifierType["Quilisma"] = "quilisma";
    ModifierType["Fusion"] = "fusion";
    ModifierType["Cavum"] = "cavum";
    ModifierType["Strata"] = "strata";
    ModifierType["Quadratum"] = "quadratum";
})(ModifierType || (exports.ModifierType = ModifierType = {}));
var NABCBasicGlyph;
(function (NABCBasicGlyph) {
    // Single notes
    NABCBasicGlyph["Virga"] = "vi";
    NABCBasicGlyph["Punctum"] = "pu";
    NABCBasicGlyph["Tractulus"] = "ta";
    NABCBasicGlyph["Gravis"] = "gr";
    // Two-note neumes
    NABCBasicGlyph["Clivis"] = "cl";
    NABCBasicGlyph["Pes"] = "pe";
    // Three-note neumes
    NABCBasicGlyph["Porrectus"] = "po";
    NABCBasicGlyph["Torculus"] = "to";
    NABCBasicGlyph["Climacus"] = "ci";
    NABCBasicGlyph["Scandicus"] = "sc";
    // Four-note neumes
    NABCBasicGlyph["PorrectusFlexus"] = "pf";
    NABCBasicGlyph["ScandicusFlexus"] = "sf";
    NABCBasicGlyph["TorculusResupinus"] = "tr";
    // Stropha variants
    NABCBasicGlyph["Stropha"] = "st";
    NABCBasicGlyph["Distropha"] = "ds";
    NABCBasicGlyph["Tristropha"] = "ts";
    // Other neumes
    NABCBasicGlyph["Trigonus"] = "tg";
    NABCBasicGlyph["Bivirga"] = "bv";
    NABCBasicGlyph["Trivirga"] = "tv";
    NABCBasicGlyph["PressusMainor"] = "pr";
    NABCBasicGlyph["PressusMinor"] = "pi";
    NABCBasicGlyph["VirgaStrata"] = "vs";
    NABCBasicGlyph["Oriscus"] = "or";
    NABCBasicGlyph["Salicus"] = "sa";
    NABCBasicGlyph["PesQuassus"] = "pq";
    NABCBasicGlyph["Quilisma3Loops"] = "ql";
    NABCBasicGlyph["Quilisma2Loops"] = "qi";
    NABCBasicGlyph["PesStratus"] = "pt";
    NABCBasicGlyph["Nihil"] = "ni";
    NABCBasicGlyph["Uncinus"] = "un";
    NABCBasicGlyph["OriscusClivis"] = "oc";
})(NABCBasicGlyph || (exports.NABCBasicGlyph = NABCBasicGlyph = {}));
var NABCGlyphModifier;
(function (NABCGlyphModifier) {
    NABCGlyphModifier["MarkModification"] = "S";
    NABCGlyphModifier["GroupingModification"] = "G";
    NABCGlyphModifier["MelodicModification"] = "M";
    NABCGlyphModifier["Episema"] = "-";
    NABCGlyphModifier["AugmentiveLiquescence"] = ">";
    NABCGlyphModifier["DiminutiveLiquescence"] = "~";
})(NABCGlyphModifier || (exports.NABCGlyphModifier = NABCGlyphModifier = {}));
// Valid codes as arrays for runtime validation
exports.NABC_ST_GALL_CODES = [
    'al', 'am', 'b', 'c', 'cm', 'co', 'cw', 'd', 'e', 'eq', 'ew',
    'fid', 'fr', 'g', 'i', 'im', 'iv', 'k', 'l', 'lb', 'lc', 'len',
    'lm', 'lp', 'lt', 'm', 'moll', 'p', 'par', 'pfec', 'pm', 'pulcre',
    's', 'sb', 'sc', 'simil', 'simul', 'sm', 'st', 'sta', 't', 'tb',
    'tm', 'tw', 'v', 'vol', 'x'
];
exports.NABC_LAON_CODES = [
    'a', 'c', 'eq', 'eq-', 'equ', 'f', 'h', 'hn', 'hp', 'l', 'n',
    'nl', 'nt', 'm', 'md', 's', 'simp', 'simpl', 'sp', 'st', 't', 'th'
];
exports.NABC_TIRONIAN_CODES = [
    'i', 'do', 'dr', 'dx', 'ps', 'qm', 'sb', 'se', 'sj', 'sl', 'sn',
    'sp', 'sr', 'st', 'us'
];
// Type guards and validation functions
function isNABCStGallCode(code) {
    return exports.NABC_ST_GALL_CODES.includes(code);
}
function isNABCLaonCode(code) {
    return exports.NABC_LAON_CODES.includes(code);
}
function isNABCTironianCode(code) {
    return exports.NABC_TIRONIAN_CODES.includes(code);
}
function isNABCSignificantLetterCode(code) {
    return isNABCStGallCode(code) || isNABCLaonCode(code);
}
//# sourceMappingURL=types.js.map