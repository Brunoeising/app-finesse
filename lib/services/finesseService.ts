// lib/services/finesseService.ts
import { FinesseApiResponse, UserCredentials, ApiResponse } from '@/types/finesse';

interface ReasonCode {
  id: { text: string };
  label: { text: string };
  category: string;
}

class FinesseService {
  private baseUrl: string;
  private fallbackUrl: string;
  private allowedDomains: string[];
  private requestTimeout: number = 5000;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_FINESSE_URL_PRIMARY || '';
    this.fallbackUrl = process.env.NEXT_PUBLIC_FINESSE_URL_FALLBACK || '';
    
    // Validar domínios de email permitidos
    const domainsEnv = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS || '@jv01.local,@totvs.com.br';
    this.allowedDomains = domainsEnv.split(',').map(domain => domain.trim());

    if (!this.baseUrl || !this.fallbackUrl) {
      throw new Error('URLs do Finesse não configuradas nas variáveis de ambiente');
    }
  }

  /**
   * Valida se o email está em um domínio permitido
   */
  private validateEmailDomain(email: string): boolean {
    return this.allowedDomains.some(domain => email.toLowerCase().endsWith(domain.toLowerCase()));
  }

  /**
   * Sanitiza e valida credenciais
   */
  private validateCredentials(credentials: UserCredentials): { valid: boolean; error?: string } {
    // Validar email
    if (!credentials.username || !credentials.username.includes('@')) {
      return { valid: false, error: 'Email inválido' };
    }

    if (!this.validateEmailDomain(credentials.username)) {
      return { valid: false, error: 'Domínio de email não autorizado' };
    }

    // Validar Agent ID (formato: números com pontos)
    const agentIdPattern = /^\d{2}\.\d{3}\.\d{3}$/;
    if (!agentIdPattern.test(credentials.agentId)) {
      return { valid: false, error: 'Formato de Agent ID inválido (ex: 99.999.999)' };
    }

    // Validar senha
    if (!credentials.password || credentials.password.length < 4) {
      return { valid: false, error: 'Senha deve ter pelo menos 4 caracteres' };
    }

    return { valid: true };
  }

  /**
   * Cria header de autenticação
   */
  private createAuthHeader(username: string, password: string): string {
    try {
      return btoa(`${username}:${password}`);
    } catch (error) {
      throw new Error('Erro ao criar header de autenticação');
    }
  }

  /**
   * Faz requisição HTTP com timeout e retry
   */
  private async makeRequest(
    url: string, 
    options: RequestInit, 
    retryCount: number = 0
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/xml',
          ...options.headers,
        }
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Retry uma vez em caso de erro de rede
      if (retryCount === 0 && error instanceof Error && error.name === 'AbortError') {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1s
        return this.makeRequest(url, options, 1);
      }
      
      throw error;
    }
  }

  /**
   * Parser XML mais robusto
   */
  private parseXmlToJson(xmlString: string): any {
    try {
      // Limpar e sanitizar XML
      const cleanXml = xmlString.trim();
      if (!cleanXml.startsWith('<')) {
        throw new Error('Resposta não é um XML válido');
      }

      return this.parseXml(cleanXml);
    } catch (error) {
      console.error('Erro no parse do XML:', error);
      throw new Error('Falha ao processar resposta do servidor');
    }
  }

  private parseXml(xml: string): any {
    const obj: any = {};
    const tagPattern = /<([\w:.-]+)[^>]*>.*?<\/\1>/g;
    let match;
    
    while ((match = tagPattern.exec(xml)) !== null) {
      const node = this.parseNode(match[0]);
      const tagName = node.tagName;
      delete node.tagName;

      if (obj[tagName]) {
        if (!Array.isArray(obj[tagName])) {
          obj[tagName] = [obj[tagName]];
        }
        obj[tagName].push(node);
      } else {
        obj[tagName] = node;
      }
    }
    return obj;
  }

  private parseNode(xmlNode: string): any {
    const obj: any = {};
    
    const tagMatch = xmlNode.match(/<([\w:.-]+)([^>]*)>/);
    if (tagMatch) {
      const tagName = tagMatch[1];
      obj["tagName"] = tagName;

      // Parse de atributos
      const attrString = tagMatch[2];
      const attrPattern = /([\w:.-]+)="([^"]*)"/g;
      let match;
      while ((match = attrPattern.exec(attrString)) !== null) {
        obj[match[1]] = match[2];
      }

      // Parse do conteúdo
      const content = xmlNode.replace(/<[\w:.-]+[^>]*>|<\/[\w:.-]+>/g, '');

      if (content.trim()) {
        if (/<[\w:.-]+[^>]*>/.test(content)) {
          obj["children"] = this.parseXml(content);
        } else {
          obj["text"] = content.trim();
        }
      }
    }

    return obj;
  }

  /**
   * Conecta com a API do Finesse
   */
  async connectApi(credentials: UserCredentials): Promise<ApiResponse<FinesseApiResponse>> {
    // Validar credenciais primeiro
    const validation = this.validateCredentials(credentials);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || 'Credenciais inválidas'
      };
    }

    const { username, password, agentId } = credentials;
    const authHeader = this.createAuthHeader(username, password);

    // Tentar servidor principal primeiro
    let response = await this.tryConnection(this.baseUrl, agentId, authHeader);
    
    // Se falhou, tentar servidor de fallback
    if (!response.success && this.fallbackUrl !== this.baseUrl) {
      response = await this.tryConnection(this.fallbackUrl, agentId, authHeader);
    }

    return response;
  }

  /**
   * Tenta conexão com um servidor específico
   */
  private async tryConnection(
    baseUrl: string, 
    agentId: string, 
    authHeader: string
  ): Promise<ApiResponse<FinesseApiResponse>> {
    try {
      const url = `${baseUrl}/User/${agentId}/`;
      
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authHeader}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'Credenciais inválidas' };
        } else if (response.status === 404) {
          return { success: false, error: 'Agent ID não encontrado' };
        } else {
          return { success: false, error: `Erro do servidor: ${response.status}` };
        }
      }

      const xmlData = await response.text();
      
      if (!xmlData) {
        return { success: false, error: 'Resposta vazia do servidor' };
      }

      const finesse = this.parseXmlToJson(xmlData);

      // Verificar se a resposta contém erro
      if (finesse.ApiErrors) {
        return {
          success: false,
          error: finesse.ApiErrors.ApiError?.ErrorMessage?.text || 'Erro na API do Finesse'
        };
      }

      return { success: true, data: finesse };

    } catch (error) {
      console.error('Erro na conexão com Finesse:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro de conexão'
      };
    }
  }

  /**
   * Altera o estado do agente
   */
  async changeAgentState(
    credentials: UserCredentials,
    state: 'READY' | 'NOT_READY',
    reasonCodeId?: string
  ): Promise<ApiResponse<any>> {
    const validation = this.validateCredentials(credentials);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const { username, password, agentId } = credentials;
    const authHeader = this.createAuthHeader(username, password);

    // Construir XML do estado
    let stateXml: string;
    if (state === 'NOT_READY' && reasonCodeId) {
      stateXml = `<User><state>${state}</state><reasonCodeId>${reasonCodeId}</reasonCodeId></User>`;
    } else if (state === 'READY') {
      stateXml = `<User><state>${state}</state></User>`;
    } else {
      return { success: false, error: 'Estado inválido ou código de motivo obrigatório' };
    }

    // Tentar servidor principal primeiro
    let response = await this.tryStateChange(this.baseUrl, agentId, authHeader, stateXml);
    
    // Se falhou, tentar servidor de fallback
    if (!response.success && this.fallbackUrl !== this.baseUrl) {
      response = await this.tryStateChange(this.fallbackUrl, agentId, authHeader, stateXml);
    }

    return response;
  }

  /**
   * Tenta mudança de estado em um servidor específico
   */
  private async tryStateChange(
    baseUrl: string,
    agentId: string,
    authHeader: string,
    stateXml: string
  ): Promise<ApiResponse<any>> {
    try {
      const url = `${baseUrl}/User/${agentId}/`;

      const response = await this.makeRequest(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/xml',
        },
        body: stateXml,
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'Não autorizado' };
        } else if (response.status === 409) {
          return { success: false, error: 'Estado não pode ser alterado no momento' };
        } else {
          return { success: false, error: `Erro ao alterar status: ${response.status}` };
        }
      }

      const xmlData = await response.text();
      const result = this.parseXmlToJson(xmlData);

      if (result.ApiErrors) {
        return {
          success: false,
          error: result.ApiErrors.ApiError?.ErrorMessage?.text || 'Erro na alteração do estado'
        };
      }

      return { success: true, data: result };

    } catch (error) {
      console.error('Erro na alteração do estado:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro de conexão'
      };
    }
  }

  /**
   * Obtém códigos de motivo
   */
  async getReasonCodes(credentials: UserCredentials): Promise<ApiResponse<ReasonCode[]>> {
    const validation = this.validateCredentials(credentials);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const { username, password } = credentials;
    const authHeader = this.createAuthHeader(username, password);

    // Tentar servidor principal primeiro
    let response = await this.tryGetReasonCodes(this.baseUrl, authHeader);
    
    // Se falhou, tentar servidor de fallback
    if (!response.success && this.fallbackUrl !== this.baseUrl) {
      response = await this.tryGetReasonCodes(this.fallbackUrl, authHeader);
    }

    return response;
  }

  /**
   * Tenta obter códigos de motivo de um servidor específico
   */
  private async tryGetReasonCodes(
    baseUrl: string,
    authHeader: string
  ): Promise<ApiResponse<ReasonCode[]>> {
    try {
      const url = `${baseUrl}/ReasonCodes?category=NOT_READY`;

      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authHeader}`,
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Erro ao buscar códigos de motivo: ${response.status}`
        };
      }

      const xmlData = await response.text();
      const reasonCodes = this.parseXmlToJson(xmlData);

      if (reasonCodes.ApiErrors) {
        return {
          success: false,
          error: reasonCodes.ApiErrors.ApiError?.ErrorMessage?.text || 'Erro ao buscar códigos'
        };
      }

      // Processar códigos de motivo
      let codes: ReasonCode[] = [];
      if (reasonCodes.ReasonCodes?.ReasonCode) {
        const rawCodes = Array.isArray(reasonCodes.ReasonCodes.ReasonCode) 
          ? reasonCodes.ReasonCodes.ReasonCode 
          : [reasonCodes.ReasonCodes.ReasonCode];
        
        codes = rawCodes.map((code: any) => ({
          id: code.id || { text: '' },
          label: code.label || { text: '' },
          category: code.category || 'NOT_READY'
        }));
      }

      return { success: true, data: codes };

    } catch (error) {
      console.error('Erro ao buscar códigos de motivo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro de conexão'
      };
    }
  }

  /**
   * Obter informações de saúde do serviço
   */
  getServiceInfo(): {
    baseUrl: string;
    fallbackUrl: string;
    allowedDomains: string[];
    timeout: number;
  } {
    return {
      baseUrl: this.baseUrl,
      fallbackUrl: this.fallbackUrl,
      allowedDomains: [...this.allowedDomains],
      timeout: this.requestTimeout
    };
  }
}

export const finesseService = new FinesseService();