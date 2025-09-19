// lib/services/encryptionService.ts
import CryptoJS from 'crypto-js';

class EncryptionService {
  private readonly secretKey: string;

  constructor() {
    this.secretKey = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || '';
    if (!this.secretKey) {
      throw new Error('Encryption key not found in environment variables');
    }
  }

  /**
   * Criptografa dados sensíveis
   */
  encrypt(data: string): string {
    try {
      const encrypted = CryptoJS.AES.encrypt(data, this.secretKey).toString();
      return encrypted;
    } catch (error) {
      console.error('Erro na criptografia:', error);
      throw new Error('Falha na criptografia dos dados');
    }
  }

  /**
   * Descriptografa dados
   */
  decrypt(encryptedData: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) {
        throw new Error('Falha na descriptografia - dados corrompidos');
      }
      
      return decrypted;
    } catch (error) {
      console.error('Erro na descriptografia:', error);
      throw new Error('Falha na descriptografia dos dados');
    }
  }

  /**
   * Gera um hash seguro para validação
   */
  generateHash(data: string): string {
    return CryptoJS.SHA256(data + this.secretKey).toString();
  }

  /**
   * Valida se um hash corresponde aos dados
   */
  validateHash(data: string, hash: string): boolean {
    const generatedHash = this.generateHash(data);
    return generatedHash === hash;
  }

  /**
   * Criptografa um objeto completo
   */
  encryptObject(obj: Record<string, any>): string {
    try {
      const jsonString = JSON.stringify(obj);
      return this.encrypt(jsonString);
    } catch (error) {
      console.error('Erro na criptografia do objeto:', error);
      throw new Error('Falha na criptografia do objeto');
    }
  }

  /**
   * Descriptografa um objeto
   */
  decryptObject<T>(encryptedData: string): T {
    try {
      const decryptedString = this.decrypt(encryptedData);
      return JSON.parse(decryptedString) as T;
    } catch (error) {
      console.error('Erro na descriptografia do objeto:', error);
      throw new Error('Falha na descriptografia do objeto');
    }
  }
}

export const encryptionService = new EncryptionService();