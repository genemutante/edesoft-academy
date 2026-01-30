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

// Variáveis globais de dados
let config = { treinamentos: [], cargos: [] };
let db = { dados: config };

// Variáveis de controle de UI e Contexto (Admin)
let colCache = {}; 
let lastHighlightedCol = null;
let contextoAdmin = {
    cargoId: null,
    treinoId: null,
    acaoPendente: null
};

// =============================================================================
// 2. INICIALIZAÇÃO (CONEXÃO COM BANCO)
// =============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log("🔄 Iniciando sistema...");

        // 1. Carrega dados via DBHandler (que já traz a View formatada)
        const dados = await DBHandler.carregarDadosIniciais();
        config = dados; 
        
        // Atribui ao db também para manter compatibilidade
        db = { dados: config };

        console.log("✅ Dados carregados!", config);
        
        // 2. Inicializa a tela
        init();
        
    } catch (e) {
        console.error("⛔ Erro fatal na inicialização:", e);
        alert("Erro ao conectar com o banco de dados. Veja o console.");
    }
});

function init() {
    if (typeof config === 'undefined') return;

    // --- 1. POPULAR DATALIST DE CARGOS ---
    const roleList = document.getElementById('roleList');
    if (roleList) {
        roleList.innerHTML = '';
        config.cargos.forEach(cargo => {
            const option = document.createElement('option');
            option.value = cargo.nome; 
            roleList.appendChild(option);
        });
    }

    // --- 2. POPULAR DATALIST DE CATEGORIAS ---
    const catList = document.getElementById('catList');
    const catListModal = document.getElementById('catListModal'); // Também popula o do modal
    
    if (catList) {
        const categoriasUnicas = [...new Set(config.treinamentos.map(t => t.categoria))].filter(Boolean);
        const optionsHTML = categoriasUnicas.sort().map(cat => `<option value="${cat}">`).join('');
        
        catList.innerHTML = optionsHTML;
        if(catListModal) catListModal.innerHTML = optionsHTML;
    }

    // --- 3. POPULAR SELECT DE STATUS ---
    const statusSelect = document.getElementById('statusFilter'); 
    if (statusSelect) {
        statusSelect.innerHTML = `
            <option value="all">Todas</option>
            <option value="mandatory">Obrigatório</option>
            <option value="recommended">Recomendável</option>
            <option value="none">Não Obrigatório</option>
        `;
    }

    const btnClear = document.getElementById('btnClearFilters');
    if (btnClear && typeof icons !== 'undefined') btnClear.innerHTML = icons.filterClear || "Limpar";
    
    // Chama o filtro inicial
    atualizarFiltros(); 
}

