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

  // 1. Ordenação (Trilha > Subtrilha > Ordem > Nome)
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
    // --- Cabeçalhos (Agrupamento visual) ---
    const trilhaDoCurso = curso.trilha || "Geral";
    
    // Header da Trilha Principal
    if (trilhaDoCurso !== trilhaAtual) {
      trilhaAtual = trilhaDoCurso;
      subAtual = null; 
      const h = document.createElement("div");
      h.className = "header-trilha";
      h.innerHTML = `<span>${trilhaAtual}</span><small>Trilha principal</small>`;
      container.appendChild(h);
    }
    
    // Header da Subtrilha
    if (curso.subtrilha && curso.subtrilha !== subAtual) {
      subAtual = curso.subtrilha;
      const h = document.createElement("div");
      h.className = "header-subtrilha";
      h.innerHTML = `<span>${subAtual}</span><small>Subtrilha</small>`;
      container.appendChild(h);
    }

    // --- Preparação dos Dados ---
    const qtdAulas = Number(curso.quantidadeAulas) || 0;
    const temLink = Boolean(curso.link && curso.link.trim());
    const podeAcessar = temLink; 
    
    const statusClass = (curso.status || "")
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-");

    // === NOVO: Verifica se está oculto ===
    // Se for false, é oculto. Se for null/undefined/true, exibe.
    const isOculto = curso.exibir_catalogo === false;

    // --- HTML do Card ---
    const card = document.createElement("article");
    card.className = "card-curso";
    
    // Adiciona classe visual se for oculto (CSS .is-hidden)
    if (isOculto) card.classList.add("is-hidden");

    card.setAttribute("data-status-text", curso.status || "Indefinido");
    if(statusClass) card.classList.add(`status-${statusClass}`);

    // Lógica do Botão de Acesso (Ícone Seta ou Texto 'Em breve')
    let botaoAcessoHtml = "";
    if (podeAcessar) {
        botaoAcessoHtml = `
            <button class="btn-icon-acessar" onclick="window.open('${curso.link}', '_blank')" title="Acessar Curso">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
            </button>
        `;
    } else {
        botaoAcessoHtml = `
            <button class="btn-disabled-text" disabled>
               Em breve
            </button>
        `;
    }

    // Template do Card
    card.innerHTML = `
      <header class="card-header">
        <div class="card-trilhas">
           ${curso.subtrilha ? `<span class="badge-subtrilha">${curso.subtrilha}</span>` : `<span class="badge-trilha">${curso.trilha || 'Geral'}</span>`}
           
           ${isOculto ? '<span class="badge-oculto">🔒 OCULTO</span>' : ''}
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
            
            <button class="btn-icon-editar" data-id="${curso.id}" title="Editar Cadastro">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>

            ${botaoAcessoHtml}
        </div>
      </footer>
    `;

    container.appendChild(card);
  });

  // --- LISTENERS (Eventos de Clique) ---

  // A) Botão Grade (Modal de Aulas)
  document.querySelectorAll('.btn-abrir-grade').forEach(btn => {
      btn.addEventListener('click', (e) => {
          e.stopPropagation(); 
          const id = e.currentTarget.dataset.id;
          if(typeof abrirModalAulas === 'function') {
              abrirModalAulas(id); 
          }
      });
  });

  // B) Botão Editar (Modal de Manutenção)
  document.querySelectorAll('.btn-icon-editar').forEach(btn => {
      btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = e.currentTarget.dataset.id;
          if(typeof editarCurso === 'function') {
              editarCurso(id);
          } else {
              console.error("Função editarCurso não encontrada.");
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
  const termo = normalizarTexto(document.getElementById("filtro-busca").value);
  const trilhaSel = document.getElementById("filtro-trilha").value;
  const subSel = document.getElementById("filtro-subtrilha").value;
  const statusSel = document.getElementById("filtro-status").value;
  
  // NOVO: Lê o checkbox "Mostrar Ocultos" da toolbar
  const elVerOcultos = document.getElementById("filtro-ver-ocultos");
  const verOcultos = elVerOcultos ? elVerOcultos.checked : false;

  const filtrados = cursos.filter((c) => {
    // --- REGRA DE OURO (Ocultação) ---
    // Se curso.exibir_catalogo for false E o usuário não marcou "ver ocultos" -> Esconde.
    if (c.exibir_catalogo === false && !verOcultos) return false;

    // Filtros normais
    const matchBusca = normalizarTexto(c.nome).includes(termo) || 
                       normalizarTexto(c.descricao).includes(termo);
    const matchTrilha = !trilhaSel || c.trilha === trilhaSel;
    const matchSub = !subSel || c.subtrilha === subSel;
    const matchStatus = !statusSel || (c.status || "").toUpperCase() === statusSel;

    return matchBusca && matchTrilha && matchSub && matchStatus;
  });

  renderCursos(filtrados);
  atualizarResumo(filtrados);
}

// Listener para o checkbox da Toolbar (cole logo abaixo da função)
const checkOcultos = document.getElementById("filtro-ver-ocultos");
if(checkOcultos) {
    checkOcultos.addEventListener("change", aplicarFiltros);
}




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

/* =============================================================
   MÓDULO DE MANUTENÇÃO (CRUD CURSOS)
   ============================================================= */

const modalCurso = document.getElementById("modal-curso");
const formCurso = document.getElementById("form-curso");
const btnNovoCurso = document.getElementById("btn-novo-curso");
const btnSalvarCurso = document.getElementById("btn-salvar-curso");
const btnExcluirCurso = document.getElementById("btn-excluir-curso");
const areaDelete = document.getElementById("area-delete");
// 1. Abrir Modal para NOVO curso
if(btnNovoCurso) {
    btnNovoCurso.addEventListener("click", () => {
        formCurso.reset();
        document.getElementById("curso-id").value = ""; 
        document.getElementById("modal-curso-titulo").textContent = "Novo Curso";
        areaDelete.style.display = "none";
        
        // PADRÃO: Novo curso já nasce Exibido (Switch Ligado)
        document.getElementById("curso-exibir").checked = true;

        // NOVA LÓGICA DE TRILHA:
        // Carrega o select com as trilhas existentes e reseta para o modo lista
        popularSelectTrilhas("");

        modalCurso.style.display = "flex";
    });
}

// 2. Abrir Modal para EDITAR curso
function editarCurso(id) {
    const curso = cursos.find(c => c.id == id);
    if (!curso) return;

    document.getElementById("curso-id").value = curso.id;
    document.getElementById("curso-nome").value = curso.nome;
    document.getElementById("curso-status").value = (curso.status || "DISPONÍVEL").toUpperCase();
    
    // OBS: O campo trilha agora é preenchido pela função auxiliar abaixo, 
    // não mais diretamente pelo value do input antigo.
    
    document.getElementById("curso-subtrilha").value = curso.subtrilha || "";
    document.getElementById("curso-link").value = curso.link || "";
    document.getElementById("curso-descricao").value = curso.descricao || "";

    // LÓGICA DO SWITCH:
    // Se for false, desmarca. Se for null/undefined/true, marca.
    document.getElementById("curso-exibir").checked = (curso.exibir_catalogo !== false);

    document.getElementById("modal-curso-titulo").textContent = "Editar Curso";
    areaDelete.style.display = "block";
    
    // NOVA LÓGICA DE TRILHA:
    // Identifica se a trilha do curso existe na lista (Select) 
    // ou se é uma nova (Input Texto) e ajusta a tela automaticamente.
    popularSelectTrilhas(curso.trilha);

    modalCurso.style.display = "flex";
}

// 3. Salvar (Create/Update)
// C) Botão SALVAR
btnSalvarCurso.addEventListener("click", async () => {
    const id = document.getElementById("curso-id").value;
    const nome = document.getElementById("curso-nome").value;

    // === LÓGICA INTELIGENTE DA TRILHA (Híbrido: Select ou Input) ===
    let trilhaValor = "";
    // Verifica se o modo de input textual está ativo (definido na função alternarModoTrilha)
    const isInputMode = document.getElementById("curso-trilha-input").dataset.mode === "active";

    if (isInputMode) {
        // Se o usuário clicou no "+", pega o que ele digitou
        trilhaValor = document.getElementById("curso-trilha-input").value.trim();
        if(!trilhaValor) { alert("Digite o nome da nova trilha."); return; }
    } else {
        // Se não, pega do select (lista existente)
        trilhaValor = document.getElementById("curso-trilha-select").value || "Geral";
    }
    // ===============================================================

    if(!nome) { alert("O nome do curso é obrigatório."); return; }

    const payload = {
        // --- REGRA DE NEGÓCIO: Categoria = Trilha ---
        categoria: trilhaValor, 
        // --------------------------------------------

        nome: nome,
        status: document.getElementById("curso-status").value,
        
        trilha: trilhaValor, // Usa a variável decidida acima
        
        subtrilha: document.getElementById("curso-subtrilha").value,
        link: document.getElementById("curso-link").value,
        descricao: document.getElementById("curso-descricao").value,
        
        // Switch de Exibição
        exibir_catalogo: document.getElementById("curso-exibir").checked
    };

    if(id) payload.id = id; 

    btnSalvarCurso.innerText = "Salvando...";
    btnSalvarCurso.disabled = true;

    try {
        await DBHandler.salvarCurso(payload);
        modalCurso.style.display = "none";
        
        // Recarrega a aplicação para atualizar a lista, os filtros e o select de trilhas
        inicializarApp(); 
        
        alert("Curso salvo com sucesso!");
    } catch (e) {
        console.error(e);
        alert("Erro ao salvar: " + e.message);
    } finally {
        btnSalvarCurso.innerText = "Salvar Alterações";
        btnSalvarCurso.disabled = false;
    }
});
// 4. Excluir
btnExcluirCurso.addEventListener("click", async () => {
    const id = document.getElementById("curso-id").value;
    if(!id) return;

    if(confirm("Tem certeza? Isso apagará o curso e TODO o histórico de aulas vinculado a ele.")) {
        try {
            await DBHandler.excluirCurso(id);
            modalCurso.style.display = "none";
            inicializarApp();
        } catch (e) {
            alert("Erro ao excluir: " + e.message);
        }
    }
});

// Fechar Modal
document.querySelectorAll(".btn-close-modal-curso").forEach(btn => {
    btn.addEventListener("click", () => modalCurso.style.display = "none");
});

// Auxiliar: Preenche o <datalist> para autocomplete de trilhas
function atualizarDatalistTrilhas() {
    const datalist = document.getElementById("lista-trilhas");
    datalist.innerHTML = "";
    // Pega trilhas únicas dos cursos existentes
    const trilhasUnicas = [...new Set(cursos.map(c => c.trilha))];
    trilhasUnicas.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t;
        datalist.appendChild(opt);
    });
}

