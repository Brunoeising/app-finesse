// lib/services/rateLimitService.ts
interface RequestRecord {
  timestamp: number;
  endpoint: string;
}

class RateLimitService {
  private requests: Map<string, RequestRecord[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private cleanupInterval: any;

  constructor() {
    this.maxRequests = parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_MAX_REQUESTS || '5');
    this.windowMs = parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS || '60000'); // 1 minuto
    
    // Limpeza automática a cada 5 minutos
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Verifica se pode fazer uma requisição
   */
  checkLimit(userId: string, endpoint: string = 'default'): boolean {
    const now = Date.now();
    const key = `${userId}:${endpoint}`;
    
    // Obter histórico de requisições
    let userRequests = this.requests.get(key) || [];
    
    // Filtrar requisições dentro da janela de tempo
    userRequests = userRequests.filter(req => 
      now - req.timestamp < this.windowMs
    );
    
    // Verificar se pode fazer nova requisição
    if (userRequests.length >= this.maxRequests) {
      console.warn(`Rate limit excedido para ${userId}:${endpoint}. ${userRequests.length}/${this.maxRequests} requisições em ${this.windowMs/1000}s`);
      return false;
    }
    
    // Registrar nova requisição
    userRequests.push({
      timestamp: now,
      endpoint
    });
    
    this.requests.set(key, userRequests);
    
    console.log(`Rate limit OK para ${userId}:${endpoint}. ${userRequests.length}/${this.maxRequests} requisições`);
    return true;
  }

  /**
   * Obter estatísticas atuais
   */
  getStats(userId: string, endpoint: string = 'default'): {
    current: number;
    max: number;
    remaining: number;
    resetIn: number;
  } {
    const now = Date.now();
    const key = `${userId}:${endpoint}`;
    
    let userRequests = this.requests.get(key) || [];
    userRequests = userRequests.filter(req => 
      now - req.timestamp < this.windowMs
    );
    
    const oldest = userRequests[0];
    const resetIn = oldest ? 
      Math.max(0, this.windowMs - (now - oldest.timestamp)) : 
      0;
    
    return {
      current: userRequests.length,
      max: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - userRequests.length),
      resetIn: Math.ceil(resetIn / 1000) // em segundos
    };
  }

  /**
   * Limpar registros antigos
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    // Converter para array para evitar problemas de iteração
    const entries = Array.from(this.requests.entries());
    
    entries.forEach(([key, requests]) => {
      const validRequests = requests.filter(req => 
        now - req.timestamp < this.windowMs
      );
      
      if (validRequests.length === 0) {
        keysToDelete.push(key);
      } else {
        this.requests.set(key, validRequests);
      }
    });
    
    // Deletar chaves marcadas
    keysToDelete.forEach(key => this.requests.delete(key));
  }

  /**
   * Reset para um usuário (útil para testes)
   */
  resetUser(userId: string): void {
    const keysToDelete: string[] = [];
    
    // Converter para array
    const keys = Array.from(this.requests.keys());
    
    keys.forEach(key => {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.requests.delete(key));
  }

  /**
   * Verificar se um usuário específico está próximo do limite
   */
  isNearLimit(userId: string, endpoint: string = 'default', threshold: number = 0.8): boolean {
    const stats = this.getStats(userId, endpoint);
    return (stats.current / stats.max) >= threshold;
  }

  /**
   * Obter tempo até o próximo reset em segundos
   */
  getTimeToReset(userId: string, endpoint: string = 'default'): number {
    return this.getStats(userId, endpoint).resetIn;
  }

  /**
   * Destruir o serviço e limpar recursos
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.requests.clear();
  }

  /**
   * Obter configurações atuais
   */
  getConfig(): { maxRequests: number; windowMs: number; windowSeconds: number } {
    return {
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      windowSeconds: Math.floor(this.windowMs / 1000)
    };
  }
}

export const rateLimitService = new RateLimitService();