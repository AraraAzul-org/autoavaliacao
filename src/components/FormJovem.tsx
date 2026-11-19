"use client";

import { useMemo, useState } from "react";
import { calcularJovem, RAMO_JOVEM } from "@/lib/jovem";

type Opcao = { id: number; rotulo: string };

export type ValoresJovem = {
  registro?: string | null;
  nome?: string | null;
  idramo?: number | null;
  dataregistro?: string | null;
  datanascimento?: string | null;
  dataacolhida?: string | null;
  datapassagemlobinho?: string | null;
  datapromessalobinho?: string | null;
  deducaolobinho?: number | null;
  datapassagemescoteiro?: string | null;
  datapromessaescoteiro?: string | null;
  deducaoescoteiro?: number | null;
  datapassagemsenior?: string | null;
  datapromessasenior?: string | null;
  deducaosenior?: number | null;
  datapassagempioneiro?: string | null;
  datapromessapioneiro?: string | null;
  deducaopioneiro?: number | null;
  ativo?: boolean;
  datamedalhabonservicos?: string | null;
};

const campo = "w-full rounded border border-gray-300 p-2 text-sm";
const numero = (valor: string): number | null => (valor === "" ? null : Number(valor));
const data = (valor: string): string | null => (valor === "" ? null : valor);

function Data({ nome, rotulo, valor, obrigatoria = false }: { nome: string; rotulo: string; valor?: string | null; obrigatoria?: boolean }) {
  return (
    <label className="text-sm">{rotulo}{obrigatoria ? " *" : ""}
      <input
        name={nome}
        type="date"
        required={obrigatoria}
        defaultValue={valor?.slice(0, 10) ?? ""}
        className={campo}
      />
    </label>
  );
}

