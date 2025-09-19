// lib/constants/reasonCodes.ts
export interface ReasonCode {
  id: { text: string };
  label: { text: string };
  category: string;
}

// Códigos de motivo padrão do Finesse (baseados na estrutura comum)
export const DEFAULT_REASON_CODES: ReasonCode[] = [
  {
    id: { text: '1' },
    label: { text: 'Pausa - Almoço' },
    category: 'NOT_READY'
  },
  {
    id: { text: '2' },
    label: { text: 'Pausa - Banheiro' },
    category: 'NOT_READY'
  },
  {
    id: { text: '3' },
    label: { text: 'Pausa - Café' },
    category: 'NOT_READY'
  },
  {
    id: { text: '4' },
    label: { text: 'Pausa - Reunião' },
    category: 'NOT_READY'
  },
  {
    id: { text: '5' },
    label: { text: 'Pausa - Treinamento' },
    category: 'NOT_READY'
  },
  {
    id: { text: '6' },
    label: { text: 'Pausa - Suporte Técnico' },
    category: 'NOT_READY'
  },
  {
    id: { text: '7' },
    label: { text: 'Pausa - Atividade Administrativa' },
    category: 'NOT_READY'
  },
  {
    id: { text: '8' },
    label: { text: 'Pausa - Fim de Expediente' },
    category: 'NOT_READY'
  },
  {
    id: { text: '9' },
    label: { text: 'Pausa - Problema Técnico' },
    category: 'NOT_READY'
  },
  {
    id: { text: '10' },
    label: { text: 'Pausa - Atendimento Interno' },
    category: 'NOT_READY'
  }
];

// Função para obter códigos com fallback
export function getReasonCodesWithFallback(apiCodes: ReasonCode[] = []): ReasonCode[] {
  if (apiCodes.length > 0) {
    return apiCodes;
  }
  return DEFAULT_REASON_CODES;
}