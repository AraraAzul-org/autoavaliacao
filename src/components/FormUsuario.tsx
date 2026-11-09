type Opcao = { id: number; rotulo: string };
export type ValoresUsuario = {
  nome?: string;
  email?: string;
  linha?: string;
  idramo?: number | null;
  idcargo?: number | null;
  idsituacao?: number | null;
  idapf?: number | null;
  datasituacao?: string | null;
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
  emailTravado?: boolean;
  botao: string;
  pedirSenha?: boolean;
}) {
  const v = props.valores ?? {};
  return (
    <form action={props.action} className="mt-4 grid gap-3 rounded border border-gray-200 border-l-4 border-l-amarelo bg-white p-4 sm:grid-cols-2">
      <label className="text-sm">Nome *
        <input name="nome" required defaultValue={v.nome ?? ""} className={campo} />
      </label>
      <label className="text-sm">E-mail *
        <input name="email" type="email" required defaultValue={v.email ?? ""} readOnly={props.emailTravado}
          className={`${campo} ${props.emailTravado ? "bg-gray-100 text-gray-500" : ""}`} />
        {props.emailTravado && <span className="text-xs text-gray-500">Já vinculado a um login; não pode ser alterado.</span>}
      </label>
      <label className="text-sm">Linha de atuação *
        <select name="linha" required defaultValue={v.linha ?? ""} className={campo}>
          <option value="" disabled>Selecione</option>
          <option>Escotista</option>
          <option>Dirigente</option>
        </select>
      </label>
      <Seletor nome="idramo" rotulo="Ramo" opcoes={props.ramos} valor={v.idramo} />
      <Seletor nome="idcargo" rotulo="Cargo" opcoes={props.cargos} valor={v.idcargo} />
      <Seletor nome="idsituacao" rotulo="Situação" opcoes={props.situacoes} valor={v.idsituacao} />
      <label className="text-sm">Data da situação
        <input name="datasituacao" type="date" defaultValue={v.datasituacao ?? ""} className={campo} />
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
        Ativo (desmarque para inativar; o cadastro e o histórico são mantidos)
      </label>
      <button className="rounded bg-azul p-2 text-white hover:bg-azul-escuro sm:col-span-2">{props.botao}</button>
    </form>
  );
}
