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