// =============================================================================
// 3. RENDERIZAÇÃO DA MATRIZ (Visual Sofisticado)
// =============================================================================
function renderizarMatriz(filtroCargo, filtroCategoria, filtroTexto, filtroObrigatoriedade) {
    const table = document.getElementById('matrixTable');
    if (!table) return;
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

    // Reset do Cache
    colCache = {}; 
    lastHighlightedCol = null;

    // --- A. CABEÇALHO (HUD + CARGOS) ---
    let headerHTML = '<tr><th class="top-left-corner"><div class="hud-card">' +
    '<div class="hud-top-label">' + icons.lupa + ' INSPEÇÃO</div>' +
    '<div id="hudScan" class="hud-scan">' +
        '<div class="scan-icon-large">' + icons.lupa + '</div>' +
        '<div class="scan-msg">Explore a matriz<br>para ver detalhes</div>' +
    '</div>' +
    '<div id="hudData" class="hud-data-state animate-entry" style="display:none;">' +
        '<div id="hudBody" class="hud-body">' + 
            '<div class="hud-group">' +
                '<div class="hud-label-row"><div class="hud-icon">' + icons.user + '</div><span class="info-label">Cargo</span></div>' +
                '<div id="hudRole" class="info-value role-value">-</div>' + 
            '</div>' +
            '<div class="hud-group">' +
                '<div class="hud-label-row"><div class="hud-icon">' + icons.book + '</div><span class="info-label">Treinamento</span></div>' +
                '<div id="hudCourse" class="info-value">-</div>' +
            '</div>' +
        '</div>' +
    '</div>' + 
    '<div id="hudStatus" class="hud-footer status-bg-none">' + icons.ban + ' Selecione</div>' +
    '</div></th>';
    
    config.cargos.forEach((cargo, index) => {
        if (filtroCargo !== 'all' && cargo.id.toString() !== filtroCargo) return;
        const isSelected = (filtroCargo === cargo.id.toString());
        const activeClass = isSelected ? 'selected-col-header' : '';
        // Note: data-col usa o INDEX do array para cache, mas onclick pode usar nome
        headerHTML += `<th class="${activeClass}" data-col="${index}" onclick="document.getElementById('roleFilter').value='${cargo.nome}'; atualizarFiltros();"><div class="role-wrapper ${cargo.corClass}"><div class="vertical-text">${cargo.nome}</div></div></th>`;
    });
    headerHTML += '</tr>';
    thead.innerHTML = headerHTML;

    // --- B. CORPO (LINHAS DE CURSOS) ---
    let bodyHTML = '';
    const treinamentosSorted = config.treinamentos;

    treinamentosSorted.forEach((treino, treinoIndex) => {
        // --- FILTROS ---
        if (filtroCategoria && filtroCategoria !== 'all' && filtroCategoria !== '') {
            const catAtual = (treino.categoria || "").trim();
            const catFiltro = filtroCategoria.trim();
            if (catAtual !== catFiltro) return;
        }

        if (filtroTexto && !treino.nome.toLowerCase().includes(filtroTexto.toLowerCase())) return;

        let rowCellsHTML = '';
        let linhaPassa = (filtroObrigatoriedade === 'all'); 

        config.cargos.forEach((cargo, index) => {
            if (filtroCargo !== 'all' && cargo.id.toString() !== filtroCargo) return;
            
            // Verifica relação na View que trouxemos do banco
            const ehO = cargo.obrigatorios?.includes(treino.id);
            const ehR = cargo.recomendados?.includes(treino.id);
            let tipoReq = ehO ? 'mandatory' : (ehR ? 'recommended' : 'none');
            
            if (filtroObrigatoriedade !== 'all' && tipoReq === filtroObrigatoriedade) linhaPassa = true;
            
            const isSelected = (filtroCargo === cargo.id.toString());
            const activeClassCell = isSelected ? 'selected-col' : '';
            
            // --- CÉLULA INTERATIVA ---
            // Passamos 'index' do cargo no array para o MenuContexto saber qual cargo é
            rowCellsHTML += `<td class="${activeClassCell}" 
                                 data-col="${index}" 
                                 data-status="${tipoReq}" 
                                 onclick="abrirMenuContexto(event, ${index}, ${treino.id})">
                                 <div class="cell-content">
                                    ${ehO ? '<span class="status-dot O"></span>' : (ehR ? '<span class="status-dot R"></span>' : '')}
                                 </div>
                             </td>`;
        });

        if (linhaPassa) {
            const tooltipText = treino.desc ? treino.desc : "Sem descrição disponível.";
            const badgeColor = treino.color || "#64748b";
            const categoriaDisplay = treino.categoria || "GERAL";
            
            // --- CABEÇALHO DA LINHA (PILULAS) ---
            bodyHTML += `
            <tr data-row="${treinoIndex}">
                <th style="--cat-color: ${badgeColor}; background-color: ${badgeColor}15; cursor: pointer;" 
                    data-tooltip="${tooltipText}"
                    onclick="editarTreinamento(${treino.id})">
                    
                    <div class="row-header-content" style="display: flex; flex-direction: row; align-items: center; justify-content: flex-start; gap: 6px; height: 100%; padding: 0 8px; width: 100%;">
                        <div style="background: #ffffff; border: 1px solid ${badgeColor}; color: ${badgeColor}; font-size: 8px; font-weight: 800; text-transform: uppercase; padding: 3px 8px; border-radius: 100px; white-space: nowrap; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); line-height: 1.2;">
                            ${categoriaDisplay}
                        </div>

                        <div style="background: #ffffff; color: #1e293b; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 100px; border: 1px solid #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-grow: 1; min-width: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); line-height: 1.2;">
                            ${treino.nome}
                        </div>
                    </div>
                </th>
                ${rowCellsHTML}
            </tr>`;
        }
    });
    tbody.innerHTML = bodyHTML;
    
    // Reconstrói cache para hover
    const allCells = table.querySelectorAll('[data-col]');
    allCells.forEach(cell => {
        const cIndex = cell.dataset.col;
        if (!colCache[cIndex]) colCache[cIndex] = [];
        colCache[cIndex].push(cell);
    });

    // Reativa eventos do HUD
    vincularEventosLupa();
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
    // Toggle via clique na coluna
    if (valorCargoClick !== undefined) {
        const cargoObj = config.cargos.find(c => c.id.toString() === valorCargoClick);
        const inputRole = document.getElementById('roleFilter');
        if (cargoObj) {
            inputRole.value = (inputRole.value === cargoObj.nome) ? '' : cargoObj.nome;
        }
    }

    const roleName = document.getElementById('roleFilter').value;
    const roleVal = getCargoIdByName(roleName); 
    let catVal = document.getElementById('categoryFilter').value;
    if (catVal === '') catVal = 'all'; 

    const obrigSelect = document.getElementById('statusFilter');
    const statusWrapper = document.getElementById('statusWrapper'); 
    const textVal = document.getElementById('textSearch').value.toLowerCase();

    if (roleVal === 'all') {
        if (statusWrapper) statusWrapper.style.display = 'none';
        obrigSelect.value = 'all';
        obrigSelect.disabled = true;
    } else {
        if (statusWrapper) statusWrapper.style.display = 'flex';
        obrigSelect.disabled = false;
    }

    atualizarFiltroHUD(roleVal, catVal, obrigSelect.value);
    renderizarMatriz(roleVal, catVal, textVal, obrigSelect.value);
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

    const obrigatoriedadeMap = { mandatory: 'Obrigatório', recommended: 'Recomendável', none: 'Não Obrigatório', all: 'Todas' };
    tagStatus.textContent = obrigatoriedadeMap[obrigatoriedade] || "Todas";
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
// 5. INTERAÇÃO E ADMIN (Obrigatoriedade, Edição, Exclusão)
// =============================================================================

// A. Menu de Contexto (Bolinhas)
window.abrirMenuContexto = function(event, cargoIndex, treinoId) {
    if (!window.isAdminMode) return; // Segurança Front-end

    event.preventDefault();
    event.stopPropagation();

    // Recupera o ID real do cargo baseado no índice do array
    const cargoReal = config.cargos[cargoIndex];
    if(!cargoReal) return;

    contextoAdmin.cargoId = cargoReal.id;
    contextoAdmin.treinoId = treinoId;

    const menu = document.getElementById('contextMenuCell');
    const overlay = document.getElementById('contextMenuOverlay');
    
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    
    menu.classList.remove('hidden');
    overlay.classList.remove('hidden');
};

window.fecharMenuContexto = function() {
    document.getElementById('contextMenuCell').classList.add('hidden');
    document.getElementById('contextMenuOverlay').classList.add('hidden');
};

window.selecionarOpcaoRelacao = function(novoStatus) {
    window.fecharMenuContexto();
    contextoAdmin.acaoPendente = novoStatus;
    abrirModalConfirmacao();
};

// B. Modal de Confirmação (Log)
function abrirModalConfirmacao() {
    const modal = document.getElementById('modalConfirmacao');
    const lblDetail = document.getElementById('lblChangeDetail');
    const auditTime = document.getElementById('auditTime');
    const auditIP = document.getElementById('auditIP');

    const agora = new Date();
    auditTime.textContent = agora.toLocaleString('pt-BR');
    auditIP.textContent = "192.168.1.10"; // IP simulado
    
    let desc = "";
    if (contextoAdmin.acaoPendente) {
        const statusMap = { 'mandatory': 'OBRIGATÓRIO', 'recommended': 'RECOMENDÁVEL', 'none': 'REMOVIDO' };
        desc = `Definir Treinamento ID ${contextoAdmin.treinoId} para Cargo ID ${contextoAdmin.cargoId} como: ${statusMap[contextoAdmin.acaoPendente]}`;
    }
    lblDetail.textContent = desc;
    modal.classList.remove('hidden');
}

window.fecharModalConfirmacao = function() {
    document.getElementById('modalConfirmacao').classList.add('hidden');
    contextoAdmin.acaoPendente = null;
};

window.confirmarAcaoSegura = async function() {
    const { cargoId, treinoId, acaoPendente } = contextoAdmin;

    try {
        if (acaoPendente) {
            // Salva no Supabase
            await DBHandler.atualizarRegra(cargoId, treinoId, acaoPendente);
            
            // Atualiza localmente para feedback instantâneo
            const cargo = config.cargos.find(c => c.id === cargoId);
            if(cargo) {
                // Remove status atual
                cargo.obrigatorios = (cargo.obrigatorios || []).filter(id => id !== treinoId);
                cargo.recomendados = (cargo.recomendados || []).filter(id => id !== treinoId);
                // Adiciona novo
                if(acaoPendente === 'mandatory') cargo.obrigatorios.push(treinoId);
                if(acaoPendente === 'recommended') cargo.recomendados.push(treinoId);
            }
            // Redesenha a tabela
            const roleName = document.getElementById('roleFilter').value;
            const roleVal = getCargoIdByName(roleName); 
            renderizarMatriz(roleVal, 'all', '', 'all');
        }
        window.fecharModalConfirmacao();
        alert("✅ Alteração registrada com sucesso!");
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar alteração.");
    }
};

// C. Gestão de Treinamentos (Novo/Editar)
window.abrirModalTreinamento = function() {
    document.getElementById('inputHiddenId').value = "";
    document.getElementById('inputNomeTreino').value = "";
    document.getElementById('inputCatTreino').value = "";
    document.getElementById('inputCorTreino').value = "#3b82f6";
    document.getElementById('inputDescTreino').value = "";
    document.getElementById('inputLinkTreino').value = "";
    document.getElementById('modalTitle').textContent = "Novo Treinamento";
    document.getElementById('btnExcluirTreino').style.display = 'none';
    document.getElementById('modalTreino').classList.remove('hidden');
};

window.editarTreinamento = function(id) {
    if (!window.isAdminMode) return; // Só edita se for Admin

    const treino = config.treinamentos.find(t => t.id === id);
    if (!treino) return;

    document.getElementById('inputHiddenId').value = treino.id;
    document.getElementById('inputNomeTreino').value = treino.nome;
    document.getElementById('inputCatTreino').value = treino.categoria;
    document.getElementById('inputCorTreino').value = treino.color || "#3b82f6";
    document.getElementById('inputDescTreino').value = treino.desc || "";
    document.getElementById('inputLinkTreino').value = treino.link || "";

    document.getElementById('modalTitle').textContent = "Editar Treinamento";
    document.getElementById('btnExcluirTreino').style.display = 'block';
    document.getElementById('modalTreino').classList.remove('hidden');
};

window.fecharModalTreinamento = function() {
    document.getElementById('modalTreino').classList.add('hidden');
};

window.salvarNovoTreinamento = async function() {
    const id = document.getElementById('inputHiddenId').value;
    const treino = {
        id: id ? parseInt(id) : null,
        nome: document.getElementById('inputNomeTreino').value,
        categoria: document.getElementById('inputCatTreino').value,
        color: document.getElementById('inputCorTreino').value,
        desc: document.getElementById('inputDescTreino').value,
        link: document.getElementById('inputLinkTreino').value
    };

    if (!treino.nome || !treino.categoria) {
        alert("Preencha Nome e Categoria!");
        return;
    }

    try {
        const salvo = await DBHandler.salvarTreinamento(treino);
        
        if (id) {
            const index = config.treinamentos.findIndex(t => t.id == id);
            if (index >= 0) config.treinamentos[index] = { ...treino, id: parseInt(id) };
        } else {
            config.treinamentos.push({ ...treino, id: salvo.id });
        }
        
        // Atualiza filtros com nova categoria se houver
        init(); 
        
        window.fecharModalTreinamento();
        alert("Treinamento salvo!");
    } catch (e) {
        console.error(e);
        alert("Erro ao salvar.");
    }
};

window.excluirTreinamento = async function() {
    const id = document.getElementById('inputHiddenId').value;
    if (!id) return;
    if(!confirm("Tem certeza?")) return;

    try {
        await DBHandler.excluirTreinamento(parseInt(id));
        config.treinamentos = config.treinamentos.filter(t => t.id != id);
        init();
        window.fecharModalTreinamento();
    } catch (e) {
        console.error(e);
        alert("Erro ao excluir.");
    }
};

// =============================================================================
// 6. EVENTOS DE UI (HUD Hover)
// =============================================================================
function vincularEventosLupa() {
    const cells = document.querySelectorAll('#matrixTable td');
    const hudScan = document.getElementById('hudScan');
    const hudData = document.getElementById('hudData');
    const hudRole = document.getElementById('hudRole');
    const hudCourse = document.getElementById('hudCourse');
    const hudStatus = document.getElementById('hudStatus');

    if (!hudScan || !hudData) return;

    cells.forEach(cell => {
        cell.addEventListener('mouseenter', (e) => {
            const row = e.target.parentElement;
            const rowIndex = row.dataset.row;
            const colIndex = e.target.dataset.col;
            const status = e.target.dataset.status;

            const treino = config.treinamentos[rowIndex];
            const cargo = config.cargos[colIndex];

            if (treino && cargo) {
                hudScan.style.display = 'none';
                hudData.style.display = 'flex';
                
                hudRole.textContent = cargo.nome;
                hudCourse.textContent = treino.nome;

                // Status Footer
                hudStatus.className = 'hud-footer'; // reset
                if (status === 'mandatory') {
                    hudStatus.innerHTML = `${icons.star} Obrigatório`;
                    hudStatus.classList.add('status-bg-mandatory');
                } else if (status === 'recommended') {
                    hudStatus.innerHTML = `${icons.check} Recomendável`;
                    hudStatus.classList.add('status-bg-recommended');
                } else {
                    hudStatus.innerHTML = `${icons.ban} Não Aplicável`;
                    hudStatus.classList.add('status-bg-none');
                }

                // Destaque Coluna
                if (lastHighlightedCol && colCache[lastHighlightedCol]) {
                    colCache[lastHighlightedCol].forEach(c => c.classList.remove('hover-col'));
                    // Remove destaque do cabeçalho também (opcional)
                }
                if (colCache[colIndex]) {
                    colCache[colIndex].forEach(c => c.classList.add('hover-col'));
                    lastHighlightedCol = colIndex;
                }
            }
        });

        cell.addEventListener('mouseleave', () => {
            // Opcional: Limpar ao sair da tabela
        });
    });
}

// =============================================================================
// 6. EVENTOS DE UI (HUD Hover e Destaques)
// =============================================================================

function vincularEventosLupa() {
    const table = document.getElementById('matrixTable');
    if (!table) return;

    // Remove listener anterior se existir (para evitar duplicação em re-render)
    table.onmouseover = null;
    table.onmouseleave = null;

    table.onmouseover = (e) => {
        const target = e.target;
        
        // Identifica o tipo de elemento sob o mouse
        const td = target.closest('td');          // Célula de status
        const thRow = target.closest('tbody th'); // Cabeçalho da Linha (Curso)
        const thCol = target.closest('thead th'); // Cabeçalho da Coluna (Cargo)

        if (!td && !thRow && !thCol) return;

        // Elementos do HUD
        const hudScan = document.getElementById('hudScan');
        const hudData = document.getElementById('hudData');
        const hudRole = document.getElementById('hudRole');
        const hudCourse = document.getElementById('hudCourse');
        const hudStatus = document.getElementById('hudStatus');
        const hudBody = document.getElementById('hudBody'); 

        if (!hudData || !hudBody) return;

        // Helper para limpar nome do curso (remove prefixo se houver ":")
        const getCleanCourseName = (rowIndex) => {
            if (!config.treinamentos[rowIndex]) return "-";
            const fullName = config.treinamentos[rowIndex].nome;
            return fullName.includes(':') ? fullName.substring(fullName.indexOf(':') + 1).trim() : fullName;
        };

        // Helper para limpar cores de fundo anteriores
        const resetBackgroundClasses = () => {
            hudBody.classList.remove('bg-mandatory', 'bg-recommended', 'bg-none');
        };

        // CENÁRIO 1: Mouse sobre uma Célula (Intersecção)
        if (td && td.dataset.col) {
            const colIndex = parseInt(td.dataset.col);
            const tr = td.closest('tr');
            const rowIndex = parseInt(tr.dataset.row);
            const tipoReq = td.dataset.status; // 'mandatory', 'recommended', 'none'

            // Atualiza Visibilidade
            hudScan.style.display = 'none';
            hudData.style.display = 'flex';

            // Preenche Textos
            hudRole.textContent = config.cargos[colIndex] ? config.cargos[colIndex].nome : "-";
            hudCourse.textContent = getCleanCourseName(rowIndex);

            // Atualiza Estilo do Corpo do HUD
            resetBackgroundClasses();
            if (tipoReq === 'mandatory') {
                hudBody.classList.add('bg-mandatory');
            } else if (tipoReq === 'recommended') {
                hudBody.classList.add('bg-recommended');
            } else {
                hudBody.classList.add('bg-none');
            }

            // Atualiza Rodapé do HUD
            hudStatus.className = 'hud-footer status-bg-' + tipoReq;
            if (tipoReq === 'mandatory') {
                hudStatus.innerHTML = `${icons.check} Obrigatório`;
            } else if (tipoReq === 'recommended') {
                hudStatus.innerHTML = `${icons.star} Recomendável`;
            } else {
                hudStatus.innerHTML = `${icons.ban} Não Obrigatório`;
            }
        } 
        // CENÁRIO 2: Mouse sobre o Curso (Linha)
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
        // CENÁRIO 3: Mouse sobre o Cargo (Coluna)
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
        }
    };
    
    // Quando o mouse sai da tabela, reseta o HUD
    table.onmouseleave = () => {
        const hudScan = document.getElementById('hudScan');
        const hudData = document.getElementById('hudData');
        const hudStatus = document.getElementById('hudStatus');
        
        if (hudScan && hudData) {
            hudScan.style.display = 'flex';
            hudData.style.display = 'none';
            if (hudStatus) {
                hudStatus.className = 'hud-footer status-bg-none';
                hudStatus.innerHTML = `${icons.ban} Selecione`;
            }
        }
    };
}

