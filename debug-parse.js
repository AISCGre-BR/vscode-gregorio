const { GabcParser } = require('./lsp-server/parser/gabc-parser.js');
const fs = require('fs');
const content = fs.readFileSync('test-alterations.gabc', 'utf-8');
const parser = new GabcParser(content);
const parsed = parser.parse();

console.log('Full file content:');
content.split('\n').forEach((line, i) => {
  console.log(`${i}: ${line}`);
});

// Find all syllables with notes
parsed.notation.syllables.forEach(syl => {
  if (syl.text && syl.notes.length > 0) {
    console.log(`\n=== Syllable: '${syl.text}' ===`);
    syl.notes.forEach((ng, i) => {
      console.log(`  NoteGroup ${i}: gabc='${ng.gabc}'`);
      const lines = content.split('\n');
      const ngText = lines[ng.range.start.line]?.substring(ng.range.start.character, ng.range.end.character) || '';
      console.log(`    Full text: '${ngText}'`);
      
      ng.notes.forEach((note, j) => {
        const noteText = lines[note.range.start.line]?.substring(note.range.start.character, note.range.end.character) || '';
        console.log(`    Note ${j}: pitch=${note.pitch} shape=${note.shape}`);
        console.log(`      Text: '${noteText}'`);
        console.log(`      Range: (${note.range.start.line},${note.range.start.character})-(${note.range.end.line},${note.range.end.character})`);
        console.log(`      Modifiers:`, note.modifiers);
      });
    });
  }
});
