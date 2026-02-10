/* =============================================================
   catalogo.JS - Versão Final (Correção Botão Fechar)
   ============================================================= */

import { DBHandler } from "../bd-treinamentos/db-handler.js";

// =============================================================
// 1. VARIÁVEIS GLOBAIS
// =============================================================
const YOUTUBE_API_KEY_FIXA = "AIzaSyAJyCenPXn41mbjieW6wTzeaFPYFX5Xrzo";

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
// 3. INICIALIZAÇÃO
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

async function inicializarApp() {
    console.log("🚀 Iniciando Aplicação...");
    carregarElementosDOM();
    setupGlobalListeners();

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

document.addEventListener("DOMContentLoaded", inicializarApp);

// =============================================================
// 4. RENDERIZAÇÃO
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
        const botaoLink = curso.link ? `<button class="btn-icon-acessar" onclick="window.open('${curso.link}', '_blank')">🚀</button>` : `<button class="btn-disabled-text" disabled>Em breve</button>`;

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
                    <button class="btn-icon-editar" data-id="${curso.id}" title="Editar">📝</button>
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
// 5. FILTROS
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
// 6. MODAL DE AULAS (VISUALIZAÇÃO)
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
// 7. GESTÃO DE ESTADO (MANUTENÇÃO)
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
// 8. LISTA DE AULAS (MANUAL & SYNC)
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

// =============================================================
// 9. EVENTOS E SYNC CORRIGIDO
// =============================================================

function setupGlobalListeners() {
    const addEvt = (id, evt, fn) => { const el = document.getElementById(id); if(el) el.addEventListener(evt, fn); };

    // Filtros
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

    // -------------------------------------------------------------
    // FECHAR MODAIS - CORREÇÃO CRÍTICA AQUI
    // -------------------------------------------------------------

    // 1. Botões "X" e "Fechar" da Lista de Aulas (Visualização)
    // Esses botões tem a classe .btn-close-modal-aulas no HTML
    document.querySelectorAll(".btn-close-modal-aulas").forEach(btn => {
        btn.addEventListener("click", () => {
            if(modalAulas) modalAulas.style.display = "none";
        });
    });

    // 2. Botões "X" e "Cancelar" do Modal de Edição (Novo/Editar)
    // Esses botões tem a classe .btn-close-modal-curso no HTML
    document.querySelectorAll(".btn-close-modal-curso").forEach(btn => {
        btn.addEventListener("click", () => {
            resetarModalManutencao();
            if(modalCurso) modalCurso.style.display = "none";
        });
    });

    // -------------------------------------------------------------

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

    addEvt("btn-add-manual", "click", () => {
        const t = document.getElementById("manual-titulo").value.trim();
        const l = document.getElementById("manual-link").value.trim();
        const m = parseInt(document.getElementById("manual-minutos").value) || 0;
        if(!t) return alert("Título obrigatório");
        videosPendentes.push({ titulo: t, link_video: l, duracao_minutos: m, ordem: videosPendentes.length + 1 });
        renderizarListaManual(); marcarAlteracao(); atualizarMetadadosGlobais();
        document.getElementById("manual-titulo").value = "";
    });

    addEvt("btn-limpar-aulas", "click", () => {
        if(confirm("Remover todas as aulas?")) {
            videosPendentes = []; renderizarListaManual(); marcarAlteracao(); atualizarMetadadosGlobais();
        }
    });

    if(formCurso) {
        formCurso.querySelectorAll("input, select, textarea").forEach(el => {
            el.addEventListener("input", marcarAlteracao);
            el.addEventListener("change", marcarAlteracao);
        });
    }

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
            inicializarApp();
        } catch(e) { 
            alert(e.message); 
            btnSalvarCurso.disabled = false; btnSalvarCurso.innerText = "Salvar Alterações";
        }
    };

    if(btnSyncRapido) btnSyncRapido.onclick = async () => {
        const link = document.getElementById("curso-link").value.trim();
        const pid = link.includes("list=") ? link.split("list=")[1].split("&")[0] : link;
        if(!pid || pid.length < 5) return alert("Playlist inválida.");

        const textoOriginal = btnSyncRapido.innerHTML;
        btnSyncRapido.innerHTML = `⏳ Buscando...`;
        btnSyncRapido.disabled = true;

        const backup = [...videosPendentes];
        videosPendentes = []; 

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
