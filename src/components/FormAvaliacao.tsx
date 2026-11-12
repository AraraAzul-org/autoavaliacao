"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { salvarRespostas, type EstadoRespostas } from "@/app/minhas-avaliacoes/actions";

type Opcao = { idpontuacao: number; descricao: string };
type Pergunta = {
  idpergunta: number;
  codigo: string;
  descricao: string;
  descritiva: boolean;
  opcoes: Opcao[];
};
type Etapa = { idetapa: number; descricao: string; perguntas: Pergunta[] };

const btn =
  "rounded bg-azul px-3 py-1.5 text-sm text-white hover:bg-azul-escuro disabled:cursor-not-allowed disabled:bg-gray-300";
const btnNeutro =
  "rounded border border-azul px-3 py-1.5 text-sm font-medium text-azul hover:bg-azul/10 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400";

export function FormAvaliacao({
  idavaliacao,
  etapas,
  respostas,
  somenteLeitura,
}: {
  idavaliacao: number;
  etapas: Etapa[];
  respostas: Record<number, string>;
  somenteLeitura: boolean;
}) {
  // Todas as etapas ficam em um único formulário controlado. Assim qualquer
  // salvamento grava tudo o que está na tela e as respostas continuam visíveis
  // depois de salvar, sem o React limpar os campos.
  const [valores, setValores] = useState<Record<number, string>>(() => {
    const inicial: Record<number, string> = {};
    etapas.forEach((et) => et.perguntas.forEach((p) => (inicial[p.idpergunta] = respostas[p.idpergunta] ?? "")));
    return inicial;
  });

  const [estado, acao, pendente] = useActionState<EstadoRespostas, FormData>(salvarRespostas, {});
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const router = useRouter();

  // Depois de salvar, atualiza os contadores da página sem sair da tela.
  useEffect(() => {
    if (estado.ok) router.refresh();
    if (estado.ok || estado.erro) {
      setAviso({ tipo: estado.ok ? "ok" : "erro", texto: (estado.ok ?? estado.erro) as string });
    }
  }, [estado, router]);

  // O aviso some sozinho, mas as respostas permanecem na tela.
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 8000);
    return () => clearTimeout(t);
  }, [aviso]);

  const mudar = (idpergunta: number, valor: string) =>
    setValores((atual) => ({ ...atual, [idpergunta]: valor }));

  const todas = etapas.flatMap((et) => et.perguntas);
  const total = todas.length;
  const respondidas = todas.filter((p) => (valores[p.idpergunta] ?? "") !== "").length;
  const faltam = total - respondidas;

  return (
    <form action={acao}>
      <input type="hidden" name="idavaliacao" value={idavaliacao} />

      {etapas.map((et) => {
        const feitasEtapa = et.perguntas.filter((p) => (valores[p.idpergunta] ?? "") !== "").length;

        return (
          <section key={et.idetapa} className="mt-6 overflow-hidden rounded border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b-2 border-amarelo bg-azul p-3 text-white">
              <h2 className="flex-1 text-sm font-semibold">{et.descricao}</h2>
              <span className="text-xs text-white/90">
                {feitasEtapa} de {et.perguntas.length}
              </span>
            </div>

            <div className="p-3">
              {et.perguntas.map((p) => {
                const valor = valores[p.idpergunta] ?? "";
                return (
                  <div key={p.idpergunta} className="border-b border-gray-100 py-3 last:border-0">
                    <input type="hidden" name="pergunta" value={p.idpergunta} />
                    <p className="text-sm font-medium text-gray-900">
                      <span className="text-azul">{p.codigo}</span> — {p.descricao}
                    </p>

                    {p.descritiva ? (
                      <textarea
                        name={`t_${p.idpergunta}`}
                        maxLength={2000}
                        rows={3}
                        disabled={somenteLeitura}
                        value={valor}
                        onChange={(e) => mudar(p.idpergunta, e.target.value)}
                        placeholder={somenteLeitura ? "Sem resposta" : "Escreva sua resposta"}
                        className="mt-2 w-full rounded border border-gray-300 p-2 text-sm disabled:bg-gray-50 disabled:text-gray-700"
                      />
                    ) : (
                      <div className="mt-2 space-y-1">
                        {p.opcoes.map((o) => (
                          <label key={o.idpontuacao} className="flex items-start gap-2 text-sm text-gray-800">
                            <input
                              type="radio"
                              name={`p_${p.idpergunta}`}
                              value={o.idpontuacao}
                              checked={valor === String(o.idpontuacao)}
                              onChange={() => mudar(p.idpergunta, String(o.idpontuacao))}
                              disabled={somenteLeitura}
                              className="mt-0.5"
                            />
                            <span>{o.descricao}</span>
                          </label>
                        ))}
                        {!p.opcoes.length && <p className="text-sm text-red-700">Pergunta sem opções de resposta.</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {!somenteLeitura && total > 0 && (
        <div className="sticky bottom-0 z-10 mt-6 flex flex-wrap items-center gap-3 rounded border border-gray-200 bg-white p-3 shadow-sm">
          <p className="min-w-48 flex-1 text-sm text-gray-600">
            {faltam > 0
              ? `Faltam ${faltam} ${faltam === 1 ? "pergunta" : "perguntas"} para concluir. Você pode salvar e voltar depois.`
              : "Tudo respondido. Ao concluir, a avaliação não poderá mais ser alterada."}
          </p>
          <button type="submit" name="intencao" value="salvar" disabled={pendente} className={btnNeutro}>
            {pendente ? "Salvando..." : "Salvar respostas"}
          </button>
          <button type="submit" name="intencao" value="concluir" disabled={pendente} className={btn}>
            Concluir avaliação
          </button>
        </div>
      )}

      {aviso && (
        <div
          role="status"
          className={`fixed right-4 top-24 z-50 max-w-sm rounded border p-3 text-sm shadow-lg ${
            aviso.tipo === "ok" ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          <div className="flex items-start gap-3">
            <p className="flex-1">{aviso.texto}</p>
            <button
              type="button"
              onClick={() => setAviso(null)}
              aria-label="Fechar aviso"
              className="text-gray-500 hover:text-gray-800"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
