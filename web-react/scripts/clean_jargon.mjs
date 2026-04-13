import fs from 'fs';
import path from 'path';

const SRC_DIR = './src';

const REPLACEMENTS = [
  ['O backend exige `company_code` para o recorte multiempresa.', 'É necessário o recorte por empresa.'],
  ['cálculo oficial do backend', 'cálculo do sistema'],
  ['Detalhe oficial do backend', 'Visualizar detalhes'],
  ['que o backend não suporta', ''],
  ['O backend negou a', 'O sistema bloqueou a'],
  ['Não foi possível ler os alertas centrais do backend', 'Não foi possível carregar os alertas centrais'],
  ['O backend valida ingestão por papel.', 'O sistema valida o acesso por permissões.'],
  ['do backend autenticado', 'do banco de dados'],
  ['oficial do backend', 'oficial'],
  ['A lista backend está vazia', 'A lista está vazia'],
  ['backend', 'sistema'],
  ['mockados', 'de demonstração'],
  ['mock_saved', 'saved']
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(SRC_DIR);
let count = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  REPLACEMENTS.forEach(([search, replace]) => {
    // Escape string for regex if needed or just replaceAll if we use string literal
    content = content.split(search).join(replace);
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Finished checking \${files.length} files. Updated \${count} files.`);
