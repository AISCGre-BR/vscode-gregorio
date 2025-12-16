# Semantic Analyzer for GABC/NABC

O Analisador Semântico valida código GABC/NABC parseado de acordo com as regras do compilador Gregorio, identificando erros, warnings e informações úteis.

## Características

### Validação de Cabeçalhos
- ✅ Detecta ausência do header obrigatório `name:`
- ✅ Avisa sobre definições duplicadas de headers
- ✅ Valida número máximo de anotações (2)

### Validação de Estrutura
- ✅ Detecta quebras de linha na primeira sílaba (erro)
- ✅ Detecta uso de `|` (pipe) sem header `nabc-lines:`
- ✅ Valida presença de header `nabc-lines:` quando NABC é usado

### Validação Musical

#### Quilisma
- ✅ **Quilisma seguido de nota igual ou mais baixa** (warning)
  - Problema: `(gwg)` - quilisma em 'g' seguido de 'g'
  - Motivo: Quilisma requer altura ascendente para renderização correta
  
- ✅ **Quilisma-pes precedido de nota igual ou mais alta** (warning)
  - Problema: `Ad(g) te(gwh)` - quilisma-pes precedido de nota na mesma altura
  - Motivo: Pes/quilisma-pes assume abordagem ascendente
  
- ℹ️ **Conector ausente em sequência quilismática** (info)
  - Sugestão: `(fgwh)` → `(f!gwh)`
  - Motivo: Conector `!` indica fusão horizontal específica

#### Virga Strata
- ✅ **Virga strata seguida de nota igual ou mais alta** (warning)
  - Problema: `(ffo)(f)` - virga strata seguida de mesma altura
  - Motivo: Virga strata implica relação posicional descendente

### Validação NABC
- ✅ Detecta modificadores de liquescência conflitantes (`>` e `~`)
- ✅ Valida formato de descritores de altura (`a-n`)
- ✅ Valida fusões NABC recursivamente

## Uso

### Básico

```typescript
import { GabcParser } from './parser/gabc-parser';
import { analyzeSemantics } from './validation/semantic-analyzer';

// Parse GABC
const parser = new GabcParser(gabcContent);
const document = parser.parse();

// Análise semântica
const diagnostics = analyzeSemantics(document);

// Processar diagnósticos
diagnostics.forEach(diag => {
  console.log(`[${diag.severity}] ${diag.code}: ${diag.message}`);
  if (diag.range) {
    console.log(`  at line ${diag.range.start.line}, col ${diag.range.start.character}`);
  }
});
```

### Com Helper de Integração

```typescript
import { parseAndValidate, formatDiagnostics } from './index';

const result = parseAndValidate(gabcContent);

if (result.hasErrors) {
  console.error('Compilation will fail:');
  console.error(formatDiagnostics(result.semanticDiagnostics));
} else if (result.hasWarnings) {
  console.warn('Warnings found:');
  console.warn(formatDiagnostics(result.semanticDiagnostics));
} else {
  console.log('✓ No issues found');
}
```

### Filtrando por Severidade

```typescript
const errors = diagnostics.filter(d => d.severity === 'error');
const warnings = diagnostics.filter(d => d.severity === 'warning');
const hints = diagnostics.filter(d => d.severity === 'info');

console.log(`${errors.length} errors, ${warnings.length} warnings, ${hints.length} hints`);
```

## Códigos de Diagnóstico

### Erros (Bloqueiam Compilação)

| Código | Descrição | Exemplo |
|--------|-----------|---------|
| `pipe-without-nabc-lines` | Pipe `\|` usado sem header `nabc-lines:` | `(f\|vi)` sem header |
| `nabc-alternation-mismatch` | Número de segmentos NABC não corresponde ao header | `nabc-lines: 1;` com `(f\|vi\|ca)` |
| `line-break-on-first-syllable` | Quebra de linha na primeira sílaba | `(z) Al(f)...` |
| `nabc-conflicting-liquescence` | Modificadores `>` e `~` juntos | `cl>~` |
| `nabc-invalid-pitch` | Altura NABC inválida | `vihz` (z inválido) |

### Warnings (Não Bloqueiam, Podem Afetar Renderização)

| Código | Descrição | Exemplo |
|--------|-----------|---------|
| `missing-name-header` | Header `name:` ausente | Sem `name:...;` no cabeçalho |
| `duplicate-header` | Header definido múltiplas vezes | `mode: 1;` ... `mode: 6;` |
| `too-many-annotations` | Mais de 2 anotações | 3+ linhas `annotation:` |
| `pes-quadratum-missing-note` | Pes quadratum sem nota subsequente | `(eq)` → `(eqg)` ou `(eq@f)` |
| `quilisma-missing-note` | Quilisma sem nota subsequente | `(ew)` → `(ewf)` ou `(gw@h)` |
| `oriscus-scapus-isolated` | Oriscus scapus isolado | `(eO)` → `(deOf)` ou `(d@eO@f)` |
| `oriscus-scapus-missing-preceding` | Oriscus scapus sem nota precedente | `(eOf)` → `(deOf)` |
| `oriscus-scapus-missing-subsequent` | Oriscus scapus sem nota subsequente | `(deO)` → `(deOf)` |
| `quilisma-equal-or-lower` | Quilisma seguido de nota ≤ | `(gwg)`, `(gwf)` → `(gwh)` |
| `quilisma-pes-preceded-by-higher` | Quilisma-pes após nota ≥ | `(h) te(gwh)` |
| `virga-strata-equal-or-higher` | Virga strata seguida de nota ≥ | `(ffo)(f)` → `(ffo)(d)` |
| `pes-stratus-equal-or-higher` | Pes stratus seguido de nota ≥ | `(eeo)(e)` → `(eeo)(d)` |

### Info (Sugestões, Não Afetam Compilação)

| Código | Descrição | Exemplo |
|--------|-----------|---------|
| `quilisma-missing-connector` | Conector `!` ausente | `(fgwh)` → `(f!gwh)` |

## Informações Adicionais

### relatedInfo
Alguns diagnósticos incluem `relatedInfo` com contexto adicional:

```typescript
if (diag.relatedInfo) {
  diag.relatedInfo.forEach(info => {
    console.log(`  Related: ${info.message}`);
    console.log(`    at line ${info.range.start.line}`);
  });
}
```

### Range
Todos os diagnósticos incluem `range` com posição no documento:

```typescript
interface Range {
  start: { line: number; character: number };
  end: { line: number; character: number };
}
```

## Referências

- `docs/ERRORS_AND_WARNINGS_SUMMARY.md` - Lista completa de erros/warnings do Gregorio
- `docs/GREGORIO_COMPILER_ERRORS_AND_WARNINGS.md` - Documentação detalhada

## Testes

Execute os testes do analisador semântico:

```bash
npm test -- semantic-analyzer.test
```

**36 testes** cobrem todos os cenários de validação, incluindo casos com conectores de fusão (@) e alternância NABC.
