; ============================================================================
; INJECTION QUERIES FOR GABC+NABC — Zed Editor
; ============================================================================
; Inject LaTeX syntax highlighting into verbatim TeX elements

; ============================================================================
; HEADER FIELDS WITH TEX CODE
; ============================================================================

; annotation: TeX code;
(header_tex_annotation
  value: (tex_code_header) @injection.content
  (#set! injection.language "latex"))

; mode-modifier: TeX code;
(header_tex_mode_modifier
  value: (tex_code_header) @injection.content
  (#set! injection.language "latex"))

; mode-differentia: TeX code;
(header_tex_mode_differentia
  value: (tex_code_header) @injection.content
  (#set! injection.language "latex"))

; def-m0: TeX code; through def-m9: TeX code;
(header_tex_def_macro
  value: (tex_code_header) @injection.content
  (#set! injection.language "latex"))

; ============================================================================
; SYLLABLE TEXT VERBATIM ELEMENTS
; ============================================================================

; Syllable verbatim tag: <v>TeX code</v>
(syllable_other_verbatim
  tex_code: (tex_code_verbatim) @injection.content
  (#set! injection.language "latex"))

; Note-level verbatim attribute: [nv:TeX code]
(gabc_attribute
  name: (nv)
  tex_code: (tex_code) @injection.content
  (#set! injection.language "latex"))

; Glyph-level verbatim attribute: [gv:TeX code]
(gabc_attribute
  name: (gv)
  tex_code: (tex_code) @injection.content
  (#set! injection.language "latex"))

; Element-level verbatim attribute: [ev:TeX code]
(gabc_attribute
  name: (ev)
  tex_code: (tex_code) @injection.content
  (#set! injection.language "latex"))
