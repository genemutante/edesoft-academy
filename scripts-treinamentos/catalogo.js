/* =============================================================
   catalogo.JS - Versão Final (Correção de Eventos Duplicados)
   ============================================================= */

import { DBHandler } from "../bd-treinamentos/db-handler.js";

// =============================================================
// 1. VARIÁVEIS GLOBAIS
// =============================================================
const YOUTUBE_API_KEY_FIXA = "AIzaSyAJyCenPXn41mbjieW6wTzeaFPYFX5Xrzo";

// =======================
// ÍCONES (SVG inline) — pacote premium
// =======================
const ICONS = {
  // editar (pencil)
  edit: `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M16.862 3.487a2.1 2.1 0 0 1 2.97 2.97l-10.6 10.6-4.232.706.706-4.232 10.6-10.6Z"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M19 7 17 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  // acessar (external link)
  open: `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14 3h7v7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M10 14 21 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M21 14v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  // grade/aulas (list)
  grade: `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 6h13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M8 12h13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M8 18h13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M3 6h.01M3 12h.01M3 18h.01" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  </svg>`,

  // oculto/visibilidade (eye off)
  eyeOff: `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 3l18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c6 0 10 8 10 8a18.5 18.5 0 0 1-3.33 4.67"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M6.18 6.18C3.7 8.06 2 12 2 12s4 8 10 8a10.8 10.8 0 0 0 4.12-.8"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  // visível (eye)
  eye: `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8Z"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  // youtube (play in circle)
  youtube: `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z"
      fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M10 8.8v6.4a.9.9 0 0 0 1.38.75l4.8-3.2a.9.9 0 0 0 0-1.5l-4.8-3.2A.9.9 0 0 0 10 8.8Z"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
  </svg>`,

  // manual (document)
  manual: `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 3h8l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <path d="M15 3v5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <path d="M8 13h8M8 17h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`
};



let cursos = [];
let videosPendentes = []; 
let houveAlteracao = false;

// Elementos DOM
let modalCurso, formCurso, areaDelete, btnSalvarCurso;
let modalAulas, listaAulasUl;
let modalYouTube, btnSyncRapido, selectCursoYT, inputPlaylistId, inputApiKey;
let btnNovoCurso, btnLimparFiltros;

// =============================================================
// 2. UTILITÁRIOS
// =============================================================

function formatarDuracao(minutos) {
    if (!minutos || isNaN(minutos) || minutos === 0) return "0 min";
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    if (h > 0 && m > 0) return `${h}h ${m}min`;
    if (h > 0) return `${h}h`;
    return `${m} min`;
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

function limparTituloVideo(titulo) {
    if (!titulo) return "Aula Sem Título";
    return titulo.replace(/^(\d+[\s\-\.]+|aula\s+\d+[\s\-\.]+|video\s+\d+[\s\-\.]+)/i, '').trim();
}

// =============================================================
// 3. INICIALIZAÇÃO E CARREGAMENTO
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
    
    btnNovoCurso = document.getElementById("btn-novo-curso");
    btnLimparFiltros = document.getElementById("btn-limpar-filtros");
}