// Lógica de Destaque Vertical (Coluna)
function vincularEventosDestaque() {
    const table = document.getElementById('matrixTable');
    if (!table) return;
    
    // Usa addEventListener para não conflitar com o onmouseover da lupa
    table.removeEventListener('mouseover', handleMouseOverOpt);
    table.removeEventListener('mouseleave', limparDestaqueOpt);
    
    table.addEventListener('mouseover', handleMouseOverOpt);
    table.addEventListener('mouseleave', limparDestaqueOpt);
}

function handleMouseOverOpt(e) {
    const target = e.target;
    // Procura célula ou cabeçalho que tenha data-col
    const el = target.closest('[data-col]');
    
    if (!el) {
        if (lastHighlightedCol !== null) limparDestaqueOpt();
        return;
    }
    
    const newColIndex = el.dataset.col;
    if (lastHighlightedCol === newColIndex) return; // Evita reflow desnecessário
    
    limparDestaqueOpt();
    destacarColunaOpt(newColIndex);
}

function destacarColunaOpt(index) {
    lastHighlightedCol = index;
    const cellsToHighlight = colCache[index];
    
    if (cellsToHighlight) {
        for (let i = 0; i < cellsToHighlight.length; i++) {
            const cell = cellsToHighlight[i];
            if (cell.tagName === 'TH') {
                cell.classList.add('hover-col-header');
            } else {
                cell.classList.add('hover-col');
            }
        }
    }
}

