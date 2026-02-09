/* =============================================================
   catalogo.JS - Versão Consolidada com Logs de Auditoria
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

// =============================================================
// CORREÇÃO: Função atualizarResumo com os IDs Corretos
// =============================================================
function atualizarResumo(lista) {
  console.log("📊 [Resumo] Processando lista de cursos:", lista.length, "itens");

  const total = lista.length;
  // Proteção para Case Sensitivity
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

  // --- ATUALIZAÇÃO DO DOM (IDs Corrigidos) ---
  
  // Total de Cursos
  const elTotal = document.getElementById("resumo-total");
  if (elTotal) elTotal.textContent = total;

  // Total Disponível
  const elDisp = document.getElementById("resumo-disponivel");
  if (elDisp) elDisp.textContent = disponiveis;

  // Total em Desenvolvimento
  const elDev = document.getElementById("resumo-em-dev");
  if (elDev) elDev.textContent = emDev;

  // Total Backlog
  const elBack = document.getElementById("resumo-backlog");
  if (elBack) elBack.textContent = backlog;
  
  // CORREÇÃO 1: ID ajustado de "total-aulas" para "resumo-total-aulas"
  const elTotalAulas = document.getElementById("resumo-total-aulas");
  if (elTotalAulas) elTotalAulas.textContent = totalAulas;

  // CORREÇÃO 2: ID ajustado de "resumo-tempo" para "resumo-horas"
  const elHoras = document.getElementById("resumo-horas");
  if (elHoras) elHoras.textContent = formatarDuracao(totalMinutos);
}


// --- Renderização do Catálogo ---

function renderCursos(lista) {
  const container = document.getElementById("lista-cursos");
  container.innerHTML = "";

  if (lista.length === 0) {
    container.innerHTML = `<div class="lista-cursos-vazia">Nenhum curso encontrado com os filtros atuais.</div>`;
    return;
  }

  // 1. Ordenação
  const listaOrdenada = [...lista].sort((a, b) => {
    const t = (a.trilha || "Geral").localeCompare(b.trilha || "Geral");
    if (t !== 0) return t;
    const s = (a.subtrilha || "").localeCompare(b.subtrilha || "");
    if (s !== 0) return s;
    const ordemA = a.ordem_curso_modulo || 999;
    const ordemB = b.ordem_curso_modulo || 999;
    if (ordemA !== ordemB) return ordemA - ordemB;
    return (a.nome || "").localeCompare(b.nome || "");
  });

  let trilhaAtual = null;
  let subAtual = null;

  listaOrdenada.forEach((curso) => {
    // --- Cabeçalhos ---
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

    // --- Dados ---
    const qtdAulas = Number(curso.quantidadeAulas) || 0;
    const temLink = Boolean(curso.link && curso.link.trim());
    const podeAcessar = temLink; 
    
    const statusClass = (curso.status || "")
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-");

    // --- HTML do Card ---
    const card = document.createElement("article");
    card.className = "card-curso";
    card.setAttribute("data-status-text", curso.status || "Indefinido");
    if(statusClass) card.classList.add(`status-${statusClass}`);

    card.innerHTML = `
      <header class="card-header">
        <div class="card-trilhas">
           ${curso.subtrilha ? `<span class="badge-subtrilha">${curso.subtrilha}</span>` : `<span class="badge-trilha">${curso.trilha || 'Geral'}</span>`}
        </div>
        <span class="badge-status ${statusClass}">${curso.status || 'Rascunho'}</span>
      </header>

      <h2 class="card-titulo">${curso.nome}</h2>
      
      <p class="card-descricao">${curso.descricao || "Sem descrição disponível."}</p>

      <footer class="card-footer">
        <div class="pill-duracao">
           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
           <strong>${formatarDuracao(curso.duracaoMinutos)}</strong>
        </div>

        <div style="display: flex; gap: 8px;">
            
            <button class="btn-icon-grade btn-abrir-grade" data-id="${curso.id}" title="Ver Grade Curricular">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
                <span class="grade-count">${qtdAulas}</span>
            </button>

            <button class="btn-link" onclick="window.open('${curso.link}', '_blank')" ${!podeAcessar ? "disabled" : ""}>
               ${podeAcessar ? "Acessar" : "Em breve"}
            </button>
        </div>
      </footer>
    `;

    container.appendChild(card);
  });

  // --- Listeners ---
  document.querySelectorAll('.btn-abrir-grade').forEach(btn => {
      btn.addEventListener('click', (e) => {
          e.stopPropagation(); 
          const id = e.currentTarget.dataset.id;
          if(typeof abrirModalAulas === 'function') {
              abrirModalAulas(id); 
          }
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
  const trilha = document.getElementById("filtro-trilha").value;
  const sub = document.getElementById("filtro-subtrilha").value;
  const status = document.getElementById("filtro-status").value;
  const busca = normalizarTexto(document.getElementById("filtro-busca").value);

  const filtrados = cursos.filter((c) => {
    if (trilha && c.trilha !== trilha) return false;
    if (sub && c.subtrilha !== sub) return false;
    if (status && (c.status || "").toUpperCase() !== status.toUpperCase()) return false;
    if (busca) {
      const texto = normalizarTexto(c.nome) + " " + normalizarTexto(c.descricao);
      if (!texto.includes(busca)) return false;
    }
    return true;
  });
  renderCursos(filtrados);
  atualizarResumo(filtrados);
}

// --- Inicialização ---
// --- Inicialização ---
async function inicializarApp() {
  console.log("🚀 Iniciando App...");
  try {
    const dados = await DBHandler.listarTreinamentos();
    console.log("📥 Dados brutos do banco:", dados);
    
    // Mapeamento com CÁLCULO DINÂMICO
    cursos = dados.map(item => {
      // 1. Verifica se existem aulas, senão é array vazio
      const listaAulas = item.aulas || [];

      // 2. Calcula o total de aulas
      const qtdCalculada = listaAulas.length;

      // 3. Calcula a duração total somando os minutos de cada aula
      const duracaoCalculada = listaAulas.reduce((acc, aula) => {
        return acc + (Number(aula.duracao_minutos) || 0);
      }, 0);

      return {
        ...item,
        // Agora usamos os valores calculados
        quantidadeAulas: qtdCalculada, 
        duracaoMinutos: duracaoCalculada,
        
        // Mantém o fallback para trilha
        trilha: item.trilha || "Geral",
        subtrilha: item.subtrilha || ""
      };
    });

    preencherOpcoesTrilha();
    aplicarFiltros(); // Isso atualiza o resumo e os cards
  } catch (e) {
    console.error("❌ Falha na inicialização:", e);
  }
}

// Verifica se o DOM já foi carregado para evitar perder o evento
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarApp);
} else {
    // Se o script carregou depois do HTML estar pronto, inicia direto
    inicializarApp();
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


/* =============================================================
   MÓDULO YOUTUBE SYNC
   ============================================================= */

