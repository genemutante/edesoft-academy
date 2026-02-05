/* =============================================================
   APP.JS - Lógica Principal (Conectada ao Supabase)
   ============================================================= */

// Variável global que armazenará os cursos vindos do banco
let cursos = [];

// --- Utilitários ---
function formatarDuracao(minutos) {
  if (!minutos || isNaN(minutos)) return "-";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h} h`;
  return `${h} h ${m} min`;
}

function normalizarTexto(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// --- Renderização Principal ---
// --- A SUA FUNÇÃO ORIGINAL (Ajustada para o Banco) ---
function renderCursos(lista) {
    const container = document.getElementById("lista-cursos");
    container.innerHTML = "";

    if (!lista.length) {
        container.innerHTML = `<div class="lista-cursos-vazia"><strong>Nenhum curso encontrado.</strong></div>`;
        return;
    }

    // Ordenação Alfabética (Trilha > Subtrilha > Nome)
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
        // Cabeçalho de Trilha
        if (curso.trilha !== trilhaAtual) {
            trilhaAtual = curso.trilha;
            subAtual = null;
            const headerTrilha = document.createElement("div");
            headerTrilha.className = "header-trilha";
            headerTrilha.innerHTML = `<span>${trilhaAtual}</span><small>Trilha principal</small>`;
            container.appendChild(headerTrilha);
        }

        // Cabeçalho de Subtrilha
        if (curso.subtrilha && curso.subtrilha !== subAtual) {
            subAtual = curso.subtrilha;
            const headerSub = document.createElement("div");
            headerSub.className = "header-subtrilha";
            headerSub.innerHTML = `<span>${subAtual}</span><small>Subtrilha</small>`;
            container.appendChild(headerSub);
        }

        const qtdAulas = Number(curso.quantidadeAulas) || 0;
        const temLink = Boolean(curso.link && curso.link.trim());
        const podeAcessar = temLink && qtdAulas > 0;

        const card = document.createElement("article");
        card.className = "card-curso";

        const statusClass = curso.status
            ? curso.status.toLowerCase().replace(/\s+/g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            : "indefinido";
        
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
                <div class="info-item">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>
                    <span>${qtdAulas} aula(s)</span>
                </div>
                <div class="info-item">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>${formatarDuracao(curso.duracaoMinutos)}</span>
                </div>
            </div>
            <footer class="card-footer">
                <button class="btn-link" ${podeAcessar ? `onclick="window.open('${curso.link}', '_blank')"` : "disabled"}>
                    ${podeAcessar ? "Acessar curso" : "Em breve"}
                </button>
                <div class="pill-duracao">
                    <strong>${curso.duracaoMinutos || 0}</strong> min
                </div>
            </footer>
        `;
        container.appendChild(card);
    });
}

// --- Dashboard / Resumo ---
function atualizarResumo(lista) {
  // Garantimos que os filtros funcionem independente de como o texto vem do banco (MAIÚSCULO)
  const total = lista.length;
  const disponiveis = lista.filter((c) => (c.status || "").toUpperCase() === "DISPONÍVEL").length;
  const emDev = lista.filter((c) => (c.status || "").toUpperCase() === "EM DESENVOLVIMENTO").length;
  const backlog = lista.filter((c) => (c.status || "").toUpperCase() === "BACKLOG").length;

  // Soma de aulas (usando o campo mapeado quantidadeAulas)
  const totalAulas = lista.reduce((acc, c) => {
    const q = Number(c.quantidadeAulas);
    return (isNaN(q) || q <= 0) ? acc : acc + q;
  }, 0);

  // Soma de minutos totais
  const totalMinutos = lista.reduce((acc, c) => {
    const m = Number(c.duracaoMinutos);
    return (isNaN(m) || m <= 0) ? acc : acc + m;
  }, 0);

  // --- ATUALIZAÇÃO DOS ELEMENTOS NA TELA ---
  
  // IDs principais (Conforme seu HTML)
  if (document.getElementById("resumo-total")) 
      document.getElementById("resumo-total").textContent = total;
  
  if (document.getElementById("resumo-disponivel")) 
      document.getElementById("resumo-disponivel").textContent = disponiveis;
  
  if (document.getElementById("resumo-em-dev")) 
      document.getElementById("resumo-em-dev").textContent = emDev;
  
  if (document.getElementById("resumo-backlog")) 
      document.getElementById("resumo-backlog").textContent = backlog;

  // IDs de métricas específicas
  const aulasEl = document.getElementById("total-aulas");
  if (aulasEl) aulasEl.textContent = totalAulas;

  const tempoEl = document.getElementById("resumo-tempo");
  if (tempoEl) {
    // Usa sua função formatarDuracao para exibir: "10 h 30 min"
    tempoEl.textContent = formatarDuracao(totalMinutos);
  }
}