function limparDestaqueOpt() {
    if (lastHighlightedCol !== null) {
        const cellsToClear = colCache[lastHighlightedCol];
        if (cellsToClear) {
            for (let i = 0; i < cellsToClear.length; i++) {
                const cell = cellsToClear[i];
                cell.classList.remove('hover-col', 'hover-col-header');
            }
        }
        lastHighlightedCol = null;
    }
}

// =============================================================================
// 5. GESTÃO DE MODAIS E NOVO TREINAMENTO
// =============================================================================

window.abrirModalTreinamento = function() {
    const modal = document.getElementById('modalTreino');
    if (modal) {
        modal.classList.remove('hidden');
        
        // Popula o Datalist do modal com as categorias existentes
        const datalist = document.getElementById('catListModal');
        // Acessa a variável global 'config' definida no início do arquivo
        if (datalist && typeof config !== 'undefined' && config.treinamentos) {
            datalist.innerHTML = '';
            const cats = [...new Set(config.treinamentos.map(t => t.categoria))].filter(Boolean).sort();
            cats.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                datalist.appendChild(opt);
            });
        }
        
        // Foco no primeiro campo
        setTimeout(() => {
            const input = document.getElementById('inputNomeTreino');
            if(input) input.focus();
        }, 100);
    }
};

