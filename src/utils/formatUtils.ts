/**
 * Utilitários de formatação de texto e logins
 */

/**
 * Converte o login cadastrado/recebido em maiúsculas para o formato
 * onde todas as letras são minúsculas, com exceção apenas das iniciais
 * de cada palavra/segmento que ficam em maiúsculas (Title Case).
 *
 * Exemplo:
 * - "OPERADOR 42" -> "Operador 42"
 * - "SALVADOR SILVA" -> "Salvador Silva"
 * - "OPERADOR_RADIO" -> "Operador_Radio"
 * - "JOAO PAULO" -> "Joao Paulo"
 */
export function formatLoginTitleCase(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(/(\s+|[-_./])/)
    .map((part) => {
      if (/^[\s\-_./]+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}
