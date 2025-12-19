const { GabcSemanticTokensProvider, tokenTypes } = require('./out/src/semanticTokensProvider');

// Create mock document
const mockDoc = {
  getText: () => `name: Test;
%%
(go0hO1)`,
  lineAt: (line) => ({
    text: [`name: Test;`, `%%`, `(go0hO1)`][line] || ''
  }),
  lineCount: 3,
  uri: { fsPath: 'test.gabc' }
};

const provider = new GabcSemanticTokensProvider();
const mockToken = { isCancellationRequested: false };

provider.provideDocumentSemanticTokens(mockDoc, mockToken).then(result => {
  if (!result) {
    console.log('No tokens generated');
    return;
  }
  
  const data = result.data;
  console.log('\nDecoding tokens...');
  
  let line = 0;
  let char = 0;
  
  for (let i = 0; i < data.length; i += 5) {
    const deltaLine = data[i];
    const deltaChar = data[i + 1];
    const length = data[i + 2];
    const type = data[i + 3];
    
    line += deltaLine;
    if (deltaLine > 0) {
      char = deltaChar;
    } else {
      char += deltaChar;
    }
    
    const lines = mockDoc.getText().split('\n');
    const content = lines[line]?.substring(char, char + length) || '';
    const typeName = tokenTypes[type];
    
    if (content === '0' || content === '1' || content === 'o' || content === 'O') {
      console.log(`Line ${line}, Char ${char}: "${content}" -> ${typeName}`);
    }
  }
  
  console.log('\nDone!');
}).catch(err => {
  console.error('Error:', err);
});
