import { UFS, type Lenco } from "@/lib/lencos";

const campo =
  "w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-azul focus:outline-none focus:ring-2 focus:ring-azul/20";
const rotulo = "text-[11px] font-medium uppercase tracking-wide text-gray-600";
const btn =
  "rounded bg-azul px-3 py-1.5 text-sm font-medium text-white hover:bg-azul-escuro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40 focus-visible:ring-offset-1";

function CampoTexto({
  nome,
  titulo,
  valor,
  obrigatorio = true,
  extenso = false,
}: {
  nome: string;
  titulo: string;
  valor?: string | null;
  obrigatorio?: boolean;
  extenso?: boolean;
}) {
  return (
    <label className="flex min-w-48 flex-1 flex-col gap-1">
      <span className={rotulo}>{titulo}</span>
      {extenso ? (
        <textarea name={nome} rows={3} defaultValue={valor ?? ""} className={campo} />
      ) : (
        <input
          name={nome}
          required={obrigatorio}
          autoComplete="off"
          defaultValue={valor ?? ""}
          className={campo}
        />
      )}
    </label>
  );
}

export function FormLenco({
  action,
  valores,
  botao,
}: {
  action: (formData: FormData) => void | Promise<void>;
  valores?: Partial<Lenco> | null;
  botao: string;
}) {
  return (
    <form
      action={action}
      className="mt-5 grid gap-3 rounded-lg border border-gray-200 border-l-4 border-l-amarelo bg-white p-4 shadow-sm sm:grid-cols-2"
    >
      <input type="hidden" name="fotolencoatual" value={valores?.fotolenco ?? ""} />
      <input type="hidden" name="fotoentregaatual" value={valores?.fotoentrega ?? ""} />

      <CampoTexto nome="grupoescoteiro" titulo="Grupo escoteiro" valor={valores?.grupoescoteiro} />
      <CampoTexto nome="numero" titulo="Número do lenço" valor={valores?.numero} />

      <label className="flex min-w-48 flex-1 flex-col gap-1">
        <span className={rotulo}>UF</span>
        <select name="uf" required defaultValue={valores?.uf ?? ""} className={campo}>
          <option value="">Selecione</option>
          {UFS.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
      </label>

      <CampoTexto nome="data" titulo="Data" valor={valores?.data?.slice(0, 10)} />

      <CampoTexto nome="nomeescoteiro" titulo="Nome do escoteiro" valor={valores?.nomeescoteiro} />
      <CampoTexto
        nome="nomeescoteiroarara"
        titulo="Nome do escoteiro no Arara Azul"
        valor={valores?.nomeescoteiroarara}
      />

      <CampoTexto
        nome="nomeatividade"
        titulo="Nome da atividade"
        valor={valores?.nomeatividade}
        extenso
      />
      <CampoTexto
        nome="observacao"
        titulo="Observação"
        valor={valores?.observacao}
        obrigatorio={false}
        extenso
      />

      <label className="flex flex-col gap-1">
        <span className={rotulo}>Foto do lenço</span>
        <input
          type="file"
          name="fotolenco"
          accept="image/jpeg,image/png,image/webp"
          className="w-full text-sm text-gray-700 file:mr-2 file:rounded file:border-0 file:bg-azul/10 file:px-2 file:py-1 file:text-azul"
        />
        {valores?.fotolenco && <span className="text-xs text-gray-500">Já existe uma foto enviada.</span>}
      </label>

      <label className="flex flex-col gap-1">
        <span className={rotulo}>Foto da entrega</span>
        <input
          type="file"
          name="fotoentrega"
          accept="image/jpeg,image/png,image/webp"
          className="w-full text-sm text-gray-700 file:mr-2 file:rounded file:border-0 file:bg-azul/10 file:px-2 file:py-1 file:text-azul"
        />
        {valores?.fotoentrega && <span className="text-xs text-gray-500">Já existe uma foto enviada.</span>}
      </label>

      <div className="sm:col-span-2">
        <button className={btn}>{botao}</button>
      </div>
    </form>
  );
}
