/* =============================================================
   APP.JS - Versão Consolidada com Logs de Auditoria
   ============================================================= */

let cursos = [];

// --- Utilitários ---
function formatarDuracao(minutos) {
  if (!minutos || isNaN(minutos)) return "0 min";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h} h`;
  return `${h} h ${m} min`;
}

function normalizarTexto(str) {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// --- Resumo (Dashboard) ---
function atualizarResumo(lista) {
  console.log("📊 [Resumo] Processando lista de cursos:", lista.length, "itens");

  const total = lista.length;
  // Proteção para Case Sensitivity (Maiúsculas/Minúsculas do Banco)
  const disponiveis = lista.filter((c) => (c.status || "").toUpperCase() === "DISPONÍVEL").length;
  const emDev = lista.filter((c) => (c.status || "").toUpperCase() === "EM DESENVOLVIMENTO").length;
  const backlog = lista.filter((c) => (c.status || "").toUpperCase() === "BACKLOG").length;

  const totalAulas = lista.reduce((acc, c) => {
    const q = Number(c.quantidadeAulas);
    return (isNaN(q) || q <= 0) ? acc : acc + q;
  }, 0);

  const totalMinutos = lista.reduce((acc, c) => {
    const m = Number(c.duracaoMinutos);
    return (isNaN(m) || m <= 0) ? acc : acc + m;
  }, 0);

  console.group("📈 Auditoria do Dashboard");
  console.log("Status:", { total, disponiveis, emDev, backlog });
  console.log("Cálculos:", { totalAulas, totalMinutos });
  console.groupEnd();

  // Atualiza HTML
  document.getElementById("resumo-total").textContent = total;
  document.getElementById("resumo-disponivel").textContent = disponiveis;
  document.getElementById("resumo-em-dev").textContent = emDev;
  document.getElementById("resumo-backlog").textContent = backlog;
  
  if (document.getElementById("total-aulas")) 
      document.getElementById("total-aulas").textContent = totalAulas;

  if (document.getElementById("resumo-tempo")) 
      document.getElementById("resumo-tempo").textContent = formatarDuracao(totalMinutos);
}

// --- Renderização do Catálogo ---
function renderCursos(lista) {
  const container = document.getElementById("lista-cursos");
  container.innerHTML = "";

  const listaOrdenada = [...lista].sort((a, b) => {
    const t = (a.trilha || "").localeCompare(b.trilha || "");
    if (t !== 0) return t;
    const s = (a.subtrilha || "").localeCompare(b.subtrilha || "");
    if (s !== 0) return s;
    return (a.nome || "").localeCompare(b.nome || "");
  });

  let trilhaAtual = null;
  let subAtual = null;

  listaOrdenada.forEach((curso) => {
    if (curso.trilha !== trilhaAtual) {
      trilhaAtual = curso.trilha;
      subAtual = null;
      const h = document.createElement("div");
      h.className = "header-trilha";
      h.innerHTML = `<span>${trilhaAtual}</span><small>Trilha principal</small>`;
      container.appendChild(h);
    }
    if (curso.subtrilha && curso.subtrilha !== subAtual) {
      subAtual = curso.subtrilha;
      const h = document.createElement("div");
      h.className = "header-subtrilha";
      h.innerHTML = `<span>${subAtual}</span><small>Subtrilha</small>`;
      container.appendChild(h);
    }

    const qtdAulas = Number(curso.quantidadeAulas) || 0;
    const temLink = Boolean(curso.link && curso.link.trim());
    const podeAcessar = temLink && qtdAulas > 0;

    const card = document.createElement("article");
    card.className = "card-curso";
    const statusClass = (curso.status || "").toLowerCase().replace(/\s+/g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    card.classList.add(`status-${statusClass}`);

    card.innerHTML = `
      <header class="card-header">
        <div class="card-trilhas">
          <span class="badge-trilha">${curso.trilha}</span>
          ${curso.subtrilha ? `<span class="badge-subtrilha">${curso.subtrilha}</span>` : ""}
        </div>
        <span class="badge-status ${statusClass}">${curso.status}</span>
      </header>
      <h2 class="card-titulo">${curso.nome}</h2>
      <p class="card-descricao">${curso.descricao || ""}</p>
      <div class="card-info">
        <div class="info-item"><span>${qtdAulas} aula(s)</span></div>
        <div class="info-item"><span>${formatarDuracao(curso.duracaoMinutos)}</span></div>
      </div>
      <footer class="card-footer">
        <button class="btn-link" ${podeAcessar ? `onclick="window.open('${curso.link}', '_blank')"` : "disabled"}>
          ${podeAcessar ? "Acessar curso" : "Em breve"}
        </button>
        <div class="pill-duracao"><strong>${curso.duracaoMinutos || 0}</strong> min</div>
      </footer>
    `;
    container.appendChild(card);
  });
}

// --- Filtros ---
function preencherOpcoesTrilha() {
  const select = document.getElementById("filtro-trilha");
  const trilhas = [...new Set(cursos.map((c) => c.trilha))].filter(Boolean).sort();
  select.innerHTML = '<option value="">Todas</option>';
  trilhas.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t; opt.textContent = t;
    select.appendChild(opt);
  });
}

function preencherOpcoesSubtrilha(trilha) {
  const select = document.getElementById("filtro-subtrilha");
  select.innerHTML = '<option value="">Todas</option>';
  if (!trilha) { select.disabled = true; return; }
  const subs = [...new Set(cursos.filter(c => c.trilha === trilha && c.subtrilha).map(c => c.subtrilha))].sort();
  select.disabled = subs.length === 0;
  subs.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s; opt.textContent = s;
    select.appendChild(opt);
  });
}

// No seu app.js, ajuste a função aplicarFiltros assim:
function aplicarFiltros() {
  const filtrados = obterCursosFiltrados();
  
  console.log("1. Filtros aplicados. Chamando renderização...");
  try {
    renderCursos(filtrados);
  } catch (e) {
    console.error("❌ Erro na renderCursos:", e);
  }

  console.log("2. Chamando atualização do resumo...");
  try {
    atualizarResumo(filtrados);
  } catch (e) {
    console.error("❌ Erro na atualizarResumo:", e);
  }
}

// --- Inicialização ---
async function inicializarApp() {
  console.log("🚀 Iniciando App...");
  try {
    const dados = await DBHandler.listarTreinamentos();
    console.log("📥 Dados brutos do banco:", dados.length, "cursos");
    
    cursos = dados.map(item => ({
      ...item,
      quantidadeAulas: item.quantidade_aulas || 0,
      duracaoMinutos: item.duracao_minutos || 0,
      trilha: item.trilha || "Geral",
      subtrilha: item.subtrilha || ""
    }));

    preencherOpcoesTrilha();
    aplicarFiltros();
  } catch (e) {
    console.error("❌ Falha na inicialização:", e);
  }
}

document.addEventListener("DOMContentLoaded", inicializarApp);

// Listeners
document.getElementById("filtro-trilha").addEventListener("change", (e) => {
  preencherOpcoesSubtrilha(e.target.value);
  aplicarFiltros();
});
document.getElementById("filtro-subtrilha").addEventListener("change", aplicarFiltros);
document.getElementById("filtro-status").addEventListener("change", aplicarFiltros);
document.getElementById("filtro-busca").addEventListener("input", aplicarFiltros);
document.getElementById("btn-limpar-filtros").addEventListener("click", () => {
  document.getElementById("filtro-trilha").value = "";
  document.getElementById("filtro-status").value = "";
  document.getElementById("filtro-busca").value = "";
  preencherOpcoesSubtrilha("");
  aplicarFiltros();
});