const modalYouTube = document.getElementById("modal-youtube");
const btnAbrirYoutube = document.getElementById("btn-modal-youtube");
const btnFecharModal = document.querySelector(".btn-close-modal");
const selectCursoYT = document.getElementById("yt-curso-selecionado");
const inputApiKey = document.getElementById("yt-api-key");
const inputPlaylistId = document.getElementById("yt-playlist-id");
const btnBuscarVideos = document.getElementById("btn-buscar-videos");
const btnSalvarSync = document.getElementById("btn-salvar-sincronizacao");
const areaPreview = document.getElementById("yt-preview-area");
const tbodyPreview = document.getElementById("yt-lista-videos");

let videosEncontrados = []; // Armazena temporariamente os vídeos buscados

// 1. Abrir Modal e Carregar Cursos
if(btnAbrirYoutube) {
    btnAbrirYoutube.addEventListener("click", () => {
        modalYouTube.style.display = "flex";
        carregarCursosNoSelect();
        
        // Tenta recuperar API Key salva anteriormente
        const savedKey = localStorage.getItem("yt_api_key");
        if(savedKey) inputApiKey.value = savedKey;
    });
}

// 2. Fechar Modal
if(btnFecharModal) {
    btnFecharModal.addEventListener("click", () => {
        modalYouTube.style.display = "none";
        videosEncontrados = [];
        areaPreview.style.display = "none";
    });
}

