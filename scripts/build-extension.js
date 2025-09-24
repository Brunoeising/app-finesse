// scripts/build-extension-csp-fix.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const BUILD_DIR = 'out';
const EXTENSION_DIR = 'extension-build';

console.log('🚀 Build Next.js para Extensão Chrome (CSP Compliant)\n');

// Função auxiliar para copiar recursivamente
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Limpar
console.log('🧹 Limpando...');
[BUILD_DIR, EXTENSION_DIR, '.next'].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// 2. Criar .env.local
if (!fs.existsSync('.env.local')) {
  fs.writeFileSync('.env.local', `
NEXT_PUBLIC_FINESSE_URL_PRIMARY=https://sncfinesse1.totvs.com.br:8445/finesse/api
NEXT_PUBLIC_FINESSE_URL_FALLBACK=https://sncfinesse2.totvs.com.br:8445/finesse/api
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=@jv01.local,@totvs.com.br
NEXT_PUBLIC_ENCRYPTION_KEY=your-secret-key-here
  `.trim());
}

// 3. Build Next.js
console.log('\n⚡ Build Next.js...');
try {
  execSync('BUILD_TARGET=extension npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Erro no build');
  process.exit(1);
}

// 4. Copiar arquivos
console.log('\n📂 Copiando arquivos...');
copyRecursive(BUILD_DIR, EXTENSION_DIR);

// 5. Renomear _next para next
const oldNext = path.join(EXTENSION_DIR, '_next');
const newNext = path.join(EXTENSION_DIR, 'next');
if (fs.existsSync(oldNext)) {
  if (fs.existsSync(newNext)) {
    fs.rmSync(newNext, { recursive: true });
  }
  fs.renameSync(oldNext, newNext);
}

// 6. Função para extrair scripts inline
function extractInlineScripts(htmlPath) {
  let html = fs.readFileSync(htmlPath, 'utf8');
  let scriptCount = 0;
  const extractedScripts = [];
  
  // Remover meta CSP
  html = html.replace(/<meta[^>]*Content-Security-Policy[^>]*>/gi, '');
  
  // Remover preload/prefetch
  html = html.replace(/<link[^>]*rel=["']?(preload|prefetch|modulepreload)["']?[^>]*>/gi, '');
  
  // Extrair TODOS os scripts inline
  html = html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, content) => {
    // Se tem src, apenas corrigir o caminho
    if (attrs.includes('src=')) {
      let srcMatch = attrs.match(/src=["']([^"']+)["']/);
      if (srcMatch && srcMatch[1]) {
        let src = srcMatch[1];
        // Corrigir caminhos
        src = src.replace(/^\/_next/, '/next').replace(/^_next/, 'next');
        if (src.startsWith('/')) {
          src = src.substring(1);
        }
        // Verificar se o arquivo existe
        const scriptPath = path.join(EXTENSION_DIR, src);
        if (!fs.existsSync(scriptPath)) {
          console.log(`  ⚠️ Script não encontrado: ${src}`);
          // Tentar encontrar o arquivo
          const possiblePaths = [
            path.join(EXTENSION_DIR, 'next', 'static', 'chunks', path.basename(src)),
            path.join(EXTENSION_DIR, 'next', 'static', 'chunks', 'pages', path.basename(src)),
            path.join(EXTENSION_DIR, 'next', 'static', 'chunks', 'app', path.basename(src))
          ];
          
          for (const possiblePath of possiblePaths) {
            if (fs.existsSync(possiblePath)) {
              // Copiar para o local esperado
              const destDir = path.dirname(scriptPath);
              fs.mkdirSync(destDir, { recursive: true });
              fs.copyFileSync(possiblePath, scriptPath);
              console.log(`  ✓ Script copiado: ${path.basename(src)}`);
              break;
            }
          }
        }
        return `<script${attrs.replace(/src=["'][^"']+["']/, `src="${src}"`)}></script>`;
      }
      return match;
    }
    
    // Se tem conteúdo inline, extrair
    if (content && content.trim()) {
      scriptCount++;
      const fileName = `extracted-${scriptCount}.js`;
      const scriptContent = `// Extracted script ${scriptCount}\n${content}`;
      fs.writeFileSync(path.join(EXTENSION_DIR, fileName), scriptContent);
      extractedScripts.push(fileName);
      return `<script src="${fileName}"></script>`;
    }
    
    return '';
  });
  
  // Adicionar meta charset se não existir
  if (!html.includes('charset')) {
    html = html.replace('<head>', '<head>\n    <meta charset="utf-8">');
  }
  
  // Adicionar viewport
  if (!html.includes('viewport')) {
    html = html.replace('<head>', '<head>\n    <meta name="viewport" content="width=device-width, initial-scale=1">');
  }
  
  fs.writeFileSync(htmlPath, html);
  return extractedScripts;
}

// 7. Processar index.html
console.log('\n📄 Processando HTMLs...');
const indexPath = path.join(EXTENSION_DIR, 'index.html');
if (fs.existsSync(indexPath)) {
  const scripts = extractInlineScripts(indexPath);
  console.log(`  ✓ index.html: ${scripts.length} scripts extraídos`);
}