/* MUDANÇA CRÍTICA:
   Esta função agora só roda UMA VEZ no carregamento da página.
   Ela não é mais chamada dentro de inicializarApp().
*/
function setupListenersUnicos() {
    console.log("🔧 Configurando botões (Execução Única)...");
    
    const addEvt = (id, evt, fn) => { const el = document.getElementById(id); if(el) el.addEventListener(evt, fn); };

    // --- FILTROS ---
    addEvt("filtro-trilha", "change", (e) => { preencherOpcoesSubtrilha(e.target.value); aplicarFiltros(); });
    addEvt("filtro-subtrilha", "change", aplicarFiltros);
    addEvt("filtro-status", "change", aplicarFiltros);
    addEvt("filtro-busca", "input", aplicarFiltros);
    addEvt("filtro-ver-ocultos", "change", aplicarFiltros);
    
    addEvt("btn-limpar-filtros", "click", () => {
        document.getElementById("filtro-busca").value = "";
        document.getElementById("filtro-trilha").value = "";
        document.getElementById("filtro-status").value = "";
        preencherOpcoesSubtrilha("");
        aplicarFiltros();
    });

    // --- FECHAR MODAIS ---
    // Fecha visualização de aulas
    document.querySelectorAll(".btn-close-modal-aulas").forEach(btn => {
        btn.addEventListener("click", () => { if(modalAulas) modalAulas.style.display = "none"; });
    });

    // Fecha edição de curso (X e Cancelar)
    document.querySelectorAll(".btn-close-modal-curso, .modal-footer .btn-secondary-full").forEach(btn => {
        btn.addEventListener("click", () => {
            resetarModalManutencao();
            if(modalCurso) modalCurso.style.display = "none";
        });
    });

    // --- AÇÕES DO FORMULÁRIO ---
    addEvt("btn-novo-curso", "click", () => {
        resetarModalManutencao();
        document.getElementById("modal-curso-titulo").textContent = "Novo Curso";
        document.getElementById("curso-exibir").checked = true;
        popularSelectTrilhas("");
        if(modalCurso) modalCurso.style.display = "flex";
    });

    addEvt("btn-excluir-curso", "click", async () => {
        const id = document.getElementById("curso-id").value;
        if(id && confirm("ATENÇÃO: Isso apagará o curso permanentemente.\nContinuar?")) {
            try { await DBHandler.excluirCurso(id); modalCurso.style.display = "none"; inicializarApp(); } 
            catch (e) { alert("Erro: " + e.message); }
        }
    });

    addEvt("btn-toggle-trilha", "click", () => {
        const input = document.getElementById("curso-trilha-input");
        const isInput = input.style.display === "block";
        alternarModoTrilha(isInput ? "select" : "input");
    });

    // --- ADICIONAR MANUAL ---
    addEvt("btn-add-manual", "click", () => {
        const t = document.getElementById("manual-titulo").value.trim();
        const l = document.getElementById("manual-link").value.trim();
        const m = parseInt(document.getElementById("manual-minutos").value) || 0;
        if(!t) return alert("Título obrigatório");
        
        videosPendentes.push({ titulo: t, link_video: l, duracao_minutos: m, ordem: videosPendentes.length + 1 });
        renderizarListaManual(); marcarAlteracao(); atualizarMetadadosGlobais();
        // --- CORREÇÃO AQUI: Limpar todos os campos ---
        document.getElementById("manual-titulo").value = "";
        document.getElementById("manual-link").value = "";     // Adicionado
        document.getElementById("manual-minutos").value = "";  // Adicionado
        document.getElementById("manual-titulo").focus();      // Opcional: foca no título para a próxima
    });

    // --- LIMPAR AULAS (AQUI ESTAVA O PROBLEMA DO LOOP) ---
    addEvt("btn-limpar-aulas", "click", () => {
        if(confirm("Remover todas as aulas da lista?")) {
            videosPendentes = []; 
            renderizarListaManual(); 
            marcarAlteracao(); 
            atualizarMetadadosGlobais();
            
            // Se limpou tudo, reseta o status de sync
            const elData = document.getElementById("meta-data-sync");
            if(elData) { elData.textContent = "-"; elData.style.color = ""; }
        }
    });

    // --- DETECTAR MUDANÇAS NO FORM ---
    if(formCurso) {
        formCurso.querySelectorAll("input, select, textarea").forEach(el => {
            el.addEventListener("input", marcarAlteracao);
            el.addEventListener("change", marcarAlteracao);
        });
    }

    // --- DETECTAR LIMPEZA DO LINK YOUTUBE ---
    const inputLink = document.getElementById("curso-link");
    if (inputLink) {
        inputLink.addEventListener("input", (e) => {
            // Se o usuário apagar o link, limpamos a lista MAS SEM ALERTAR (para não irritar)
            // Se ele quiser confirmar, ele usa o botão "Limpar Tudo"
            if (e.target.value.trim() === "" && videosPendentes.length > 0) {
                 // Opcional: Se quiser limpar automático descomente abaixo
                 // videosPendentes = []; 
                 // renderizarListaManual(); 
                 // atualizarMetadadosGlobais();
                 marcarAlteracao();
            }
        });
    }

    // --- SALVAR CURSO ---
    if(btnSalvarCurso) btnSalvarCurso.onclick = async () => {
        const id = document.getElementById("curso-id").value;
        const nome = document.getElementById("curso-nome").value;
        const inputTrilha = document.getElementById("curso-trilha-input");
        const trilha = inputTrilha.dataset.mode === "active" ? inputTrilha.value.trim() : document.getElementById("curso-trilha-select").value;
        
        if(!nome || !trilha) return alert("Preencha Nome e Trilha.");

        const payload = {
            id: id || undefined, nome, trilha,
            categoria: trilha,
            subtrilha: document.getElementById("curso-subtrilha").value,
            link: document.getElementById("curso-link").value,
            status: document.getElementById("curso-status").value,
            descricao: document.getElementById("curso-descricao").value,
            exibir_catalogo: document.getElementById("curso-exibir").checked
        };

        if(houveAlteracao && videosPendentes.length > 0) payload.ultima_sincronizacao = new Date().toISOString();
        
        btnSalvarCurso.disabled = true; btnSalvarCurso.innerText = "Gravando...";
        try {
            await DBHandler.salvarCursoCompleto(payload, videosPendentes);
            modalCurso.style.display = "none";
            resetarModalManutencao();
            inicializarApp(); // Recarrega dados, mas NÃO recarrega listeners
        } catch(e) { 
            alert(e.message); 
            btnSalvarCurso.disabled = false; btnSalvarCurso.innerText = "Salvar Alterações";
        }
    };

    // --- SYNC YOUTUBE ---
    if(btnSyncRapido) btnSyncRapido.onclick = async () => {
        const link = document.getElementById("curso-link").value.trim();
        const pid = link.includes("list=") ? link.split("list=")[1].split("&")[0] : link;
        if(!pid || pid.length < 5) return alert("Playlist inválida.");

        const textoOriginal = btnSyncRapido.innerHTML;
        btnSyncRapido.innerHTML = `⏳ Buscando...`;
        btnSyncRapido.disabled = true;

        const backup = [...videosPendentes];
        videosPendentes = []; // Limpa para evitar duplicidade

        try {
            let fetched = [];
            let token = "";
            do {
                const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${pid}&key=${YOUTUBE_API_KEY_FIXA}&pageToken=${token}`;
                const res = await fetch(url);
                const data = await res.json();
                
                if(data.error) throw new Error(data.error.message);
                if(!data.items || data.items.length === 0) break;

                const ids = data.items.map(i => i.contentDetails.videoId).join(",");
                if(!ids) { token = data.nextPageToken || ""; continue; }

                const resD = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${ids}&key=${YOUTUBE_API_KEY_FIXA}`);
                const dataD = await resD.json();

                fetched.push(...dataD.items.map(i => ({
                    titulo: limparTituloVideo(i.snippet.title),
                    link_video: `https://www.youtube.com/watch?v=${i.id}`,
                    duracao_minutos: parseIsoDuration(i.contentDetails.duration),
                    ordem: 0
                })));
                token = data.nextPageToken || "";
            } while(token);

            if(fetched.length === 0) throw new Error("Playlist vazia.");

            videosPendentes = fetched.map((v, i) => ({ ...v, ordem: i+1 }));
            
            marcarAlteracao(); 
            renderizarListaManual();      
            atualizarMetadadosGlobais();  
            
            const elData = document.getElementById("meta-data-sync");
            if(elData) { elData.textContent = "Agora"; elData.style.color = "#16a34a"; }

            alert(`✅ ${videosPendentes.length} aulas encontradas.`);

        } catch(e) {
            console.error(e);
            alert("Erro: " + e.message);
            videosPendentes = backup;
            renderizarListaManual();
        } finally {
            btnSyncRapido.innerHTML = textoOriginal;
            btnSyncRapido.disabled = false;
        }
    };
}

