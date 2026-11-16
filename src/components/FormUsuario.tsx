"use client";

import { useState } from "react";
import { anosPromessa } from "@/lib/promessa";

type Opcao = { id: number; rotulo: string };
export type ValoresUsuario = {
  nome?: string;
  email?: string;
  registro?: string | null;
  linha?: string;
  idramo?: number | null;
  idcargo?: number | null;
  idsituacao?: number | null;
  idapf?: number | null;
  datasituacao?: string | null;
  datapromessa?: string | null;
  reducaopromessa?: number | null;
  membrogrupo?: boolean;
  ativo?: boolean;
};

const campo = "w-full rounded border border-gray-300 p-2 text-sm";

function Seletor({ nome, rotulo, opcoes, valor }: { nome: string; rotulo: string; opcoes: Opcao[]; valor?: number | null }) {
  return (
    <label className="text-sm">{rotulo}
      <select name={nome} defaultValue={valor ?? ""} className={campo}>
        <option value="">—</option>
        {opcoes.map((o) => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
      </select>
    </label>
  );
}

export function FormUsuario(props: {
  action: (formData: FormData) => Promise<void>;
  ramos: Opcao[];
  cargos: Opcao[];
  situacoes: Opcao[];
  apfs: Opcao[];
  valores?: ValoresUsuario;
  botao: string;
  pedirSenha?: boolean;
}) {
  const v = props.valores ?? {};
  const [promessa, setPromessa] = useState(v.datapromessa?.slice(0, 10) ?? "");
  const [reducao, setReducao] = useState(
    v.reducaopromessa === null || v.reducaopromessa === undefined ? "" : String(v.reducaopromessa),
  );

  // Prévia calculada no próprio formulário; o valor gravado é sempre recalculado a partir das datas.
  const anos = anosPromessa(promessa || null, reducao === "" ? null : Number(reducao));

  return (
    <form action={props.action} className="mt-4 grid gap-3 rounded border border-gray-200 border-l-4 border-l-amarelo bg-white p-4 sm:grid-cols-2">
      <label className="text-sm">Nome *
        <input name="nome" required defaultValue={v.nome ?? ""} className={campo} />
      </label>
      <label className="text-sm">E-mail *
        <input name="email" type="email" required defaultValue={v.email ?? ""} className={campo} />
        <span className="text-xs text-gray-500">O login do usuário usa este e-mail; ao alterar, o acesso também muda.</span>
      </label>
      <label className="text-sm">Registro *
        <input name="registro" required maxLength={30} autoComplete="off" defaultValue={v.registro ?? ""} className={campo} />
        <span className="text-xs text-gray-500">Número da carteira escoteira, ex.: 555749-6.</span>
      </label>
      <label className="text-sm">Linha de atuação *
        <select name="linha" required defaultValue={v.linha ?? ""} className={campo}>
          <option value="" disabled>Selecione</option>
          <option>Escotista</option>
          <option>Dirigente</option>
        </select>
      </label>
      <Seletor nome="idcargo" rotulo="Função" opcoes={props.cargos} valor={v.idcargo} />
      <Seletor nome="idramo" rotulo="Ramo" opcoes={props.ramos} valor={v.idramo} />
      <Seletor nome="idsituacao" rotulo="Situação" opcoes={props.situacoes} valor={v.idsituacao} />
      <label className="text-sm">Data da situação
        <input name="datasituacao" type="date" defaultValue={v.datasituacao?.slice(0, 10) ?? ""} className={campo} />
      </label>
      <label className="text-sm">Data da promessa
        <input
          name="datapromessa"
          type="date"
          value={promessa}
          onChange={(e) => setPromessa(e.target.value)}
          className={campo}
        />
      </label>
      <label className="text-sm">Redução (anos de promessa)
        <input
          name="reducaopromessa"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          placeholder="0"
          value={reducao}
          onChange={(e) => setReducao(e.target.value)}
          className={campo}
        />
        <span className="text-xs text-gray-500">Anos que já contavam antes da promessa e devem ser descontados.</span>
      </label>
      <label className="text-sm">Anos de promessa
        <input
          value={anos === null ? "" : String(anos)}
          readOnly
          tabIndex={-1}
          aria-readonly="true"
          placeholder="—"
          className={`${campo} cursor-default bg-gray-50 text-gray-700`}
        />
        <span className="text-xs text-gray-500">Calculado: anos desde a promessa até hoje, menos a redução.</span>
      </label>
      <Seletor nome="idapf" rotulo="APF (assessor pessoal de formação)" opcoes={props.apfs} valor={v.idapf} />
      {props.pedirSenha && (
        <label className="text-sm sm:col-span-2">Senha inicial * (mínimo 8 caracteres)
          <input name="senha" type="text" required minLength={8} autoComplete="off" className={campo} />
          <span className="text-xs text-gray-500">Anote e repasse ao adulto. Ele será obrigado a trocá-la no primeiro acesso.</span>
        </label>
      )}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input name="membrogrupo" type="checkbox" defaultChecked={v.membrogrupo ?? true} />
        Faz parte do grupo (desmarque para APF de outro grupo)
      </label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input name="ativo" type="checkbox" defaultChecked={v.ativo ?? true} />
        Ativo (ao desmarcar, o sistema registra a data e quem inativou)
      </label>
      <button className="rounded bg-azul p-2 text-white hover:bg-azul-escuro sm:col-span-2">{props.botao}</button>
    </form>
  );
}
