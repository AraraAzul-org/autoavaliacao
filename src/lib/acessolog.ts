// Rótulos usados no log de acesso. Cada consulta do menu vira uma opção gravada.
const ROTULOS: Array<{ prefixo: string; rotulo: string }> = [
  { prefixo: "/jovens", rotulo: "Jovens" },
  { prefixo: "/usuarios", rotulo: "Associados" },
  { prefixo: "/ramos", rotulo: "Ramos" },
  { prefixo: "/funcoes", rotulo: "Funções" },
  { prefixo: "/situacoes", rotulo: "Situações" },
  { prefixo: "/avaliacoes", rotulo: "Avaliações" },
  { prefixo: "/perguntas", rotulo: "Questionários" },
  { prefixo: "/promessas", rotulo: "Promessas" },
  { prefixo: "/resultados", rotulo: "Resultados" },
  { prefixo: "/minhas-avaliacoes", rotulo: "Minhas avaliações" },
  { prefixo: "/meu-ppf", rotulo: "Meu PPF" },
  { prefixo: "/meus-assessorados", rotulo: "Meus assessorados" },
  { prefixo: "/parecer", rotulo: "Parecer" },
  { prefixo: "/acessolog", rotulo: "Log de acesso" },
];

export function rotuloAcesso(caminho: string): string {
  if (caminho === "/") return "Início";
  const encontrado = ROTULOS.find(
    ({ prefixo }) => caminho === prefixo || caminho.startsWith(`${prefixo}/`),
  );
  return encontrado?.rotulo ?? "Outro";
}