// 8. Corrigir caminhos em todos os arquivos
console.log('\n🔧 Corrigindo caminhos...');
function fixAllPaths(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  let count = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      count += fixAllPaths(filePath);
    } else if (file.name.endsWith('.html') || file.name.endsWith('.js') || file.name.endsWith('.css')) {
      let content = fs.readFileSync(filePath, 'utf8');
      const original = content;
      
      // Corrigir _next
      content = content.replace(/_next\//g, 'next/');
      content = content.replace(/\/_next\//g, '/next/');
      
      // Corrigir paths absolutos
      content = content.replace(/href="\//g, 'href="');
      content = content.replace(/src="\//g, 'src="');
      
      // Corrigir imports
      content = content.replace(/from["\s]+\//g, 'from "');
      content = content.replace(/import["\s]+\//g, 'import "');
      
      if (content !== original) {
        fs.writeFileSync(filePath, content);
        count++;
      }
    }
  }
  
  return count;
}

const fixedFiles = fixAllPaths(EXTENSION_DIR);
console.log(`  ✓ ${fixedFiles} arquivos corrigidos`);

// 9. Criar popup.html SEM scripts inline
console.log('\n📱 Criando popup.html...');

// Primeiro criar o JavaScript do popup
const popupJs = `
// popup-loader.js
document.addEventListener('DOMContentLoaded', function() {
  const iframe = document.getElementById('app');
  const loader = document.getElementById('loader');
  
  iframe.onload = function() {
    setTimeout(function() {
      loader.style.display = 'none';
      iframe.style.display = 'block';
    }, 1000);
  };
  
  // Fallback
  setTimeout(function() {
    if (iframe.style.display === 'none') {
      const button = document.createElement('button');
      button.textContent = 'Abrir em Nova Aba';
      button.style.cssText = 'padding: 10px 20px; font-size: 16px; cursor: pointer; background: white; border: none; border-radius: 5px;';
      button.onclick = function() {
        chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
      };
      loader.innerHTML = '';
      loader.appendChild(button);
    }
  }, 5000);
});
`;

fs.writeFileSync(path.join(EXTENSION_DIR, 'popup-loader.js'), popupJs);

// Agora criar o HTML sem scripts inline
const popupHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Finesse Notifier</title>
    <link rel="stylesheet" href="popup-styles.css">
</head>
<body>
    <div id="loader" class="loading">
        <div>
            <p>Carregando aplicação...</p>
            <p class="subtitle">Aguarde alguns segundos...</p>
        </div>
    </div>
    <iframe id="app" src="index.html"></iframe>
    <script src="popup-loader.js"></script>
</body>
</html>`;

fs.writeFileSync(path.join(EXTENSION_DIR, 'popup.html'), popupHtml);

// Criar CSS do popup
const popupCss = `
body {
    margin: 0;
    padding: 0;
    width: 450px;
    height: 600px;
    overflow: hidden;
}

iframe {
    width: 100%;
    height: 100%;
    border: none;
    display: none;
}

.loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-family: system-ui, -apple-system, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    text-align: center;
}

.loading p {
    margin: 5px 0;
}

.subtitle {
    font-size: 12px;
    opacity: 0.9;
}
`;

fs.writeFileSync(path.join(EXTENSION_DIR, 'popup-styles.css'), popupCss);

// 10. Copiar arquivos da extensão
console.log('\n📦 Copiando arquivos da extensão...');

// Background.js
if (fs.existsSync('public/background.js')) {
  fs.copyFileSync('public/background.js', path.join(EXTENSION_DIR, 'background.js'));
}

// Ícones
if (fs.existsSync('public/icons')) {
  copyRecursive('public/icons', path.join(EXTENSION_DIR, 'icons'));
}

// 11. Criar manifest.json com CSP correto
console.log('\n📝 Criando manifest.json...');
const manifest = {
  "manifest_version": 3,
  "name": "Finesse Notifier",
  "version": "2.0.0",
  "description": "Sistema de monitoramento para Cisco Finesse",
  "permissions": [
    "storage",
    "tabs",
    "notifications",
    "alarms"
  ],
  "host_permissions": [
    "https://sncfinesse1.totvs.com.br/*",
    "https://sncfinesse2.totvs.com.br/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_title": "Finesse Notifier",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; style-src 'self' 'unsafe-inline';"
  },
  "web_accessible_resources": [
    {
      "resources": ["*"],
      "matches": ["<all_urls>"]
    }
  ]
};

fs.writeFileSync(
  path.join(EXTENSION_DIR, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);

// 12. Verificar arquivos faltantes do Next.js
console.log('\n🔍 Verificando arquivos do Next.js...');
const nextDir = path.join(EXTENSION_DIR, 'next', 'static', 'chunks');
if (fs.existsSync(nextDir)) {
  const chunks = fs.readdirSync(nextDir);
  console.log(`  ✓ ${chunks.length} chunks encontrados`);
  
  // Verificar se há pages
  const pagesDir = path.join(nextDir, 'pages');
  if (!fs.existsSync(pagesDir)) {
    // Se pages não existe mas há arquivos page-*, mover para pages
    const pageFiles = chunks.filter(f => f.startsWith('page-'));
    if (pageFiles.length > 0) {
      fs.mkdirSync(pagesDir, { recursive: true });
      pageFiles.forEach(file => {
        fs.renameSync(
          path.join(nextDir, file),
          path.join(pagesDir, file)
        );
      });
      console.log(`  ✓ ${pageFiles.length} arquivos de página organizados`);
    }
  }
}

// 13. Validação final
console.log('\n✅ Validando build...');
const required = ['manifest.json', 'popup.html', 'index.html', 'next'];
let valid = true;

required.forEach(file => {
  const exists = fs.existsSync(path.join(EXTENSION_DIR, file));
  console.log(`  ${exists ? '✓' : '✗'} ${file}`);
  if (!exists) valid = false;
});

if (valid) {
  console.log('\n🎉 Build concluído com sucesso!');
  console.log('\n📋 Para testar:');
  console.log('1. chrome://extensions/');
  console.log('2. Modo desenvolvedor: ON');
  console.log('3. Carregar sem compactação');
  console.log(`4. Selecionar: ${path.resolve(EXTENSION_DIR)}`);
} else {
  console.error('\n❌ Arquivos faltando!');
}