// Função auxiliar para popular o Select de Trilhas
function popularSelectTrilhas(valorSelecionado = "") {
    const select = document.getElementById("curso-trilha-select");
    select.innerHTML = "";

    // 1. Pega todas as trilhas únicas existentes
    const trilhasUnicas = [...new Set(cursos.map(c => c.trilha || "Geral"))].sort();

    // 2. Preenche o select
    trilhasUnicas.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        select.appendChild(opt);
    });

    // 3. Seleciona o valor atual (se existir na lista)
    if (valorSelecionado && trilhasUnicas.includes(valorSelecionado)) {
        select.value = valorSelecionado;
        alternarModoTrilha("select"); // Garante que mostre o select
    } else if (valorSelecionado) {
        // Se o valor não existe na lista (ex: edição de um nome exótico), força modo texto
        document.getElementById("curso-trilha-input").value = valorSelecionado;
        alternarModoTrilha("input");
    } else {
        alternarModoTrilha("select");
    }
}

// Alterna visualmente entre Select e Input
function alternarModoTrilha(modo) {
    const boxSelect = document.getElementById("box-select-trilha");
    const inputTexto = document.getElementById("curso-trilha-input");
    const btnIcon = document.getElementById("btn-toggle-trilha");

    if (modo === "input") {
        boxSelect.style.display = "none";
        inputTexto.style.display = "block";
        inputTexto.focus();
        // Muda ícone para "Lista" (voltar)
        btnIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>`;
        btnIcon.title = "Selecionar existente";
        inputTexto.dataset.mode = "active"; // Marcador
    } else {
        boxSelect.style.display = "block";
        inputTexto.style.display = "none";
        // Muda ícone para "Mais" (criar novo)
        btnIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>`;
        btnIcon.title = "Criar nova trilha";
        inputTexto.dataset.mode = "inactive";
    }
}

