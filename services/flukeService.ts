
/**
 * SERVIÇO MOCK PARA INTEGRAÇÃO COM A API FLUKE
 * Em um cenário real, estas chamadas usariam fetch/axios com o endpoint e chaves da Fluke.
 */

export const flukeApi = {
  /**
   * Solicita um novo número disponível da Fluke
   */
  async createNumber(): Promise<{ phoneNumber: string }> {
    // Simula delay de rede
    await new Promise(r => setTimeout(r, 2000));
    
    // Simula geração de número aleatório formatado
    const ddd = ["11", "21", "31", "41", "51"][Math.floor(Math.random() * 5)];
    const num = Math.floor(100000000 + Math.random() * 900000000);
    return { phoneNumber: `+55${ddd}${num}` };
  },

  /**
   * Ativa o número para recebimento de SMS/WA
   */
  async activateNumber(phoneNumber: string): Promise<boolean> {
    await new Promise(r => setTimeout(r, 1500));
    return true;
  },

  /**
   * Consulta a API da Fluke para buscar o código de verificação recebido via SMS
   */
  async getVerificationCode(phoneNumber: string): Promise<string> {
    await new Promise(r => setTimeout(r, 1000));
    // Simula um código de 6 dígitos do WA Business
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  /**
   * Cancela a assinatura do número
   */
  async cancelNumber(phoneNumber: string): Promise<boolean> {
    await new Promise(r => setTimeout(r, 1000));
    return true;
  }
};
