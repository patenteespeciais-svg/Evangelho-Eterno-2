import { TacticalCode } from '../types';

export const TACTICAL_CODES: TacticalCode[] = [
  { code: 'QAP', meaning: 'Na escuta / Aguardando na frequência', category: 'Q' },
  { code: 'QRV', meaning: 'À disposição / Pronto para operar', category: 'Q' },
  { code: 'QSL', meaning: 'Entendido / Mensagem recebida e confirmada', category: 'Q' },
  { code: 'QTH', meaning: 'Localização atual / Posição geográfica', category: 'Q' },
  { code: 'QSY', meaning: 'Mudando para outra frequência/canal', category: 'Q' },
  { code: 'QRL', meaning: 'Frequência ocupada no momento', category: 'Q' },
  { code: 'QRM', meaning: 'Interferência provocada por outra estação', category: 'Q' },
  { code: 'QTR', meaning: 'Horário exato da transmissão', category: 'Q' },
  { code: '10-4', meaning: 'Afirmativo / Câmbio / Entendido perfeitamente', category: '10' },
  { code: '10-20', meaning: 'Qual a sua localização?', category: '10' },
  { code: '10-33', meaning: 'EMERGÊNCIA! Tráfego urgente de rádio', category: '10' },
  { code: '10-7', meaning: 'Fora de serviço / Desligando rádio', category: '10' },
  { code: '10-8', meaning: 'Em serviço / Em patrulha ativa', category: '10' },
  { code: 'SOS', meaning: 'SOCORRO / EMERGÊNCIA PRIORITÁRIA', category: 'STATUS' },
  { code: 'TKS 73', meaning: 'Obrigado e saudações cordiais', category: 'STATUS' },
];
