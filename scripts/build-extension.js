// scripts/build-extension-nextjs.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUILD_DIR = 'out';
const EXTENSION_DIR = 'extension-build';

console.log('🚀 Iniciando build Next.js para extensão Chrome...\n');

// 1. Limpar diretórios anteriores
console.log('🧹 Limpando builds anteriores...');
[BUILD_DIR, EXTENSION_DIR, '.next'].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`  ✓ ${dir} removido`);
  }
});

// 2. Criar arquivo .env.local se não existir
console.log('\n📝 Configurando variáveis de ambiente...');
const envContent = `
NEXT_PUBLIC_FINESSE_URL_PRIMARY=https://sncfinesse1.totvs.com.br:8445/finesse/api
NEXT_PUBLIC_FINESSE_URL_FALLBACK=https://sncfinesse2.totvs.com.br:8445/finesse/api
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=@jv01.local,@totvs.com.br
NEXT_PUBLIC_ALLOWED_WEBHOOK_DOMAIN=chat.googleapis.com
NEXT_PUBLIC_DEFAULT_STANDARD_TIMER=5
NEXT_PUBLIC_DEFAULT_PAUSE_TIMER=30
NEXT_PUBLIC_MIN_TIMER_MINUTES=1
NEXT_PUBLIC_MAX_TIMER_MINUTES=120
NEXT_PUBLIC_MAX_LOGIN_ATTEMPTS=10
NEXT_PUBLIC_LOCKOUT_DURATION=15
NEXT_PUBLIC_SESSION_TIMEOUT=480
NEXT_PUBLIC_ENCRYPTION_KEY=your-secret-key-here-change-this
`.trim();

if (!fs.existsSync('.env.local')) {
  fs.writeFileSync('.env.local', envContent);
  console.log('  ✓ .env.local criado');
} else {
  console.log('  ✓ .env.local já existe');
}

// 3. Build do Next.js
console.log('\n⚡ Executando build do Next.js...');
try {
  execSync('BUILD_TARGET=extension npm run build', { stdio: 'inherit' });
  console.log('  ✓ Build Next.js concluído');
} catch (error) {
  console.error('❌ Erro no build do Next.js');
  process.exit(1);
}

// 4. Verificar se o build foi criado
if (!fs.existsSync(BUILD_DIR)) {
  console.error('❌ Pasta out não foi criada');
  process.exit(1);
}

// 5. Copiar build para extension-build
console.log('\n📂 Copiando arquivos...');
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

copyRecursive(BUILD_DIR, EXTENSION_DIR);
console.log('  ✓ Arquivos copiados');

// 6. Renomear _next para next
console.log('\n🔄 Ajustando estrutura de pastas...');
const oldNextPath = path.join(EXTENSION_DIR, '_next');
const newNextPath = path.join(EXTENSION_DIR, 'next');

if (fs.existsSync(oldNextPath)) {
  if (fs.existsSync(newNextPath)) {
    fs.rmSync(newNextPath, { recursive: true });
  }
  fs.renameSync(oldNextPath, newNextPath);
  console.log('  ✓ _next renomeado para next');
}

