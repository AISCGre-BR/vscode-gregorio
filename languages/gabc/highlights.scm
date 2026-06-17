; ============================================================================
; TREE-SITTER HIGHLIGHTING QUERIES FOR GABC+NABC — Zed Editor
; ============================================================================
; Adapted from tree-sitter-gregorio queries for Zed compatibility

; ============================================================================
; HEADERS
; ============================================================================

; Header names
; header_generic uses a proper named node (header_name)
(header_name) @attribute

; Numeric and TeX headers use anonymous literal tokens as names → use _
(header_numeric_mode        name: _ @attribute)
(header_numeric_nabc_lines  name: _ @attribute)
(header_numeric_staff_lines name: _ @attribute)
(header_tex_annotation      name: _ @attribute)
(header_tex_mode_modifier   name: _ @attribute)
(header_tex_mode_differentia name: _ @attribute)

; Header values
; Generic header value text is not yet a named node in the pinned grammar (v0.5.2, commit c9034de8).
; Add `(header_value) @string` here once the grammar introduces that node.

; Numeric header value (named node already highlighted elsewhere)
(header_value_numeric) @number

; TeX header values (injected LaTeX code)
(header_tex_annotation       value: (tex_code_header) @string)
(header_tex_mode_modifier    value: (tex_code_header) @string)
(header_tex_mode_differentia value: (tex_code_header) @string)
(header_tex_def_macro        value: (tex_code_header) @string)

; Header terminators (; and ;;)
(header_generic              terminator: _ @punctuation.delimiter)
(header_numeric_mode         terminator: _ @punctuation.delimiter)
(header_numeric_nabc_lines   terminator: _ @punctuation.delimiter)
(header_numeric_staff_lines  terminator: _ @punctuation.delimiter)
(header_tex_annotation       terminator: _ @punctuation.delimiter)
(header_tex_mode_modifier    terminator: _ @punctuation.delimiter)
(header_tex_mode_differentia terminator: _ @punctuation.delimiter)
(header_tex_def_macro        terminator: _ @punctuation.delimiter)

(section_separator) @keyword.control

; ============================================================================
; GABC NOTATION - PITCHES
; ============================================================================

(pitch_lowercase) @constant.builtin
(pitch_uppercase) @constant.builtin

; ============================================================================
; GABC NOTATION - CLEFS
; ============================================================================

(c_clef) @keyword.directive
(f_clef) @keyword.directive
(c_clef_flat) @keyword.directive
; f_clef_flat is not a named node in the pinned grammar (v0.5.2, commit c9034de8) — add once the grammar introduces it.

; ============================================================================
; GABC NOTATION - SEPARATION BARS
; ============================================================================

(virgula) @punctuation.special
(virgula_upper_ledger_line) @punctuation.special
(divisio_minimis) @punctuation.special
(divisio_minimis_upper_ledger_line) @punctuation.special
(divisio_minima) @punctuation.special
(divisio_minima_upper_ledger_line) @punctuation.special
(divisio_minor) @punctuation.special
(divisio_maior) @punctuation.special
(divisio_maior_dotted) @punctuation.special
(divisio_finalis) @punctuation.special
(dominican_bar) @punctuation.special

; Bar modifiers
(vertical_episema) @attribute
(brace) @punctuation.bracket

; ============================================================================
; GABC NOTATION - CUSTOS
; ============================================================================

(custos_auto_pitch) @keyword.directive
(custos_symbol) @keyword.directive
(force_custos) @keyword.control
(disable_custos) @keyword.control

; ============================================================================
; GABC NOTATION - LINE BREAKS
; ============================================================================

(justified_line_break) @keyword.control
(ragged_line_break) @keyword.control

; ============================================================================
; GABC NOTATION - SPACING
; ============================================================================

(small_neume_separation) @punctuation.delimiter
(medium_neume_separation) @punctuation.delimiter
(large_space) @punctuation.delimiter
(large_unbreakable_space) @punctuation.delimiter
(half_space_same_neume) @punctuation.delimiter
(small_space_same_neume) @punctuation.delimiter
(zero_space) @punctuation.delimiter
(scaled_large_neume_separation) @punctuation.delimiter

; ============================================================================
; GABC NOTATION - ALTERATIONS
; ============================================================================

(natural) @operator
(flat) @operator
(sharp) @operator
(natural_parenthesized) @operator
(flat_parenthesized) @operator
(sharp_parenthesized) @operator
(natural_soft) @operator
(flat_soft) @operator
(sharp_soft) @operator

; Musica ficta
(musica_ficta_natural) @operator
(musica_ficta_flat) @operator
(musica_ficta_sharp) @operator

; ============================================================================
; GABC NOTATION - EXTRA SYMBOLS
; ============================================================================

; Punctum mora
(punctum_mora) @attribute

; Ictus
(ictus) @attribute
(always_below) @attribute
(always_above) @attribute

; Episema
(episema) @attribute
(below_note) @attribute
(above_note) @attribute
(disable_bridging) @attribute
(small_left) @attribute
(small_center) @attribute
(small_right) @attribute

