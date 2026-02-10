/* =============================================================
   catalogo.JS - Versão Estritamente Separada (Youtube OU Manual)
   ============================================================= */

import { DBHandler } from "../bd-treinamentos/db-handler.js";

let cursos = [];
const YOUTUBE_API_KEY_FIXA = "AIzaSyAJyCenPXn41mbjieW6wTzeaFPYFX5Xrzo";

// Estado Local
let modalCurso, formCurso, areaDelete, btnSalvarCurso;
let modalAulas, listaAulasUl;
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
// LÓGICA DE ALTERNÂNCIA DE MODO (NOVA)
// =============================================================
window.alternarFonte = function(modo) {
    const painelYT = document.getElementById("panel-youtube");
    const painelManual = document.getElementById("panel-manual");
    
    // Se já tem vídeos cadastrados, avisa que vai limpar ao trocar
    if(videosPendentes.length > 0) {
        if(!confirm("Ao trocar a forma de cadastro, a lista atual de aulas será limpa. Continuar?")) {
            // Reverte a seleção visualmente (truque simples)
            document.getElementById(modo === 'youtube' ? 'fonte_manual' : 'fonte_youtube').checked = true;
            return;
        }
    }

    // Limpa tudo ao trocar
    videosPendentes = [];
    renderizarListaUnificada();
    
    if(modo === 'youtube') {
        painelYT.style.display = 'block';
        painelManual.style.display = 'none';
        document.getElementById("curso-link").focus();
    } else {
        painelYT.style.display = 'none';
        painelManual.style.display = 'block';
        document.getElementById("manual-titulo").focus();
    }
}

// =============================================================
// FUNÇÕES DE UI
// =============================================================

function carregarElementosDOM() {
    modalCurso = document.getElementById("modal-curso");
    formCurso = document.getElementById("form-curso");
    areaDelete = document.getElementById("area-delete");
    btnSalvarCurso = document.getElementById("btn-salvar-curso");
    modalAulas = document.getElementById("modal-lista-aulas");
    listaAulasUl = document.getElementById("lista-aulas-container");
}

// Renderiza a lista de "Preview" no modal de edição
function renderizarListaUnificada() {
    const ul = document.getElementById("lista-manual-preview");
    const btnLimpar = document.getElementById("btn-limpar-aulas");
    const contador = document.getElementById("meta-qtd-aulas");
    const tempo = document.getElementById("meta-tempo-total");

    if(!ul) return;
    
    ul.innerHTML = "";
    
    // Atualiza contadores
    const totalAulas = videosPendentes.length;
    const totalMinutos = videosPendentes.reduce((acc, v) => acc + (v.duracao_minutos || 0), 0);
    
    if(contador) contador.textContent = totalAulas;
    if(tempo) tempo.textContent = formatarDuracao(totalMinutos);

    // Controle do botão limpar
    if(totalAulas === 0) {
        if(btnLimpar) btnLimpar.style.display = "none";
        ul.innerHTML = `<li style="text-align:center; padding:10px; color:#94a3b8; font-size:0.8rem; font-style:italic;">Nenhuma aula adicionada ainda.</li>`;
        return;
    }

    if(btnLimpar) btnLimpar.style.display = "block";

    // Desenha a lista
    videosPendentes.forEach((video, index) => {
        const li = document.createElement("li");
        li.className = "item-manual";
        li.innerHTML = `
            <div style="display:flex; flex-direction:column; overflow:hidden;">
                <strong style="color:#334155;">${index + 1}. ${video.titulo}</strong>
                <span style="color:#94a3b8; font-size:0.7rem;">${formatarDuracao(video.duracao_minutos)} • ${video.link_video ? 'Com Link' : 'Sem Link'}</span>
            </div>
            <button type="button" class="btn-remove-item" onclick="removerItem(${index})">&times;</button>
        `;
        ul.appendChild(li);
    });
}

window.removerItem = function(index) {
    videosPendentes.splice(index, 1);
    videosPendentes.forEach((v, i) => v.ordem = i + 1); // Reordena
    renderizarListaUnificada();
    marcarAlteracao();
}

function marcarAlteracao() {
    houveAlteracao = true;
    if(btnSalvarCurso) {
        btnSalvarCurso.disabled = false;
        btnSalvarCurso.innerText = "Salvar Alterações";
    }
}

// =============================================================
// RESET E EDIÇÃO
// =============================================================

function resetarModalManutencao() {
    formCurso.reset();
    videosPendentes = []; 
    houveAlteracao = false;
    if(btnSalvarCurso) btnSalvarCurso.disabled = true;
    
    if(areaDelete) areaDelete.style.display = "none";
    
    // Reseta visualização da fonte para YouTube
    document.getElementById("fonte_youtube").checked = true;
    document.getElementById("panel-youtube").style.display = 'block';
    document.getElementById("panel-manual").style.display = 'none';
    
    renderizarListaUnificada();
}