// 3. Popular Combo de Cursos
function carregarCursosNoSelect() {
    selectCursoYT.innerHTML = '<option value="">Selecione um curso...</option>';
    // Usa a variável global 'cursos' que já está carregada na memória
    cursos.forEach(c => {
        const option = document.createElement("option");
        option.value = c.id;
        option.textContent = `${c.trilha} - ${c.nome}`;
        // Se o curso tiver link, tenta extrair o ID da playlist pra ajudar
        if(c.link && c.link.includes("list=")) {
            option.dataset.playlist = c.link.split("list=")[1];
        }
        selectCursoYT.appendChild(option);
    });
}

// Ao selecionar curso, preenche o ID da playlist se tiver
selectCursoYT.addEventListener("change", (e) => {
    const selectedOpt = selectCursoYT.options[selectCursoYT.selectedIndex];
    if(selectedOpt.dataset.playlist) {
        inputPlaylistId.value = selectedOpt.dataset.playlist;
    }
});

// 4. Buscar Vídeos (Lógica portada do seu HTML)
btnBuscarVideos.addEventListener("click", async () => {
    const apiKey = inputApiKey.value.trim();
    let playlistId = inputPlaylistId.value.trim();
    const statusMsg = document.getElementById("yt-status-msg");

    if (!apiKey || !playlistId) {
        alert("Por favor, preencha a API Key e o ID da Playlist.");
        return;
    }

    // Limpa URL se o usuário colou o link inteiro
    if(playlistId.includes("list=")) {
        playlistId = playlistId.split("list=")[1].split("&")[0];
    }

    // Salva API Key para facilitar próxima vez
    localStorage.setItem("yt_api_key", apiKey);

    statusMsg.textContent = "⏳ Buscando dados no YouTube...";
    statusMsg.style.color = "blue";
    btnBuscarVideos.disabled = true;
    tbodyPreview.innerHTML = "";
    
    try {
        let videos = [];
        let nextPageToken = "";
        
        // Loop para pegar paginação (caso tenha mais de 50 vídeos)
        do {
            const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}&pageToken=${nextPageToken}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) throw new Error(data.error.message);

            // Coleta IDs dos vídeos para buscar duração
            const videoIds = data.items.map(item => item.contentDetails.videoId).join(",");
            
            // Busca detalhes (Duração)
            const urlDetails = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${apiKey}`;
            const respDetails = await fetch(urlDetails);
            const dataDetails = await respDetails.json();

            // Mescla informações
            const pageVideos = dataDetails.items.map(item => ({
                titulo: item.snippet.title,
                link_video: `https://www.youtube.com/watch?v=${item.id}`,
                descricao: item.snippet.description ? item.snippet.description.substring(0, 200) + "..." : "",
                duracao_minutos: parseIsoDuration(item.contentDetails.duration),
                ordem: 0 // Será ajustado no loop final
            }));

            videos = [...videos, ...pageVideos];
            nextPageToken = data.nextPageToken;

        } while (nextPageToken);

        videosEncontrados = videos; // Guarda na variável global
        renderPreview(videos);
        
        statusMsg.textContent = `✅ ${videos.length} vídeos encontrados!`;
        statusMsg.style.color = "green";
        btnSalvarSync.disabled = false;
        areaPreview.style.display = "block";

    } catch (error) {
        console.error(error);
        statusMsg.textContent = "❌ Erro: " + error.message;
        statusMsg.style.color = "red";
    } finally {
        btnBuscarVideos.disabled = false;
    }
});

