// Partículas que permanecem em minúsculas quando não iniciam o nome.
const PARTICULAS = new Set([
  "de",
  "da",
  "do",
  "dos",
  "das",
  "e",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "a",
  "o",
  "os",
  "as",
]);

/**
 * Title Case inteligente para nomes em português: a primeira letra de cada
 * palavra fica maiúscula, o restante minúsculo, e as partículas continuam
 * minúsculas quando não são a primeira palavra.
 *
 * Ex.: "maria da SILVA e souza" -> "Maria da Silva e Souza".
 */
export function tituloInteligente(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((palavra, indice) => {
      const minuscula = palavra.toLocaleLowerCase("pt-BR");
      if (indice > 0 && PARTICULAS.has(minuscula)) return minuscula;
      return minuscula.charAt(0).toLocaleUpperCase("pt-BR") + minuscula.slice(1);
    })
    .join(" ");
}