// =============================================================
// LÓGICA DE DADOS (RECARREGÁVEL)
// =============================================================

async function inicializarApp() {
    console.log("🚀 Recarregando dados...");
    
    // NOTA: carregarElementosDOM() e setupListenersUnicos() agora são chamados no DOMContentLoaded
    // Isso evita que os botões ganhem múltiplos eventos de clique.

    try {
        const dados = await DBHandler.listarTreinamentos();
        cursos = dados.map(item => {
            const aulas = item.aulas || [];
            return {
                ...item,
                quantidadeAulas: aulas.length,
                duracaoMinutos: aulas.reduce((acc, a) => acc + (Number(a.duracao_minutos) || 0), 0),
                trilha: item.trilha || "Geral",
                subtrilha: item.subtrilha || ""
            };
        });
        preencherOpcoesTrilha();
        aplicarFiltros();
    } catch (e) {
        console.error("Erro fatal:", e);
        const container = document.getElementById("lista-cursos");
        if(container) container.innerHTML = `<div class="lista-cursos-vazia" style="color:red">Erro: ${e.message}</div>`;
    }
}

// INICIALIZAÇÃO SEGURA
document.addEventListener("DOMContentLoaded", () => {
    carregarElementosDOM();    // Pega os elementos do HTML
    setupListenersUnicos();    // Configura os cliques UMA VEZ
    inicializarApp();          // Busca os dados do banco
});

