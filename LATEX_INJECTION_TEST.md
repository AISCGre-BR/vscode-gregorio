# Teste de Injeção LaTeX em Atributos GABC

## Objetivo

Validar que o highlight LaTeX está sendo aplicado corretamente aos valores de atributos que aceitam código TeX (`nv`, `gv`, `ev`, `alt`).

## Arquivos Criados

1. **syntaxes/latex-injection.json**: Gramática de injeção LaTeX para VS Code
2. **test-latex-attributes.gabc**: Arquivo de teste com exemplos de atributos LaTeX
3. **test-latex-injection.js**: Script de validação automatizada

## Como Funciona

### Semantic Tokens vs TextMate Grammar

- **Semantic tokens** têm precedência sobre gramáticas TextMate
- Para atributos LaTeX, o semantic token provider **não adiciona tokens** no valor
- Isso permite que a gramática de injeção LaTeX funcione sem interferência

### Configuração

1. **package.json**: Declara a gramática de injeção
   ```json
   {
     "scopeName": "latex.injection",
     "path": "./syntaxes/latex-injection.json",
     "injectTo": ["source.gabc"]
   }
   ```

2. **latex-injection.json**: Define padrões de injeção para cada atributo
   - `[nv:...]` → Injeta LaTeX no valor
   - `[gv:...]` → Injeta LaTeX no valor
   - `[ev:...]` → Injeta LaTeX no valor
   - `[alt:...]` → Injeta LaTeX no valor

3. **semanticTokensProvider.ts**: Não tokeniza valores LaTeX
   ```typescript
   if (['nv', 'gv', 'ev', 'alt'].includes(attributeName)) {
     // Do NOT add semantic tokens - let TextMate handle LaTeX injection
   }
   ```

## Como Testar

### 1. Teste Automatizado

```bash
node test-latex-injection.js
```

Resultado esperado: ✓ All tests passed!

### 2. Teste Visual no VS Code

1. **Recarregue a janela do VS Code**:
   - Pressione `Ctrl+Shift+P`
   - Digite "Reload Window"
   - Confirme

2. **Abra o arquivo de teste**:
   ```bash
   code test-latex-attributes.gabc
   ```

3. **Verifique o highlight**:

   **✓ Atributos LaTeX (devem ter syntax LaTeX):**
   - `[nv:\textbf{bold}]` → `\textbf` em cor de comando LaTeX
   - `[gv:\textit{italic}]` → `\textit` em cor de comando LaTeX
   - `[ev:\hspace{5mm}]` → `\hspace` em cor de comando LaTeX
   - `[alt:\textcolor{red}{text}]` → `\textcolor` em cor de comando LaTeX

   **✓ Atributos regulares (devem ter syntax GABC):**
   - `[shape:stroke]` → `stroke` em cor de string
   - `[cs:sign]` → `sign` em cor de string
   - `[ob:0;2mm]` → `0;2mm` em cor de string

   **✓ Atributo NABC (deve ter syntax NABC):**
   - `[cn:pu]` → `pu` em cor de keyword NABC
   - `[cn:viM]` → `vi` keyword, `M` operator

## Requisitos

Para que a injeção LaTeX funcione, o VS Code precisa ter suporte LaTeX:

1. **Extensão LaTeX** (uma das seguintes):
   - LaTeX Workshop (james-yu.latex-workshop)
   - LaTeX (mathematic.vscode-latex)
   - Qualquer extensão que forneça `text.tex.latex` scope

2. **Verificar se LaTeX está disponível**:
   - Abra um arquivo `.tex`
   - Verifique se comandos LaTeX têm syntax highlighting
   - Se não, instale uma extensão LaTeX

## Exemplos de Highlight Esperado

### Atributo nv (note verbatim)
```gabc
(c4) Bo(d[nv:\textbf{bold}]e)ld(f)
```
- `nv` → entity.other.attribute-name.gabc (cor de atributo)
- `:` → punctuation.separator.gabc (cor de pontuação)
- `\textbf` → support.function.latex (cor de comando LaTeX)
- `{bold}` → texto dentro de chaves LaTeX

### Atributo shape (regular)
```gabc
(c4) Test(gh[shape:stroke]i)
```
- `shape` → entity.other.attribute-name.gabc (cor de atributo)
- `:` → punctuation.separator.gabc (cor de pontuação)
- `stroke` → string.unquoted.gabc (cor de string)

### Atributo cn (NABC)
```gabc
(c4) Test(d[cn:viM]e)
```
- `cn` → entity.other.attribute-name.gabc (cor de atributo)
- `:` → punctuation.separator.gabc (cor de pontuação)
- `vi` → keyword.control.gabc (cor de keyword NABC)
- `M` → keyword.operator.gabc (cor de operator NABC)

## Solução de Problemas

### LaTeX não está sendo destacado

1. Verifique se uma extensão LaTeX está instalada
2. Recarregue a janela do VS Code
3. Verifique o console de desenvolvedor (`Help > Toggle Developer Tools`)
4. Procure por erros relacionados a "grammar" ou "injection"

### Semantic tokens sobrescrevendo LaTeX

Se os valores LaTeX estiverem com cor de string:
1. Verifique `semanticTokensProvider.ts`
2. Confirme que atributos LaTeX NÃO chamam `builder.push()` para o valor
3. Recompile: `npm run compile`

### Atributos regulares sem highlight

Se `[shape:stroke]` não tem highlight no valor:
1. Verifique o bloco `else` em `tokenizeAttribute()`
2. Deve chamar `builder.push()` com tipo `'string'`
3. Recompile: `npm run compile`

## Referências

- [VS Code Language Extensions](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide)
- [TextMate Grammar Injection](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide#injection-grammars)
- [LaTeX Workshop Extension](https://github.com/James-Yu/LaTeX-Workshop)
