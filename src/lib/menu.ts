// Lista canônica dos itens de menu. A chave é o que fica gravada em
// public.usuario_menu e é usada tanto no menu quanto nos guards das rotas.
export const MENU_GRUPOS = ["Geral", "Cadastros", "Áreas pessoais", "Direção"] as const;

export type ItemMenu = {
  chave: string;
  rotulo: string;
  href: string;
  grupo: (typeof MENU_GRUPOS)[number];
};

export const ITENS_MENU: ItemMenu[] = [
  { chave: "inicio", rotulo: "Início", href: "/", grupo: "Geral" },
  { chave: "jovens", rotulo: "Jovens", href: "/jovens", grupo: "Geral" },
  { chave: "promessas", rotulo: "Promessas", href: "/promessas", grupo: "Geral" },
  { chave: "usuarios", rotulo: "Associados", href: "/usuarios", grupo: "Cadastros" },
  { chave: "ramos", rotulo: "Ramos", href: "/ramos", grupo: "Cadastros" },
  { chave: "funcoes", rotulo: "Funções", href: "/funcoes", grupo: "Cadastros" },
  { chave: "situacoes", rotulo: "Situações", href: "/situacoes", grupo: "Cadastros" },
  { chave: "avaliacoes", rotulo: "Avaliações", href: "/avaliacoes", grupo: "Cadastros" },
  { chave: "perguntas", rotulo: "Questionários", href: "/perguntas", grupo: "Cadastros" },
  { chave: "minhas-avaliacoes", rotulo: "Minhas avaliações", href: "/minhas-avaliacoes", grupo: "Áreas pessoais" },
  { chave: "meu-ppf", rotulo: "Meu PPF", href: "/meu-ppf", grupo: "Áreas pessoais" },
  { chave: "meus-assessorados", rotulo: "Meus assessorados", href: "/meus-assessorados", grupo: "Áreas pessoais" },
  { chave: "parecer", rotulo: "Parecer", href: "/parecer", grupo: "Direção" },
  { chave: "resultados", rotulo: "Resultados", href: "/resultados", grupo: "Direção" },
  { chave: "acessolog", rotulo: "Log de acesso", href: "/acessolog", grupo: "Direção" },
];

export const CHAVES_MENU = ITENS_MENU.map((item) => item.chave);

export const ROTULO_CHAVE = new Map(ITENS_MENU.map((item) => [item.chave, item.rotulo]));

export function primeiraRota(acessos: Set<string>) {
  return ITENS_MENU.find((item) => item.chave !== "inicio" && acessos.has(item.chave))?.href ?? "/sem-acesso";
}

// As chaves de cadastro que passaram a existir como itens separados na tela de acessos.
export const CHAVES_CADASTRO = ITENS_MENU.filter((item) => item.grupo === "Cadastros").map((item) => item.chave);

// Chaves básicas usadas quando um associado é criado. A tela de acessos abre
// em seguida para que a direção ajuste antes de usar o cadastro.
export const CHAVES_PADRAO = [
  "inicio",
  "jovens",
  "promessas",
  "minhas-avaliacoes",
  "meu-ppf",
  "meus-assessorados",
];

// Liberação inicial de um associado recém-criado: equivale às regras antigas.
// A tela de acessos abre logo depois para que a direção ajuste se precisar.
export function acessosIniciais(d: {
  membrogrupo: boolean;
  cargoAvalia: boolean;
  linha: string;
  acessocadastros: boolean;
}) {
  const chaves = new Set<string>();
  if (!d.membrogrupo) {
    chaves.add("meus-assessorados");
    return [...chaves];
  }
  CHAVES_PADRAO.forEach((chave) => chaves.add(chave));
  if (d.cargoAvalia || d.acessocadastros) {
    CHAVES_CADASTRO.forEach((chave) => chaves.add(chave));
  }
  if (d.cargoAvalia && d.linha === "Dirigente") {
    ["parecer", "resultados", "acessolog"].forEach((chave) => chaves.add(chave));
  }
  return [...chaves];
}