; Accents above staff
(accent_above_staff) @operator
(accent_grave_above_staff) @operator
(circle_above_staff) @operator
(lower_semicircle_above_staff) @operator
(upper_semicircle_above_staff) @operator

; ============================================================================
; GABC NOTATION - NEUME SHAPES
; ============================================================================

; Basic shapes
(oriscus) @type
(oriscus_scapus) @type
(quilisma) @type
(quilisma_quadratum) @type
(quadratum) @type
(virga) @type
(virga_reversa) @type
(bivirga) @type
(trivirga) @type
(stropha) @type
(distropha) @type
(tristropha) @type
(linea) @type
(cavum) @type
(punctum_linea) @type
(cavum_linea) @type

; Initio debilis
(initio_debilis) @type

; Liquescence
(deminutus) @type
(augmented) @type
(diminished) @type

; Orientation
(upwards) @keyword
(downwards) @keyword

; Leaning
(left_leaning) @keyword
(right_leaning) @keyword
(non_leaning) @keyword

; ============================================================================
; GABC NOTATION - ATTRIBUTES
; ============================================================================

; Shape & stroke
(shape) @keyword.directive
(stroke) @keyword.directive

; Custos control
(nocustos) @keyword.control

; Choral signs
(cs) @keyword.directive
(cn) @keyword.directive

; Braces
(ob) @keyword.directive
(ub) @keyword.directive
(ocb) @keyword.directive
(ocba) @keyword.directive

; Stem length
(ll) @keyword.directive

; Ledger lines
(oll) @keyword.directive
(ull) @keyword.directive

; Slurs
(oslur) @keyword.directive
(uslur) @keyword.directive

; Horizontal episema
(oh) @keyword.directive
(uh) @keyword.directive
(episema_position) @string

; Above lines text
(alt) @keyword.directive

; Verbatim
(nv) @keyword.directive
(gv) @keyword.directive
(ev) @keyword.directive

; Macros ([nm0], [gm0], [em0], [altm0]) — gabc_macro is not a named node in the
; pinned grammar (v0.5.2, commit c9034de8); macros are anonymous tokens. Add once the grammar names them.

; ============================================================================
; SYLLABLE TEXT & STYLING
; ============================================================================

; Special syllable elements
(syllable_other_verbatim) @string.special
(syllable_other_above_lines_text) @string.special
(syllable_other_special_character) @string.escape

; Syllable control tags
(syllable_control_clear) @keyword.control
(syllable_control_protrusion) @keyword.control

; Elision (vowel suppression for centering)
(syllable_control_elision) @keyword.control
(syllable_control_elision_open) @keyword.control
(syllable_control_elision_close) @keyword.control

; EUOUAE (psalm tone differentia marking)
(syllable_control_euouae) @keyword.control
(syllable_control_euouae_open) @keyword.control
(syllable_control_euouae_close) @keyword.control

; No Line Break Area
(syllable_control_no_line_break_open) @keyword.control
(syllable_control_no_line_break_close) @keyword.control

; Translation text below staff: [text]
(syllable_translation) @string.special
; translation_content is not a named node in the pinned grammar (v0.5.2, commit c9034de8) — add once introduced.

; Lyric centering markers: {text}
(syllable_centering) @punctuation.special
; centering_content is not a named node in the pinned grammar (v0.5.2, commit c9034de8) — add once introduced.

; Lyric tie (Gregorio 6.2.0+): ~ in syllable text
(lyric_tie) @punctuation.special

; Escape sequences: $x
(syllable_escape_sequence) @string.escape

