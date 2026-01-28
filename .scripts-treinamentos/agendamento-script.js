// =============================================================================
// ARQUIVO: agendamento-script.js
// =============================================================================

let db;
let config;
let modoEdicao = false;
let turmaAtual = { treino: null, data: null };


document.addEventListener('DOMContentLoaded', () => {
    try {
        db = DBHandler.get();
        config = db.dados ? db.dados : db;
        if (!config.agendamentos) config.agendamentos = [];

        popularDatalistTreinos(); 
        popularFiltroCursos();    
        
        if(typeof aplicarFiltroRapido === 'function') {
            aplicarFiltroRapido('60d_passados', null); 
        } else {
            renderizarTabela();
        }

    } catch (e) {
        console.error("Erro ao iniciar:", e);
    }
});

// =============================================================================
// HELPER: LIMPEZA DE NOME (REMOVE CATEGORIA)
// =============================================================================
function limparNomeCurso(nomeCompleto) {
    if (!nomeCompleto) return "";
    if (nomeCompleto.includes(':')) {
        const partes = nomeCompleto.split(':');
        return partes.slice(1).join(':').trim();
    }
    return nomeCompleto;
}

// =============================================================================
// 1. VISUALIZAÇÃO DE TURMAS
// =============================================================================

function renderizarTabela() {
    const tbody = document.querySelector('#tableTurmas tbody');
    tbody.innerHTML = '';

    const termo = document.getElementById('filtroBusca').value.toLowerCase();
    const dtInicio = document.getElementById('filtroDataInicio').value;
    const dtFim = document.getElementById('filtroDataFim').value;
    const cursoIdFiltro = document.getElementById('filtroCursoId').value;
    const statusFiltro = document.getElementById('filtroStatus').value;

    const grupos = {};
    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    config.agendamentos.forEach(item => {
        const key = `${item.treinamentoId}|${item.dataAgendamento}`;
        if (!grupos[key]) {
            grupos[key] = {
                treinoId: item.treinamentoId,
                data: item.dataAgendamento,
                total: 0, processados: 0, abertos: 0, nomesPendentes: []
            };
        }
        grupos[key].total++;
        if (['Concluido', 'Falta', 'Cancelado'].includes(item.status)) {
            grupos[key].processados++;
        } else {
            grupos[key].abertos++;
            const colab = getColab(item.colaboradorId);
            grupos[key].nomesPendentes.push(colab.nome);
        }
    });

    let listaTurmas = Object.values(grupos);

    listaTurmas = listaTurmas.filter(t => {
        const treino = getTreino(t.treinoId);
        const nomeLimpo = limparNomeCurso(treino.nome).toLowerCase();
        
        const dataTurma = new Date(t.data + "T00:00:00");
        
        if (termo && !nomeLimpo.includes(termo)) return false;
        if (dtInicio && dataTurma < new Date(dtInicio + "T00:00:00")) return false;
        if (dtFim && dataTurma > new Date(dtFim + "T00:00:00")) return false;
        if (cursoIdFiltro && String(t.treinoId) !== String(cursoIdFiltro)) return false;

        let statusCalculado = '';
        if (t.total > 0 && t.abertos === 0) statusCalculado = 'Concluido';
        else if (dataTurma >= hoje) statusCalculado = 'Agendada';
        else statusCalculado = 'Pendente';

        if (statusFiltro && statusCalculado !== statusFiltro) return false;

        return true;
    });

    listaTurmas.sort((a, b) => new Date(b.data) - new Date(a.data));

    listaTurmas.forEach(turma => {
        const treino = getTreino(turma.treinoId);
        const nomeExibicao = limparNomeCurso(treino.nome);
        
        const dataPartes = turma.data.split('-'); 
        const dataFmt = `${dataPartes[2]}/${dataPartes[1]}/${dataPartes[0]}`;
        
        let statusHtml = '';
        let barraCor = '';
        let percentual = turma.total > 0 ? Math.round((turma.processados / turma.total) * 100) : 0;
        const dataTurmaObj = new Date(turma.data + "T00:00:00");

        if (turma.total > 0 && turma.abertos === 0) {
            statusHtml = `<span style="color:#166534; font-weight:700; font-size:11px;">✅ Encerrada</span>`;
            barraCor = '#22c55e'; percentual = 100;
        } else if (dataTurmaObj >= hoje) {
            statusHtml = `<span style="color:#2563eb; font-weight:700; font-size:11px;">📅 Futura</span>`;
            barraCor = '#3b82f6'; 
        } else {
            statusHtml = `<span style="color:#ea580c; font-weight:700; font-size:11px;">⚠️ Pendente (${turma.abertos})</span>`;
            barraCor = '#f97316'; 
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600; color: #334155;">${nomeExibicao}</td>
            <td style="font-size:13px;">${dataFmt}</td>
            <td style="text-align:center;">
                <span style="background:#f1f5f9; color:#475569; padding:4px 10px; border-radius:12px; font-weight:600; font-size:11px; border:1px solid #e2e8f0;">
                    👥 ${turma.total}
                </span>
            </td>
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    <div style="flex:1; height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
                        <div style="width:${percentual}%; background:${barraCor}; height:100%;"></div>
                    </div>
                    <span style="font-size:10px; font-weight:600; color:${barraCor}">${percentual}%</span>
                </div>
                ${statusHtml}
            </td>
            <td style="text-align:right;">
                <button class="btn-icon-action btn-edit" onclick="gerenciarTurma('${turma.treinoId}', '${turma.data}')" title="Gerenciar" style="cursor:pointer; background:none; border:none; font-size:16px;">
                    ⚙️
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    atualizarIndicadorVisualFiltros();
}


// =============================================================================
// 2. GESTÃO DA TURMA E INPUT BUSCÁVEL
// =============================================================================

function novaTurma() {
    modoEdicao = false;
    turmaAtual = { treino: null, data: null };
    
    document.getElementById('formTitle').textContent = "Nova Turma (Agendamento em Massa)";
    
    const inputBusca = document.getElementById('inputBuscaTreino');
    const inputHidden = document.getElementById('treinamentoId');
    
    inputBusca.value = "";
    inputBusca.disabled = false;
    inputBusca.style.backgroundColor = "white";
    inputHidden.value = ""; 
    
    const inpData = document.getElementById('dataAgendamento');
    inpData.value = new Date().toISOString().split('T')[0];
    inpData.disabled = false;
    inpData.style.backgroundColor = "white"; 
    
    document.getElementById('acoesMassa').style.display = 'none';
    
    renderizarListaSelecao(); 
    alternarTela('viewForm');
}

function gerenciarTurma(treinoId, data) {
    modoEdicao = true;
    turmaAtual = { treino: String(treinoId).trim(), data: String(data).trim() };
    
    const treino = getTreino(treinoId);
    document.getElementById('formTitle').textContent = `Gerenciar: ${limparNomeCurso(treino.nome)}`;
    
    const inputBusca = document.getElementById('inputBuscaTreino');
    const inputHidden = document.getElementById('treinamentoId');
    
    inputBusca.value = limparNomeCurso(treino.nome);
    inputHidden.value = treinoId;
    
    inputBusca.disabled = true; 
    inputBusca.style.backgroundColor = "#f1f5f9";
    
    const inpData = document.getElementById('dataAgendamento');
    inpData.value = data;
    inpData.disabled = false; 
    inpData.style.backgroundColor = "white";
    
    document.getElementById('acoesMassa').style.display = 'flex'; 

    renderizarListaSelecao(true); 
    alternarTela('viewForm');
}

// --- LÓGICA DO AUTOCOMPLETE E SETA ---

function resolverIdTreino(inputElement) {
    const val = inputElement.value;
    const datalist = document.getElementById('listaTreinos');
    const hiddenInput = document.getElementById('treinamentoId');
    
    const option = Array.from(datalist.options).find(opt => opt.value === val);
    
    if (option) {
        hiddenInput.value = option.dataset.id;
    } else {
        hiddenInput.value = "";
    }
}

// NOVA FUNÇÃO: Clicar na setinha limpa o texto para mostrar tudo
function mostrarTodosCursos() {
    const inputBusca = document.getElementById('inputBuscaTreino');
    
    if (inputBusca.disabled) return; // Se estiver em edição e bloqueado, não faz nada
    
    inputBusca.value = ''; // Limpa o visual para o navegador abrir a lista completa
    inputBusca.focus();    // Foca no input
}

// RENDERIZAÇÃO DA LISTA DE CHECKBOXES
function renderizarListaSelecao(carregarExistentes = false) {
    const container = document.getElementById('listaParticipantes');
    container.innerHTML = '';
    
    const deptos = [...new Set(config.colaboradores.map(c => c.departamento).filter(Boolean))].sort();
    const selDepto = document.getElementById('filtroDeptoAdd');
    while (selDepto.options.length > 3) selDepto.remove(3);
    
    deptos.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        selDepto.appendChild(opt);
    });
    
    if (modoEdicao) {
        selDepto.value = "__SELECTED__";
    } else {
        selDepto.value = "";
    }
    
    document.getElementById('buscaColabAdd').value = "";

    let participantesIds = [];
    const mapaStatus = {};

    if (carregarExistentes) {
        config.agendamentos.forEach(a => {
            if (String(a.treinamentoId).trim() === turmaAtual.treino && 
                String(a.dataAgendamento).trim() === turmaAtual.data) {
                
                participantesIds.push(String(a.colaboradorId).trim());
                mapaStatus[a.colaboradorId] = a.status;
            }
        });
    }

    config.colaboradores.sort((a,b) => a.nome.localeCompare(b.nome)).forEach(colab => {
        const jaEstaNaTurma = participantesIds.includes(String(colab.id).trim());
        if(colab.dataDemissao && !jaEstaNaTurma) return; 
        
        const statusAtual = mapaStatus[colab.id] || '';
        
        const div = document.createElement('div');
        div.className = 'user-item';
        div.dataset.depto = colab.departamento || '';
        div.dataset.nome = colab.nome.toLowerCase();

        let htmlStatus = '';
        if (modoEdicao && jaEstaNaTurma) {
            const cor = statusAtual === 'Concluido' ? 'green' : (statusAtual === 'Falta' ? 'red' : 'blue');
            htmlStatus = `
                <select class="status-selector-row" data-colab="${colab.id}" 
                    style="font-size:10px; padding:0 2px; border:1px solid #ccc; border-radius:4px; color:${cor}; margin-left:10px; height:22px; cursor:pointer;" onclick="event.stopPropagation()">
                    <option value="Agendado" ${statusAtual=='Agendado'?'selected':''}>Agendado</option>
                    <option value="Concluido" ${statusAtual=='Concluido'?'selected':''}>Concluído</option>
                    <option value="Falta" ${statusAtual=='Falta'?'selected':''}>Falta</option>
                    <option value="Pendente" ${statusAtual=='Pendente'?'selected':''}>Pendente</option>
                </select>`;
        }

        const tagDesligado = colab.dataDemissao 
            ? `<span style="background:#fee2e2; color:#991b1b; font-size:9px; padding:1px 4px; border-radius:3px; margin-left:5px;">DESLIGADO</span>` 
            : '';

        div.innerHTML = `
            <input type="checkbox" class="chk-participante" value="${colab.id}" ${jaEstaNaTurma ? 'checked' : ''} id="chk_${colab.id}">
            <label for="chk_${colab.id}">
                <div class="user-info-row">
                    <span class="user-name">${colab.nome} ${tagDesligado}</span>
                    <span class="dept-tag">${colab.departamento || 'Geral'}</span>
                </div>
                ${htmlStatus}
            </label>
        `;
        container.appendChild(div);
    });
    
    atualizarContadorSelecao();
    filtrarListaSelecao();
}

function filtrarListaSelecao() {
    const texto = document.getElementById('buscaColabAdd').value.toLowerCase();
    const filtro = document.getElementById('filtroDeptoAdd').value;
    
    document.querySelectorAll('.user-item').forEach(row => {
        const checkbox = row.querySelector('.chk-participante');
        const isChecked = checkbox.checked;
        const matchTexto = row.dataset.nome.includes(texto);
        
        let matchFiltro = true;
        if (filtro === '__SELECTED__') {
            matchFiltro = isChecked;
        } else if (filtro !== '') {
            matchFiltro = row.dataset.depto === filtro;
        }

        row.style.display = (matchTexto && matchFiltro) ? 'flex' : 'none';
    });
}

function toggleSelectAll() {
    const checkMaster = document.getElementById('checkAll').checked;
    document.querySelectorAll('.user-item').forEach(row => {
        if(row.style.display !== 'none') {
            row.querySelector('.chk-participante').checked = checkMaster;
        }
    });
    atualizarContadorSelecao();
}

function atualizarContadorSelecao() {
    const count = document.querySelectorAll('.chk-participante:checked').length;
    document.getElementById('contadorSelecao').textContent = `${count} selecionados`;
}

function salvarTurma() {
    const treinoId = document.getElementById('treinamentoId').value;
    const data = document.getElementById('dataAgendamento').value;

    if (!treinoId || !data) {
        alert("Selecione um Curso Válido (da lista) e a Data.");
        return;
    }

    const selecionados = Array.from(document.querySelectorAll('.chk-participante:checked')).map(cb => String(cb.value));

    if (modoEdicao) {
        if (String(turmaAtual.data) !== String(data)) {
            config.agendamentos.forEach(ag => {
                if (String(ag.treinamentoId).trim() === String(turmaAtual.treino).trim() && 
                    String(ag.dataAgendamento).trim() === String(turmaAtual.data).trim()) {
                    
                    ag.dataAgendamento = data; 
                }
            });
            turmaAtual.data = data;
        }

        for (let i = config.agendamentos.length - 1; i >= 0; i--) {
            const ag = config.agendamentos[i];
            if (String(ag.treinamentoId).trim() === String(treinoId).trim() && 
                String(ag.dataAgendamento).trim() === String(data).trim()) {
                
                if (!selecionados.includes(String(ag.colaboradorId).trim())) {
                    config.agendamentos.splice(i, 1);
                }
            }
        }
        
        selecionados.forEach(colabId => {
            const existente = config.agendamentos.find(a => 
                String(a.treinamentoId).trim() === String(treinoId).trim() && 
                String(a.dataAgendamento).trim() === String(data).trim() && 
                String(a.colaboradorId).trim() === String(colabId).trim()
            );
            
            if (existente) {
                const selectStatus = document.querySelector(`.status-selector-row[data-colab="${colabId}"]`);
                if(selectStatus) existente.status = selectStatus.value;
            } else {
                config.agendamentos.push({
                    id: Date.now() + Math.random(),
                    colaboradorId: parseInt(colabId),
                    treinamentoId: parseInt(treinoId),
                    dataAgendamento: data,
                    status: 'Agendado'
                });
            }
        });

    } else {
        selecionados.forEach(colabId => {
            config.agendamentos.push({
                id: Date.now() + Math.random(),
                colaboradorId: parseInt(colabId),
                treinamentoId: parseInt(treinoId),
                dataAgendamento: data,
                status: 'Agendado'
            });
        });
    }

    DBHandler.save(db, `Turma ${data} atualizada`);
    alert("✅ Turma salva com sucesso!");
    renderizarTabela();
    alternarTela('viewList');
}

function aplicarStatusMassa(novoStatus) {
    if(confirm(`Tem certeza que deseja marcar todos desta lista como '${novoStatus}'?`)) {
        document.querySelectorAll('.status-selector-row').forEach(sel => {
            if(sel.closest('.user-item').style.display !== 'none') {
                sel.value = novoStatus;
                sel.style.color = novoStatus === 'Concluido' ? 'green' : 'red';
            }
        });
    }
}

// =============================================================================
// 4. HELPERS E FILTROS RÁPIDOS
// =============================================================================

function popularDatalistTreinos() {
    const datalist = document.getElementById('listaTreinos');
    datalist.innerHTML = '';
    
    if (config.treinamentos) {
        config.treinamentos.sort((a,b) => {
            return limparNomeCurso(a.nome).localeCompare(limparNomeCurso(b.nome));
        }).forEach(t => {
            const opt = document.createElement('option');
            opt.value = limparNomeCurso(t.nome); 
            opt.dataset.id = t.id;               
            datalist.appendChild(opt);
        });
    }
}

function getTreino(id) {
    const found = config.treinamentos ? config.treinamentos.find(t => t.id == id) : null;
    return found || { nome: '[Curso Excluído]' };
}

function getColab(id) {
    const found = config.colaboradores ? config.colaboradores.find(c => c.id == id) : null;
    return found || { nome: '[Colaborador Excluído]' };
}

function alternarTela(id) {
    document.querySelectorAll('.content-view').forEach(el => el.style.display = 'none');
    document.getElementById(id).style.display = 'flex';
}

function popularFiltroCursos() {
    const sel = document.getElementById('filtroCursoId');
    if(!sel) return;
    while (sel.options.length > 1) sel.remove(1);
    
    if (config.treinamentos) {
        config.treinamentos.sort((a,b) => limparNomeCurso(a.nome).localeCompare(limparNomeCurso(b.nome))).forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = limparNomeCurso(t.nome);
            sel.appendChild(opt);
        });
    }
}

