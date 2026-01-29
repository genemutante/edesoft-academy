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

// Variáveis globais
let db;
let config;

// CACHE DE PERFORMANCE
let colCache = {}; 
let lastHighlightedCol = null;

// =============================================================================
// 2. INICIALIZAÇÃO (CONEXÃO COM BANCO)
// =============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log("🔄 Iniciando sistema...");

        // 1. Carrega dados via DBHandler (que já traz a View formatada)
        const dados = await DBHandler.carregarDadosIniciais();
        config = dados; 
        
        // Atribui ao db também para manter compatibilidade se usado em outro lugar
        db = { dados: config };

        console.log("✅ Dados carregados!", config);
        
        // 2. Inicializa a tela
        if (typeof init === 'function') init();
        
        // 3. Verifica sessão
        if (typeof verificarSessaoInicial === 'function') verificarSessaoInicial();

    } catch (e) {
        console.error("⛔ Erro fatal na inicialização:", e);
        alert("Erro ao conectar com o banco de dados. Veja o console.");
    }
});

// ... (O resto do seu código: função init(), renderMatrix(), etc.) ...
function init() {
    if (typeof config === 'undefined') return;

    // --- 1. POPULAR DATALIST DE CARGOS ---
    const roleList = document.getElementById('roleList');
    if (roleList) {
        roleList.innerHTML = '';
        config.cargos.forEach(cargo => {
            const option = document.createElement('option');
            option.value = cargo.nome; // Valor visual
            roleList.appendChild(option);
        });
    }

    // --- 2. POPULAR DATALIST DE CATEGORIAS (CORRIGIDO) ---
    const catList = document.getElementById('catList');
    if (catList) {
        catList.innerHTML = '';
        
        // CORREÇÃO: Usamos direto t.categoria. Não fazemos split.
        // O filter(Boolean) remove categorias vazias ou nulas.
        const categoriasUnicas = [...new Set(config.treinamentos.map(t => t.categoria))].filter(Boolean);
        
        categoriasUnicas.sort().forEach(cat => {
            const option = document.createElement('option');
            option.value = cat; // Ex: "QA", "TI - DESENVOLVIMENTO"
            catList.appendChild(option);
        });
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
    // Adicionei verificação de icons para não quebrar se icons não existir
    if (btnClear && typeof icons !== 'undefined') btnClear.innerHTML = icons.filterClear || "Limpar";
    
    // Chama o filtro inicial
    atualizarFiltros(); 
}
// Helper: Converter Nome do Cargo em ID
function getCargoIdByName(nome) {
    if (!nome) return 'all';
    const cargo = config.cargos.find(c => c.nome === nome);
    return cargo ? cargo.id.toString() : 'all';
}

function atualizarFiltroHUD(cargoId, categoria, obrigatoriedade) {
    const tagRole = document.getElementById('tagRole');
    const tagCat = document.getElementById('tagCategory');
    const tagStatus = document.getElementById('tagStatus');
    const tagStatusContainer = document.getElementById('tagStatusContainer');
    const hudDividerStatus = document.getElementById('hudDividerStatus');

    // 1. Definição do Texto do Cargo
    let roleText = "Todos";
    if (cargoId !== 'all') {
        const cargoObj = config.cargos.find(c => c.id.toString() === cargoId);
        if (cargoObj) roleText = cargoObj.nome;
    }
    tagRole.textContent = roleText;
    tagRole.style.color = "#3b82f6"; 

    // 2. Atualização da Categoria
    tagCat.textContent = categoria === '' || categoria === 'all' ? "Todas" : categoria;
    tagCat.style.color = "#3b82f6"; 

    // 3. Atualização da Obrigatoriedade
    const obrigatoriedadeMap = { 
        mandatory: 'Obrigatório', 
        recommended: 'Recomendável',
        none: 'Não Obrigatório', 
        all: 'Todas' 
    };
    
    tagStatus.textContent = obrigatoriedadeMap[obrigatoriedade] || "Todas";
    tagStatus.style.color = "#3b82f6"; 
    
    const labelTitulo = tagStatusContainer ? tagStatusContainer.querySelector('.hud-label') : null;
    if(labelTitulo) labelTitulo.textContent = "OBRIGATORIEDADE";

    if (tagStatusContainer) tagStatusContainer.classList.remove('hidden');
    if (hudDividerStatus) hudDividerStatus.classList.remove('hidden');
}

function atualizarFiltros(valorCargoClick) {
    // --- LÓGICA DE TOGGLE (LIGAR/DESLIGAR) ---
    // Se a função foi chamada pelo clique na coluna (valorCargoClick existe)
    if (valorCargoClick !== undefined) {
        const cargoObj = config.cargos.find(c => c.id.toString() === valorCargoClick);
        const inputRole = document.getElementById('roleFilter');

        if (cargoObj) {
            // VERIFICAÇÃO: O input já está com o nome desse cargo?
            if (inputRole.value === cargoObj.nome) {
                // SIM -> Então o usuário quer DESMARCAR (Limpar filtro)
                inputRole.value = ''; 
            } else {
                // NÃO -> Então o usuário quer SELECIONAR esse cargo
                inputRole.value = cargoObj.nome;
            }
        }
    }

    // --- LEITURA DOS INPUTS (Continua igual) ---
    const roleName = document.getElementById('roleFilter').value;
    const roleVal = getCargoIdByName(roleName); // Converte Nome -> ID

    let catVal = document.getElementById('categoryFilter').value;
    if (catVal === '') catVal = 'all'; 

    const obrigSelect = document.getElementById('statusFilter');
    const statusWrapper = document.getElementById('statusWrapper'); 
    const textVal = document.getElementById('textSearch').value.toLowerCase();

    // Lógica de Visibilidade do Status
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
function limparFiltros() {
    // Limpa Inputs de Texto
    document.getElementById('roleFilter').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('textSearch').value = '';
    
    // Reseta Select
    document.getElementById('statusFilter').value = 'all';

    const obrigSelect = document.getElementById('statusFilter');
    const statusWrapper = document.getElementById('statusWrapper');

    if (statusWrapper) statusWrapper.style.display = 'none';
    if (obrigSelect) obrigSelect.disabled = true;

    const tagStatusContainer = document.getElementById('tagStatusContainer');
    const hudDividerStatus = document.getElementById('hudDividerStatus');
    if (tagStatusContainer) tagStatusContainer.classList.add('hidden');
    if (hudDividerStatus) hudDividerStatus.classList.add('hidden');

    atualizarFiltros();
}


function renderizarMatriz(filtroCargo, filtroCategoria, filtroTexto, filtroObrigatoriedade) {
    const table = document.getElementById('matrixTable');
    if (!table) return;
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

    // Reset do Cache
    colCache = {}; 
    lastHighlightedCol = null;

    // --- 1. CABEÇALHO (HUD + CARGOS) ---
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
        headerHTML += `<th class="${activeClass}" data-col="${index}" onclick="document.getElementById('roleFilter').value='${cargo.nome}'; atualizarFiltros();"><div class="role-wrapper ${cargo.corClass}"><div class="vertical-text">${cargo.nome}</div></div></th>`;
    });
    headerHTML += '</tr>';
    thead.innerHTML = headerHTML;

    // --- 2. CORPO (LINHAS DE CURSOS) ---
    let bodyHTML = '';
    
// CÓDIGO NOVO (RESPEITA A ORDEM DO ARQUIVO)
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
            
            const ehO = cargo.obrigatorios?.includes(treino.id);
            const ehR = cargo.recomendados?.includes(treino.id);
            let tipoReq = ehO ? 'mandatory' : (ehR ? 'recommended' : 'none');
            
            if (filtroObrigatoriedade !== 'all' && tipoReq === filtroObrigatoriedade) linhaPassa = true;
            
            const isSelected = (filtroCargo === cargo.id.toString());
            const activeClassCell = isSelected ? 'selected-col' : '';
            
            // --- AJUSTE: CHAMADA DO MENU DE CONTEXTO ---
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
            
            // --- SUGESTÃO PILLS LADO A LADO ---
            bodyHTML += `
            <tr data-row="${treinoIndex}">
                <th style="--cat-color: ${badgeColor}; background-color: ${badgeColor}15; cursor: pointer;" 
                    data-tooltip="${tooltipText}"
                    onclick="editarTreinamento(${treino.id})">
                    
                    <div class="row-header-content" style="
                        display: flex; 
                        flex-direction: row; 
                        align-items: center; 
                        justify-content: flex-start;
                        gap: 6px; 
                        height: 100%; 
                        padding: 0 8px; 
                        width: 100%;
                    ">
                        <div style="
                            background: #ffffff;
                            border: 1px solid ${badgeColor};
                            color: ${badgeColor};
                            font-size: 8px;
                            font-weight: 800;
                            text-transform: uppercase;
                            padding: 3px 8px;
                            border-radius: 100px;
                            white-space: nowrap;
                            flex-shrink: 0;
                            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                            line-height: 1.2;
                        ">
                            ${categoriaDisplay}
                        </div>

                        <div style="
                            background: #ffffff;
                            color: #1e293b;
                            font-size: 10px;
                            font-weight: 700;
                            padding: 3px 10px;
                            border-radius: 100px;
                            border: 1px solid #cbd5e1;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            flex-grow: 1;
                            min-width: 0;
                            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                            line-height: 1.2;
                        ">
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

    if(typeof vincularEventosLupa === 'function') vincularEventosLupa();
    if(typeof vincularEventosDestaque === 'function') vincularEventosDestaque();
}



function vincularEventosLupa() {
    const table = document.getElementById('matrixTable');
    if (!table) return;

    table.onmouseover = (e) => {
        const target = e.target;
        const td = target.closest('td');
        const thRow = target.closest('tbody th'); 
        const thCol = target.closest('thead th');

        if (!td && !thRow && !thCol) return;

        const hudScan = document.getElementById('hudScan');
        const hudData = document.getElementById('hudData');
        const hudRole = document.getElementById('hudRole');
        const hudCourse = document.getElementById('hudCourse');
        const hudStatus = document.getElementById('hudStatus');
        const hudBody = document.getElementById('hudBody'); 

        if (!hudData) return;

        const getCleanCourseName = (rowIndex) => {
            const fullName = config.treinamentos[rowIndex].nome;
            return fullName.includes(':') ? fullName.substring(fullName.indexOf(':') + 1).trim() : fullName;
        };

        const resetBackgroundClasses = () => {
            hudBody.classList.remove('bg-mandatory', 'bg-recommended', 'bg-none');
        };

        if (td && td.dataset.col) {
            const colIndex = parseInt(td.dataset.col);
            const tr = td.closest('tr');
            const rowIndex = parseInt(tr.dataset.row);
            const tipoReq = td.dataset.status;

            hudScan.style.display = 'none';
            hudData.style.display = 'flex';

            hudRole.textContent = config.cargos[colIndex].nome;
            hudCourse.textContent = getCleanCourseName(rowIndex);

            resetBackgroundClasses();
            if (tipoReq === 'mandatory') {
                hudBody.classList.add('bg-mandatory');
            } else if (tipoReq === 'recommended') {
                hudBody.classList.add('bg-recommended');
            } else {
                hudBody.classList.add('bg-none');
            }

            hudStatus.className = 'hud-footer status-bg-' + tipoReq;
            if (tipoReq === 'mandatory') {
                hudStatus.innerHTML = `${icons.check} Obrigatório`;
            } else if (tipoReq === 'recommended') {
                hudStatus.innerHTML = `${icons.star} Recomendável`;
            } else {
                hudStatus.innerHTML = `${icons.ban} Não Obrigatório`;
            }
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
            hudRole.textContent = config.cargos[colIndex].nome;
            hudCourse.textContent = "-";
            resetBackgroundClasses();
            hudBody.classList.add('bg-none');
            hudStatus.className = 'hud-footer status-bg-none';
            hudStatus.innerHTML = `${icons.user} Visualizando Cargo`;
        }
    };
    
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

function vincularEventosDestaque() {
    const table = document.getElementById('matrixTable');
    if (!table) return;
    table.removeEventListener('mouseover', handleMouseOverOpt);
    table.removeEventListener('mouseleave', limparDestaqueOpt);
    table.addEventListener('mouseover', handleMouseOverOpt);
    table.addEventListener('mouseleave', limparDestaqueOpt);
}

function handleMouseOverOpt(e) {
    const target = e.target;
    const el = target.closest('[data-col]');
    if (!el) {
        if (lastHighlightedCol !== null) limparDestaqueOpt();
        return;
    }
    const newColIndex = el.dataset.col;
    if (lastHighlightedCol === newColIndex) return;
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

function abrirModalTreinamento() {
    const modal = document.getElementById('modalTreino');
    if (modal) {
        modal.classList.remove('hidden');
        
        // Popula o Datalist do modal com as categorias existentes
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
        
        // Foco no primeiro campo
        setTimeout(() => document.getElementById('inputNomeTreino').focus(), 100);
    }
}

// ATUALIZAÇÃO DA FUNÇÃO FECHAR (Para limpar o ID oculto)
function fecharModalTreinamento() {
    const modal = document.getElementById('modalTreino');
    if (modal) modal.classList.add('hidden');
    
    // Limpa TUDO para garantir que próxima abertura seja "Novo"
    document.getElementById('inputHiddenId').value = ''; 
    document.getElementById('inputNomeTreino').value = '';
    document.getElementById('inputCatTreino').value = '';
    document.getElementById('inputDescTreino').value = '';
    document.getElementById('inputLinkTreino').value = '';
    document.getElementById('inputCorTreino').value = '#3b82f6';
    
    // Reseta visual
    document.getElementById('modalTitle').textContent = "Novo Treinamento";
    document.getElementById('btnExcluirTreino').style.display = 'none';
}


async function salvarNovoTreinamento() {
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
        // CHAMA O BANCO DE DADOS
        await DBHandler.salvarTreinamento(dadosFormulario);
        
        // RECARREGA TUDO PARA ATUALIZAR A TELA
        const dadosAtualizados = await DBHandler.carregarDadosIniciais();
        config = dadosAtualizados;
        
        init(); // Recria filtros e listas
        atualizarFiltros();
        fecharModalTreinamento();
        alert("Salvo com sucesso!");

    } catch (e) {
        console.error(e);
        alert("Erro ao salvar no banco.");
    }
}
// =============================================================================
// HELPER DE PERSISTÊNCIA (CORRIGIDO PARA SALVAR CARGOS E REGRAS)
// =============================================================================



// Atualiza o texto do Hexadecimal quando muda a cor
document.getElementById('inputCorTreino')?.addEventListener('input', (e) => {
    document.getElementById('hexColorDisplay').textContent = e.target.value.toUpperCase();
});

// Helper de Persistência Simples
function salvarDadosLocais() {
    try {
        localStorage.setItem('matrizCapacitacao_Dados', JSON.stringify(config));
        console.log("💾 Dados salvos localmente!");
    } catch (e) {
        console.error("Erro ao salvar localmente", e);
    }
}

// =============================================================================
// 6. AUTOMAÇÃO DE COR POR CATEGORIA
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    const inputCat = document.getElementById('inputCatTreino');
    const inputCor = document.getElementById('inputCorTreino');
    const hexDisplay = document.getElementById('hexColorDisplay');

    if (inputCat && inputCor) {
        inputCat.addEventListener('input', function() {
            const valorDigitado = this.value.trim();
            
            // Se não tiver nada digitado, não faz nada
            if (!valorDigitado) return;

            // Busca se existe algum treinamento com essa categoria exata (case insensitive)
            // config.treinamentos já está carregado na memória
            const match = config.treinamentos.find(t => 
                t.categoria.toUpperCase() === valorDigitado.toUpperCase()
            );

            if (match && match.color) {
                // ACHOU: Define a cor automaticamente
                inputCor.value = match.color;
                if (hexDisplay) hexDisplay.textContent = match.color.toUpperCase();
                
                // Visual feedback (opcional): piscar levemente a borda da cor
                inputCor.parentElement.style.borderColor = match.color;
                setTimeout(() => inputCor.parentElement.style.borderColor = '#cbd5e1', 300);
            }
            // SE NÃO ACHOU: Mantém a cor atual e o usuário escolhe manualmente no campo ao lado.
        });
    }
});

// =============================================================================
// 7. MANUTENÇÃO (EDIÇÃO E EXCLUSÃO)
// =============================================================================

function editarTreinamento(id) {
    // 1. Encontra o treino na memória
    const treino = config.treinamentos.find(t => t.id === id);
    if (!treino) return;

    // 2. Preenche o Modal
    document.getElementById('inputHiddenId').value = treino.id; // Guarda o ID
    document.getElementById('inputNomeTreino').value = treino.nome;
    document.getElementById('inputCatTreino').value = treino.categoria;
    document.getElementById('inputDescTreino').value = treino.desc || '';
    document.getElementById('inputLinkTreino').value = treino.link || '';
    document.getElementById('inputCorTreino').value = treino.color || '#3b82f6';
    document.getElementById('hexColorDisplay').textContent = (treino.color || '#3b82f6').toUpperCase();
    
    // 3. Ajusta Interface para Modo Edição
    document.getElementById('modalTitle').textContent = "Editar Treinamento";
    document.getElementById('btnExcluirTreino').style.display = 'block'; // Mostra botão excluir

    // 4. Abre o modal
    abrirModalTreinamento();
}

async function excluirTreinamento() {
    const id = document.getElementById('inputHiddenId').value;
    if (!id) return;

    if (confirm("Tem certeza que deseja EXCLUIR este treinamento permanentemente?")) {
        try {
            // 1. Envia o comando de exclusão para o banco
            await DBHandler.excluirTreinamento(id);
            
            // 2. Recarrega os dados atualizados do banco
            const dadosAtualizados = await DBHandler.carregarDadosIniciais();
            config = dadosAtualizados;
            
            // 3. Atualiza a interface
            fecharModalTreinamento();
            init(); // Recria as listas de filtros/categorias
            atualizarFiltros();
            
            alert("Treinamento excluído com sucesso!");

        } catch (e) {
            console.error("Erro ao excluir:", e);
            alert("Não foi possível excluir o treinamento. Verifique o console.");
        }
    }
}

// =============================================================================
// 8. CONTROLE DE ACESSO E SESSÃO (LOGIN PERSISTENTE)
// =============================================================================

let isAdminMode = false;
let currentUser = null;

// Função chamada automaticamente no final do DOMContentLoaded (veja abaixo)
function verificarSessaoInicial() {
    const sessionRaw = localStorage.getItem('rh_session');
    
    if (sessionRaw) {
        currentUser = JSON.parse(sessionRaw);
        console.log("👤 Usuário logado:", currentUser.user);

        // Se a role for ADMIN, libera tudo automaticamente
        if (currentUser.role === 'ADMIN') {
            ativarModoAdmin(true); // true = sem pedir senha/alertas
        }
    } else {
        // Se não tiver sessão, você pode decidir:
        // Opção A: Redirecionar para login.html
        // window.location.href = 'login.html';
        
        // Opção B: Deixar como visitante anônimo (padrão atual)
        console.log("👤 Acesso anônimo (Leitura)");
    }
}

// Função Unificada para Ativar/Desativar
function toggleAdminMode() {
    // Se já estiver logado (Sessão Ativa)
    if (currentUser) {
        // O botão agora serve como LOGOUT
        if (confirm(`Deseja sair da conta de ${currentUser.user}?`)) {
            fazerLogout();
        }
    } else {
        // Se NÃO estiver logado (Anônimo), tenta login manual (aquele modal antigo)
        // Isso mantemos caso alguém acesse direto a URL sem passar pelo login.html
        abrirModalLogin(); 
    }
}

function ativarModoAdmin(silencioso = false) {
    isAdminMode = true;
    document.body.classList.add('is-admin');
    
    // Atualiza ícones do topo
    const btn = document.getElementById('btnAdminToggle');
    const iconClosed = document.getElementById('iconLockClosed'); // Cadeado
    const iconOpen = document.getElementById('iconLockOpen');     // Cadeado Aberto
    
    if (btn) {
        btn.classList.add('unlocked');
        btn.title = "Clique para Sair (Logout)";
        // Mudar ícone para um 'User' ou 'Power' para indicar que está logado
        // Mas por enquanto, vamos manter a lógica do cadeado aberto
        if(iconClosed) iconClosed.style.display = 'none';
        if(iconOpen) iconOpen.style.display = 'block';
    }

    if (!silencioso) {
        // Se foi login manual, salvamos uma sessão temporária
        currentUser = { user: 'Admin Temporário', role: 'ADMIN' };
        localStorage.setItem('rh_session', JSON.stringify(currentUser));
    }
}

function fazerLogout() {
    isAdminMode = false;
    currentUser = null;
    localStorage.removeItem('rh_session'); // Limpa sessão
    
    // Redireciona para tela de login ou recarrega como anônimo
    window.location.href = 'login.html'; 
}

// --- INTEGRAÇÃO COM O MODAL DE LOGIN ANTIGO (MANUAL) ---
function realizarLogin() {
    // Esta função é chamada pelo modal antigo de senha "admin"
    ativarModoAdmin(false); 
}



// =============================================================================
// 9. EDIÇÃO DE RELACIONAMENTO (COM CONFIRMAÇÃO)
// =============================================================================

async function alternarRelacao(cargoIndex, treinoId) {
    // 1. Segurança: Só permite se estiver no Modo Admin
    if (!isAdminMode) return;

    const cargo = config.cargos[cargoIndex];
    if (!cargo) return;

    // 2. Identifica o estado atual nos dados carregados
    // (Usamos os arrays da memória apenas para saber o estado ATUAL)
    const isObrig = cargo.obrigatorios && cargo.obrigatorios.includes(treinoId);
    const isRecom = cargo.recomendados && cargo.recomendados.includes(treinoId);

    // 3. Determina o PRÓXIMO estado (Lógica de Negócio)
    let novoStatus = '';
    let msgConfirmacao = '';

    if (!isObrig && !isRecom) {
        // Se não tem nada -> Vira OBRIGATÓRIO
        novoStatus = 'mandatory';
        msgConfirmacao = `Deseja tornar este curso OBRIGATÓRIO para ${cargo.nome}?`;
    } 
    else if (isObrig) {
        // Se é Obrigatório -> Vira RECOMENDÁVEL
        novoStatus = 'recommended';
        msgConfirmacao = `Deseja mudar de Obrigatório para RECOMENDÁVEL?`;
    } 
    else if (isRecom) {
        // Se é Recomendável -> Vira NADA (Remove a regra)
        novoStatus = 'none';
        msgConfirmacao = `Deseja REMOVER a regra deste curso para ${cargo.nome}?`;
    }

    // 4. Confirmação do Usuário
    if (!confirm(msgConfirmacao)) return;

    // 5. Operação no Banco de Dados
    try {
        // Chama o Handler para fazer o INSERT ou DELETE no Supabase
        await DBHandler.atualizarRegra(cargo.id, treinoId, novoStatus);

        // 6. Recarrega os dados do banco para garantir sincronia total
        const dadosFrescos = await DBHandler.carregarDadosIniciais();
        config = dadosFrescos;

        // 7. Atualiza a tela mantendo filtros
        atualizarFiltros();

    } catch (e) {
        console.error("Erro ao alterar regra:", e);
        alert("Não foi possível salvar a alteração. Verifique a conexão.");
    }
}
// =============================================================================
// 10. LÓGICA DO MENU DE CONTEXTO (EDIÇÃO SEGURA)
// =============================================================================

// Variáveis temporárias globais
let tempCargoIndex = null;
let tempTreinoId = null;

function abrirMenuContexto(e, cargoIndex, treinoId) {
    if (!isAdminMode) return;

    // Salva referências e garante que são números
    tempCargoIndex = parseInt(cargoIndex);
    tempTreinoId = parseInt(treinoId);

    const menu = document.getElementById('contextMenuCell');
    const overlay = document.getElementById('contextMenuOverlay');
    
    // Posicionamento
    const x = e.pageX;
    const y = e.pageY;
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    menu.classList.remove('hidden');
    overlay.classList.remove('hidden');
}

function fecharMenuContexto() {
    const menu = document.getElementById('contextMenuCell');
    const overlay = document.getElementById('contextMenuOverlay');
    if (menu) menu.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
}

function selecionarOpcaoRelacao(novoStatus) {
    // 1. Validação de Segurança
    if (tempCargoIndex === null || tempTreinoId === null) return;
    
    const cargo = config.cargos[tempCargoIndex];
    if (!cargo) {
        console.error("Cargo não encontrado index:", tempCargoIndex);
        return;
    }

    // Garante arrays
    if (!cargo.obrigatorios) cargo.obrigatorios = [];
    if (!cargo.recomendados) cargo.recomendados = [];

    // 2. Verifica status atual
    let statusAtual = 'none';
    if (cargo.obrigatorios.includes(tempTreinoId)) statusAtual = 'mandatory';
    else if (cargo.recomendados.includes(tempTreinoId)) statusAtual = 'recommended';

    if (statusAtual === novoStatus) { 
        fecharMenuContexto(); 
        return; 
    }

    // 3. Prepara Auditoria
    const mapa = { 'mandatory': 'OBRIGATÓRIO', 'recommended': 'RECOMENDÁVEL', 'none': 'NÃO OBRIGATÓRIO' };
    const msg = `<span style="color:#64748b">Alterar Regra</span> &rarr; <span style="color:#d97706">${mapa[novoStatus]}</span>`;

    fecharMenuContexto();
    
    exibirModalAuditoria(msg, {
        TIPO: 'RELACAO',
        cargoIndex: tempCargoIndex,
        treinoId: tempTreinoId,
        novoStatus: novoStatus
    });
}

// =============================================================================
// 11. CENTRAL DE SEGURANÇA E AUDITORIA (BLINDADA)
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
        elIP.textContent = "Rastreando origem...";
        // Simulação rápida para não travar UI
        setTimeout(() => elIP.textContent = "192.168.1." + Math.floor(Math.random() * 255), 400);
    }

    const modal = document.getElementById('modalConfirmacao');
    if(modal) modal.classList.remove('hidden');
}

function fecharModalConfirmacao() {
    const modal = document.getElementById('modalConfirmacao');
    if(modal) modal.classList.add('hidden');
    pendingChange = null;
}

async function confirmarAcaoSegura() {
    if (!pendingChange) return;

    try {
        // --- CENÁRIO A: MUDANÇA DE REGRA (MATRIZ) ---
        if (pendingChange.TIPO === 'RELACAO') {
            const { cargoIndex, treinoId, novoStatus } = pendingChange;
            // No banco precisamos do ID do cargo, não do índice do array
            const cargoId = config.cargos[cargoIndex].id; 

            // 1. Envia comando ao banco
            await DBHandler.atualizarRegra(cargoId, treinoId, novoStatus);
        }
        
        // --- CENÁRIO B: EDIÇÃO DE TREINAMENTO (VIA AUDITORIA) ---
        else if (pendingChange.TIPO === 'EDICAO_TREINO') {
            const { novosDados } = pendingChange;
            await DBHandler.salvarTreinamento(novosDados);
        }

        // --- PÓS-GRAVAÇÃO: RECARREGA DADOS ---
        const dadosFrescos = await DBHandler.carregarDadosIniciais();
        config = dadosFrescos;
        
        // Atualiza a interface
        renderizarMatriz(
            getCargoIdByName(document.getElementById('roleFilter').value),
            document.getElementById('categoryFilter').value || 'all',
            document.getElementById('textSearch').value.toLowerCase(),
            document.getElementById('statusFilter').value
        );

        fecharModalConfirmacao();

    } catch (e) {
        console.error("Erro na operação:", e);
        alert("Erro ao salvar alteração: " + e.message);
    }
}