window.fecharModalTreinamento = function() {
    const modal = document.getElementById('modalTreino');
    if (modal) modal.classList.add('hidden');
    
    // Limpa TUDO para garantir que próxima abertura seja "Novo"
    const fields = ['inputHiddenId', 'inputNomeTreino', 'inputCatTreino', 'inputDescTreino', 'inputLinkTreino'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });

    // Reseta cor para o padrão
    const colorPicker = document.getElementById('inputCorTreino');
    if(colorPicker) colorPicker.value = '#3b82f6';
    const hexDisplay = document.getElementById('hexColorDisplay');
    if(hexDisplay) hexDisplay.textContent = '#3B82F6';
    
    // Reseta visual do modal
    const title = document.getElementById('modalTitle');
    if(title) title.textContent = "Novo Treinamento";
    
    const btnDel = document.getElementById('btnExcluirTreino');
    if(btnDel) btnDel.style.display = 'none';
};

window.salvarNovoTreinamento = async function() {
    const idExistente = document.getElementById('inputHiddenId').value;
    const nome = document.getElementById('inputNomeTreino').value.trim();
    const categoria = document.getElementById('inputCatTreino').value.trim();
    const desc = document.getElementById('inputDescTreino').value.trim();
    const link = document.getElementById('inputLinkTreino').value.trim();
    const cor = document.getElementById('inputCorTreino').value;

    if (!nome || !categoria) { alert("Preencha Nome e Categoria!"); return; }

    const dadosFormulario = { nome, categoria: categoria.toUpperCase(), desc, link, color: cor };
    if (idExistente) dadosFormulario.id = parseInt(idExistente);

    try {
        // 1. Salva no Banco de Dados
        await DBHandler.salvarTreinamento(dadosFormulario);
        
        // 2. Recarrega dados REAIS do banco para manter sincronia
        const dadosAtualizados = await DBHandler.carregarDadosIniciais();
        
        // 3. Atualiza a variável global 'config' e 'db'
        config = dadosAtualizados;
        // Se houver variável global 'db', atualiza também
        if (typeof db !== 'undefined') db.dados = config; 
        
        // 4. Redesenha a tela
        init(); // Recria filtros e listas
        window.atualizarFiltros(); // Redesenha a matriz
        window.fecharModalTreinamento();
        
        alert("Salvo com sucesso!");

    } catch (e) {
        console.error(e);
        alert("Erro ao salvar no banco. Verifique o console.");
    }
};