// --- Filtros ---
function preencherOpcoesTrilha() {
  const select = document.getElementById("filtro-trilha");
  const trilhas = [...new Set(cursos.map((c) => c.trilha))].sort();
  
  // Mantém a opção "Todas" e adiciona as do banco
  select.innerHTML = '<option value="">Todas as Trilhas</option>';
  trilhas.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    select.appendChild(opt);
  });
}

function preencherOpcoesSubtrilha(trilhaSelecionada) {
  const select = document.getElementById("filtro-subtrilha");
  select.innerHTML = '<option value="">Todas as Subtrilhas</option>';

  if (!trilhaSelecionada) {
    select.disabled = true;
    return;
  }

  const subs = [...new Set(cursos.filter((c) => c.trilha === trilhaSelecionada && c.subtrilha).map((c) => c.subtrilha))].sort();

  if (subs.length > 0) {
    select.disabled = false;
    subs.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      select.appendChild(opt);
    });
  } else {
    select.disabled = true;
  }
}

function obterCursosFiltrados() {
  const trilha = document.getElementById("filtro-trilha").value;
  const sub = document.getElementById("filtro-subtrilha").value;
  const status = document.getElementById("filtro-status").value;
  const busca = normalizarTexto(document.getElementById("filtro-busca").value);

  return cursos.filter((c) => {
    if (trilha && c.trilha !== trilha) return false;
    if (sub && c.subtrilha !== sub) return false;
    if (status && c.status !== status) return false;
    if (busca) {
      const texto = normalizarTexto(c.nome) + " " + normalizarTexto(c.descricao);
      if (!texto.includes(busca)) return false;
    }
    return true;
  });
}

function aplicarFiltros() {
  const filtrados = obterCursosFiltrados();
  renderCursos(filtrados);
  atualizarResumo(filtrados);
}

function limparFiltros() {
  document.getElementById("filtro-trilha").value = "";
  document.getElementById("filtro-status").value = "";
  document.getElementById("filtro-busca").value = "";
  preencherOpcoesSubtrilha("");
  document.getElementById("filtro-subtrilha").value = "";
  aplicarFiltros();
}

// --- INICIALIZAÇÃO ASSÍNCRONA (CONEXÃO COM BANCO) ---
async function inicializarApp() {
    const listaCursosContainer = document.getElementById("lista-cursos");
    listaCursosContainer.innerHTML = '<div class="lista-cursos-vazia">Carregando catálogo...</div>';

    try {
        // 1. Chama o DBHandler para buscar os dados reais do Supabase
        const dadosDoBanco = await DBHandler.listarTreinamentos();

// 2. Mapeamento: Converte snake_case (banco) para camelCase (código) e previne erros de null
        cursos = dadosDoBanco.map(item => ({
            ...item,
            // Tradução de nomes e garantia de valores numéricos
            quantidadeAulas: item.quantidade_aulas || 0,
            duracaoMinutos: item.duracao_minutos || 0,
            
            // PROTEÇÃO CRÍTICA: Garante que strings nunca sejam null (evita erro de .split)
            trilha: item.trilha || "", 
            subtrilha: item.subtrilha || "",
            descricao: item.descricao || "",
            nome: item.nome || "Sem Nome",
            status: item.status || "BACKLOG"
        }));

        // 3. Preenche a interface
        preencherOpcoesTrilha();
        aplicarFiltros(); // Renderiza e atualiza resumo

    } catch (error) {
        console.error("Erro ao inicializar catálogo:", error);
        listaCursosContainer.innerHTML = '<div class="lista-cursos-vazia text-red">Erro ao carregar dados do servidor.</div>';
    }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  // Inicia a carga dos dados
  inicializarApp();

  const filtroTrilha = document.getElementById("filtro-trilha");
  const filtroSub = document.getElementById("filtro-subtrilha");
  const filtroStatus = document.getElementById("filtro-status");
  const filtroBusca = document.getElementById("filtro-busca");
  const btnLimpar = document.getElementById("btn-limpar-filtros");

  filtroTrilha.addEventListener("change", () => {
    preencherOpcoesSubtrilha(filtroTrilha.value);
    aplicarFiltros();
  });

  filtroSub.addEventListener("change", aplicarFiltros);
  filtroStatus.addEventListener("change", aplicarFiltros);
  filtroBusca.addEventListener("input", aplicarFiltros);
  btnLimpar.addEventListener("click", limparFiltros);
});





