// =============================================================================
// 1. IMPORTAÇÃO E VARIÁVEIS GLOBAIS
// =============================================================================
import { DBHandler } from '../bd-treinamentos/db-handler.js';

const icons = {
    lupa: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>`,
    user: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>`,
    book: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>`,
    check: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`,
    star: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>`,
    ban: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" /></svg>`,
    filterClear: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /><path stroke-linecap="round" stroke-linejoin="round" d="M3 3l18 18" /></svg>`
};



let config = { treinamentos: [], cargos: [] };
let db = { dados: config };
let colCache = {}; 
let lastHighlightedCol = null;

// Controle Admin
let contextoAdmin = {
    cargoId: null,
    treinoId: null,
    acaoPendente: null,
    treinoOriginal: null // Novo: Armazena os dados antes da edição
};
let pendingChange = null; 
let tempCargoIndex = null;
let tempTreinoId = null;

window.isAdminMode = false;
let currentUser = null;


// =============================================================================
// Helper para capturar o IP Real do usuário
// =============================================================================
async function obterIPReal() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error("Erro ao obter IP:", error);
        return 'Não detectado';
    }
}
// =============================================================================
// 2. INICIALIZAÇÃO
// =============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log("🔄 Iniciando sistema...");
        const dados = await DBHandler.carregarDadosIniciais();
        config = dados; 
        db = { dados: config };
        
        init();
        verificarSessaoInicial();
        console.log("✅ Dados carregados!", config);
    } catch (e) {
        console.error("⛔ Erro fatal:", e);
        alert("Erro ao conectar com o banco.");
    }
});

function init() {
    if (typeof config === 'undefined') return;

    // Popula Cargos
    const roleList = document.getElementById('roleList');
    if (roleList) {
        roleList.innerHTML = '';
        config.cargos.forEach(cargo => {
            const option = document.createElement('option');
            option.value = cargo.nome; 
            roleList.appendChild(option);
        });
    }

    // Popula Categorias
    const catList = document.getElementById('catList');
    const catListModal = document.getElementById('catListModal');
    if (catList) {
        const categoriasUnicas = [...new Set(config.treinamentos.map(t => t.categoria))].filter(Boolean);
        const optionsHTML = categoriasUnicas.sort().map(cat => `<option value="${cat}">`).join('');
        catList.innerHTML = optionsHTML;
        if(catListModal) catListModal.innerHTML = optionsHTML;
    }

    // Popula Status
    const statusSelect = document.getElementById('statusFilter'); 
    if (statusSelect) {
        statusSelect.innerHTML = `<option value="all">Todas</option><option value="mandatory">Obrigatório</option><option value="recommended">Recomendável</option><option value="none">Não Obrigatório</option>`;
    }

    const btnClear = document.getElementById('btnClearFilters');
    if (btnClear) btnClear.innerHTML = icons.filterClear || "Limpar";
    
    atualizarFiltros(); 
}



// =============================================================================
// 3. RENDERIZAÇÃO DA MATRIZ (Versão com Menu de Contexto no Header)
// =============================================================================
function renderizarMatriz(filtroCargo, filtroCategoria, filtroTexto, filtroObrigatoriedade) {
    const table = document.getElementById('matrixTable');
    if (!table) return;
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

    colCache = {}; 
    lastHighlightedCol = null;

    // --- A. Cabeçalho (Borda padronizada e alinhada ao topo) ---
    let headerHTML = '<tr><th class="top-left-corner"><div class="hud-card">' +
    '<div class="hud-top-label">' + icons.lupa + ' INSPEÇÃO</div>' +
    '<div id="hudScan" class="hud-scan"><div class="scan-icon-large">' + icons.lupa + '</div><div class="scan-msg">Explore a matriz<br>para ver detalhes</div></div>' +
    '<div id="hudData" class="hud-data-state animate-entry" style="display:none;"><div id="hudBody" class="hud-body"><div class="hud-group"><div class="hud-label-row"><div class="hud-icon">' + icons.user + '</div><span class="info-label">Cargo</span></div><div id="hudRole" class="info-value role-value">-</div></div><div class="hud-group"><div class="hud-label-row"><div class="hud-icon">' + icons.book + '</div><span class="info-label">Treinamento</span></div><div id="hudCourse" class="info-value">-</div></div></div></div>' + 
    '<div id="hudStatus" class="hud-footer status-bg-none">' + icons.ban + ' Selecione</div>' +
    '</div></th>';
    
    config.cargos.forEach((cargo, index) => {
        if (filtroCargo !== 'all' && cargo.id.toString() !== filtroCargo) return;
        const activeClass = (filtroCargo === cargo.id.toString()) ? 'selected-col-header' : '';
        
        // Identifica se é Hexadecimal ou classe legada
        const isHex = cargo.corClass && cargo.corClass.startsWith('#');
        
        // PADRONIZAÇÃO: Definimos 8px para igualar a altura das bordas originais
        const alturaBorda = "8px"; 
        
        // Aplicação de Estilo: Padding zero na TH e Height 100% garantem que a borda encoste no topo
        const borderStyle = isHex 
            ? `style="border-top: ${alturaBorda} solid ${cargo.corClass} !important; height: 100%; box-sizing: border-box;"` 
            : `style="border-top: ${alturaBorda} solid transparent; height: 100%; box-sizing: border-box;"`;

        const extraClass = isHex ? '' : cargo.corClass;

        headerHTML += `
            <th class="${activeClass}" 
                data-col="${index}" 
                style="padding: 0 !important; vertical-align: top !important;"
                onclick="document.getElementById('roleFilter').value='${cargo.nome}'; atualizarFiltros();"
                oncontextmenu="window.abrirMenuCargo(event, ${index})">
                <div class="role-wrapper ${extraClass}" ${borderStyle}>
                    <div class="vertical-text">${cargo.nome}</div>
                </div>
            </th>`;
    });
    headerHTML += '</tr>';
    thead.innerHTML = headerHTML;

    // --- B. Corpo (Linhas "Blindadas" contra altura excessiva) ---
    let bodyHTML = '';
    
    const styleRow = 'height: 30px !important; max-height: 30px !important;';
    const styleTH = 'height: 30px !important; max-height: 30px !important; padding: 0 !important; vertical-align: middle !important;';
    const styleTD = 'height: 30px !important; max-height: 30px !important; padding: 0 !important; vertical-align: middle !important;';
    const styleFlex = 'display: flex; align-items: center; gap: 8px; height: 30px; padding: 0 10px; width: 100%; box-sizing: border-box;';

    config.treinamentos.forEach((treino, treinoIndex) => {
        if (filtroCategoria && filtroCategoria !== 'all' && filtroCategoria !== '' && treino.categoria.trim() !== filtroCategoria.trim()) return;
        if (filtroTexto && !treino.nome.toLowerCase().includes(filtroTexto.toLowerCase())) return;

        let rowCellsHTML = '';
        let linhaPassa = (filtroObrigatoriedade === 'all'); 

        config.cargos.forEach((cargo, index) => {
            if (filtroCargo !== 'all' && cargo.id.toString() !== filtroCargo) return;
            
            const ehO = cargo.obrigatorios?.includes(treino.id);
            const ehR = cargo.recomendados?.includes(treino.id);
            let tipoReq = ehO ? 'mandatory' : (ehR ? 'recommended' : 'none');
            
            if (filtroObrigatoriedade !== 'all' && tipoReq === filtroObrigatoriedade) linhaPassa = true;
            
            const activeClassCell = (filtroCargo === cargo.id.toString()) ? 'selected-col' : '';
            
            rowCellsHTML += `
                <td class="${activeClassCell}" style="${styleTD}" data-col="${index}" data-status="${tipoReq}" onclick="abrirMenuContexto(event, ${index}, ${treino.id})">
                    <div class="cell-content" style="height: 100%; display: flex; align-items: center; justify-content: center;">
                        ${ehO ? '<span class="status-dot O"></span>' : (ehR ? '<span class="status-dot R"></span>' : '')}
                    </div>
                </td>`;
        });

        if (linhaPassa) {
            const tooltipText = treino.desc ? treino.desc : "Sem descrição disponível.";
            const badgeColor = treino.color || "#64748b";
            const categoriaDisplay = treino.categoria || "GERAL";
            
            bodyHTML += `
            <tr data-row="${treinoIndex}" style="${styleRow}">
                <th style="--cat-color: ${badgeColor}; background-color: ${badgeColor}15; cursor: pointer; ${styleTH}" 
                    data-tooltip="${tooltipText}"
                    onclick="editarTreinamento(${treino.id})">
                    <div style="${styleFlex}">
                        <div style="background: #ffffff; border: 1px solid ${badgeColor}; color: ${badgeColor}; font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; line-height: 1;">
                            ${categoriaDisplay}
                        </div>
                        <div style="color: #334155; font-size: 11px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-grow: 1; text-align: left; line-height: normal;">
                            ${treino.nome}
                        </div>
                    </div>
                </th>
                ${rowCellsHTML}
            </tr>`;
        }
    });
    tbody.innerHTML = bodyHTML;
    
    const allCells = table.querySelectorAll('[data-col]');
    allCells.forEach(cell => {
        const cIndex = cell.dataset.col;
        if (!colCache[cIndex]) colCache[cIndex] = [];
        colCache[cIndex].push(cell);
    });

    vincularEventosLupa();
    vincularEventosDestaque();
}



// =============================================================================
// 4. LÓGICA DE FILTROS & HUD
// =============================================================================
function getCargoIdByName(nome) {
    if (!nome) return 'all';
    const cargo = config.cargos.find(c => c.nome === nome);
    return cargo ? cargo.id.toString() : 'all';
}

window.atualizarFiltros = function(valorCargoClick) {
    if (valorCargoClick !== undefined) {
        const cargoObj = config.cargos.find(c => c.id.toString() === valorCargoClick);
        const inputRole = document.getElementById('roleFilter');
        if (cargoObj) inputRole.value = (inputRole.value === cargoObj.nome) ? '' : cargoObj.nome;
    }

    const roleName = document.getElementById('roleFilter').value;
    const roleVal = getCargoIdByName(roleName); 
    let catVal = document.getElementById('categoryFilter').value || 'all'; 
    const statusSelect = document.getElementById('statusFilter');
    const statusWrapper = document.getElementById('statusWrapper');
    const textVal = document.getElementById('textSearch').value.toLowerCase();

    if (roleVal === 'all') {
        if (statusWrapper) statusWrapper.style.display = 'none';
        statusSelect.value = 'all';
        statusSelect.disabled = true;
    } else {
        if (statusWrapper) statusWrapper.style.display = 'flex';
        statusSelect.disabled = false;
    }

    atualizarFiltroHUD(roleVal, catVal, statusSelect.value);
    renderizarMatriz(roleVal, catVal, textVal, statusSelect.value);
}

function atualizarFiltroHUD(cargoId, categoria, obrigatoriedade) {
    const tagRole = document.getElementById('tagRole');
    const tagCat = document.getElementById('tagCategory');
    const tagStatus = document.getElementById('tagStatus');
    const tagStatusContainer = document.getElementById('tagStatusContainer');
    const hudDividerStatus = document.getElementById('hudDividerStatus');

    if (!tagRole) return; 

    let roleText = "Todos";
    if (cargoId !== 'all') {
        const cargoObj = config.cargos.find(c => c.id.toString() === cargoId);
        if (cargoObj) roleText = cargoObj.nome;
    }
    tagRole.textContent = roleText;
    tagRole.style.color = "#3b82f6"; 
    tagCat.textContent = categoria === '' || categoria === 'all' ? "Todas" : categoria;
    tagCat.style.color = "#3b82f6"; 

    tagStatus.textContent = STATUS_MAP[obrigatoriedade] || "Todas";
    tagStatus.style.color = "#3b82f6"; 
    
    if (tagStatusContainer && hudDividerStatus) {
        if (obrigatoriedade !== 'all') {
            tagStatusContainer.classList.remove('hidden');
            hudDividerStatus.classList.remove('hidden');
        } else {
            tagStatusContainer.classList.add('hidden');
            hudDividerStatus.classList.add('hidden');
        }
    }
}

window.limparFiltros = function() {
    document.getElementById('roleFilter').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('textSearch').value = '';
    document.getElementById('statusFilter').value = 'all';
    window.atualizarFiltros();
}

// =============================================================================
// 5. GESTÃO DE TREINAMENTOS (MODAL)
// =============================================================================
window.abrirModalTreinamento = function() {
    const modal = document.getElementById('modalTreino');
    if (modal) {
        modal.classList.remove('hidden');
        const datalist = document.getElementById('catListModal');
        if (datalist && config.treinamentos) {
            datalist.innerHTML = '';
            const cats = [...new Set(config.treinamentos.map(t => t.categoria))].filter(Boolean).sort();
            cats.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                datalist.appendChild(opt);
            });
        }
        setTimeout(() => document.getElementById('inputNomeTreino')?.focus(), 100);
    }
};

window.fecharModalTreinamento = function() {
    const modal = document.getElementById('modalTreino');
    if (modal) modal.classList.add('hidden');
    
    ['inputHiddenId', 'inputNomeTreino', 'inputCatTreino', 'inputDescTreino', 'inputLinkTreino'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });

    const colorPicker = document.getElementById('inputCorTreino');
    if(colorPicker) colorPicker.value = '#3b82f6';
    const hexDisplay = document.getElementById('hexColorDisplay');
    if(hexDisplay) hexDisplay.textContent = '#3B82F6';
    
    document.getElementById('modalTitle').textContent = "Novo Treinamento";
    document.getElementById('btnExcluirTreino').style.display = 'none';
};


window.salvarNovoTreinamento = async function() {
    const idExistente = document.getElementById('inputHiddenId').value;
    const nome = document.getElementById('inputNomeTreino').value.trim();
    const categoria = document.getElementById('inputCatTreino').value.trim().toUpperCase();
    const desc = document.getElementById('inputDescTreino').value.trim();
    const link = document.getElementById('inputLinkTreino').value.trim();
    const cor = document.getElementById('inputCorTreino').value;

    if (!nome || !categoria) { alert("Preencha Nome e Categoria!"); return; }

    const dadosFormulario = { nome, categoria, desc, link, color: cor };
    if (idExistente) dadosFormulario.id = parseInt(idExistente);

    const nomeUsuario = currentUser && currentUser.user ? currentUser.user : 'Admin';
    let acaoLog = idExistente ? 'EDITAR_CURSO' : 'CRIAR_CURSO';
    let detalhesLog = "";

    // --- LÓGICA DE ANTES E DEPOIS (AJUSTADA) ---
    if (idExistente && contextoAdmin.treinoOriginal) {
        const orig = contextoAdmin.treinoOriginal;
        const alteracoes = [];

        if (orig.nome !== nome) alteracoes.push(`Nome: "${orig.nome}" -> "${nome}"`);
        if (orig.categoria !== categoria) alteracoes.push(`Cat: "${orig.categoria}" -> "${categoria}"`);
        
        // AJUSTE NA DESCRIÇÃO: Mostra o texto antigo e o novo
        if ((orig.desc || "") !== desc) {
            const vAntigo = orig.desc ? `"${orig.desc}"` : "(vazio)";
            const vNovo = desc ? `"${desc}"` : "(vazio)";
            alteracoes.push(`Desc: ${vAntigo} -> ${vNovo}`);
        }

        if ((orig.link || "") !== link) alteracoes.push(`Link: "${orig.link || ''}" -> "${link}"`);
        if (orig.color !== cor) alteracoes.push(`Cor: ${orig.color} -> ${cor}`);

        detalhesLog = alteracoes.length > 0 ? alteracoes.join(" | ") : "Nenhuma alteração nos campos.";
    } else {
        detalhesLog = `Novo Curso: ${nome} | Categoria: ${categoria}`;
    }

    try {
        // 1. Salva no Banco
        await DBHandler.salvarTreinamento(dadosFormulario);
        
        // 2. Registra o Log com IP Real
        const ipReal = await obterIPReal();
        await DBHandler.registrarLog(nomeUsuario, acaoLog, detalhesLog, ipReal);

        // 3. Refresh na Interface
        const dadosAtualizados = await DBHandler.carregarDadosIniciais();
        config = dadosAtualizados;
        if (typeof db !== 'undefined') db.dados = config;
        
        init(); 
        window.atualizarFiltros();
        window.fecharModalTreinamento();
        
        alert("Salvo com sucesso e registrado no log!");

    } catch (e) {
        console.error(e);
        alert("Erro ao salvar.");
    }
};



window.editarTreinamento = function(id) {
    if (!window.isAdminMode) return;

    const treino = config.treinamentos.find(t => t.id === id);
    if (!treino) return;

    // Salva uma cópia exata do que está no banco atualmente para comparar depois
    contextoAdmin.treinoOriginal = { ...treino };

    document.getElementById('inputHiddenId').value = treino.id;
    document.getElementById('inputNomeTreino').value = treino.nome;
    document.getElementById('inputCatTreino').value = treino.categoria;
    document.getElementById('inputDescTreino').value = treino.desc || "";
    document.getElementById('inputLinkTreino').value = treino.link || "";
    document.getElementById('inputCorTreino').value = treino.color || "#3b82f6";

    const hexDisplay = document.getElementById('hexColorDisplay');
    if(hexDisplay) hexDisplay.textContent = (treino.color || "#3b82f6").toUpperCase();

    document.getElementById('modalTitle').textContent = "Editar Treinamento";
    document.getElementById('btnExcluirTreino').style.display = 'block';
    document.getElementById('modalTreino').classList.remove('hidden');
    
    obterIPReal(); 
};

window.excluirTreinamento = async function() {
    const id = document.getElementById('inputHiddenId').value;
    if (!id) return;

    // Busca o nome para uma mensagem personalizada e log
    const treinoAlvo = config.treinamentos.find(t => t.id == id);
    const nomeCurso = treinoAlvo ? treinoAlvo.nome : "Desconhecido";

    // --- AJUSTE: ALERTA SOBRE PERDA DE RELACIONAMENTOS ---
    const mensagemConfirmacao = `⚠️ ATENÇÃO: Você está prestes a excluir o curso "${nomeCurso}".\n\n` +
                                `Isso removerá permanentemente o curso E TODAS as regras de obrigatoriedade ` +
                                `definidas para ele na matriz.\n\n` +
                                `Deseja continuar?`;

    if (confirm(mensagemConfirmacao)) {
        
        const nomeUsuario = currentUser && currentUser.user ? currentUser.user : 'Admin';
        
        try {
            // 1. Exclui do Banco (DBHandler deve ter a cascata implementada)
            await DBHandler.excluirTreinamento(parseInt(id));
            
            // 2. Grava Log detalhando a limpeza
            const ipReal = await obterIPReal();
            const msgLog = `Exclusão Crítica: Removeu o curso "${nomeCurso}" (ID: ${id}) e todos os seus vínculos na matriz.`;
            await DBHandler.registrarLog(nomeUsuario, 'EXCLUIR_CURSO', msgLog, ipReal);

            // 3. Atualiza a Tela
            const dadosAtualizados = await DBHandler.carregarDadosIniciais();
            config = dadosAtualizados;
            if (typeof db !== 'undefined') db.dados = config;

            window.fecharModalTreinamento();
            init();
            window.atualizarFiltros();
            
            alert("Curso e seus relacionamentos foram excluídos com sucesso!");

        } catch (e) {
            console.error("Erro ao excluir:", e);
            alert("Não foi possível excluir o treinamento. Verifique o console.");
        }
    }
};

// --- BLOCO DE AUTOMAÇÃO DE CORES (MANTIDO) ---
const inputCat = document.getElementById('inputCatTreino');
const inputCor = document.getElementById('inputCorTreino');
if (inputCat && inputCor) {
    inputCor.addEventListener('input', (e) => document.getElementById('hexColorDisplay').textContent = e.target.value.toUpperCase());
    inputCat.addEventListener('input', function() {
        const valorDigitado = this.value.trim();
        if (!valorDigitado) return;
        const match = config.treinamentos.find(t => t.categoria.toUpperCase() === valorDigitado.toUpperCase());
        if (match && match.color) {
            inputCor.value = match.color;
            document.getElementById('hexColorDisplay').textContent = match.color.toUpperCase();
        }
    });
}

// =============================================================================
// 6. EVENTOS DE UI (HOVER E DESTAQUE)
// =============================================================================
function vincularEventosLupa() {
    const table = document.getElementById('matrixTable');
    if (!table) return;

    table.onmouseover = (e) => {
        const target = e.target;
        const td = target.closest('td');
        const thRow = target.closest('tbody th');
        const thCol = target.closest('thead th');

        const hudScan = document.getElementById('hudScan');
        const hudData = document.getElementById('hudData');
        const hudRole = document.getElementById('hudRole');
        const hudCourse = document.getElementById('hudCourse');
        const hudStatus = document.getElementById('hudStatus');
        const hudBody = document.getElementById('hudBody'); 

        if (!hudData || !hudBody) return;

        const getCleanCourseName = (rowIndex) => {
            if (!config.treinamentos[rowIndex]) return "-";
            const fullName = config.treinamentos[rowIndex].nome;
            return fullName.includes(':') ? fullName.substring(fullName.indexOf(':') + 1).trim() : fullName;
        };

        const resetBackgroundClasses = () => hudBody.classList.remove('bg-mandatory', 'bg-recommended', 'bg-none');

        if (td && td.dataset.col) {
            const colIndex = parseInt(td.dataset.col);
            const tr = td.closest('tr');
            const rowIndex = parseInt(tr.dataset.row);
            const tipoReq = td.dataset.status;

            hudScan.style.display = 'none';
            hudData.style.display = 'flex';
            hudRole.textContent = config.cargos[colIndex] ? config.cargos[colIndex].nome : "-";
            hudCourse.textContent = getCleanCourseName(rowIndex);

            resetBackgroundClasses();
            hudBody.classList.add(tipoReq === 'mandatory' ? 'bg-mandatory' : (tipoReq === 'recommended' ? 'bg-recommended' : 'bg-none'));

            hudStatus.className = 'hud-footer status-bg-' + tipoReq;
            hudStatus.innerHTML = tipoReq === 'mandatory' ? `${icons.check} Obrigatório` : (tipoReq === 'recommended' ? `${icons.star} Recomendável` : `${icons.ban} Não Obrigatório`);
        } 
        else if (thRow && thRow.parentElement.dataset.row) {
            const rowIndex = parseInt(thRow.parentElement.dataset.row);
            hudScan.style.display = 'none';
            hudData.style.display = 'flex';
            hudRole.textContent = "-";
            hudCourse.textContent = getCleanCourseName(rowIndex);
            resetBackgroundClasses();
            hudBody.classList.add('bg-none');
            hudStatus.className = 'hud-footer status-bg-none';
            hudStatus.innerHTML = `${icons.ban} Selecione um Cargo`;
        }
        else if (thCol && thCol.dataset.col) {
            const colIndex = parseInt(thCol.dataset.col);
            hudScan.style.display = 'none';
            hudData.style.display = 'flex';
            hudRole.textContent = config.cargos[colIndex] ? config.cargos[colIndex].nome : "-";
            hudCourse.textContent = "-";
            resetBackgroundClasses();
            hudBody.classList.add('bg-none');
            hudStatus.className = 'hud-footer status-bg-none';
            hudStatus.innerHTML = `${icons.user} Visualizando Cargo`;
        } else {
            hudScan.style.display = 'flex';
            hudData.style.display = 'none';
            hudStatus.className = 'hud-footer status-bg-none';
            hudStatus.innerHTML = `${icons.ban} Selecione`;
        }
    };
}

function vincularEventosDestaque() {
    const table = document.getElementById('matrixTable');
    if (!table) return;
    
    table.addEventListener('mouseover', (e) => {
        const el = e.target.closest('[data-col]');
        if (!el) {
            if (lastHighlightedCol !== null) limparDestaqueOpt();
            return;
        }
        const newColIndex = el.dataset.col;
        if (lastHighlightedCol === newColIndex) return;
        limparDestaqueOpt();
        destacarColunaOpt(newColIndex);
    });
    
    table.addEventListener('mouseleave', limparDestaqueOpt);
}

function destacarColunaOpt(index) {
    lastHighlightedCol = index;
    const cells = colCache[index];
    if (cells) cells.forEach(c => c.classList.add(c.tagName === 'TH' ? 'hover-col-header' : 'hover-col'));
}

function limparDestaqueOpt() {
    if (lastHighlightedCol !== null) {
        const cells = colCache[lastHighlightedCol];
        if (cells) cells.forEach(c => c.classList.remove('hover-col', 'hover-col-header'));
        lastHighlightedCol = null;
    }
}





// =============================================================================
// 8. CONTROLE DE SESSÃO
// =============================================================================

function verificarSessaoInicial() {
    const sessionRaw = localStorage.getItem('rh_session');
    if (sessionRaw) {
        try {
            currentUser = JSON.parse(sessionRaw);
            console.log("👤 Usuário logado:", currentUser.user);
            if (currentUser.role === 'ADMIN') ativarModoAdmin(true);
        } catch (e) { console.error("Erro ao ler sessão", e); }
    } else {
        console.log("👤 Acesso anônimo (Leitura)");
    }
}

window.toggleAdminMode = function() {
    if (currentUser) {
        if (confirm(`Deseja sair da conta de ${currentUser.user}?`)) fazerLogout();
    } else {
        window.location.href = 'login.html'; 
    }
};

function ativarModoAdmin(silencioso = false) {
    window.isAdminMode = true;
    document.body.classList.add('is-admin');
    const btn = document.getElementById('btnAdminToggle');
    const iconClosed = document.getElementById('iconLockClosed');
    const iconOpen = document.getElementById('iconLockOpen');
    
    if (btn) {
        btn.classList.add('unlocked');
        btn.title = "Clique para Sair (Logout)";
        if(iconClosed) iconClosed.style.display = 'none';
        if(iconOpen) iconOpen.style.display = 'block';
    }
}

function fazerLogout() {
    window.isAdminMode = false;
    currentUser = null;
    localStorage.removeItem('rh_session');
    document.body.classList.remove('is-admin');
    window.location.href = 'index.html'; 
}


// =============================================================================
// HELPER: TRADUÇÃO DE STATUS (PARA O LOG)
// =============================================================================
const STATUS_MAP = {
    'mandatory': 'OBRIGATÓRIO',
    'recommended': 'RECOMENDÁVEL',
    'none': 'NÃO OBRIGATÓRIO' 
};

// =============================================================================
// 9. EDIÇÃO DE RELACIONAMENTO (CLIQUE DUPLO / LÓGICA)
// =============================================================================

async function alternarRelacao(cargoIndex, treinoId) {
    if (!window.isAdminMode) return;

    const cargo = config.cargos[cargoIndex];
    if (!cargo) return;

    // 1. Identifica o estado ATUAL (ANTES)
    const isObrig = cargo.obrigatorios && cargo.obrigatorios.includes(treinoId);
    const isRecom = cargo.recomendados && cargo.recomendados.includes(treinoId);
    
    let statusAnterior = 'none';
    if (isObrig) statusAnterior = 'mandatory';
    else if (isRecom) statusAnterior = 'recommended';

    // 2. Determina o PRÓXIMO estado
    let novoStatus = '';
    let msgConfirmacao = '';

    if (statusAnterior === 'none') {
        novoStatus = 'mandatory';
        msgConfirmacao = `Definir como <strong style="color:#ef4444">OBRIGATÓRIO</strong>?`;
    } 
    else if (statusAnterior === 'mandatory') {
        novoStatus = 'recommended';
        msgConfirmacao = `Mudar para <strong style="color:#eab308">RECOMENDÁVEL</strong>?`;
    } 
    else if (statusAnterior === 'recommended') {
        novoStatus = 'none';
        msgConfirmacao = `<strong>REMOVER</strong> a regra deste curso?`;
    }

    // 3. Dispara Auditoria com dados completos
    exibirModalAuditoria(msgConfirmacao, {
        TIPO: 'RELACAO',
        cargoIndex: cargoIndex,
        treinoId: treinoId,
        statusAnterior: statusAnterior, 
        novoStatus: novoStatus
    });
}

// =============================================================================
// 10. LÓGICA DO MENU DE CONTEXTO
// =============================================================================
window.abrirMenuContexto = function(e, cargoIndex, treinoId) {
    if (!window.isAdminMode) return;
    e.preventDefault(); e.stopPropagation();

    tempCargoIndex = parseInt(cargoIndex);
    tempTreinoId = parseInt(treinoId);

    const menu = document.getElementById('contextMenuCell');
    const overlay = document.getElementById('contextMenuOverlay');
    
    let x = e.pageX;
    let y = e.pageY;
    if (x + 160 > window.innerWidth) x -= 160; 
    
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.remove('hidden');
    overlay.classList.remove('hidden');
};

window.fecharMenuContexto = function() {
    document.getElementById('contextMenuCell').classList.add('hidden');
    document.getElementById('contextMenuOverlay').classList.add('hidden');
};

window.selecionarOpcaoRelacao = function(novoStatus) {
    if (tempCargoIndex === null || tempTreinoId === null) return;
    
    const cargo = config.cargos[tempCargoIndex];
    if (!cargo) return;

    // 1. Identifica o status ANTERIOR
    let statusAnterior = 'none';
    if (cargo.obrigatorios && cargo.obrigatorios.includes(tempTreinoId)) statusAnterior = 'mandatory';
    else if (cargo.recomendados && cargo.recomendados.includes(tempTreinoId)) statusAnterior = 'recommended';

    if (statusAnterior === novoStatus) {
        window.fecharMenuContexto();
        return;
    }

    const mapaHTML = { 
        'mandatory': '<span style="color:#ef4444; font-weight:800;">OBRIGATÓRIO</span>', 
        'recommended': '<span style="color:#eab308; font-weight:800;">RECOMENDÁVEL</span>', 
        'none': '<span style="color:#94a3b8; font-weight:800;">NÃO OBRIGATÓRIO</span>' 
    };
    
    const msg = `Alterar regra para: ${mapaHTML[novoStatus]}`;
    window.fecharMenuContexto();
    
    exibirModalAuditoria(msg, {
        TIPO: 'RELACAO',
        cargoIndex: tempCargoIndex,
        treinoId: tempTreinoId,
        statusAnterior: statusAnterior, // <--- Importante para o Log
        novoStatus: novoStatus
    });
};


// =============================================================================
// 11. CENTRAL DE SEGURANÇA E AUDITORIA (LOG COM NOME)
// =============================================================================
async function exibirModalAuditoria(mensagemHTML, changeObject) {
    pendingChange = changeObject;

    const lbl = document.getElementById('lblChangeDetail');
    if(lbl) lbl.innerHTML = mensagemHTML;
    
    const timeEl = document.getElementById('auditTime');
    if(timeEl) timeEl.textContent = new Date().toLocaleString('pt-BR');

    const elIP = document.getElementById('auditIP');
    if(elIP) {
        elIP.textContent = "Obtendo IP real...";
        const ipReal = await obterIPReal(); // Busca o IP real
        elIP.textContent = ipReal;
        pendingChange.ipReal = ipReal; // Armazena para usar na confirmação
    }

    const modal = document.getElementById('modalConfirmacao');
    if(modal) modal.classList.remove('hidden');
}

window.fecharModalConfirmacao = function() {
    document.getElementById('modalConfirmacao').classList.add('hidden');
    pendingChange = null;
};

window.confirmarAcaoSegura = async function() {
    if (!pendingChange) return;

    const nomeUsuario = currentUser && currentUser.user ? currentUser.user : 'Admin';

    try {
        if (pendingChange.TIPO === 'RELACAO') {
            const { cargoIndex, treinoId, statusAnterior, novoStatus, ipReal } = pendingChange;
            const cargo = config.cargos[cargoIndex];
            const cargoId = cargo.id;

            const treinoEncontrado = config.treinamentos.find(t => t.id === treinoId);
            const nomeDoCurso = treinoEncontrado ? treinoEncontrado.nome : `Curso ID ${treinoId}`;

            // 1. Atualiza Banco
            await DBHandler.atualizarRegra(cargoId, treinoId, novoStatus);

            // 2. Grava Log (Passando o IP real capturado)
            const txtAntes = STATUS_MAP[statusAnterior] || statusAnterior;
            const txtDepois = STATUS_MAP[novoStatus] || novoStatus;
            const msgLog = `Cargo: ${cargo.nome} | Curso: ${nomeDoCurso} | Alterado de: ${txtAntes} -> Para: ${txtDepois}`;
            
            await DBHandler.registrarLog(nomeUsuario, 'ALTERAR_REGRA', msgLog, ipReal);
        }
        
        // ... restante do código de refresh da tela (igual ao anterior)
        const dadosFrescos = await DBHandler.carregarDadosIniciais();
        config = dadosFrescos;
        if (typeof db !== 'undefined') db.dados = config;

        atualizarFiltros();
        window.fecharModalConfirmacao();
        alert("✅ Alteração salva e registrada no log!");

    } catch (e) {
        console.error("Erro na operação:", e);
        alert("Erro ao salvar alteração: " + e.message);
    }
};



// =============================================================================
// GESTÃO DE CARGOS (MODAL & LOGICA)
// =============================================================================

// Adicione este ouvinte de evento (pode ser dentro do init ou global)
document.getElementById('inputCorCargo')?.addEventListener('input', (e) => {
    document.getElementById('hexColorDisplayCargo').textContent = e.target.value.toUpperCase();
});

window.abrirModalCargo = function() {
    window.fecharMenus(); // Garante limpeza de menus abertos
    
    document.getElementById('inputHiddenIdCargo').value = '';
    document.getElementById('inputNomeCargo').value = '';
    document.getElementById('inputCorCargo').value = '#334155';
    document.getElementById('hexColorDisplayCargo').textContent = '#334155';
    document.getElementById('inputLinkCargo').value = '';
    document.getElementById('inputOrdemCargo').value = '';
    document.getElementById('modalTitleCargo').textContent = "Novo Cargo";

    document.getElementById('modalCargo').classList.remove('hidden');
    setTimeout(() => document.getElementById('inputNomeCargo')?.focus(), 100);
};

window.fecharModalCargo = function() {
    const modal = document.getElementById('modalCargo');
    if(modal) modal.classList.add('hidden');
};

window.salvarNovoCargo = async function() {
    const idVal = document.getElementById('inputHiddenIdCargo').value;
    const nome = document.getElementById('inputNomeCargo').value.trim();
    // Agora capturamos o valor Hexadecimal do seletor de cores
    const corHex = document.getElementById('inputCorCargo').value;
    const link = document.getElementById('inputLinkCargo') ? document.getElementById('inputLinkCargo').value.trim() : '';
    const ordem = document.getElementById('inputOrdemCargo').value;

    if (!nome) { 
        alert("O nome do cargo é obrigatório!"); 
        return; 
    }

    // Montamos o objeto de dados
    const dadosCargo = { 
        nome: nome, 
        corClass: corHex, // Armazenamos o Hexadecimal na coluna de estilo
        link: link,
        ordem: ordem ? parseInt(ordem) : null
    };
    
    // SEGURANÇA: Só adiciona o ID se for uma edição (campo preenchido)
    // Se estiver vazio, o Supabase gera um novo ID automaticamente
    if (idVal && idVal !== '') {
        dadosCargo.id = parseInt(idVal);
    }

    const nomeUsuario = currentUser && currentUser.user ? currentUser.user : 'Admin';
    const acaoLog = dadosCargo.id ? 'EDITAR_CARGO' : 'CRIAR_CARGO';
    
    // Log detalhado incluindo a cor e o link, seguindo o padrão de cursos
    const msgLog = `Cargo: ${nome} | Cor: ${corHex.toUpperCase()}${link ? ' | Link: ' + link : ''}`;

    try {
        // 1. Salva no Banco de Dados
        await DBHandler.salvarCargo(dadosCargo);
        
        // 2. Grava Log de Auditoria com IP Real
        const ipReal = await obterIPReal();
        await DBHandler.registrarLog(nomeUsuario, acaoLog, msgLog, ipReal);

        // 3. Atualiza os dados locais e a interface
        const dadosAtualizados = await DBHandler.carregarDadosIniciais();
        config = dadosAtualizados;
        if (typeof db !== 'undefined') db.dados = config;
        
        init(); 
        window.atualizarFiltros(); 
        window.fecharModalCargo();
        
        alert("Cargo e preferências salvos com sucesso!");
    } catch (e) {
        console.error("Erro ao salvar cargo:", e);
        alert("Erro ao salvar: " + e.message);
    }
};

let tempCargoIndexParaMenu = null;

window.abrirMenuCargo = function(e, index) {
    if (!window.isAdminMode) return;
    
    // Impede o menu padrão do sistema
    e.preventDefault();
    e.stopPropagation();

    // 1. FECHA QUALQUER MENU ANTERIOR IMEDIATAMENTE
    window.fecharMenus();

    // 2. ATUALIZA O ÍNDICE DO CARGO SELECIONADO
    tempCargoIndexParaMenu = index;

    const menu = document.getElementById('contextMenuHeader');
    const overlay = document.getElementById('contextMenuOverlay');

    if (menu && overlay) {
        // 3. POSICIONA O MENU NA COORDENADA DO CLIQUE
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
        
        // 4. TORNA VISÍVEL
        menu.classList.remove('hidden');
        menu.style.display = 'block';
        overlay.classList.remove('hidden');

        // 5. GARANTE QUE O OVERLAY FECHE O MENU NO CLIQUE ESQUERDO
        overlay.onclick = window.fecharMenus;
    }
};

// Certifique-se de que a função fecharMenus limpe o display block também
window.fecharMenus = function() {
    const menuHeader = document.getElementById('contextMenuHeader');
    const menuCell = document.getElementById('contextMenuCell');
    const overlay = document.getElementById('contextMenuOverlay');

    if (menuHeader) {
        menuHeader.classList.add('hidden');
        menuHeader.style.display = 'none';
    }
    if (menuCell) {
        menuCell.classList.add('hidden');
        menuCell.style.display = 'none';
    }
    if (overlay) {
        overlay.classList.add('hidden');
    }
    
    tempCargoIndexParaMenu = null;
    tempCellData = null;
};
window.editarCargoContexto = function() {
    if (tempCargoIndexParaMenu === null) return;
    const cargo = config.cargos[tempCargoIndexParaMenu];
    
    document.getElementById('inputHiddenIdCargo').value = cargo.id;
    document.getElementById('inputNomeCargo').value = cargo.nome;
    
    // Define a cor (se for uma classe CSS antiga 'b-blue', define um cinza padrão ou mapeie)
    const corHex = cargo.corClass?.startsWith('#') ? cargo.corClass : '#334155';
    document.getElementById('inputCorCargo').value = corHex;
    document.getElementById('hexColorDisplayCargo').textContent = corHex.toUpperCase();
    
    document.getElementById('inputLinkCargo').value = cargo.link || '';
    document.getElementById('inputOrdemCargo').value = cargo.ordem || '';
    
    document.getElementById('modalTitleCargo').textContent = "Editar Cargo";
    document.getElementById('modalCargo').classList.remove('hidden');
    window.fecharMenus();
};

window.excluirCargoContexto = async function() {
    if (tempCargoIndexParaMenu === null) return;
    const cargo = config.cargos[tempCargoIndexParaMenu];
    
    if (confirm(`⚠️ ATENÇÃO: Excluir o cargo "${cargo.nome}" removerá TODAS as regras vinculadas a ele na matriz.\n\nDeseja continuar?`)) {
        try {
            await DBHandler.excluirCargo(cargo.id); // Certifique-se de ter esta função no db-handler
            const ipReal = await obterIPReal();
            await DBHandler.registrarLog(currentUser.user, 'EXCLUIR_CARGO', `Excluiu cargo: ${cargo.nome}`, ipReal);
            
            // Refresh total
            const dados = await DBHandler.carregarDadosIniciais();
            config = dados;
            init();
            atualizarFiltros();
            fecharMenus();
            alert("Cargo excluído com sucesso!");
        } catch (e) {
            alert("Erro ao excluir cargo: " + e.message);
        }
    }
};

window.fecharMenus = function() {
    // Esconde Menu de Cargos
    const menuHeader = document.getElementById('contextMenuHeader');
    if (menuHeader) {
        menuHeader.classList.add('hidden');
        menuHeader.style.display = 'none';
    }

    // Esconde Menu de Células (Bolinhas O/R)
    const menuCell = document.getElementById('contextMenuCell');
    if (menuCell) {
        menuCell.classList.add('hidden');
        menuCell.style.display = 'none';
    }

    // Esconde o Overlay (Camada de clique fora)
    const overlay = document.getElementById('contextMenuOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }

    tempCargoIndexParaMenu = null;
};