// =============================================================================
// 6. UTILITÁRIOS E AUTOMAÇÃO VISUAL
// =============================================================================

// Atualiza o texto do Hexadecimal quando muda a cor no input color
const inputCor = document.getElementById('inputCorTreino');
if (inputCor) {
    inputCor.addEventListener('input', (e) => {
        const hexDisplay = document.getElementById('hexColorDisplay');
        if(hexDisplay) {
            hexDisplay.textContent = e.target.value.toUpperCase();
            hexDisplay.style.display = 'inline'; // Garante que aparece
        }
    });
}

// Automação de Cor por Categoria (Ao digitar a categoria, puxa a cor existente)
const inputCat = document.getElementById('inputCatTreino');
if (inputCat && inputCor) {
    inputCat.addEventListener('input', function() {
        const valorDigitado = this.value.trim();
        if (!valorDigitado || typeof config === 'undefined') return;

        // Busca se existe algum treinamento com essa categoria exata
        const match = config.treinamentos.find(t => 
            t.categoria.toUpperCase() === valorDigitado.toUpperCase()
        );

        if (match && match.color) {
            inputCor.value = match.color;
            const hexDisplay = document.getElementById('hexColorDisplay');
            if (hexDisplay) hexDisplay.textContent = match.color.toUpperCase();
        }
    });
}

// =============================================================================
// 7. MANUTENÇÃO (EDIÇÃO E EXCLUSÃO)
// =============================================================================

window.editarTreinamento = function(id) {
    if (!window.isAdminMode) return; // Segurança visual

    // Encontra o treino na memória global
    const treino = config.treinamentos.find(t => t.id === id);
    if (!treino) return;

    // Preenche o Modal
    document.getElementById('inputHiddenId').value = treino.id;
    document.getElementById('inputNomeTreino').value = treino.nome;
    document.getElementById('inputCatTreino').value = treino.categoria;
    document.getElementById('inputDescTreino').value = treino.desc || '';
    document.getElementById('inputLinkTreino').value = treino.link || '';
    
    const cor = treino.color || '#3b82f6';
    document.getElementById('inputCorTreino').value = cor;
    
    const hexDisplay = document.getElementById('hexColorDisplay');
    if(hexDisplay) {
        hexDisplay.textContent = cor.toUpperCase();
        hexDisplay.style.display = 'inline';
    }
    
    // Ajusta Interface para Modo Edição
    document.getElementById('modalTitle').textContent = "Editar Treinamento";
    document.getElementById('btnExcluirTreino').style.display = 'block';

    window.abrirModalTreinamento();
};

