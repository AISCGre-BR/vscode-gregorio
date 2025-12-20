# Testes de Validação de Chaves em Atributos GABC

## Objetivo

Validar que a extensão VS Code Gregorio trata corretamente chaves balanceadas e não balanceadas em diferentes tipos de atributos GABC.

## Tipos de Atributos

### 1. Atributos com Chaves Não Balanceadas (GABC)

Estes atributos aceitam chaves `{` e `}` que **não precisam ser balanceadas**, pois são usadas para marcar início e fim de elementos gráficos separadamente:

- `ob` (overbrace) - Parênteses sobre a pauta
- `ub` (underbrace) - Parênteses sob a pauta  
- `ocb` (overcurly brace) - Chaves sobre a pauta
- `ocba` (overcurly brace above) - Chaves acima da pauta
- `oll` (overledger lines) - Linhas de extensão sobre a pauta
- `ull` (underledger lines) - Linhas de extensão sob a pauta
- `oslur` (overslur) - Ligaduras sobre a pauta
- `uslur` (underslur) - Ligaduras sob a pauta
- `oh` (overhoriz episema) - Episema horizontal sobre a pauta
- `uh` (underhoriz episema) - Episema horizontal sob a pauta

**Exemplos válidos:**
```gabc
(c4) Te(f)[ob:0;6mm] De(g)[ob:1{]um(h) lau(i)[ub:1}]da(j)mus(k) (::)
(c4) Glo(f)[ocb:1{]ri(g)[ocb:1}]a(h) (::)
(c4) A(f)[ob:0{]men(g) (::)  % chave aberta solitária - OK
(c4) De(h)[ub:1}]o(i) (::)   % chave fechada solitária - OK
```

### 2. Atributos com LaTeX (Chaves Balanceadas)

Estes atributos aceitam código LaTeX onde as chaves `{` e `}` **devem ser balanceadas** conforme sintaxe LaTeX padrão:

- `nv` (note verbatim) - Texto LaTeX para nota individual
- `gv` (glyph verbatim) - Texto LaTeX para grupo de notas
- `ev` (element verbatim) - Texto LaTeX para elemento completo
- `alt` (above lines text) - Texto LaTeX acima das linhas da pauta

**Exemplos válidos:**
```gabc
(c4) Te(f[nv:\textit{Texto}])xt(g) (::)
(c4) Ma(f[nv:\textbf{Negrito {aninhado}}])gno(g) (::)
(c4) Do(fg[gv:\textcolor{red}{Vermelho}])mi(g)ne(h) (::)
```

**Exemplos inválidos (devem mostrar erro):**
```gabc
(c4) Te(f[nv:\textit{Texto])xt(g) (::)  % falta }
(c4) Ma(f[nv:\textbf{Negrito {aninhado}])gno(g) (::)  % falta }
```

### 3. Atributo cn (NABC)

O atributo `cn` aceita código NABC, que não usa chaves:

```gabc
(c4) Pa(f[cn:bv-k])ter(g) nos(h)[cn:pq-dso-nqo]ter(i) (::)
```

### 4. Outros Atributos

Atributos como `cs`, `shape`, `ll`, etc. aceitam valores simples sem chaves especiais:

```gabc
(c4) Ky(f[cs:a])ri(g[shape:stroke])e(h) e(i[ll:1])le(j)i(k)son(l) (::)
```

## Checklist de Validação

Execute os testes abrindo o arquivo `test-brace-validation.gabc` no VS Code com a extensão instalada:

### ✅ Testes que NÃO devem mostrar erros de chaves

- [ ] `[ob:1{]` - chave aberta em overbrace
- [ ] `[ub:1}]` - chave fechada em underbrace
- [ ] `[ocb:1{]` - chave aberta em overcurly brace
- [ ] `[ocba:1}]` - chave fechada em overcurly brace above
- [ ] `[oll:0;1mm]` - ledger lines (sem chaves)
- [ ] `[oslur:0{]` - chave aberta em overslur
- [ ] `[uslur:0}]` - chave fechada em underslur
- [ ] `[oh:0{]` - chave aberta em episema horizontal
- [ ] `[uh:0}]` - chave fechada em episema horizontal
- [ ] Sequências mistas: `[ob:1{]...[ub:1}]`

### ⚠️ Testes que DEVEM mostrar erros (chaves LaTeX desbalanceadas)

- [ ] `[nv:\textit{Texto]` - falta `}`
- [ ] `[gv:\textbf{Negrito {aninhado}]` - falta `}`
- [ ] `[ev:\small{Pequeno]` - falta `}`
- [ ] `[alt:\textit{Glória]` - falta `}`

### ✅ Testes que NÃO devem mostrar erros (LaTeX válido)

- [ ] `[nv:\textit{Texto}]` - chaves balanceadas
- [ ] `[nv:\textbf{Negrito {aninhado}}]` - chaves aninhadas balanceadas
- [ ] `[gv:\textcolor{red}{Vermelho}]` - múltiplas chaves balanceadas

## Implementação

### Arquivos Modificados

1. **syntaxes/gabc.tmLanguage.json**
   - Adicionado padrão específico para atributos com chaves não balanceadas
   - Padrão `meta.attribute.braces.gabc` processa antes do padrão genérico
   - Captura atributo completo como string única (sem análise de chaves internas)

2. **language-configuration.json**
   - Removido `["{", "}"]` de `brackets`
   - Removido par `{ "open": "{", "close": "}" }` de `autoClosingPairs`
   - Removido `["{", "}"]` de `surroundingPairs`
   - **Motivo**: Chaves em GABC não são sempre balanceadas, então não devem ser tratadas como brackets automáticos

3. **syntaxes/latex-injection.json**
   - Mantém injeção LaTeX para `nv`, `gv`, `ev`, `alt`
   - **Não** usa `applyEndPatternLast` (LaTeX requer balanceamento)
   - Inclui `text.tex.latex` para sintaxe LaTeX completa

### Ordem de Processamento

A ordem dos padrões em `gabc.tmLanguage.json` é crucial:

1. **LaTeX attributes** (`nv`, `gv`, `ev`) - processados primeiro
2. **alt attribute** - processado em segundo
3. **Brace attributes** (`ob`, `ub`, `ocb`, etc.) - processados em terceiro
4. **Generic attributes** - processados por último (fallback)

Isso garante que atributos específicos sejam tratados corretamente antes do padrão genérico.

## Testes Automáticos

### Compilação

```bash
cd /home/laercio/Documentos/vscode-gregorio
npm run compile
```

Deve compilar sem erros.

### Verificação Visual

1. Abra `test-brace-validation.gabc` no VS Code
2. Verifique que:
   - Não há sublinhados vermelhos em atributos GABC com chaves não balanceadas
   - Há highlighting LaTeX nos atributos `nv`, `gv`, `ev`, `alt`
   - Há highlighting NABC no atributo `cn`

### Debugging

Se ainda houver problemas:

1. Verifique o escopo do token com `Developer: Inspect Editor Tokens and Scopes` (Cmd/Ctrl+Shift+P)
2. Verifique que atributos com chaves usam escopo `meta.attribute.braces.gabc`
3. Verifique que atributos LaTeX usam escopo `meta.embedded.inline.latex`

## Changelog

- Adicionado padrão específico para atributos com chaves não balanceadas
- Removida configuração de brackets para chaves em language-configuration.json
- Criados testes de validação em test-brace-validation.gabc
- Documentação completa de tipos de atributos e comportamento esperado