// =============================================================
// RENDERIZAÇÃO
// =============================================================

function atualizarResumo(lista) {
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    const totalMinutos = lista.reduce((acc, c) => acc + (c.duracaoMinutos || 0), 0);
    set("resumo-total", lista.length);
    set("resumo-disponivel", lista.filter(c => (c.status || "").toUpperCase() === "DISPONÍVEL").length);
    set("resumo-em-dev", lista.filter(c => (c.status || "").toUpperCase() === "EM DESENVOLVIMENTO").length);
    set("resumo-backlog", lista.filter(c => (c.status || "").toUpperCase() === "BACKLOG").length);
    set("resumo-total-aulas", lista.reduce((acc, c) => acc + (c.quantidadeAulas || 0), 0));
    set("resumo-horas", formatarDuracao(totalMinutos));
}

function renderCursos(lista) {
    const container = document.getElementById("lista-cursos");
    if(!container) return;
    container.innerHTML = "";

    if (lista.length === 0) {
        container.innerHTML = `<div class="lista-cursos-vazia">Nenhum curso encontrado.</div>`;
        return;
    }

    const listaOrdenada = [...lista].sort((a, b) => 
        (a.trilha || "Geral").localeCompare(b.trilha || "Geral") || 
        (a.subtrilha || "").localeCompare(b.subtrilha || "") ||
        (a.nome || "").localeCompare(b.nome || "")
    );

    let trilhaAtual = null;
    let subAtual = null;

    listaOrdenada.forEach((curso) => {
        if (curso.trilha !== trilhaAtual) {
            trilhaAtual = curso.trilha; subAtual = null;
            container.insertAdjacentHTML('beforeend', `<div class="header-trilha"><span>${trilhaAtual}</span><small>Trilha Principal</small></div>`);
        }
        if (curso.subtrilha && curso.subtrilha !== subAtual) {
            subAtual = curso.subtrilha;
            container.insertAdjacentHTML('beforeend', `<div class="header-subtrilha"><span>${subAtual}</span><small>Subtrilha</small></div>`);
        }

        const statusClass = (curso.status || "backlog").toLowerCase().replace(/\s+/g, "-");
        const isOculto = curso.exibir_catalogo === false;
       const botaoLink = curso.link
        ? `<button class="btn-icon-acessar" type="button" title="Acessar curso" aria-label="Acessar curso"
           onclick="window.open('${curso.link}', '_blank')">${ICONS.open}</button>`
        : `<button class="btn-disabled-text" disabled>Em breve</button>`;


        const html = `
        <article class="card-curso ${isOculto ? 'is-hidden' : ''} status-${statusClass}">
            <header class="card-header">
                <div class="card-trilhas">
                    ${curso.subtrilha ? `<span class="badge-subtrilha">${curso.subtrilha}</span>` : `<span class="badge-trilha">${curso.trilha}</span>`}
                    ${isOculto ? '<span class="badge-oculto">🔒 OCULTO</span>' : ''}
                </div>
                <span class="badge-status ${statusClass}">${curso.status || 'Rascunho'}</span>
            </header>
            <h2 class="card-titulo">${curso.nome}</h2>
            <p class="card-descricao">${curso.descricao || "Sem descrição."}</p>
            <footer class="card-footer">
                <div class="pill-duracao"><strong>${formatarDuracao(curso.duracaoMinutos)}</strong></div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-icon-grade btn-abrir-grade" data-id="${curso.id}" title="Grade"><span class="grade-count">${curso.quantidadeAulas}</span> aulas</button>
                    <button class="btn-icon-editar" type="button" data-id="${curso.id}" title="Editar" aria-label="Editar">
                     ${ICONS.edit}
                    </button>


                    ${botaoLink}
                </div>
            </footer>
        </article>`;
        container.insertAdjacentHTML('beforeend', html);
    });

    container.querySelectorAll('.btn-abrir-grade').forEach(b => b.onclick = e => { e.stopPropagation(); abrirModalAulas(e.currentTarget.dataset.id); });
    container.querySelectorAll('.btn-icon-editar').forEach(b => b.onclick = e => { e.stopPropagation(); editarCurso(e.currentTarget.dataset.id); });
}