function RamoBloco({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-4">
      <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500 sm:col-span-4">
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}

export function FormJovem(props: {
  action: (formData: FormData) => Promise<void>;
  ramos: Opcao[];
  valores?: ValoresJovem;
  botao: string;
}) {
  const v = props.valores ?? {};
  const [idramo, setIdramo] = useState(String(v.idramo ?? ""));
  const [datas, setDatas] = useState<Record<string, string>>({
    dataacolhida: v.dataacolhida?.slice(0, 10) ?? "",
    datapassagemlobinho: v.datapassagemlobinho?.slice(0, 10) ?? "",
    datapromessalobinho: v.datapromessalobinho?.slice(0, 10) ?? "",
    datapassagemescoteiro: v.datapassagemescoteiro?.slice(0, 10) ?? "",
    datapromessaescoteiro: v.datapromessaescoteiro?.slice(0, 10) ?? "",
    datapassagemsenior: v.datapassagemsenior?.slice(0, 10) ?? "",
    datapromessasenior: v.datapromessasenior?.slice(0, 10) ?? "",
    datapassagempioneiro: v.datapassagempioneiro?.slice(0, 10) ?? "",
    datapromessapioneiro: v.datapromessapioneiro?.slice(0, 10) ?? "",
  });
  const [deducoes, setDeducoes] = useState<Record<string, string>>({
    deducaolobinho: v.deducaolobinho === null || v.deducaolobinho === undefined ? "" : String(v.deducaolobinho),
    deducaoescoteiro: v.deducaoescoteiro === null || v.deducaoescoteiro === undefined ? "" : String(v.deducaoescoteiro),
    deducaosenior: v.deducaosenior === null || v.deducaosenior === undefined ? "" : String(v.deducaosenior),
    deducaopioneiro: v.deducaopioneiro === null || v.deducaopioneiro === undefined ? "" : String(v.deducaopioneiro),
  });

  const calculo = useMemo(
    () =>
      calcularJovem({
        dataacolhida: data(datas.dataacolhida),
        datapassagemlobinho: data(datas.datapassagemlobinho),
        datapromessalobinho: data(datas.datapromessalobinho),
        deducaolobinho: numero(deducoes.deducaolobinho),
        datapassagemescoteiro: data(datas.datapassagemescoteiro),
        datapromessaescoteiro: data(datas.datapromessaescoteiro),
        deducaoescoteiro: numero(deducoes.deducaoescoteiro),
        datapassagemsenior: data(datas.datapassagemsenior),
        datapromessasenior: data(datas.datapromessasenior),
        deducaosenior: numero(deducoes.deducaosenior),
        datapassagempioneiro: data(datas.datapassagempioneiro),
        datapromessapioneiro: data(datas.datapromessapioneiro),
        deducaopioneiro: numero(deducoes.deducaopioneiro),
        idramo: idramo ? Number(idramo) : null,
      }),
    [datas, deducoes, idramo],
  );

  const ramoAtual = Object.entries(RAMO_JOVEM).find(([, id]) => String(id) === idramo)?.[0];
  const somaRamos = (Object.keys(calculo.anosPorRamo) as Array<keyof typeof calculo.anosPorRamo>)
    .map((r) => `${r[0].toUpperCase()}${r.slice(1)}: ${calculo.anosPorRamo[r] ?? "—"}`)
    .join(" · ");

  return (
    <form
      action={props.action}
      className="mt-4 grid gap-3 rounded border border-gray-200 border-l-4 border-l-amarelo bg-white p-4 sm:grid-cols-2"
    >
      <label className="text-sm">Registro * (alfanumérico)
        <input
          name="registro"
          required
          maxLength={30}
          autoComplete="off"
          defaultValue={v.registro ?? ""}
          className={`${campo} sm:max-w-44`}
        />
      </label>
      <label className="text-sm">Nome *
        <input name="nome" required defaultValue={v.nome ?? ""} className={campo} />
      </label>
      <label className="text-sm">Ramo *
        <select
          name="idramo"
          required
          value={idramo}
          onChange={(e) => setIdramo(e.target.value)}
          className={campo}
        >
          <option value="" disabled>Selecione</option>
          {props.ramos.map((o) => (
            <option key={o.id} value={o.id}>{o.rotulo}</option>
          ))}
        </select>
      </label>
      <Data nome="dataregistro" rotulo="Data de registro" valor={v.dataregistro} />
      <Data nome="datanascimento" rotulo="Data de nascimento" valor={v.datanascimento} obrigatoria />
      <label className="text-sm">Data da medalha Bons Serviços
        <input
          name="datamedalhabonservicos"
          type="date"
          defaultValue={v.datamedalhabonservicos?.slice(0, 10) ?? ""}
          className={campo}
        />
      </label>

      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input name="ativo" type="checkbox" defaultChecked={v.ativo ?? true} />
        Ativo (ao desmarcar, o sistema registra a data e quem inativou)
      </label>

      <RamoBloco titulo="Filhotes">
        <label className="text-sm">Data de acolhida
          <input
            name="dataacolhida"
            type="date"
            value={datas.dataacolhida}
            onChange={(e) => setDatas({ ...datas, dataacolhida: e.target.value })}
            className={campo}
          />
        </label>
        <p className="text-xs text-gray-500 sm:col-span-3">
          Filhotes não tem promessa nem dedução: vale a data de acolhida.
        </p>
      </RamoBloco>

      <RamoBloco titulo="Lobinho">
        <label className="text-sm">Data de passagem
          <input
            name="datapassagemlobinho"
            type="date"
            value={datas.datapassagemlobinho}
            onChange={(e) => setDatas({ ...datas, datapassagemlobinho: e.target.value })}
            className={campo}
          />
        </label>
        <label className="text-sm">Data da promessa
          <input
            name="datapromessalobinho"
            type="date"
            value={datas.datapromessalobinho}
            onChange={(e) => setDatas({ ...datas, datapromessalobinho: e.target.value })}
            className={campo}
          />
        </label>
        <label className="text-sm">Dedução (anos)
          <input
            name="deducaolobinho"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            placeholder="0"
            value={deducoes.deducaolobinho}
            onChange={(e) => setDeducoes({ ...deducoes, deducaolobinho: e.target.value })}
            className={campo}
          />
        </label>
      </RamoBloco>

      <RamoBloco titulo="Escoteiro">
        <label className="text-sm">Data de passagem
          <input
            name="datapassagemescoteiro"
            type="date"
            value={datas.datapassagemescoteiro}
            onChange={(e) => setDatas({ ...datas, datapassagemescoteiro: e.target.value })}
            className={campo}
          />
        </label>
        <label className="text-sm">Data da promessa
          <input
            name="datapromessaescoteiro"
            type="date"
            value={datas.datapromessaescoteiro}
            onChange={(e) => setDatas({ ...datas, datapromessaescoteiro: e.target.value })}
            className={campo}
          />
        </label>
        <label className="text-sm">Dedução (anos)
          <input
            name="deducaoescoteiro"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            placeholder="0"
            value={deducoes.deducaoescoteiro}
            onChange={(e) => setDeducoes({ ...deducoes, deducaoescoteiro: e.target.value })}
            className={campo}
          />
        </label>
      </RamoBloco>

      <RamoBloco titulo="Sênior">
        <label className="text-sm">Data de passagem
          <input
            name="datapassagemsenior"
            type="date"
            value={datas.datapassagemsenior}
            onChange={(e) => setDatas({ ...datas, datapassagemsenior: e.target.value })}
            className={campo}
          />
        </label>
        <label className="text-sm">Data da promessa
          <input
            name="datapromessasenior"
            type="date"
            value={datas.datapromessasenior}
            onChange={(e) => setDatas({ ...datas, datapromessasenior: e.target.value })}
            className={campo}
          />
        </label>
        <label className="text-sm">Dedução (anos)
          <input
            name="deducaosenior"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            placeholder="0"
            value={deducoes.deducaosenior}
            onChange={(e) => setDeducoes({ ...deducoes, deducaosenior: e.target.value })}
            className={campo}
          />
        </label>
      </RamoBloco>

      <RamoBloco titulo="Pioneiro">
        <label className="text-sm">Data de passagem
          <input
            name="datapassagempioneiro"
            type="date"
            value={datas.datapassagempioneiro}
            onChange={(e) => setDatas({ ...datas, datapassagempioneiro: e.target.value })}
            className={campo}
          />
        </label>
        <label className="text-sm">Data da promessa
          <input
            name="datapromessapioneiro"
            type="date"
            value={datas.datapromessapioneiro}
            onChange={(e) => setDatas({ ...datas, datapromessapioneiro: e.target.value })}
            className={campo}
          />
        </label>
        <label className="text-sm">Dedução (anos)
          <input
            name="deducaopioneiro"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            placeholder="0"
            value={deducoes.deducaopioneiro}
            onChange={(e) => setDeducoes({ ...deducoes, deducaopioneiro: e.target.value })}
            className={campo}
          />
        </label>
      </RamoBloco>

      <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
        <label className="text-sm">Anos de promessa (prévia)
          <input
            value={calculo.anosPromessa === null ? "" : String(calculo.anosPromessa)}
            readOnly
            tabIndex={-1}
            aria-readonly="true"
            placeholder="—"
            className={`${campo} cursor-default bg-gray-50 text-gray-700`}
          />
        </label>
        <label className="text-sm">Anos no ramo ({ramoAtual ?? "—"}) (prévia)
          <input
            value={calculo.anosNoRamo === null ? "" : String(calculo.anosNoRamo)}
            readOnly
            tabIndex={-1}
            aria-readonly="true"
            placeholder="—"
            className={`${campo} cursor-default bg-gray-50 text-gray-700`}
          />
        </label>
        <div className="text-xs text-gray-500">
          <span className="block font-medium text-gray-600">Anos por ramo</span>
          {somaRamos}
          <span className="mt-1 block">
            Cálculo até o fim do mês; dedução total de {calculo.deducaoTotal}{" "}
            {calculo.deducaoTotal === 1 ? "ano" : "anos"}.
          </span>
        </div>
      </div>

      <button className="rounded bg-azul p-2 text-white hover:bg-azul-escuro sm:col-span-2">
        {props.botao}
      </button>
    </form>
  );
}
