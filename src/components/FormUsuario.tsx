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
  deducaopromessa?: number | null;
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
  const [deducao, setDeducao] = useState(
    v.deducaopromessa === null || v.deducaopromessa === undefined ? "" : String(v.deducaopromessa),
  );

  // Prévia calculada no próprio formulário; o valor gravado é sempre recalculado a partir das datas.
  const anos = anosPromessa(promessa || null, deducao === "" ? null : Number(deducao));

  return (
    <form action={props.action} className="mt-4 grid gap-3 rounded border border-gray-200 border-l-4 border-l-amarelo bg-white p-4 sm:grid-cols-2">
      <label className="text-sm">Nome *
        <input name="nome" required defaultValue={v.nome ?? ""} className={campo} />
      </label>
      <label className="text-sm">Registro *
        <input
          name="registro"
          required
          maxLength={15}
          autoComplete="off"
          defaultValue={v.registro ?? ""}
          className={`${campo} sm:max-w-40`}
        />
        <span className="block text-xs text-gray-500">Carteira escoteira, até 15 caracteres.</span>
      </label>
      <label className="text-sm">E-mail *
        <input name="email" type="email" required defaultValue={v.email ?? ""} className={campo} />
        <span className="block text-xs text-gray-500">O login do usuário usa este e-mail; ao alterar, o acesso também muda.</span>
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
      <Seletor nome="idapf" rotulo="APF (assessor pessoal de formação)" opcoes={props.apfs} valor={v.idapf} />

      <div className="grid gap-3 sm:col-span-2 sm:grid-cols-4">
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
        <label className="text-sm">Dedução (anos)
          <input
            name="deducaopromessa"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            placeholder="0"
            value={deducao}
            onChange={(e) => setDeducao(e.target.value)}
            className={campo}
          />
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
        </label>
      </div>

      {props.pedirSenha && (
        <label className="text-sm sm:col-span-2">Senha inicial * (mínimo 8 caracteres)
          <input
            name="senha"
            type="text"
            required
            minLength={8}
            autoComplete="off"
            className={`${campo} sm:max-w-44`}
          />
          <span className="block text-xs text-gray-500">Anote e repasse ao adulto. Ele será obrigado a trocá-la no primeiro acesso.</span>
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