window.excluirTreinamento = async function() {
    const id = document.getElementById('inputHiddenId').value;
    if (!id) return;

    if (confirm("Tem certeza que deseja EXCLUIR este treinamento permanentemente?")) {
        try {
            await DBHandler.excluirTreinamento(parseInt(id));
            
            // Recarrega dados
            const dadosAtualizados = await DBHandler.carregarDadosIniciais();
            config = dadosAtualizados;
            if (typeof db !== 'undefined') db.dados = config;

            window.fecharModalTreinamento();
            init();
            window.atualizarFiltros();
            
            alert("Treinamento excluído com sucesso!");

        } catch (e) {
            console.error("Erro ao excluir:", e);
            alert("Não foi possível excluir o treinamento.");
        }
    }
};

// =============================================================================
// 8. CONTROLE DE ACESSO E SESSÃO (ADMIN)
// =============================================================================

// Define globalmente para o restante do script acessar
window.isAdminMode = false;
let currentUser = null;

// Função de verificação inicial (Chamada no DOMContentLoaded)
function verificarSessaoInicial() {
    const sessionRaw = localStorage.getItem('rh_session');
    
    if (sessionRaw) {
        try {
            currentUser = JSON.parse(sessionRaw);
            console.log("👤 Usuário logado:", currentUser.user);

            if (currentUser.role === 'ADMIN') {
                ativarModoAdmin(true);
            }
        } catch (e) {
            console.error("Erro ao ler sessão", e);
        }
    } else {
        console.log("👤 Acesso anônimo (Leitura)");
    }
}

// Botão de Cadeado no Topo
window.toggleAdminMode = function() {
    if (currentUser) {
        // Logout
        if (confirm(`Deseja sair da conta de ${currentUser.user}?`)) {
            fazerLogout();
        }
    } else {
        // Login: Se não estiver logado, redireciona para página de login
        // Se estiverem na mesma pasta:
        window.location.href = 'login.html'; 
    }
};

function ativarModoAdmin(silencioso = false) {
    window.isAdminMode = true;
    document.body.classList.add('is-admin');
    
    // Atualiza ícones do topo
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
    
    // Atualiza ícones
    const btn = document.getElementById('btnAdminToggle');
    const iconClosed = document.getElementById('iconLockClosed');
    const iconOpen = document.getElementById('iconLockOpen');

    if (btn) {
        btn.classList.remove('unlocked');
        btn.title = "Acesso Restrito";
        if(iconClosed) iconClosed.style.display = 'block';
        if(iconOpen) iconOpen.style.display = 'none';
    }

    // Redireciona
    window.location.href = 'index.html'; 
}

// Executa verificação ao carregar este script
verificarSessaoInicial();


// =============================================================================
// 9. EDIÇÃO DE RELACIONAMENTO (LÓGICA DE NEGÓCIO)
// =============================================================================

async function alternarRelacao(cargoIndex, treinoId) {
    // 1. Segurança: Só permite se estiver no Modo Admin
    if (!window.isAdminMode) return;

    const cargo = config.cargos[cargoIndex];
    if (!cargo) return;

    // 2. Identifica o estado atual nos dados carregados
    const isObrig = cargo.obrigatorios && cargo.obrigatorios.includes(treinoId);
    const isRecom = cargo.recomendados && cargo.recomendados.includes(treinoId);

    // 3. Determina o PRÓXIMO estado (Ciclo: Nada -> Obrigatório -> Recomendado -> Nada)
    let novoStatus = '';
    let msgConfirmacao = '';

    if (!isObrig && !isRecom) {
        novoStatus = 'mandatory';
        msgConfirmacao = `Definir como <strong style="color:#ef4444">OBRIGATÓRIO</strong>?`;
    } 
    else if (isObrig) {
        novoStatus = 'recommended';
        msgConfirmacao = `Mudar para <strong style="color:#eab308">RECOMENDÁVEL</strong>?`;
    } 
    else if (isRecom) {
        novoStatus = 'none';
        msgConfirmacao = `<strong>REMOVER</strong> a regra deste curso?`;
    }

    // 4. Dispara o Fluxo de Auditoria (Em vez de confirm() nativo)
    exibirModalAuditoria(msgConfirmacao, {
        TIPO: 'RELACAO',
        cargoIndex: cargoIndex,
        treinoId: treinoId,
        novoStatus: novoStatus
    });
}

// =============================================================================
// 10. LÓGICA DO MENU DE CONTEXTO (CLIQUE DIREITO / ESQUERDO)
// =============================================================================