// Listener do Botão de Alternância
document.getElementById("btn-toggle-trilha").addEventListener("click", () => {
    const inputTexto = document.getElementById("curso-trilha-input");
    const isInputMode = inputTexto.style.display === "block";
    alternarModoTrilha(isInputMode ? "select" : "input");
});


/* =============================================================
   MÓDULO SYNC YOUTUBE RÁPIDO (DENTRO DA EDIÇÃO)
   ============================================================= */

const YOUTUBE_API_KEY_FIXA = "AIzaSyAJyCenPXn41mbjieW6wTzeaFPYFX5Xrzo";
const btnSyncRapido = document.getElementById("btn-sync-youtube-rapido");

if(btnSyncRapido) {
    btnSyncRapido.addEventListener("click", async () => {
        const cursoId = document.getElementById("curso-id").value;
        const linkUrl = document.getElementById("curso-link").value;
        
        // 1. Validações Iniciais
        if (!cursoId) {
            alert("⚠️ Por favor, salve o curso pela primeira vez antes de sincronizar as aulas.");
            return;
        }

        if (!linkUrl || !linkUrl.includes("list=")) {
            alert("⚠️ O link informado não parece ser uma Playlist do YouTube válida (deve conter 'list=').");
            return;
        }

        // 2. Extrai o ID da Playlist
        const playlistId = linkUrl.split("list=")[1].split("&")[0];

        // 3. Confirmação de Segurança
        if(!confirm("⚠️ ATENÇÃO:\n\nIsso irá APAGAR todas as aulas atuais deste curso e cadastrar as aulas da Playlist informada.\n\nDeseja continuar?")) {
            return;
        }

        // 4. Feedback Visual (Loading)
        const textoOriginal = btnSyncRapido.innerHTML;
        btnSyncRapido.innerHTML = `⏳ Buscando...`;
        btnSyncRapido.disabled = true;

        try {
            let videos = [];
            let nextPageToken = "";
            
            // --- Loop de Busca (Paginação do YouTube) ---
            do {
                const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${YOUTUBE_API_KEY_FIXA}&pageToken=${nextPageToken}`;
                const response = await fetch(url);
                const data = await response.json();

                if (data.error) throw new Error("YouTube diz: " + data.error.message);

                // Coleta IDs para buscar duração exata
                const videoIds = data.items.map(item => item.contentDetails.videoId).join(",");
                
                // Busca detalhes (Duração)
                const urlDetails = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY_FIXA}`;
                const respDetails = await fetch(urlDetails);
                const dataDetails = await respDetails.json();

                // Monta array de objetos
                const pageVideos = dataDetails.items.map(item => ({
                    titulo: item.snippet.title,
                    link_video: `https://www.youtube.com/watch?v=${item.id}`,
                    descricao: item.snippet.description ? item.snippet.description.substring(0, 200) + "..." : "",
                    duracao_minutos: parseIsoDuration(item.contentDetails.duration),
                    ordem: 0 
                }));

                videos = [...videos, ...pageVideos];
                nextPageToken = data.nextPageToken || ""; // Garante string vazia se undefined

            } while (nextPageToken);

            // --- 5. Salvar no Banco ---
            if(videos.length === 0) {
                throw new Error("Nenhum vídeo encontrado nesta playlist.");
            }

            btnSyncRapido.innerHTML = `💾 Salvando...`;

            // Prepara payload final
            const payload = videos.map((v, index) => ({
                treinamento_id: cursoId,
                titulo: v.titulo,
                descricao: v.descricao,
                link_video: v.link_video,
                duracao_minutos: v.duracao_minutos,
                ordem: index + 1
            }));

            // Chama o DB Handler existente
            await DBHandler.sincronizarAulasPorPlaylist(cursoId, payload);

            // Sucesso!
            alert(`✅ Sucesso! ${videos.length} aulas foram importadas da playlist.`);
            
            // Atualiza a aplicação (recalcula totais e cards)
            inicializarApp();

        } catch (error) {
            console.error(error);
            alert("❌ Erro ao sincronizar: " + error.message);
        } finally {
            // Restaura botão
            btnSyncRapido.innerHTML = textoOriginal;
            btnSyncRapido.disabled = false;
        }
    });
}

// Função Auxiliar de Tempo (Caso não tenha sido declarada antes)
// Se já existir no seu arquivo, pode remover esta duplicata.
function parseIsoDuration(iso) {
    const match = iso.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if(!match) return 0;
    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    return (hours * 60) + minutes;
}


