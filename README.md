# Finesse Notifier Next.js v2.0

Uma versão moderna e melhorada da extensão Finesse Notifier, construída com **Next.js**, **TypeScript** e **Tailwind CSS**. Esta versão mantém todas as funcionalidades da extensão original e adiciona novas melhorias significativas.

## ✨ Novas Funcionalidades

### 🔔 Sistema de Notificações Avançado
- **Notificações do Windows**: Melhoradas com controle de permissões
- **Google Chat**: Envio de notificações para Google Chat via webhook
- **Fallback Inteligente**: Se notificações do Windows estão desabilitadas, usa Google Chat automaticamente
- **Teste de Notificações**: Botão para testar configurações

### 🎛️ Controle de Estado do Agente
- **Alteração de Status**: Possibilidade de mudar status diretamente pela extensão
- **Códigos de Motivo**: Seleção de códigos de motivo para status "Não Pronto"
- **Atualização em Tempo Real**: Status atualizado automaticamente após mudanças

### 🎨 Interface Moderna
- **Design Responsivo**: Tailwind CSS para interface moderna
- **TypeScript**: Tipagem completa para melhor manutenibilidade
- **Componentes Reutilizáveis**: Arquitetura modular com React/Next.js
- **Feedback Visual**: Indicadores visuais de status e carregamento

## 📋 Pré-requisitos

- Node.js 18.x ou superior
- Chrome/Chromium para desenvolvimento de extensões
- Acesso à VPN da TOTVS (para APIs do Finesse)

## 🚀 Instalação e Desenvolvimento

### 1. Clone o repositório
```bash
git clone <repository-url>
cd finesse-notifier-nextjs
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Execute em modo de desenvolvimento
```bash
npm run dev
```

### 4. Build para produção
```bash
npm run build
```

### 5. Build para extensão do Chrome
```bash
npm run build-extension
```

## 🔧 Configuração da Extensão Chrome

### 1. Carregar extensão no Chrome
1. Abra `chrome://extensions/`
2. Ative o "Modo desenvolvedor"
3. Clique em "Carregar sem compactação"
4. Selecione a pasta `.next` após o build

### 2. Configurar permissões
A extensão solicitará as seguintes permissões:
- `activeTab`, `tabs`: Para focar na aba do Finesse
- `storage`: Para salvar credenciais e configurações
- `notifications`: Para notificações do Windows
- `alarms`: Para verificações periódicas
- `background`: Para execução em segundo plano

## ⚙️ Configuração do Google Chat

### 1. Criar Webhook no Google Chat
1. Acesse o espaço do Google Chat desejado
2. Vá em **Configurações do espaço** → **Aplicativos e integrações** → **Webhooks**
3. Clique em **Adicionar webhook**
4. Configure nome e avatar (opcional)
5. Copie a URL do webhook gerada

### 2. Configurar na Extensão
1. Abra a extensão
2. Vá para "Configurações de Notificação"
3. Ative "Google Chat"
4. Cole a URL do webhook
5. Teste a configuração

## 📁 Estrutura do Projeto

```
finesse-notifier-nextjs/
├── components/           # Componentes React
│   ├── LoginForm.tsx
│   ├── AgentStatus.tsx
│   ├── StateChanger.tsx
│   ├── TimerSettings.tsx
│   ├── NotificationConfig.tsx
│   └── Header.tsx
├── hooks/               # Hooks personalizados
│   └── useFinesse.ts
├── lib/                 # Serviços e utilitários
│   └── services/
│       ├── finesseService.ts
│       ├── notificationService.ts
│       └── storageService.ts
├── types/               # Definições TypeScript
│   ├── finesse.ts
│   ├── chrome.ts
│   └── notifications.ts
├── pages/               # Páginas Next.js
│   ├── index.tsx
│   ├── _app.tsx
│   └── _document.tsx
├── styles/              # Estilos
│   └── globals.css
├── public/              # Assets públicos
│   ├── manifest.json
│   ├── background.js
│   └── icons/
└── next.config.js
```

## 🔄 Migração da Versão Anterior

### Dados Preservados
A nova versão é compatível com dados da versão anterior:
- ✅ Credenciais salvas
- ✅ Configurações de timer
- ✅ Histórico de status (se existente)

### Novas Configurações
Após a migração, configure:
- Preferências de notificação (Windows/Google Chat)
- URL do webhook do Google Chat (opcional)
- Testes de funcionalidades

## 🎯 Funcionalidades Principais

### Monitoramento Automático
- Verificação periódica do status do agente
- Detecção automática de desconexões
- Alertas para pausas prolongadas

### Notificações Inteligentes
- **Não Pronto**: Quando status muda para "Not Ready"
- **Erro de Dispositivo**: Problemas de conexão (VPN/Cisco)
- **Tempo Excedido**: Pausas além do limite configurado

### Gestão de Estado
- Visualização em tempo real do status
- Alteração de status diretamente pela extensão
- Seleção de códigos de motivo

### Configurações Flexíveis
- Timer principal (verificação de falhas)
- Timer de pausa (limite de tempo em pausa)
- Múltiplos canais de notificação

## 🔒 Segurança

### Armazenamento Seguro
- Credenciais criptografadas no storage local
- Dados nunca enviados para servidores externos
- Comunicação HTTPS com APIs Finesse

### Permissões Mínimas
- Acesso apenas aos domínios necessários
- Permissões explicadas claramente
- Controle total do usuário sobre configurações

## 🐛 Solução de Problemas

### Problemas Comuns

**Notificações não funcionam**
1. Verifique permissões do navegador
2. Teste configuração na extensão
3. Confirme webhook do Google Chat

**Erro de conexão Finesse**
1. Confirme conectividade VPN
2. Verifique status do Cisco Jabber
3. Teste acesso manual ao Finesse

**Extensão não carrega**
1. Verifique console de erros (F12)
2. Confirme build completo
3. Recarregue extensão no Chrome

### Logs e Debug
- Console do navegador: `F12` → Console
- Logs da extensão: `chrome://extensions/` → Detalhes → Inspecionar views
- Service Worker: Background page logs

## 🤝 Contribuição

### Desenvolvimento Local
```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Executar linting
npm run lint

# Build para produção
npm run build
```

### Padrões de Código
- TypeScript strict mode
- ESLint + Prettier
- Conventional Commits
- Componentes funcionais com hooks

## 📞 Suporte

### Contatos TOTVS
- **Desenvolvedor**: Rafael Arcanjo - rafael.arcanjo@totvs.com.br
- **Desenvolvedor**: Bruno Henrique dos Santos Arcanjo - b.hsantos@totvs.com.br
- **Apoio técnico**: Abner de Assis Athayde - abner.athayde@fluig.com
- **Coordenador**: Rafael Maciel Vanat - rafael.vanat@fluig.com

### Recursos
- **Documentação**: [TDN TOTVS](https://tdn.totvs.com/pages/viewpage.action?pageId=961629221)
- **Feedback**: [Formulário Google](https://docs.google.com/forms/d/e/1FAIpQLSeeMiF6LywX6OfRddaWB1igSbn0TylLtRUy28AFWNP4KpC4iA/viewform?usp=dialog)
- **Chrome Store**: [Link da Extensão](https://chromewebstore.google.com/detail/finesse-notifier/cglkkcedledghdpkbopambajgmjmkkab)

## 📄 Licença

Este projeto é de propriedade da **TOTVS**.  
Uso, modificação e distribuição sujeitos às políticas internas da empresa.

---

**Versão**: 2.0.0  
**Última atualização**: 2025  
**Tecnologias**: Next.js, TypeScript, Tailwind CSS, Chrome Extensions API
