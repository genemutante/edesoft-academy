/* cadastro-script.js (COMPLETO / AJUSTADO)
   - Usa Supabase via window.DBHandler
   - ✅ Corrige o "item 2": validação no salvarColaborador()
   - ✅ Remove duplicidade de salvarColaborador()
*/

let colaboradoresCache = [];
let colaboradorEditandoId = null;

document.addEventListener("DOMContentLoaded", () => {
  // Botões
  const btnNovo = document.getElementById("btnNovo");
  const btnCancelar = document.getElementById("btnCancelar");
  const btnSalvar = document.getElementById("btnSalvar");
  const inputBusca = document.getElementById("busca");

  if (btnNovo) btnNovo.addEventListener("click", () => abrirFormularioNovo());
  if (btnCancelar) btnCancelar.addEventListener("click", () => fecharFormulario());
  if (btnSalvar) btnSalvar.addEventListener("click", (e) => {
    e.preventDefault();
    salvarColaborador(); // ✅ agora esse salva com validação dentro
  });

  if (inputBusca) inputBusca.addEventListener("input", () => renderTabela());

  // Inicialização
  initTela();
});

async function initTela() {
  try {
    if (!window.DBHandler) {
      alert("DBHandler não carregou. Verifique se db-handler.js está sendo importado antes do cadastro-script.js");
      return;
    }

    // Preenche select de cargos (tenta Supabase; se falhar, tenta config)
    await preencherCargos();

    // Carrega colaboradores
    await carregarColaboradores();
    renderTabela();
    fecharFormulario();
  } catch (err) {
    console.error(err);
    alert("Erro ao inicializar tela: " + (err.message || err));
  }
}

async function preencherCargos() {
  const selectCargo = document.getElementById("cargoAtualId");
  if (!selectCargo) return;

  selectCargo.innerHTML = `<option value="">Selecione...</option>`;

  // 1) tenta pelo Supabase (tabela cargos)
  try {
    const cargos = await window.DBHandler.listarCargos();
    cargos.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nome;
      selectCargo.appendChild(opt);
    });
    return;
  } catch (e) {
    // segue pro fallback
  }

  // 2) fallback: config.cargos (se existir)
  if (window.config && Array.isArray(window.config.cargos)) {
    window.config.cargos.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nome || c.titulo || `Cargo ${c.id}`;
      selectCargo.appendChild(opt);
    });
  }
}

async function carregarColaboradores() {
  colaboradoresCache = await window.DBHandler.listarColaboradores({ somenteAtivos: false });
}

function renderTabela() {
  const tbody = document.getElementById("tbodyColaboradores");
  if (!tbody) return;

  const termo = (document.getElementById("busca")?.value || "").trim().toLowerCase();

  const lista = colaboradoresCache.filter((c) => {
    if (!termo) return true;
    const nome = (c.nome || "").toLowerCase();
    const cpf = (c.cpf || "").toString().toLowerCase();
    const emailEmp = (c.email_empresarial || "").toLowerCase();
    const emailPes = (c.email_pessoal || "").toLowerCase();
    return (
      nome.includes(termo) ||
      cpf.includes(termo) ||
      emailEmp.includes(termo) ||
      emailPes.includes(termo)
    );
  });

  tbody.innerHTML = "";

  lista.forEach((col) => {
    const tr = document.createElement("tr");

    const status = col.data_demissao ? "Inativo" : "Ativo";
    const dataAdm = col.data_admissao || "";
    const funcao = col.funcao || "";

    tr.innerHTML = `
      <td>${col.id ?? ""}</td>
      <td>${escapeHtml(col.nome ?? "")}</td>
      <td>${escapeHtml(funcao)}</td>
      <td>${escapeHtml(dataAdm)}</td>
      <td>${escapeHtml(status)}</td>
      <td class="acoes">
        <button type="button" class="btn-acao" data-acao="editar">Editar</button>
        ${
          col.data_demissao
            ? `<button type="button" class="btn-acao" data-acao="reativar">Reativar</button>`
            : `<button type="button" class="btn-acao btn-danger" data-acao="desativar">Desativar</button>`
        }
      </td>
    `;

    tr.querySelector('[data-acao="editar"]')?.addEventListener("click", () => editarColaborador(col.id));
    tr.querySelector('[data-acao="desativar"]')?.addEventListener("click", () => desativarColaborador(col.id));
    tr.querySelector('[data-acao="reativar"]')?.addEventListener("click", () => reativarColaborador(col.id));

    tbody.appendChild(tr);
  });
}

function abrirFormularioNovo() {
  colaboradorEditandoId = null;
  limparFormulario();
  abrirFormulario();
}

function abrirFormulario() {
  const formBox = document.getElementById("formBox");
  const listBox = document.getElementById("listBox");
  if (formBox) formBox.style.display = "block";
  if (listBox) listBox.style.display = "none";
}

function fecharFormulario() {
  const formBox = document.getElementById("formBox");
  const listBox = document.getElementById("listBox");
  if (formBox) formBox.style.display = "none";
  if (listBox) listBox.style.display = "block";
}

function limparFormulario() {
  const form = document.getElementById("formColaborador");
  if (form) form.reset();

  // alguns campos não resetam como esperado em certos browsers, então garantimos:
  setVal("id", "");
}