// CORREÇÃO: AGORA LIMPA TODOS OS CAMPOS
function limparFiltros() {
    // 1. Limpa Texto
    document.getElementById('filtroBusca').value = '';
    
    // 2. Limpa Selects (O que estava faltando)
    document.getElementById('filtroCursoId').value = '';
    document.getElementById('filtroStatus').value = '';

    // 3. Remove seleção visual dos botões de data
    document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
    
    // 4. Reseta as datas e renderiza a tabela
    aplicarFiltroRapido('todos', null);
}

function toggleFilters() {
    const p = document.getElementById('advancedFilters');
    p.style.display = (p.style.display === 'none') ? 'block' : 'none';
}

function exportarExcel() {
    let csv = "Curso;Data;Participantes;Status\n";
    const linhas = document.querySelectorAll('#tableTurmas tbody tr');
    linhas.forEach(row => {
        const cols = row.querySelectorAll('td');
        const curso = cols[0].innerText;
        const data = cols[1].innerText;
        const parts = cols[2].innerText.replace('👥','').trim();
        const status = cols[3].innerText.replace(/\n/g, ' ').trim();
        csv += `${curso};${data};${parts};${status}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "relatorio_auditoria.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function aplicarFiltroRapido(tipo, btnElement) {
    const hoje = new Date();
    let inicio = new Date();
    let fim = new Date();

    if (btnElement) {
        document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    }

    switch (tipo) {
        case '30d_passados': inicio.setDate(hoje.getDate() - 30); break;
        case '60d_passados': inicio.setDate(hoje.getDate() - 60); break;
        case 'este_ano':
            inicio = new Date(hoje.getFullYear(), 0, 1);
            fim = new Date(hoje.getFullYear(), 11, 31);
            break;
        case 'futuro':
            inicio = hoje;
            fim = new Date();
            fim.setDate(hoje.getDate() + 30);
            break;
        case 'todos':
            document.getElementById('filtroDataInicio').value = '';
            document.getElementById('filtroDataFim').value = '';
            renderizarTabela();
            return;
    }
    const format = (d) => d.toISOString().split('T')[0];
    document.getElementById('filtroDataInicio').value = format(inicio);
    document.getElementById('filtroDataFim').value = format(fim);
    renderizarTabela();
}

function atualizarIndicadorVisualFiltros() {
    let count = 0;
    const dtInicio = document.getElementById('filtroDataInicio').value;
    const dtFim = document.getElementById('filtroDataFim').value;
    const curso = document.getElementById('filtroCursoId').value;
    const status = document.getElementById('filtroStatus').value;
    
    if (dtInicio) count++;
    if (dtFim) count++;
    if (curso) count++;
    if (status) count++;

    const btnToggle = document.getElementById('btnToggleFilters');
    const btnLimpar = document.getElementById('btnLimparRapido');

    if (count > 0) {
        if(btnLimpar) btnLimpar.style.display = 'flex';
        if(btnToggle) {
            btnToggle.innerHTML = `⚙️ Filtros (${count})`;
            btnToggle.classList.add('btn-active-filters');
        }
    } else {
        if(btnLimpar) btnLimpar.style.display = 'none';
        if(btnToggle) {
            btnToggle.innerHTML = `⚙️ Filtros Avançados`;
            btnToggle.classList.remove('btn-active-filters');
        }
    }
}