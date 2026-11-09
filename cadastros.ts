export type CampoCadastro = { nome: string; rotulo: string; tipo: "texto" | "bool" };
export type ConfigCadastro = {
  chave: string;
  rota: string;
  titulo: string;
  ajuda: string;
  campos: CampoCadastro[];
};

export const CADASTROS: Record<string, ConfigCadastro> = {
  ramo: {
    chave: "idramo",
    rota: "/ramos",
    titulo: "Ramos",
    ajuda: "Ramos do grupo escoteiro (Filhotes, Lobinho, Escoteiro...).",
    campos: [{ nome: "nome", rotulo: "Nome", tipo: "texto" }],
  },
  cargo: {
    chave: "idcargo",
    rota: "/cargos",
    titulo: "Cargos",
    ajuda: "Cargos que avaliam (diretores) podem ver e avaliar todos os adultos do grupo.",
    campos: [
      { nome: "descricao", rotulo: "Descrição", tipo: "texto" },
      { nome: "avalia", rotulo: "Avalia (diretor)", tipo: "bool" },
    ],
  },
  situacao: {
    chave: "idsituacao",
    rota: "/situacoes",
    titulo: "Situações",
    ajuda: "Situações da formação do adulto, na ordem em que foram cadastradas.",
    campos: [{ nome: "situacao", rotulo: "Situação", tipo: "texto" }],
  },
};