async function editarColaborador(id) {
  try {
    const col = await window.DBHandler.buscarColaboradorPorId(id);
    colaboradorEditandoId = id;

    // Preenche formulário (snake_case -> inputs camelCase do HTML)
    setVal("id", col.id ?? "");
    setVal("gestorId", col.gestor_id ?? "");
    setVal("cargoAtualId", col.cargo_atual_id ?? "");

    setVal("nome", col.nome ?? "");
    setVal("funcao", col.funcao ?? "");
    setVal("matricula", col.matricula ?? "");

    setVal("dataNascimento", col.data_nascimento ?? "");
    setVal("genero", col.genero ?? "");
    setVal("estadoCivil", col.estado_civil ?? "");

    setVal("nacionalidade", col.nacionalidade ?? "");
    setVal("naturalidade", col.naturalidade ?? "");

    setVal("dataAdmissao", col.data_admissao ?? "");
    setVal("dataDemissao", col.data_demissao ?? "");
    setVal("motivoDemissao", col.motivo_demissao ?? "");

    setVal("cep", col.cep ?? "");
    setVal("logradouro", col.logradouro ?? "");
    setVal("numero", col.numero ?? "");
    setVal("complemento", col.complemento ?? "");
    setVal("bairro", col.bairro ?? "");
    setVal("cidade", col.cidade ?? "");
    setVal("estado", col.estado ?? "");

    setVal("celular", col.celular ?? "");
    setVal("telefone", col.telefone ?? "");
    setVal("telefoneEmergencia", col.telefone_emergencia ?? "");

    setVal("emailEmpresarial", col.email_empresarial ?? "");
    setVal("emailPessoal", col.email_pessoal ?? "");

    setVal("cpf", col.cpf ?? "");
    setVal("rg", col.rg ?? "");

    abrirFormulario();
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar colaborador: " + (err.message || err));
  }
}

async function desativarColaborador(id) {
  const motivo = prompt("Motivo da demissão/desativação (opcional):") || null;

  try {
    await window.DBHandler.desativarColaborador(id, {
      dataDemissao: new Date().toISOString().slice(0, 10),
      motivoDemissao: motivo,
    });
    await carregarColaboradores();
    renderTabela();
  } catch (err) {
    console.error(err);
    alert("Erro ao desativar: " + (err.message || err));
  }
}

async function reativarColaborador(id) {
  try {
    await window.DBHandler.reativarColaborador(id);
    await carregarColaboradores();
    renderTabela();
  } catch (err) {
    console.error(err);
    alert("Erro ao reativar: " + (err.message || err));
  }
}

/* =========================================================
   ✅ ITEM 2 AQUI: salvarColaborador() chama validarFormulario()
   ========================================================= */
async function salvarColaborador() {
  try {
    const dados = montarPayloadDoForm();

    // ✅ AQUI é onde você precisava mexer (ITEM 2)
    const ok = validarFormulario(dados);
    if (!ok) return;

    if (colaboradorEditandoId) {
      await window.DBHandler.atualizarColaborador(colaboradorEditandoId, dados);
    } else {
      await window.DBHandler.inserirColaborador(dados);
    }

    await carregarColaboradores();
    renderTabela();
    fecharFormulario();
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar: " + (err.message || err));
  }
}

/* Monta payload no padrão do banco (snake_case) */
function montarPayloadDoForm() {
  const cpfRaw = getVal("cpf");
  const cpfDigits = (cpfRaw || "").toString().replace(/\D/g, "");

  return {
    // id não precisa enviar no insert (mas não atrapalha no update se você preferir)
    gestor_id: asNumberOrNull(getVal("gestorId")),
    cargo_atual_id: asNumberOrNull(getVal("cargoAtualId")),

    nome: getVal("nome") || null,
    funcao: getVal("funcao") || null,
    matricula: getVal("matricula") || null,

    data_nascimento: getVal("dataNascimento") || null,
    genero: getVal("genero") || null,
    estado_civil: getVal("estadoCivil") || null,

    nacionalidade: getVal("nacionalidade") || null,
    naturalidade: getVal("naturalidade") || null,

    data_admissao: getVal("dataAdmissao") || null,
    data_demissao: getVal("dataDemissao") || null,
    motivo_demissao: getVal("motivoDemissao") || null,

    cep: getVal("cep") || null,
    logradouro: getVal("logradouro") || null,
    numero: getVal("numero") || null,
    complemento: getVal("complemento") || null,
    bairro: getVal("bairro") || null,
    cidade: getVal("cidade") || null,
    estado: getVal("estado") || null,

    celular: getVal("celular") || null,
    telefone: getVal("telefone") || null,
    telefone_emergencia: getVal("telefoneEmergencia") || null,

    email_empresarial: getVal("emailEmpresarial") || null,
    email_pessoal: getVal("emailPessoal") || null,

    // ✅ NOT NULL no seu banco (pelo erro que você mostrou)
    cpf: cpfDigits || null,
    rg: getVal("rg") || null,
  };
}

function validarFormulario(dados) {
  // Pelo seu erro do Supabase:
  // - cpf é NOT NULL
  // - data_admissao é NOT NULL
  // então validamos aqui antes de chamar o banco.

  const erros = [];

  if (!dados.nome || !dados.nome.trim()) erros.push("Nome é obrigatório.");
  if (!dados.cpf) erros.push("CPF é obrigatório (somente números).");
  if (!dados.data_admissao) erros.push("Data de admissão é obrigatória.");

  // valida email se preenchido
  const emailEmp = dados.email_empresarial;
  const emailPes = dados.email_pessoal;
  if (emailEmp && !isEmailValido(emailEmp)) erros.push("E-mail empresarial inválido.");
  if (emailPes && !isEmailValido(emailPes)) erros.push("E-mail pessoal inválido.");

  if (erros.length) {
    alert(erros.join("\n"));
    return false;
  }
  return true;
}

/* Helpers DOM */
function getVal(id) {
  const el = document.getElementById(id);
  return el ? (el.value ?? "").trim() : "";
}
function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

function asNumberOrNull(v) {
  const n = Number((v || "").toString().trim());
  return Number.isFinite(n) && n !== 0 ? n : (v ? n : null);
}

function isEmailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