// =============================================================
// FILTROS
// =============================================================

function preencherOpcoesTrilha() {
    const select = document.getElementById("filtro-trilha");
    if(!select) return;
    const trilhas = [...new Set(cursos.map(c => c.trilha))].filter(Boolean).sort();
    select.innerHTML = '<option value="">Todas</option>' + trilhas.map(t => `<option value="${t}">${t}</option>`).join("");
}

function preencherOpcoesSubtrilha(trilha) {
    const select = document.getElementById("filtro-subtrilha");
    if(!select) return;
    select.innerHTML = '<option value="">Todas</option>';
    if(!trilha) { select.disabled = true; return; }
    const subs = [...new Set(cursos.filter(c => c.trilha === trilha && c.subtrilha).map(c => c.subtrilha))].sort();
    select.disabled = subs.length === 0;
    select.innerHTML += subs.map(s => `<option value="${s}">${s}</option>`).join("");
}

function aplicarFiltros() {
    const termo = normalizarTexto(document.getElementById("filtro-busca").value);
    const tr = document.getElementById("filtro-trilha").value;
    const sub = document.getElementById("filtro-subtrilha").value;
    const st = document.getElementById("filtro-status").value;
    const oc = document.getElementById("filtro-ver-ocultos")?.checked;
    
    const filtrados = cursos.filter(c => {
        if(c.exibir_catalogo === false && !oc) return false;
        return (normalizarTexto(c.nome).includes(termo) || normalizarTexto(c.descricao).includes(termo)) &&
               (!tr || c.trilha === tr) && (!sub || c.subtrilha === sub) && (!st || (c.status||"").toUpperCase() === st);
    });
    renderCursos(filtrados); atualizarResumo(filtrados);
}

// =============================================================
// MODAL DE AULAS (VISUALIZAÇÃO)
// =============================================================

function abrirModalAulas(id) {
    const c = cursos.find(x => x.id == id);
    if(!c) return;
    document.getElementById("modal-titulo-curso").textContent = c.nome;
    document.getElementById("modal-qtd-aulas").textContent = c.quantidadeAulas + " aulas";
    document.getElementById("modal-tempo-total").textContent = formatarDuracao(c.duracaoMinutos);
    listaAulasUl.innerHTML = (c.aulas||[]).sort((a,b)=>a.ordem-b.ordem).map((a,i)=>`
        <li class="aula-item"><div class="aula-ordem">${i+1}</div><div class="aula-info"><span class="aula-titulo">${a.titulo}</span><span class="aula-tempo">${a.duracao_minutos} min</span></div>${a.link_video?`<button onclick="window.open('${a.link_video}')" class="btn-ver-video">📺</button>`:''}</li>
    `).join("");
    modalAulas.style.display = "flex";
}

// =============================================================
// GESTÃO DE ESTADO (MANUTENÇÃO)
// =============================================================

function resetarModalManutencao() {
    if(formCurso) formCurso.reset();
    
    videosPendentes = []; 
    houveAlteracao = false;
    
    if(btnSalvarCurso) { btnSalvarCurso.disabled = true; btnSalvarCurso.innerText = "Salvar Alterações"; }
    
    document.getElementById("meta-qtd-aulas").textContent = "0";
    document.getElementById("meta-tempo-total").textContent = "0 min";
    document.getElementById("meta-data-sync").textContent = "-";
    
    if(areaDelete) areaDelete.style.display = "none";
    if(document.getElementById("lista-manual-preview")) document.getElementById("lista-manual-preview").innerHTML = "";
    
    const badge = document.getElementById("badge-pendente");
    if(badge) badge.style.display = "none";

    const radioYoutube = document.getElementById("fonte_youtube");
    if(radioYoutube) { radioYoutube.checked = true; window.alternarFonte('youtube'); }
    alternarModoTrilha('select');
}