// 5. Renderizar Preview
function renderPreview(lista) {
    document.getElementById("yt-total-videos").textContent = lista.length;
    let html = "";
    lista.forEach((v, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${v.titulo}</td>
                <td>${v.duracao_minutos} min</td>
                <td><a href="${v.link_video}" target="_blank">Link</a></td>
            </tr>
        `;
    });
    tbodyPreview.innerHTML = html;
}

// 6. Converter ISO 8601 (PT1H2M) para Minutos Inteiros
function parseIsoDuration(iso) {
    const match = iso.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    // Segundos ignorados para cálculo de aulas, mas arredondamos se > 30s se quiser
    return (hours * 60) + minutes;
}

// 7. Salvar no Banco
btnSalvarSync.addEventListener("click", async () => {
    const cursoId = selectCursoYT.value;
    if(!cursoId) return;

    const statusMsg = document.getElementById("yt-status-msg");
    statusMsg.textContent = "💾 Salvando no banco...";
    btnSalvarSync.disabled = true;

    try {
        // Prepara o array final com o ID do curso e Ordem sequencial
        const payload = videosEncontrados.map((v, index) => ({
            treinamento_id: cursoId,
            titulo: v.titulo,
            descricao: v.descricao,
            link_video: v.link_video,
            duracao_minutos: v.duracao_minutos,
            ordem: index + 1
        }));

        await DBHandler.sincronizarAulasPorPlaylist(cursoId, payload);

        alert("Sucesso! Aulas atualizadas.");
        modalYouTube.style.display = "none";
        
        // Recarrega a aplicação para atualizar os cards e totais
        inicializarApp(); 

    } catch (error) {
        console.error(error);
        statusMsg.textContent = "Erro ao salvar: " + error.message;
        alert("Erro ao salvar no banco. Veja o console.");
    } finally {
        btnSalvarSync.disabled = false;
    }
});


/* =============================================================
   MODAL DE VISUALIZAÇÃO DE AULAS
   ============================================================= */
const modalAulas = document.getElementById("modal-lista-aulas");
const listaAulasUl = document.getElementById("lista-aulas-container");

// Fechar modal
document.querySelectorAll(".btn-close-modal-aulas").forEach(btn => {
    btn.addEventListener("click", () => {
        modalAulas.style.display = "none";
    });
});

function abrirModalAulas(id) {
    // 1. Acha o curso na memória
    const curso = cursos.find(c => c.id == id);
    if (!curso) return;

    // 2. Preenche Header
    document.getElementById("modal-titulo-curso").textContent = curso.nome;
    document.getElementById("modal-qtd-aulas").textContent = `${curso.quantidadeAulas} aulas`;
    document.getElementById("modal-tempo-total").textContent = formatarDuracao(curso.duracaoMinutos);

    // 3. Renderiza Lista
    listaAulasUl.innerHTML = "";
    
    // Ordena por ordem (caso venha bagunçado do banco)
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
                    <span class="aula-tempo">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        ${aula.duracao_minutos} min
                    </span>
                </div>
                ${aula.link_video ? `
                <a href="${aula.link_video}" target="_blank" class="btn-ver-video" title="Assistir Aula">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </a>` : ''}
            `;
            listaAulasUl.appendChild(li);
        });
    }

    // 4. Mostra Modal
    modalAulas.style.display = "flex";
}

/* ==========================================================================
   AJUSTE DE LAYOUT: Botão Acessar virou Ícone (Economia de Espaço)
   ========================================================================== */

/* Garante que o rodapé nunca quebre a linha */
.card-footer {
  flex-wrap: nowrap !important; 
  gap: 8px; /* Espaço mínimo entre tempo e botões */
}

/* O tempo não pode encolher, mas se for muito longo, usa reticências */
.pill-duracao {
  flex-shrink: 0; 
  white-space: nowrap;
}

/* Novo estilo para o botão "Acessar" quando for ícone */
.btn-icon-acessar {
  background: var(--accent);
  color: #ffffff;
  border: none;
  
  /* Tamanho fixo para ser um círculo perfeito */
  width: 36px; 
  height: 36px;
  border-radius: 50%;
  
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  
  transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
}

.btn-icon-acessar:hover {
  background: var(--accent-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(37, 99, 235, 0.3);
}

/* Mantém o estilo "Em breve" como texto (pílula cinza), pois ícone seria confuso */
.btn-disabled-text {
  background: #e2e8f0;
  color: #94a3b8;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0 12px;
  height: 36px;
  border-radius: 999px;
  border: none;
  cursor: default;
  white-space: nowrap;
}