// Variáveis temporárias globais para o contexto
let tempCargoIndex = null;
let tempTreinoId = null;

// Exposta globalmente para ser chamada pelo HTML
window.abrirMenuContexto = function(e, cargoIndex, treinoId) {
    if (!window.isAdminMode) return;

    e.preventDefault();
    e.stopPropagation();

    // Salva referências
    tempCargoIndex = parseInt(cargoIndex);
    tempTreinoId = parseInt(treinoId);

    const menu = document.getElementById('contextMenuCell');
    const overlay = document.getElementById('contextMenuOverlay');
    
    // Posicionamento inteligente (evita sair da tela)
    let x = e.pageX;
    let y = e.pageY;
    
    // Ajuste simples para borda direita
    if (x + 160 > window.innerWidth) x -= 160;
    
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    menu.classList.remove('hidden');
    overlay.classList.remove('hidden');
};

window.fecharMenuContexto = function() {
    const menu = document.getElementById('contextMenuCell');
    const overlay = document.getElementById('contextMenuOverlay');
    if (menu) menu.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
};

window.selecionarOpcaoRelacao = function(novoStatus) {
    // 1. Validação
    if (tempCargoIndex === null || tempTreinoId === null) return;
    
    const cargo = config.cargos[tempCargoIndex];
    if (!cargo) return;

    // 2. Prepara mensagem de Auditoria
    const mapa = { 
        'mandatory': '<span style="color:#ef4444; font-weight:800;">OBRIGATÓRIO</span>', 
        'recommended': '<span style="color:#eab308; font-weight:800;">RECOMENDÁVEL</span>', 
        'none': '<span style="color:#94a3b8; font-weight:800;">NÃO OBRIGATÓRIO</span>' 
    };
    
    const msg = `Alterar regra para: ${mapa[novoStatus]}`;

    fecharMenuContexto();
    
    // 3. Abre Modal de Confirmação
    exibirModalAuditoria(msg, {
        TIPO: 'RELACAO',
        cargoIndex: tempCargoIndex,
        treinoId: tempTreinoId,
        novoStatus: novoStatus
    });
};

// =============================================================================
// 11. CENTRAL DE SEGURANÇA E AUDITORIA (MODAL CONFIRMAÇÃO)
// =============================================================================

let pendingChange = null; 

function exibirModalAuditoria(mensagemHTML, changeObject) {
    pendingChange = changeObject;

    const lbl = document.getElementById('lblChangeDetail');
    if(lbl) lbl.innerHTML = mensagemHTML;
    
    const timeEl = document.getElementById('auditTime');
    if(timeEl) timeEl.textContent = new Date().toLocaleString('pt-BR');

    const elIP = document.getElementById('auditIP');
    if(elIP) {
        elIP.textContent = "Verificando...";
        setTimeout(() => elIP.textContent = "192.168.1." + Math.floor(Math.random() * 255), 300);
    }

    const modal = document.getElementById('modalConfirmacao');
    if(modal) modal.classList.remove('hidden');
}

window.fecharModalConfirmacao = function() {
    const modal = document.getElementById('modalConfirmacao');
    if(modal) modal.classList.add('hidden');
    pendingChange = null;
};

window.confirmarAcaoSegura = async function() {
    if (!pendingChange) return;

    try {
        // --- CENÁRIO A: MUDANÇA DE REGRA ---
        if (pendingChange.TIPO === 'RELACAO') {
            const { cargoIndex, treinoId, novoStatus } = pendingChange;
            const cargoId = config.cargos[cargoIndex].id; // Pega ID real do cargo

            // 1. Envia ao Banco
            await DBHandler.atualizarRegra(cargoId, treinoId, novoStatus);
        }
        
        // --- CENÁRIO B: OUTROS TIPOS FUTUROS ---
        // (Aqui você pode adicionar lógica para exclusão ou edição crítica se quiser centralizar)

        // 2. Refresh Global dos Dados
        // Recarrega tudo do banco para garantir que a UI mostre a verdade
        const dadosFrescos = await DBHandler.carregarDadosIniciais();
        config = dadosFrescos;
        if (typeof db !== 'undefined') db.dados = config;

        // 3. Atualiza a UI mantendo os filtros atuais
        const roleFilter = document.getElementById('roleFilter').value;
        const catFilter = document.getElementById('categoryFilter').value || 'all';
        const textFilter = document.getElementById('textSearch').value;
        const statusFilter = document.getElementById('statusFilter').value;

        // Reencontra o ID do cargo baseado no nome que está no filtro
        const cargoObj = config.cargos.find(c => c.nome === roleFilter);
        const cargoIdFilter = cargoObj ? cargoObj.id.toString() : 'all';

        renderizarMatriz(cargoIdFilter, catFilter, textFilter, statusFilter);

        fecharModalConfirmacao();
        
        // Feedback discreto (opcional, já que a UI atualiza)
        // alert("Alteração registrada.");

    } catch (e) {
        console.error("Erro na operação:", e);
        alert("Erro ao salvar alteração: " + e.message);
    }
};