function editarCurso(id) {
    resetarModalManutencao();

    const curso = cursos.find(c => c.id == id);
    if (!curso) return;

    document.getElementById("curso-id").value = curso.id;
    document.getElementById("curso-nome").value = curso.nome;
    document.getElementById("curso-status").value = (curso.status || "DISPONÍVEL").toUpperCase();
    document.getElementById("curso-subtrilha").value = curso.subtrilha || "";
    document.getElementById("curso-link").value = curso.link || "";
    document.getElementById("curso-descricao").value = curso.descricao || "";
    document.getElementById("curso-exibir").checked = (curso.exibir_catalogo !== false);

    if (curso.aulas && curso.aulas.length > 0) {
        videosPendentes = JSON.parse(JSON.stringify(curso.aulas));
        videosPendentes.sort((a, b) => a.ordem - b.ordem);
    }
    
    houveAlteracao = false;

    renderizarListaManual();
    atualizarMetadadosGlobais();
    popularSelectTrilhas(curso.trilha);
    
    const elData = document.getElementById("meta-data-sync");
    if(curso.ultima_sincronizacao) elData.textContent = new Date(curso.ultima_sincronizacao).toLocaleString('pt-BR');

    document.getElementById("modal-curso-titulo").textContent = "Editar Curso";
    if(areaDelete) areaDelete.style.display = "block";
    modalCurso.style.display = "flex";
}

// =============================================================
// LISTA DE AULAS (MANUAL & SYNC)
// =============================================================

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
            <div style="flex:1; overflow:hidden;">
                <strong style="color:#1e293b; font-size:0.85rem;">${index + 1}. ${video.titulo}</strong>
                <div style="font-size:0.75rem; color:#64748b;">${video.duracao_minutos} min</div>
            </div>
            <button type="button" class="btn-remove-item" onclick="window.removerItemManual(${index})">&times;</button>
        `;
        ul.appendChild(li);
    });

    if(btnLimpar) btnLimpar.style.display = "block";
}

window.removerItemManual = function(index) {
    videosPendentes.splice(index, 1);
    videosPendentes.forEach((v, i) => v.ordem = i + 1);
    renderizarListaManual();
    marcarAlteracao();
    atualizarMetadadosGlobais();
};

function marcarAlteracao() {
    houveAlteracao = true;
    if(btnSalvarCurso) btnSalvarCurso.disabled = false;
}

function atualizarMetadadosGlobais() {
    const total = videosPendentes.length;
    const mins = videosPendentes.reduce((acc, v) => acc + (Number(v.duracao_minutos) || 0), 0);

    document.getElementById("meta-qtd-aulas").textContent = total;
    document.getElementById("meta-tempo-total").textContent = formatarDuracao(mins);

    const badge = document.getElementById("badge-pendente");
    if(badge) {
        if (houveAlteracao) {
            badge.style.display = "block";
            badge.textContent = "Alterações não salvas";
            badge.style.backgroundColor = "#fef3c7";
            badge.style.color = "#d97706";
        } else {
            badge.style.display = "none";
        }
    }
}

// Helpers
function popularSelectTrilhas(val) {
    const s = document.getElementById("curso-trilha-select");
    const t = [...new Set(cursos.map(c => c.trilha || "Geral"))].sort();
    s.innerHTML = t.map(o => `<option value="${o}">${o}</option>`).join("");
    if(val) s.value = val;
}
function alternarModoTrilha(m) {
    document.getElementById("box-select-trilha").style.display = m==='input'?'none':'block';
    const inp = document.getElementById("curso-trilha-input");
    inp.style.display = m==='input'?'block':'none';
    inp.dataset.mode = m==='input'?'active':'inactive';
}
window.alternarFonte = function(v) {
    document.getElementById("panel-youtube").style.display = v==='youtube'?'block':'none';
    document.getElementById("panel-manual").style.display = v==='manual'?'block':'none';
}