; Asterisk markers (* = half-asterisk/division, ** = second asterisk)
; These are parsed as syllable_text but have structural meaning
((syllable_text) @keyword
  (#match? @keyword "^\\*+$"))

; Style tags - highlight text content within tags (not the tags themselves)
(syllable_style_bold
  (syllable
    (syllable_text) @markup.bold))

(syllable_style_italic
  (syllable
    (syllable_text) @markup.italic))

(syllable_style_underline
  (syllable
    (syllable_text) @markup.underline))

(syllable_style_small_caps
  (syllable
    (syllable_text) @markup.heading))

(syllable_style_teletype
  (syllable
    (syllable_text) @markup.raw))

(syllable_style_colored
  (syllable
    (syllable_text) @string.special))

; Style tags - cross-syllable (open/close)
; Bold
(syllable
  (syllable_style_bold_open)
  (syllable_text) @markup.bold)

(syllable
  (syllable_text) @markup.bold
  (syllable_style_bold_close))

; Italic
(syllable
  (syllable_style_italic_open)
  (syllable_text) @markup.italic)

(syllable
  (syllable_text) @markup.italic
  (syllable_style_italic_close))

; Underline
(syllable
  (syllable_style_underline_open)
  (syllable_text) @markup.underline)

(syllable
  (syllable_text) @markup.underline
  (syllable_style_underline_close))

; Small Caps
(syllable
  (syllable_style_small_caps_open)
  (syllable_text) @markup.heading)

(syllable
  (syllable_text) @markup.heading
  (syllable_style_small_caps_close))

; Teletype
(syllable
  (syllable_style_teletype_open)
  (syllable_text) @markup.raw)

(syllable
  (syllable_text) @markup.raw
  (syllable_style_teletype_close))

; Colored
(syllable
  (syllable_style_colored_open)
  (syllable_text) @string.special)

(syllable
  (syllable_text) @string.special
  (syllable_style_colored_close))

; ============================================================================
; NABC - BASIC GLYPHS
; ============================================================================

; Single note glyphs
(punctum) @property
(tractulus) @property
(gravis) @property

; Compound glyphs
(clivis) @property
(pes) @property
(porrectus) @property
(torculus) @property
(climacus) @property
(scandicus) @property
(porrectus_flexus) @property
(scandicus_flexus) @property
(torculus_resupinus) @property
(trigonus) @property
(pressus_maior) @property
(pressus_minor) @property
(virga_strata) @property
(salicus) @property
(pes_quassus) @property
(pes_stratus) @property
(nihil) @property
(uncinus) @property
(oriscus_clivis) @property
(quilisma_3_loops) @property
(quilisma_2_loops) @property

; ============================================================================
; NABC - MODIFIERS
; ============================================================================

(mark_modification) @operator
(grouping_modification) @operator
(melodic_modification) @operator
(augmentive_liquescence) @variable.special
(diminutive_liquescence) @variable.special
(variant_number) @number

; ============================================================================
; NABC - SUBPUNCTIS/PREPUNCTIS
; ============================================================================

(subpunctis) @type
(prepunctis) @type
(tractulus_episema) @property
(tractulus_double_episema) @property
(gravis_episema) @property
(liquescens_stropha_cephalicus) @property
(repetition_count) @number

; ============================================================================
; NABC - STRUCTURE
; ============================================================================

(nabc_glyph_descriptor) @function
(nabc_glyph_fusion) @function
(pitch_descriptor) @property

; NABC spacing
(larger_space_right) @punctuation.delimiter
(inter_element_space_right) @punctuation.delimiter
(larger_space_left) @punctuation.delimiter
(inter_element_space_left) @punctuation.delimiter

; ============================================================================
; NABC - SIGNIFICANT LETTERS
; ============================================================================

(augete) @variable.special
(altius) @variable.special
(altius_mediocriter) @variable.special
(bene) @variable.special
(celeriter) @variable.special
(celeriter_mediocriter) @variable.special
(coniunguntur) @variable.special
(celeriter_wide) @variable.special
(deprimatur) @variable.special
(equaliter) @variable.special
(equaliter_eq) @variable.special
(equaliter_dash) @variable.special
(equaliter_equ) @variable.special
(equaliter_wide) @variable.special
(fastigium) @variable.special
(fideliter) @variable.special
(frendor) @variable.special
(gutture) @variable.special
(humiliter) @variable.special
(humiliter_nectum) @variable.special
(humiliter_parum) @variable.special
(iusum) @variable.special
(iusum_mediocriter) @variable.special
(iusum_valde) @variable.special
(klenche) @variable.special
(levare) @variable.special
(levare_bene) @variable.special
(levare_celeriter) @variable.special
(leniter) @variable.special
(levare_mediocriter) @variable.special
(levare_parvum) @variable.special
(levare_tenere) @variable.special
(mediocriter) @variable.special
(mediocriter_md) @variable.special
(molliter) @variable.special
(non_tenere_negare_nectum_naturaliter) @variable.special
(non_levare) @variable.special
(non_tenere) @variable.special
(parvum) @variable.special
(paratim) @variable.special
(perfecte) @variable.special
(parvum_mediocriter) @variable.special
(pulcre) @variable.special
(sursum) @variable.special
(sursum_bene) @variable.special
(sursum_celeriter) @variable.special
(similiter) @variable.special
(simpliciter) @variable.special
(simpliciter_simpl) @variable.special
(simul) @variable.special
(sursum_mediocriter) @variable.special
(sursum_parum) @variable.special
(sursum_tenere) @variable.special
(statim) @variable.special
(tenere) @variable.special
(tenere_bene) @variable.special
(tenere_humiliter) @variable.special
(tenere_mediocriter) @variable.special
(tenere_wide) @variable.special
(valde) @variable.special
(volubiliter) @variable.special
(expectare) @variable.special

; Tironian letters (Laon notation)
(deorsum) @variable.special
(devertit) @variable.special
(devexum) @variable.special
(prode_sub_eam) @variable.special
(quam_mox) @variable.special
(sub) @variable.special
(seorsum) @variable.special
(subjice) @variable.special
(saltim) @variable.special
(sonare) @variable.special
(supra) @variable.special
(saltate) @variable.special
(ut_supra) @variable.special

; Structural wrappers for significant/tironian letters
(significant_letter) @variable.special
(tironian_letter) @variable.special
(position_number) @number

; ============================================================================
; COMMENTS
; ============================================================================

(comment) @comment