function editarCurso(id) {
    if(!modalCurso) return;
    
    resetarModalManutencao();
    const curso = cursos.find(c => c.id == id);
    if (!curso) return;

    // Popula campos
    document.getElementById("curso-id").value = curso.id;
    document.getElementById("curso-nome").value = curso.nome;
    document.getElementById("curso-status").value = (curso.status || "DISPONÍVEL").toUpperCase();
    document.getElementById("curso-subtrilha").value = curso.subtrilha || "";
    document.getElementById("curso-link").value = curso.link || "";
    document.getElementById("curso-descricao").value = curso.descricao || "";
    document.getElementById("curso-exibir").checked = (curso.exibir_catalogo !== false);

    // Carrega aulas existentes para a memória do modal
    if(curso.aulas && curso.aulas.length > 0) {
        // Clona para não alterar o original até salvar
        videosPendentes = curso.aulas.map(a => ({...a})).sort((a,b) => a.ordem - b.ordem);
        
        // Se tem aulas, mas não tem link de playlist, sugere modo manual
        if(!curso.link || !curso.link.includes("list=")) {
            document.getElementById("fonte_manual").checked = true;
            window.alternarFonte('manual'); // Troca visualmente sem limpar (hack)
            // Recarrega pois o alternarFonte limpa
            videosPendentes = curso.aulas.map(a => ({...a})).sort((a,b) => a.ordem - b.ordem);
        }
    }

    renderizarListaUnificada();

    document.getElementById("modal-curso-titulo").textContent = "Editar Curso";
    if(areaDelete) areaDelete.style.display = "block";
    
    popularSelectTrilhas(curso.trilha);
    modalCurso.style.display = "flex";
}

// =============================================================
// SETUP LISTENERS
// =============================================================
function setupGlobalListeners() {
    
    // --- LISTENERS DO CATALOGO (FILTROS E BOTOES GERAIS) ---
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

    document.querySelectorAll(".btn-close-modal-curso").forEach(btn => btn.addEventListener("click", () => modalCurso.style.display = "none"));
    document.querySelectorAll(".btn-close-modal-aulas").forEach(btn => btn.addEventListener("click", () => modalAulas.style.display = "none"));

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

    // --- SALVAR TUDO ---
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

    // --- ADICIONAR MANUAL ---
    addEvt("btn-add-manual", "click", () => {
        const titulo = document.getElementById("manual-titulo").value.trim();
        const link = document.getElementById("manual-link").value.trim();
        const minutos = parseInt(document.getElementById("manual-minutos").value) || 0;

        if(!titulo) { alert("O título da aula é obrigatório."); return; }
        
        // Garante que array existe
        if(!videosPendentes) videosPendentes = [];

        videosPendentes.push({
            titulo: titulo,
            link_video: link,
            duracao_minutos: minutos,
            ordem: videosPendentes.length + 1,
            descricao: "Cadastrado manualmente"
        });

        renderizarListaUnificada();
        marcarAlteracao();

        document.getElementById("manual-titulo").value = "";
        document.getElementById("manual-link").value = "";
        document.getElementById("manual-minutos").value = "";
        document.getElementById("manual-titulo").focus();
    });

    // --- LIMPAR TUDO ---
    addEvt("btn-limpar-aulas", "click", () => {
        if(confirm("Isso removerá todas as aulas da lista de preview. Confirmar?")) {
            videosPendentes = [];
            renderizarListaUnificada();
            marcarAlteracao();
        }
    });

    // --- SYNC YOUTUBE (LÓGICA CORRIGIDA) ---
    const btnSync = document.getElementById("btn-sync-youtube-rapido");
    if(btnSync) {
        btnSync.addEventListener("click", async () => {
            const linkUrl = document.getElementById("curso-link").value.trim();
            let playlistId = "";
            
            if (linkUrl.includes("list=")) {
                playlistId = linkUrl.split("list=")[1].split("&")[0];
            } else {
                playlistId = linkUrl;
            }

            if (!playlistId || playlistId.length < 5) {
                alert("Link inválido. Cole o link completo da Playlist.");
                return;
            }

            // LIMPEZA CRÍTICA ANTES DE COMEÇAR (Evita duplicar)
            videosPendentes = [];
            renderizarListaUnificada();

            const originalText = btnSync.innerHTML;
            btnSync.innerHTML = "⏳ Buscando...";
            btnSync.disabled = true;

            try {
                let fetchedVideos = [];
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
                            duracao_minutos: parseIsoDuration(item.contentDetails.duration),
                            ordem: 0 // Será reordenado no final
                        };
                    });
                    fetchedVideos = [...fetchedVideos, ...pageVideos];
                    nextPageToken = data.nextPageToken || "";
                } while (nextPageToken);

                if(fetchedVideos.length === 0) throw new Error("Playlist vazia.");

                // Reordena e Salva no Global
                videosPendentes = fetchedVideos.map((v, i) => ({...v, ordem: i+1}));
                
                renderizarListaUnificada();
                marcarAlteracao();
                alert(`✅ ${videosPendentes.length} aulas encontradas! Clique em SALVAR para confirmar.`);

            } catch (error) {
                console.error(error);
                alert("Erro ao buscar no YouTube: " + error.message);
            } finally {
                btnSync.innerHTML = originalText;
                btnSync.disabled = false;
            }
        });
    }
}

// =============================================================
// FUNÇÕES COMPLEMENTARES
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

  // Attach Listeners
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
// BOOTSTRAP (INICIALIZAÇÃO)
// =============================================================
async function inicializarApp() {
  console.log("🚀 Iniciando App...");
  
  carregarElementosDOM();
  setupGlobalListeners();

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