// 7. Corrigir todos os caminhos nos arquivos
console.log('\n🔧 Corrigindo caminhos...');
function fixPaths(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  let count = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      count += fixPaths(filePath);
    } else if (file.name.endsWith('.html') || file.name.endsWith('.js') || file.name.endsWith('.css')) {
      let content = fs.readFileSync(filePath, 'utf8');
      const original = content;
      
      // Corrigir referências a _next
      content = content.replace(/_next\//g, 'next/');
      content = content.replace(/\/_next\//g, '/next/');
      
      // Corrigir paths absolutos para relativos
      content = content.replace(/href="\//g, 'href="');
      content = content.replace(/src="\//g, 'src="');
      
      // Corrigir importações de módulos
      content = content.replace(/from"\//g, 'from"');
      content = content.replace(/import"\//g, 'import"');
      
      if (content !== original) {
        fs.writeFileSync(filePath, content);
        count++;
      }
    }
  }
  
  return count;
}

const fixedFiles = fixPaths(EXTENSION_DIR);
console.log(`  ✓ ${fixedFiles} arquivos corrigidos`);

// 8. Processar index.html principal
console.log('\n📄 Processando index.html...');
const indexPath = path.join(EXTENSION_DIR, 'index.html');

if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  
  // Remover meta CSP problemático
  html = html.replace(/<meta[^>]*Content-Security-Policy[^>]*>/gi, '');
  
  // Remover preload/prefetch que podem falhar
  html = html.replace(/<link[^>]*rel=["']?(preload|prefetch|modulepreload)["']?[^>]*>/gi, '');
  
  // Garantir charset UTF-8
  if (!html.includes('charset')) {
    html = html.replace('<head>', '<head>\n    <meta charset="utf-8">');
  }
  
  // Adicionar loader script para garantir que tudo carregue
  const loaderScript = `
    <script>
      // Extension Loader
      console.log('Extensão carregando...');
      
      // Aguardar Next.js carregar
      window.addEventListener('load', function() {
        setTimeout(function() {
          const nextRoot = document.getElementById('__next');
          if (nextRoot && !nextRoot.children.length) {
            console.error('Next.js não carregou - recarregando...');
            window.location.reload();
          }
        }, 2000);
      });
    </script>
  `;
  
  if (!html.includes('Extension Loader')) {
    html = html.replace('</body>', loaderScript + '\n</body>');
  }
  
  fs.writeFileSync(indexPath, html);
  console.log('  ✓ index.html processado');
}

// 9. Criar popup.html que abre index.html
console.log('\n📱 Criando popup.html...');
const popupHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Finesse Notifier</title>
    <style>
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
        }
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            font-family: system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
    </style>
</head>
<body>
    <div id="loader" class="loading">
        <div>
            <p>Carregando aplicação...</p>
            <p style="font-size: 12px; margin-top: 10px;">Aguarde alguns segundos...</p>
        </div>
    </div>
    <iframe id="app" src="index.html" style="display: none;"></iframe>
    
    <script>
        const iframe = document.getElementById('app');
        const loader = document.getElementById('loader');
        
        iframe.onload = function() {
            setTimeout(function() {
                loader.style.display = 'none';
                iframe.style.display = 'block';
            }, 1000);
        };
        
        // Fallback se não carregar
        setTimeout(function() {
            if (iframe.style.display === 'none') {
                loader.innerHTML = '<button onclick="chrome.tabs.create({url: chrome.runtime.getURL(\'index.html\')})" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">Abrir em Nova Aba</button>';
            }
        }, 5000);
    </script>
</body>
</html>`;

fs.writeFileSync(path.join(EXTENSION_DIR, 'popup.html'), popupHtml);
console.log('  ✓ popup.html criado');

// 10. Copiar arquivos essenciais da extensão
console.log('\n📦 Copiando arquivos da extensão...');

// Copiar manifest.json
if (fs.existsSync('public/manifest.json')) {
  const manifest = JSON.parse(fs.readFileSync('public/manifest.json', 'utf8'));
  
  // Ajustar manifest para funcionar corretamente
  manifest.action = {
    default_popup: "popup.html",
    default_title: "Finesse Notifier",
    default_icon: {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  };
  
  // Adicionar permissões necessárias
  if (!manifest.permissions.includes('scripting')) {
    manifest.permissions.push('scripting');
  }
  
  // Configurar CSP apropriado para Next.js
  manifest.content_security_policy = {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; style-src 'self' 'unsafe-inline';"
  };
  
  // Recursos acessíveis
  manifest.web_accessible_resources = [{
    "resources": ["*"],
    "matches": ["<all_urls>"]
  }];
  
  fs.writeFileSync(path.join(EXTENSION_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('  ✓ manifest.json copiado e ajustado');
}

// Copiar background.js
if (fs.existsSync('public/background.js')) {
  fs.copyFileSync('public/background.js', path.join(EXTENSION_DIR, 'background.js'));
  console.log('  ✓ background.js copiado');
}

// Copiar ícones
if (fs.existsSync('public/icons')) {
  copyRecursive('public/icons', path.join(EXTENSION_DIR, 'icons'));
  console.log('  ✓ Ícones copiados');
}

// 11. Criar script de correção final
console.log('\n🔨 Aplicando correções finais...');
const fixerScript = `
// Corretor de paths para extensão Chrome
(function() {
  // Corrigir todos os links e scripts
  document.querySelectorAll('[src], [href]').forEach(el => {
    const attr = el.hasAttribute('src') ? 'src' : 'href';
    let value = el.getAttribute(attr);
    
    if (value && value.startsWith('/')) {
      // Remover barra inicial
      value = value.substring(1);
      el.setAttribute(attr, value);
    }
    
    // Corrigir _next
    if (value && value.includes('_next')) {
      value = value.replace('_next', 'next');
      el.setAttribute(attr, value);
    }
  });
})();
`;

fs.writeFileSync(path.join(EXTENSION_DIR, 'path-fixer.js'), fixerScript);

// Injetar o script no index.html
let indexContent = fs.readFileSync(indexPath, 'utf8');
if (!indexContent.includes('path-fixer.js')) {
  indexContent = indexContent.replace('</head>', '<script src="path-fixer.js"></script>\n</head>');
  fs.writeFileSync(indexPath, indexContent);
}

// 12. Validação final
console.log('\n✅ Validando build...');
const requiredFiles = [
  'manifest.json',
  'background.js', 
  'index.html',
  'popup.html',
  'next'
];

let allValid = true;
requiredFiles.forEach(file => {
  const filePath = path.join(EXTENSION_DIR, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✓ ${file}`);
  } else {
    console.log(`  ✗ ${file} FALTANDO`);
    allValid = false;
  }
});

if (allValid) {
  console.log('\n🎉 Build concluído com sucesso!');
  console.log('\n📋 Próximos passos:');
  console.log('1. Abra chrome://extensions/');
  console.log('2. Ative "Modo do desenvolvedor"');
  console.log('3. Clique em "Carregar sem compactação"');
  console.log(`4. Selecione: ${path.resolve(EXTENSION_DIR)}`);
  console.log('\n💡 Dica: Se a interface não carregar no popup, clique com botão direito');
  console.log('   no ícone da extensão e selecione "Inspecionar popup" para ver erros.');
} else {
  console.error('\n❌ Build incompleto - verifique os arquivos faltantes');
  process.exit(1);
}