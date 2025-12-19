# Como Testar o Highlight de Símbolos Mistos

## O Problema Corrigido

O highlight não estava sendo aplicado corretamente em situações de ocorrências mistas de ictus (`'`) e episema (`_`), como:
- `g'_0` - ictus seguido de episema com dígito
- `g_0'` - episema com dígito seguido de ictus
- `g_'` - episema seguido de ictus

## A Solução

A correção mudou os `else if` para `if` independentes no bloco de tokenização de extra symbols. Isso permite que:
1. Cada símbolo (`'`, `_`, `` ` ``) seja tokenizado individualmente
2. Cada símbolo verifique se há um dígito de posição após ele
3. Múltiplos símbolos possam ser processados em sequência

## Como Testar

### 1. Recarregar a Extensão

**IMPORTANTE**: Você DEVE recarregar a extensão no VS Code para ver as mudanças:

#### Opção A: Recarregar Janela
1. Pressione `F1` ou `Ctrl+Shift+P`
2. Digite "Reload Window"
3. Pressione Enter

#### Opção B: Reiniciar VS Code
1. Feche completamente o VS Code
2. Abra novamente

### 2. Abrir Arquivo de Teste

Abra o arquivo `test-extra-symbols-visual.gabc` que foi criado no diretório raiz do projeto.

### 3. Verificar o Highlight

Verifique se o highlight está sendo aplicado corretamente nos seguintes casos:

#### Caso 1: `g'_0`
- `g` deve receber highlight de pitch (class)
- `'` deve receber highlight de símbolo (variable) 
- `_` deve receber highlight de símbolo (variable)
- `0` deve receber highlight numérico (number)

#### Caso 2: `g_0'`
- `g` deve receber highlight de pitch (class)
- `_` deve receber highlight de símbolo (variable)
- `0` deve receber highlight numérico (number)
- `'` deve receber highlight de símbolo (variable)

#### Caso 3: `g_'`
- `g` deve receber highlight de pitch (class)
- `_` deve receber highlight de símbolo (variable)
- `'` deve receber highlight de símbolo (variable)

### 4. Validar os Tokens (Debug)

Se você quiser validar a lógica de tokenização em isolamento, execute:

```bash
node debug-exact-simulation.js
```

Isso irá executar uma simulação exata da lógica do provider e mostrar:
- Cada passo da tokenização
- Os tokens gerados
- Se os testes passaram

Expected output:
```
Testing Extra Symbols Tokenization
===================================

>>> Test 1: g'_0
Tokenizing: "g'_0"
...
Result: ✓ PASS

>>> Test 2: g_0'
Tokenizing: "g_0'"
...
Result: ✓ PASS

>>> Test 3: g_'
Tokenizing: "g_'"
...
Result: ✓ PASS

===================================
SUMMARY
===================================
✓ All tests PASSED
```

## Mapeamento de Cores

Os tokens são mapeados para TextMate scopes em `package.json`:

- **variable** → `variable.other.gabc`, `entity.name.note.gabc`
- **number** → `constant.numeric.gabc`
- **class** → `variable.language.gabc`

As cores específicas dependem do seu tema ativo no VS Code.

## Troubleshooting

### O highlight ainda está incorreto
1. Certifique-se de que recarregou a janela do VS Code
2. Verifique se a extensão está compilada: `npm run compile`
3. Verifique se não há erros no console do VS Code (Help → Toggle Developer Tools → Console)

### Como ver os tokens aplicados
1. Abra o Command Palette (`Ctrl+Shift+P`)
2. Digite "Developer: Inspect Editor Tokens and Scopes"
3. Posicione o cursor sobre o caractere que você quer inspecionar
4. Verifique os "semantic token type" na janela que aparece

## Casos de Teste Incluídos

O arquivo `test-extra-symbols-visual.gabc` inclui:
- Casos básicos: `g'_0`, `g_0'`, `g_'`, `g'_`
- Múltiplas combinações: `j'_0`, `k_'`, `l_0'`, `m'_`
- Posições de episema: `n_0`, `o_1`, `p_2`, `q_3`, `r_4`, `s_5`
- Posições de ictus: `a'0`, `b'1`
- Combinações complexas: `g'_0h_'i_1'j'_k_2`
