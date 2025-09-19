// scripts/build-extension-improved.js
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const BUILD_DIR = 'out';
const EXTENSION_DIR = 'extension-build';

async function buildExtension() {
  console.log('🚀 Iniciando build da extensão...');

  try {
    // 1. Limpar TUDO primeiro
    console.log('🧹 Limpeza completa...');
    await forceClean();

    // 2. Build do Next.js para extensão
    console.log('⚡ Executando build do Next.js...');
    process.env.BUILD_TARGET = 'extension';
    
    await executeCommand('npm run build');

    // 3. Verificar se build foi criado
    if (!fs.existsSync(BUILD_DIR)) {
      throw new Error('Build do Next.js falhou - pasta out não foi criada');
    }

    // 4. Criar diretório da extensão
    fs.mkdirSync(EXTENSION_DIR, { recursive: true });

    // 5. Copiar arquivos do build
    console.log('📁 Copiando arquivos...');
    copyDirectory(BUILD_DIR, EXTENSION_DIR);

    // 6. Renomear _next para next
    console.log('🔄 Renomeando _next para next...');
    await renameNextDirectory();

    // 7. Copiar arquivos específicos da extensão
    console.log('📋 Copiando arquivos da extensão...');
    await copyExtensionFiles();

    // 8. Corrigir TODAS as referências _next
    console.log('🔧 Corrigindo referências _next...');
    await fixAllNextReferences();

    // 9. Processar e limpar HTML completamente
    console.log('🧽 Limpando HTML...');
    await cleanHtmlCompletely();

    // 10. Remover preload tags
    console.log('🔗 Removendo preload tags...');
    await removePreloadTags();

    // 11. Debug e validação final
    console.log('🔍 Validação final...');
    await debugValidation();

    console.log('✅ Build concluído!');
    console.log(`📦 Arquivos em: ${EXTENSION_DIR}/`);
    console.log('\n📝 Próximos passos:');
    console.log('1. Abra chrome://extensions/');
    console.log('2. Ative o "Modo do desenvolvedor"');
    console.log('3. Clique em "Carregar sem compactação"');
    console.log(`4. Selecione a pasta: ${path.resolve(EXTENSION_DIR)}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

async function forceClean() {
  const dirsToClean = [BUILD_DIR, EXTENSION_DIR, '.next'];
  
  for (const dir of dirsToClean) {
    if (fs.existsSync(dir)) {
      console.log(`  Removendo ${dir}...`);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  
  // Aguardar um pouco para garantir que foi limpo
  await new Promise(resolve => setTimeout(resolve, 1000));
}

function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      console.log(stdout);
      if (stderr) console.error(stderr);
      resolve();
    });
  });
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Pasta fonte não existe: ${src}`);
  }
  
  fs.mkdirSync(dest, { recursive: true });
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function renameNextDirectory() {
  const nextDirOld = path.join(EXTENSION_DIR, '_next');
  const nextDirNew = path.join(EXTENSION_DIR, 'next');
  
  if (fs.existsSync(nextDirOld)) {
    if (fs.existsSync(nextDirNew)) {
      fs.rmSync(nextDirNew, { recursive: true });
    }
    fs.renameSync(nextDirOld, nextDirNew);
    console.log('  ✅ _next renomeado para next');
  } else {
    console.warn('  ⚠️ Pasta _next não encontrada');
  }
}

async function copyExtensionFiles() {
  // Verificar se arquivos existem
  const files = [
    { src: 'public/manifest.json', dest: 'manifest.json' },
    { src: 'public/background.js', dest: 'background.js' }
  ];
  
  for (const file of files) {
    const srcPath = file.src;
    const destPath = path.join(EXTENSION_DIR, file.dest);
    
    if (!fs.existsSync(srcPath)) {
      throw new Error(`Arquivo obrigatório não encontrado: ${srcPath}`);
    }
    
    fs.copyFileSync(srcPath, destPath);
    console.log(`  ✅ Copiado: ${file.dest}`);
  }
  
  // Copiar icons
  const iconsDir = 'public/icons';
  if (fs.existsSync(iconsDir)) {
    copyDirectory(iconsDir, path.join(EXTENSION_DIR, 'icons'));
    console.log('  ✅ Ícones copiados');
  } else {
    console.warn('  ⚠️ Pasta de ícones não encontrada');
  }
}

async function fixAllNextReferences() {
  const filesToFix = [];
  findFiles(EXTENSION_DIR, ['.html', '.js', '.css'], filesToFix);
  
  let totalFixed = 0;
  
  for (const filePath of filesToFix) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      // Substituir TODAS as referências _next por next
      content = content.replace(/_next\//g, 'next/');
      content = content.replace(/\.\/_next\//g, './next/');
      content = content.replace(/\/_next\//g, '/next/');
      content = content.replace(/"_next\//g, '"next/');
      content = content.replace(/'_next\//g, "'next/");
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        totalFixed++;
        console.log(`  ✅ Corrigido: ${path.relative(EXTENSION_DIR, filePath)}`);
      }
    } catch (error) {
      console.warn(`  ⚠️ Erro ao processar ${filePath}: ${error.message}`);
    }
  }
  
  console.log(`  ✅ ${totalFixed} arquivos corrigidos`);
}

async function cleanHtmlCompletely() {
  const indexPath = path.join(EXTENSION_DIR, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    throw new Error('index.html não encontrado');
  }

  let content = fs.readFileSync(indexPath, 'utf8');
  let scriptCounter = 0;
  
  console.log('  📄 Tamanho original do HTML:', content.length);
  
  // REMOVER COMPLETAMENTE todos os scripts inline
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/g, (match) => {
    // Se é um script src externo, manter
    if (match.includes('src=')) {
      return match;
    }
    
    // Se é script inline, extrair para arquivo
    const scriptContent = match.replace(/<script[^>]*>|<\/script>/g, '').trim();
    
    if (scriptContent) {
      scriptCounter++;
      const scriptFileName = `extracted-${scriptCounter}.js`;
      const scriptPath = path.join(EXTENSION_DIR, scriptFileName);
      
      // Salvar script em arquivo externo
      const safeScript = `// Extracted script ${scriptCounter}\ntry {\n${scriptContent}\n} catch(e) { console.warn('Script ${scriptCounter} failed:', e); }`;
      fs.writeFileSync(scriptPath, safeScript);
      
      console.log(`  📝 Script extraído: ${scriptFileName}`);
      return `<script src="./${scriptFileName}"></script>`;
    }
    
    return '';
  });
  
  // Remover qualquer CSP do HTML
  content = content.replace(/<meta[^>]*http-equiv[^>]*Content-Security-Policy[^>]*>/gi, '');
  
  // Remover scripts vazios
  content = content.replace(/<script[^>]*><\/script>/g, '');
  
  fs.writeFileSync(indexPath, content);
  console.log(`  ✅ ${scriptCounter} scripts extraídos, HTML limpo`);
}

async function removePreloadTags() {
  const htmlFiles = [];
  findFiles(EXTENSION_DIR, ['.html'], htmlFiles);
  
  let totalRemoved = 0;
  
  for (const filePath of htmlFiles) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      // Remover todas as tags de preload
      content = content.replace(/<link[^>]*rel=['"]?preload['"]?[^>]*>/gi, '');
      content = content.replace(/<link[^>]*rel=['"]?prefetch['"]?[^>]*>/gi, '');
      content = content.replace(/<link[^>]*rel=['"]?modulepreload['"]?[^>]*>/gi, '');
      
      // Remover preloads específicos do webpack
      content = content.replace(/<link[^>]*href=['"][^'"]*webpack[^'"]*['"][^>]*rel=['"]?preload['"]?[^>]*>/gi, '');
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        totalRemoved++;
        console.log(`  ✅ Preload removido de: ${path.relative(EXTENSION_DIR, filePath)}`);
      }
    } catch (error) {
      console.warn(`  ⚠️ Erro ao processar ${filePath}: ${error.message}`);
    }
  }
  
  if (totalRemoved > 0) {
    console.log(`  ✅ ${totalRemoved} arquivos limpos de preload`);
  } else {
    console.log('  ✅ Nenhuma tag preload encontrada');
  }
}

function findFiles(dir, extensions, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      findFiles(filePath, extensions, fileList);
    } else {
      const ext = path.extname(file.name).toLowerCase();
      if (extensions.includes(ext)) {
        fileList.push(filePath);
      }
    }
  }
  
  return fileList;
}

async function debugValidation() {
  const manifestPath = path.join(EXTENSION_DIR, 'manifest.json');
  const indexPath = path.join(EXTENSION_DIR, 'index.html');
  
  // 1. Verificar manifest
  if (!fs.existsSync(manifestPath)) {
    throw new Error('manifest.json não encontrado');
  }
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log('  📋 Manifest validado:', manifest.name, manifest.version);
  
  // Verificar se tem CSP no manifest
  if (manifest.content_security_policy) {
    console.log('  ⚠️ ATENÇÃO: CSP encontrado no manifest:', manifest.content_security_policy);
  } else {
    console.log('  ✅ Manifest sem CSP (padrão será usado)');
  }
  
  // 2. Verificar HTML
  const htmlContent = fs.readFileSync(indexPath, 'utf8');
  
  // Verificar scripts inline
  const inlineScripts = htmlContent.match(/<script[^>]*>[\s\S]*?<\/script>/g) || [];
  const inlineScriptCount = inlineScripts.filter(script => !script.includes('src=')).length;
  
  if (inlineScriptCount > 0) {
    console.log('  ❌ PROBLEMA: Ainda há', inlineScriptCount, 'scripts inline');
    inlineScripts.forEach((script, i) => {
      if (!script.includes('src=')) {
        console.log(`    Script inline ${i + 1}:`, script.substring(0, 100) + '...');
      }
    });
  } else {
    console.log('  ✅ Nenhum script inline encontrado');
  }
  
  // Verificar referências _next
  if (htmlContent.includes('_next/')) {
    console.log('  ❌ PROBLEMA: Ainda há referências _next no HTML');
  } else {
    console.log('  ✅ Todas as referências _next foram corrigidas');
  }
  
  // Verificar preload tags
  const preloadTags = htmlContent.match(/<link[^>]*rel=['"]?preload['"]?[^>]*>/gi) || [];
  if (preloadTags.length > 0) {
    console.log('  ⚠️ AVISO:', preloadTags.length, 'preload tags ainda presentes');
  } else {
    console.log('  ✅ Nenhuma tag preload encontrada');
  }
  
  // 3. Verificar arquivos essenciais
  const requiredFiles = ['next', 'icons/icon16.png', 'background.js'];
  for (const file of requiredFiles) {
    const filePath = path.join(EXTENSION_DIR, file);
    if (fs.existsSync(filePath)) {
      console.log(`  ✅ ${file} encontrado`);
    } else {
      console.log(`  ❌ ${file} NÃO encontrado`);
    }
  }
  
  // 4. Contar total de arquivos
  const jsFiles = [];
  const cssFiles = [];
  findFiles(EXTENSION_DIR, ['.js'], jsFiles);
  findFiles(EXTENSION_DIR, ['.css'], cssFiles);
  
  console.log(`  📊 Total: ${jsFiles.length} arquivos JS, ${cssFiles.length} arquivos CSS`);
  
  console.log('  ✅ Validação concluída');
}

// Executar build
if (require.main === module) {
  buildExtension();
}

module.exports = { buildExtension };