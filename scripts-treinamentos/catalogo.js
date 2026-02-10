/* =============================================================
   catalogo.JS - Versão Final Corrigida
   ============================================================= */

// 1. IMPORTAÇÃO
import { DBHandler } from "../bd-treinamentos/db-handler.js";

let cursos = [];
const YOUTUBE_API_KEY_FIXA = "AIzaSyAJyCenPXn41mbjieW6wTzeaFPYFX5Xrzo";

// --- Variáveis Globais ---
let modalCurso, formCurso, areaDelete, btnSalvarCurso;
let modalAulas, listaAulasUl;
let modalYouTube, btnSyncRapido, selectCursoYT, inputPlaylistId, inputApiKey;
let videosPendentes = []; 
let houveAlteracao = false;

// --- Utilitários ---
function formatarDuracao(minutos) {
  if (!minutos || isNaN(minutos)) return "0 min";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h} h`;
  return `${h} h ${m} min`;
}

// ✅ FUNÇÃO QUE FALTAVA (Correção do Erro de Sync)
function parseIsoDuration(iso) {
    if (!iso) return 0;
    const match = iso.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;
    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    return (hours * 60) + minutes;
}

function normalizarTexto(str) {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// =============================================================
// CARREGAMENTO DOS ELEMENTOS DOM
// =============================================================
function carregarElementosDOM() {
    modalCurso = document.getElementById("modal-curso");
    formCurso = document.getElementById("form-curso");
    areaDelete = document.getElementById("area-delete");
    btnSalvarCurso = document.getElementById("btn-salvar-curso");
    
    modalAulas = document.getElementById("modal-lista-aulas");
    listaAulasUl = document.getElementById("lista-aulas-container");

    modalYouTube = document.getElementById("modal-youtube");
    btnSyncRapido = document.getElementById("btn-sync-youtube-rapido");
    selectCursoYT = document.getElementById("yt-curso-selecionado");
    inputPlaylistId = document.getElementById("yt-playlist-id");
    inputApiKey = document.getElementById("yt-api-key");
}

function atualizarResumo(lista) {
  const total = lista.length;
  const disponiveis = lista.filter((c) => (c.status || "").toUpperCase() === "DISPONÍVEL").length;
  const emDev = lista.filter((c) => (c.status || "").toUpperCase() === "EM DESENVOLVIMENTO").length;
  const backlog = lista.filter((c) => (c.status || "").toUpperCase() === "BACKLOG").length;

  const totalAulas = lista.reduce((acc, c) => acc + (Number(c.quantidadeAulas) || 0), 0);
  const totalMinutos = lista.reduce((acc, c) => acc + (Number(c.duracaoMinutos) || 0), 0);

  const setContent = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };

  setContent("resumo-total", total);
  setContent("resumo-disponivel", disponiveis);
  setContent("resumo-em-dev", emDev);
  setContent("resumo-backlog", backlog);
  setContent("resumo-total-aulas", totalAulas);
  setContent("resumo-horas", formatarDuracao(totalMinutos));
}

// =============================================================
// RENDERIZAÇÃO DO CATÁLOGO
// =============================================================
function renderCursos(lista) {
  const container = document.getElementById("lista-cursos");
  if(!container) return;
  
  container.innerHTML = "";

  if (lista.length === 0) {
    container.innerHTML = `<div class="lista-cursos-vazia">Nenhum curso encontrado.</div>`;
    return;
  }

  const listaOrdenada = [...lista].sort((a, b) => {
    const t = (a.trilha || "Geral").localeCompare(b.trilha || "Geral");
    if (t !== 0) return t;
    const s = (a.subtrilha || "").localeCompare(b.subtrilha || "");
    if (s !== 0) return s;
    return (a.nome || "").localeCompare(b.nome || "");
  });

  let trilhaAtual = null;
  let subAtual = null;

  listaOrdenada.forEach((curso) => {
    // Cabeçalhos
    const trilhaDoCurso = curso.trilha || "Geral";
    if (trilhaDoCurso !== trilhaAtual) {
      trilhaAtual = trilhaDoCurso;
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
    const statusClass = (curso.status || "").toLowerCase().replace(/\s+/g, "-");
    const isOculto = curso.exibir_catalogo === false;

    // Botão Acesso
    let botaoAcessoHtml = `<button class="btn-disabled-text" disabled>Em breve</button>`;
    if (curso.link) {
        botaoAcessoHtml = `<button class="btn-icon-acessar" onclick="window.open('${curso.link}', '_blank')" title="Acessar"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg></button>`;
    }

    const card = document.createElement("article");
    card.className = "card-curso";
    if (isOculto) card.classList.add("is-hidden");
    if(statusClass) card.classList.add(`status-${statusClass}`);

    card.innerHTML = `
      <header class="card-header">
        <div class="card-trilhas">
           ${curso.subtrilha ? `<span class="badge-subtrilha">${curso.subtrilha}</span>` : `<span class="badge-trilha">${curso.trilha || 'Geral'}</span>`}
           ${isOculto ? '<span class="badge-oculto">🔒 OCULTO</span>' : ''}
        </div>
        <span class="badge-status ${statusClass}">${curso.status || 'Rascunho'}</span>
      </header>
      <h2 class="card-titulo">${curso.nome}</h2>
      <p class="card-descricao">${curso.descricao || "Sem descrição."}</p>
      <footer class="card-footer">
        <div class="pill-duracao">
           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
           <strong>${formatarDuracao(curso.duracaoMinutos)}</strong>
        </div>
        <div style="display: flex; gap: 8px;">
            <button class="btn-icon-grade btn-abrir-grade" data-id="${curso.id}" title="Ver Grade">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
                <span class="grade-count">${qtdAulas}</span>
            </button>
            <button class="btn-icon-editar" data-id="${curso.id}" title="Editar">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            ${botaoAcessoHtml}
        </div>
      </footer>
    `;
    container.appendChild(card);
  });

  // ✅ CORREÇÃO: Restringe a busca de botões APENAS dentro da lista
  // Isso evita conflito com o botão "+" dentro do modal
  container.querySelectorAll('.btn-abrir-grade').forEach(btn => {
      btn.addEventListener('click', (e) => {
          e.stopPropagation(); 
          abrirModalAulas(e.currentTarget.dataset.id); 
      });
  });

  container.querySelectorAll('.btn-icon-editar').forEach(btn => {
      btn.addEventListener('click', (e) => {
          e.stopPropagation();
          editarCurso(e.currentTarget.dataset.id);
      });
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

function aplicarFiltros() {
  const termo = normalizarTexto(document.getElementById("filtro-busca").value);
  const trilhaSel = document.getElementById("filtro-trilha").value;
  const subSel = document.getElementById("filtro-subtrilha").value;
  const statusSel = document.getElementById("filtro-status").value;
  const elVerOcultos = document.getElementById("filtro-ver-ocultos");
  const verOcultos = elVerOcultos ? elVerOcultos.checked : false;

  const filtrados = cursos.filter((c) => {
    if (c.exibir_catalogo === false && !verOcultos) return false;
    const matchBusca = normalizarTexto(c.nome).includes(termo) || normalizarTexto(c.descricao).includes(termo);
    const matchTrilha = !trilhaSel || c.trilha === trilhaSel;
    const matchSub = !subSel || c.subtrilha === subSel;
    const matchStatus = !statusSel || (c.status || "").toUpperCase() === statusSel;
    return matchBusca && matchTrilha && matchSub && matchStatus;
  });

  renderCursos(filtrados);
  atualizarResumo(filtrados);
}

// =============================================================
// INICIALIZAÇÃO
// =============================================================
async function inicializarApp() {
  console.log("🚀 Iniciando App...");
  
  carregarElementosDOM(); // 1. Carrega variáveis
  setupGlobalListeners(); // 2. Ativa botões da tela

  try {
    const dados = await DBHandler.listarTreinamentos();
    
    cursos = dados.map(item => {
      const listaAulas = item.aulas || [];
      return {
        ...item,
        quantidadeAulas: listaAulas.length, 
        duracaoMinutos: listaAulas.reduce((acc, a) => acc + (Number(a.duracao_minutos) || 0), 0),
        trilha: item.trilha || "Geral",
        subtrilha: item.subtrilha || ""
      };
    });

    preencherOpcoesTrilha();
    aplicarFiltros();
  } catch (e) {
    console.error("❌ Falha na inicialização:", e);
    alert("Erro ao conectar com o banco de dados. Verifique o console.");
  }
}

document.addEventListener("DOMContentLoaded", inicializarApp);


// =============================================================
// MODAIS E EDIÇÃO
// =============================================================

function abrirModalAulas(id) {
    const curso = cursos.find(c => c.id == id);
    if (!curso) return;

    document.getElementById("modal-titulo-curso").textContent = curso.nome;
    document.getElementById("modal-qtd-aulas").textContent = `${curso.quantidadeAulas} aulas`;
    document.getElementById("modal-tempo-total").textContent = formatarDuracao(curso.duracaoMinutos);
    listaAulasUl.innerHTML = "";
    
    const aulasOrdenadas = (curso.aulas || []).sort((a, b) => a.ordem - b.ordem);

    if (aulasOrdenadas.length === 0) {
        listaAulasUl.innerHTML = `<li style="padding:20px; text-align:center; color:#94a3b8;">Nenhuma aula cadastrada.</li>`;
    } else {
        aulasOrdenadas.forEach((aula, index) => {
            const li = document.createElement("li");
            li.className = "aula-item";
            li.innerHTML = `
                <div class="aula-ordem">${index + 1}</div>
                <div class="aula-info">
                    <span class="aula-titulo">${aula.titulo}</span>
                    <span class="aula-tempo">${aula.duracao_minutos} min</span>
                </div>
                ${aula.link_video ? `<a href="${aula.link_video}" target="_blank" class="btn-ver-video" title="Assistir">📺</a>` : ''}
            `;
            listaAulasUl.appendChild(li);
        });
    }
    modalAulas.style.display = "flex";
}

function marcarAlteracao() {
    houveAlteracao = true;
    if(btnSalvarCurso) {
        btnSalvarCurso.disabled = false;
        btnSalvarCurso.innerText = "Salvar Alterações";
    }
}

function resetarModalManutencao() {
    formCurso.reset();
    videosPendentes = []; 
    houveAlteracao = false;
    if(btnSalvarCurso) btnSalvarCurso.disabled = true;
    
    const elBadge = document.getElementById("badge-pendente");
    if(elBadge) elBadge.style.display = "none";
    
    document.getElementById("meta-qtd-aulas").textContent = "0";
    document.getElementById("meta-tempo-total").textContent = "0 min";
    
    const elData = document.getElementById("meta-data-sync");
    if(elData) {
        elData.textContent = "-";
        elData.style.color = "";
        elData.style.fontWeight = "";
    }
    
    if(areaDelete) areaDelete.style.display = "none";
    
    const listaManual = document.getElementById("lista-manual-preview");
    if(listaManual) listaManual.innerHTML = "";
    const btnLimpar = document.getElementById("btn-limpar-aulas");
    if(btnLimpar) btnLimpar.style.display = "none";

    // Reseta abas (Volta para YouTube)
    const btnYT = document.querySelector('.tab-btn[data-target="tab-youtube"]');
    if(btnYT && window.alternarAba) window.alternarAba(btnYT);
}

function editarCurso(id) {
    if(!modalCurso) { console.error("Modal não carregado"); return; }
    
    resetarModalManutencao();
    const curso = cursos.find(c => c.id == id);
    if (!curso) return;

    // Preenche Campos
    document.getElementById("curso-id").value = curso.id;
    document.getElementById("curso-nome").value = curso.nome;
    document.getElementById("curso-status").value = (curso.status || "DISPONÍVEL").toUpperCase();
    document.getElementById("curso-subtrilha").value = curso.subtrilha || "";
    document.getElementById("curso-link").value = curso.link || "";
    document.getElementById("curso-descricao").value = curso.descricao || "";
    document.getElementById("curso-exibir").checked = (curso.exibir_catalogo !== false);

    // Metadados
    document.getElementById("meta-qtd-aulas").textContent = curso.quantidadeAulas || 0;
    document.getElementById("meta-tempo-total").textContent = formatarDuracao(curso.duracaoMinutos);
    
    const elData = document.getElementById("meta-data-sync");
    if(curso.ultima_sincronizacao) {
        elData.textContent = new Date(curso.ultima_sincronizacao).toLocaleString('pt-BR');
    } else {
        elData.textContent = "Nunca";
    }

    document.getElementById("modal-curso-titulo").textContent = "Editar Curso";
    if(areaDelete) areaDelete.style.display = "block";
    
    popularSelectTrilhas(curso.trilha);
    modalCurso.style.display = "flex";
}

// =============================================================
// FUNÇÕES AUXILIARES
// =============================================================

function popularSelectTrilhas(valorSelecionado = "") {
    const select = document.getElementById("curso-trilha-select");
    if(!select) return;
    
    select.innerHTML = "";
    const trilhasUnicas = [...new Set(cursos.map(c => c.trilha || "Geral"))].sort();
    
    trilhasUnicas.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t; opt.textContent = t;
        select.appendChild(opt);
    });

    if (valorSelecionado && trilhasUnicas.includes(valorSelecionado)) {
        select.value = valorSelecionado;
        alternarModoTrilha("select"); 
    } else if (valorSelecionado) {
        document.getElementById("curso-trilha-input").value = valorSelecionado;
        alternarModoTrilha("input");
    } else {
        alternarModoTrilha("select");
    }
}

function alternarModoTrilha(modo) {
    const boxSelect = document.getElementById("box-select-trilha");
    const inputTexto = document.getElementById("curso-trilha-input");
    const btnIcon = document.getElementById("btn-toggle-trilha");
    
    if(!boxSelect || !inputTexto) return;

    if (modo === "input") {
        boxSelect.style.display = "none";
        inputTexto.style.display = "block";
        inputTexto.focus();
        btnIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>`;
        btnIcon.title = "Selecionar existente";
        inputTexto.dataset.mode = "active"; 
    } else {
        boxSelect.style.display = "block";
        inputTexto.style.display = "none";
        btnIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>`;
        btnIcon.title = "Criar nova trilha";
        inputTexto.dataset.mode = "inactive";
    }
}

// -------------------------------------------------------------
// LÓGICA DE ABAS e MANUAL (Window Scoped)
// -------------------------------------------------------------
window.alternarAba = function(btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const targetId = btn.dataset.target;
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.getElementById(targetId).style.display = 'block';
}

window.removerItemManual = function(index) {
    videosPendentes.splice(index, 1);
    videosPendentes.forEach((v, i) => v.ordem = i + 1);
    renderizarListaManual();
    atualizarMetadadosGlobais();
    marcarAlteracao();
}

function renderizarListaManual() {
    const ul = document.getElementById("lista-manual-preview");
    const btnLimpar = document.getElementById("btn-limpar-aulas");
    if(!ul) return;
    
    ul.innerHTML = "";
    if(!videosPendentes || videosPendentes.length === 0) {
        if(btnLimpar) btnLimpar.style.display = "none";
        return;
    }

    videosPendentes.forEach((video, index) => {
        const li = document.createElement("li");
        li.className = "item-manual";
        li.innerHTML = `
            <div style="display:flex; flex-direction:column; overflow:hidden;">
                <strong style="color:#334155;">${index + 1}. ${video.titulo}</strong>
                <span style="color:#94a3b8; font-size:0.7rem;">${video.link_video || 'Sem link'} • ${video.duracao_minutos} min</span>
            </div>
            <button type="button" class="btn-remove-item" onclick="removerItemManual(${index})">&times;</button>
        `;
        ul.appendChild(li);
    });
    if(btnLimpar) btnLimpar.style.display = "block";
}

function atualizarMetadadosGlobais() {
    const totalAulas = videosPendentes ? videosPendentes.length : 0;
    const totalMinutos = videosPendentes ? videosPendentes.reduce((acc, v) => acc + (v.duracao_minutos || 0), 0) : 0;

    document.getElementById("meta-qtd-aulas").textContent = totalAulas;
    document.getElementById("meta-tempo-total").textContent = formatarDuracao(totalMinutos);

    const badge = document.getElementById("badge-pendente");
    if(badge) {
        if(totalAulas > 0 || houveAlteracao) {
            badge.style.display = "block";
            badge.textContent = "Pendentes de Salvar";
            badge.style.backgroundColor = "#fef3c7";
            badge.style.color = "#d97706";
        } else {
            badge.style.display = "none";
        }
    }
}

// -------------------------------------------------------------
// CONFIGURAÇÃO DOS LISTENERS
// -------------------------------------------------------------
function setupGlobalListeners() {
    
    const addEvt = (id, evt, fn) => { const el = document.getElementById(id); if(el) el.addEventListener(evt, fn); };
    
    addEvt("filtro-trilha", "change", (e) => { preencherOpcoesSubtrilha(e.target.value); aplicarFiltros(); });
    addEvt("filtro-subtrilha", "change", aplicarFiltros);
    addEvt("filtro-status", "change", aplicarFiltros);
    addEvt("filtro-busca", "input", aplicarFiltros);
    addEvt("filtro-ver-ocultos", "change", aplicarFiltros);
    
    addEvt("btn-limpar-filtros", "click", () => {
        document.getElementById("filtro-trilha").value = "";
        document.getElementById("filtro-status").value = "";
        document.getElementById("filtro-busca").value = "";
        preencherOpcoesSubtrilha("");
        aplicarFiltros();
    });

    // Fechar Modais
    document.querySelectorAll(".btn-close-modal").forEach(btn => btn.addEventListener("click", () => {
        if(modalYouTube) modalYouTube.style.display = "none";
        if(modalCurso) modalCurso.style.display = "none";
    }));
    document.querySelectorAll(".btn-close-modal-curso").forEach(btn => btn.addEventListener("click", () => modalCurso.style.display = "none"));
    document.querySelectorAll(".btn-close-modal-aulas").forEach(btn => btn.addEventListener("click", () => modalAulas.style.display = "none"));

    // Ações Principais
    addEvt("btn-novo-curso", "click", () => {
        resetarModalManutencao();
        document.getElementById("curso-id").value = ""; 
        document.getElementById("modal-curso-titulo").textContent = "Novo Curso";
        document.getElementById("curso-exibir").checked = true;
        popularSelectTrilhas("");
        if(modalCurso) modalCurso.style.display = "flex";
    });

    addEvt("btn-excluir-curso", "click", async () => {
        const id = document.getElementById("curso-id").value;
        if(!id) return;
        if(confirm("Tem certeza? Isso apagará o curso e TODO o histórico de aulas.")) {
            try {
                await DBHandler.excluirCurso(id);
                modalCurso.style.display = "none";
                inicializarApp();
            } catch (e) { alert("Erro ao excluir: " + e.message); }
        }
    });

    addEvt("btn-toggle-trilha", "click", () => {
        const inputTexto = document.getElementById("curso-trilha-input");
        const isInputMode = inputTexto.style.display === "block";
        alternarModoTrilha(isInputMode ? "select" : "input");
    });

    // Salvar
    if(btnSalvarCurso) btnSalvarCurso.addEventListener("click", async () => {
        const id = document.getElementById("curso-id").value;
        const nome = document.getElementById("curso-nome").value;
        
        let trilhaValor = "";
        const inputTrilha = document.getElementById("curso-trilha-input");
        if (inputTrilha.dataset.mode === "active") {
            trilhaValor = inputTrilha.value.trim();
            if(!trilhaValor) { alert("Digite o nome da nova trilha."); return; }
        } else {
            trilhaValor = document.getElementById("curso-trilha-select").value || "Geral";
        }

        if(!nome) { alert("O nome do curso é obrigatório."); return; }

        const payload = {
            categoria: trilhaValor, 
            nome: nome,
            status: document.getElementById("curso-status").value,
            trilha: trilhaValor, 
            subtrilha: document.getElementById("curso-subtrilha").value,
            link: document.getElementById("curso-link").value,
            descricao: document.getElementById("curso-descricao").value,
            exibir_catalogo: document.getElementById("curso-exibir").checked
        };

        if(id) payload.id = id; 
        if (videosPendentes.length > 0) {
            payload.ultima_sincronizacao = new Date().toISOString();
        }

        btnSalvarCurso.innerText = "Salvando...";
        btnSalvarCurso.disabled = true;

        try {
            await DBHandler.salvarCursoCompleto(payload, videosPendentes);
            modalCurso.style.display = "none";
            inicializarApp(); 
            alert("Curso salvo com sucesso!");
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar: " + e.message);
            btnSalvarCurso.disabled = false;
            btnSalvarCurso.innerText = "Salvar Alterações";
        }
    });

    // Monitorar Digitação
    if(formCurso) {
        formCurso.querySelectorAll("input, select, textarea").forEach(el => {
            el.addEventListener("input", marcarAlteracao);
            el.addEventListener("change", marcarAlteracao);
        });
    }

    // Manual Add
    addEvt("btn-add-manual", "click", () => {
        const titulo = document.getElementById("manual-titulo").value.trim();
        const link = document.getElementById("manual-link").value.trim();
        const minutos = parseInt(document.getElementById("manual-minutos").value) || 0;

        if(!titulo) { alert("O título da aula é obrigatório."); return; }
        if(!videosPendentes) videosPendentes = [];

        videosPendentes.push({
            titulo: titulo,
            link_video: link,
            duracao_minutos: minutos,
            ordem: videosPendentes.length + 1,
            descricao: "Cadastrado manualmente"
        });

        renderizarListaManual();
        atualizarMetadadosGlobais();
        marcarAlteracao();

        document.getElementById("manual-titulo").value = "";
        document.getElementById("manual-link").value = "";
        document.getElementById("manual-minutos").value = "";
        document.getElementById("manual-titulo").focus();
    });

    addEvt("btn-limpar-aulas", "click", () => {
        if(confirm("Remover todas as aulas pendentes?")) {
            videosPendentes = [];
            renderizarListaManual();
            atualizarMetadadosGlobais();
            marcarAlteracao();
        }
    });

    // Listener Limpeza Link
    const inputLink = document.getElementById("curso-link");
    if (inputLink) {
        inputLink.addEventListener("input", (e) => {
            if (e.target.value.trim() === "") {
                videosPendentes = []; 
                renderizarListaManual();      
                atualizarMetadadosGlobais();  
                const elData = document.getElementById("meta-data-sync");
                if(elData) {
                    elData.textContent = "Remoção Pendente";
                    elData.style.color = "#ef4444";
                }
                marcarAlteracao();
            }
        });
    }

    // Listener SYNC YOUTUBE
    if(btnSyncRapido) {
        btnSyncRapido.addEventListener("click", async () => {
            const linkUrl = document.getElementById("curso-link").value.trim();
            let playlistId = "";
            
            if (linkUrl.includes("list=")) {
                playlistId = linkUrl.split("list=")[1].split("&")[0];
            } else {
                playlistId = linkUrl;
            }

            if (!playlistId || playlistId.length < 5) {
                alert("⚠️ Link inválido. Certifique-se que contém '?list=...'");
                return;
            }

            const textoOriginal = btnSyncRapido.innerHTML;
            btnSyncRapido.innerHTML = `⏳ ...`;
            btnSyncRapido.disabled = true;

            try {
                let videos = [];
                let nextPageToken = "";
                
                do {
                    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${YOUTUBE_API_KEY_FIXA}&pageToken=${nextPageToken}`;
                    const response = await fetch(url);
                    const data = await response.json();
                    
                    if (data.error) throw new Error(data.error.message);

                    const videoIds = data.items.map(item => item.contentDetails.videoId).join(",");
                    if(!videoIds) { nextPageToken = data.nextPageToken || ""; continue; }

                    const urlDetails = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY_FIXA}`;
                    const respDetails = await fetch(urlDetails);
                    const dataDetails = await respDetails.json();

                    const pageVideos = dataDetails.items.map(item => {
                        return {
                            titulo: item.snippet.title,
                            link_video: `https://www.youtube.com/watch?v=${item.id}`,
                            descricao: item.snippet.description || "",
                            // AQUI ESTAVA O ERRO ANTES: CHAMAVA A FUNÇÃO QUE NÃO EXISTIA
                            duracao_minutos: parseIsoDuration(item.contentDetails.duration),
                            ordem: 0
                        };
                    });
                    videos = [...videos, ...pageVideos];
                    nextPageToken = data.nextPageToken || "";
                } while (nextPageToken);

                if(videos.length === 0) throw new Error("Playlist vazia.");

                videosPendentes = videos; 
                renderizarListaManual();      
                atualizarMetadadosGlobais();  
                
                const elData = document.getElementById("meta-data-sync");
                elData.textContent = new Date().toLocaleString('pt-BR');
                elData.style.color = "#16a34a";
                elData.style.fontWeight = "bold";

                marcarAlteracao();
                alert(`✅ Sincronização em rascunho!\n\n${videos.length} aulas encontradas.\nClique em SALVAR para confirmar.`);

            } catch (error) {
                console.error(error);
                alert("❌ Erro ao buscar: " + error.message);
            } finally {
                btnSyncRapido.innerHTML = textoOriginal;
                btnSyncRapido.disabled = false;
            }
        });
    }
}
