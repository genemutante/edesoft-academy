
// VARIÁVEIS GLOBAIS
let db;      // O objeto completo do banco (meta + dados)
let config;  // O atalho para os dados (para não quebrar seu código antigo)
let statusAtivo = 'todos';
let currentTabId = 'tab1'; // NOVO: Controla o contexto atual

// --- FUNÇÕES UTILITÁRIAS (NO TOPO = SEGURANÇA) ---
// Elas precisam ser lidas antes de qualquer lógica de banco
function forcarListaCompleta(input) {
    if (input.value !== '') {
        const valorTemporario = input.value;
        input.value = ''; 
        setTimeout(() => {
            input.value = valorTemporario;
        }, 1);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. CARREGA O BANCO (LocalStorage ou Arquivo)
    db = DBHandler.get();
    
    // 2. CRIA O ATALHO "CONFIG"
    // Isso garante que "config.colaboradores" continue funcionando
    // Verifica se os dados estão dentro de uma pasta .dados ou na raiz
    config = db.dados ? db.dados : db;

    // 3. INICIA A TELA
    popularListaColaboradores();
    
    // Escuta alterações no banco (caso outra aba mude algo)
    window.addEventListener('db-updated', () => {
        db = DBHandler.get();
        config = db.dados ? db.dados : db;
        renderizarPainel(); // Redesenha para atualizar
    });
});





// --- LÓGICA DOS BOTÕES DE FILTRO (CORRIGIDA) ---
// Seleciona classe .btn-toggle em vez de .filter-btn
document.querySelectorAll('#typeFilterGroup .btn-toggle').forEach(btn => {
    btn.addEventListener('click', function() {
        // Remove active de todos os .btn-toggle
        document.querySelectorAll('#typeFilterGroup .btn-toggle').forEach(b => b.classList.remove('active'));
        
        // Adiciona no clicado
        this.classList.add('active');
        
        // Atualiza variável global e redesenha
        statusAtivo = this.getAttribute('data-target');
        renderizarPainel();
    });
});
function popularListaColaboradores() {
    const list = document.getElementById('colabList');
    config.colaboradores.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.nome;
        list.appendChild(opt);
    });
}

function selecionarColaborador() {
    const nome = document.getElementById('colabFilter').value;
    const colab = config.colaboradores.find(c => c.nome === nome);

    if (colab) {
        document.getElementById('displayName').textContent = colab.nome;
        document.getElementById('lenteWrapper').style.display = 'flex';
        
        // Popular a "Lente" com histórico de cargos
        const lenteSelect = document.getElementById('lenteFilter');
        lenteSelect.innerHTML = '';
        
        const historico = config.historico_cargos.filter(h => h.colaboradorId === colab.id);
        historico.reverse().forEach(h => {
            const cargo = config.cargos.find(car => car.id === h.cargoId);
            const opt = document.createElement('option');
            opt.value = h.cargoId;
            opt.textContent = cargo.nome + (h.dataFim ? ` (Antigo)` : ` (Atual)`);
            lenteSelect.appendChild(opt);
        });

        renderizarPainel();
    }
}

function toggleStatusFilter(btn) {
    document.querySelectorAll('.btn-toggle').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    statusAtivo = btn.dataset.status;
    renderizarPainel();
}


function atualizarSelectStatus(statusEncontrados) {
    const select = document.getElementById('statusSelect');
    if (!select) return;

    const valorAtual = select.value;
    select.innerHTML = '<option value="todos">Todos os Status</option>';
    
    const statusUnicos = [...new Set(statusEncontrados)];
    statusUnicos.sort().forEach(st => {
        const opt = document.createElement('option');
        opt.value = st;
        opt.textContent = st;
        select.appendChild(opt);
    });
    
    select.value = statusEncontrados.includes(valorAtual) ? valorAtual : "todos";
}



// ATUALIZADA: Função para Alternar Abas e Contexto
function switchTab(tabId, btn) {
    // 1. Troca visual das abas
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(tabId).classList.add('active');

    // 2. Atualiza Contexto Global
    currentTabId = tabId;

    // 3. Redesenha a tela com as regras da nova aba
    renderizarPainel();
}

function renderizarPainel() {
    // 1. PREPARAÇÃO DO TOOLTIP GLOBAL
    let globalTooltip = document.getElementById('global-tooltip');
    if (!globalTooltip) {
        globalTooltip = document.createElement('div');
        globalTooltip.id = 'global-tooltip';
        document.body.appendChild(globalTooltip);
    }

    const colabInput = document.getElementById('colabFilter');
    const selectLente = document.getElementById('lenteFilter');
    const selectStatus = document.getElementById('statusSelect');
    
    if (!colabInput || !selectLente || !selectLente.value) return;

    const nome = colabInput.value;
    const colab = config.colaboradores.find(c => c.nome === nome);
    if (!colab) return;

    // --- CONTROLE DE VISIBILIDADE POR CONTEXTO (ABA) ---
    const mostrarStatus = (currentTabId === 'tab2'); 

    const statusWrapper = document.getElementById('statusFiltroWrapper');
    if (statusWrapper) statusWrapper.style.display = mostrarStatus ? 'flex' : 'none';

    // Controle das Colunas
    const thStatus = document.getElementById('thStatus');
    const thFuncao = document.getElementById('thFuncao');
    const thCurso = document.getElementById('thCurso');
    const thObrig = document.getElementById('thObrig');

    if (thStatus && thFuncao && thCurso && thObrig) {
        if (mostrarStatus) {
            thStatus.style.display = 'table-cell';
            thFuncao.style.width = '27%'; thCurso.style.width = '37%'; thObrig.style.width = '14%';
        } else {
            thStatus.style.display = 'none';
            thFuncao.style.width = '30%'; thCurso.style.width = '50%'; thObrig.style.width = '20%';
        }
    }

    const selectStatusVal = selectStatus ? selectStatus.value : "todos";
    const cargoLente = config.cargos.find(c => c.id === parseInt(selectLente.value));
    const tbody = document.querySelector('#individualTable tbody');
    
    if (!tbody || !cargoLente) return;
    tbody.innerHTML = '';

    // ESTATÍSTICAS
    let stats = { 
        total: config.treinamentos.length,
        mandatory: 0, recommended: 0, none: 0,
        realizados_geral: 0, pendentesO: 0,
        gestao_requisitos: 0, gestao_homologados: 0, gestao_inscritos: 0,        
        gestao_agendados: 0, gestao_realizados_internos: 0, gestao_faltas: 0
    };
    
    let todosStatusNaTela = [];
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    let contadorLinhasVisiveis = 0;

    config.treinamentos.forEach(treino => {
        // 1. Classificação
        const ehO = cargoLente.obrigatorios?.includes(treino.id);
        const ehR = cargoLente.recomendados?.includes(treino.id);
        const tipoReq = ehO ? 'mandatory' : (ehR ? 'recommended' : 'none');
        
        if (ehO) stats.mandatory++; else if (ehR) stats.recommended++; else stats.none++;

        // 2. Status
        let statusTexto = "Pendente ⏳"; let subTexto = ""; let cssClass = "st-pendente";
        let tooltipTitulo = "GAP DE COMPETÊNCIA"; let tooltipMsg = "Este curso é um requisito para o cargo, mas ainda não foi realizado. Não há registros de homologação externa nem agendamento futuro. O colaborador precisa ser inscrito.";
        let origemResolucao = "nenhuma"; 

        const listaHomologacoes = config.homologacoes || [];
        const homologado = listaHomologacoes.find(h => h.colaboradorId === colab.id && h.treinamentoId === treino.id);

        if (homologado) {
            statusTexto = "Homologado ✅"; 
            cssClass = "st-homologado"; 
            origemResolucao = 'homologado';
            tooltipTitulo = "AUDITORIA: CONFORMIDADE EXTERNA"; 
            
            // --- AJUSTE AQUI: Lógica para exibir Link ou Texto ---
            let evidenciaHtml = "";
            const rawEvidencia = homologado.evidencia || "";

            if (rawEvidencia.startsWith("LINK|")) {
                const parts = rawEvidencia.split('|');
                const url = parts[1];
                const instituicao = parts[2] || "Externa";
                
                evidenciaHtml = `
                    Certificação emitida por: <strong>${instituicao}</strong>.<br>
                    <a href="${url}" target="_blank" style="color: #fbbf24; text-decoration: underline; font-weight: bold; display: inline-block; margin-top: 4px;">
                        🔗 Abrir Documento de Evidência
                    </a>
                `;
            } else {
                evidenciaHtml = `A evidência ("${rawEvidencia}") garante a conformidade.`;
            }

            tooltipMsg = `O requisito foi atendido via <strong>${homologado.origem}</strong>.<br>${evidenciaHtml}`;
            
            if(homologado.dataHomologacao) { const parts = homologado.dataHomologacao.split('-'); if(parts.length === 3) subTexto = `Desde ${parts[2]}/${parts[1]}/${parts[0]}`; }
        } 
        else {
            const realizado = config.treinamentos_realizados.find(r => r.colaboradorId === colab.id && r.treinamentoId === treino.id);
            if (realizado) {
                statusTexto = "Treinado ✅"; cssClass = "st-treinado"; origemResolucao = 'interno';
                tooltipTitulo = "TREINAMENTO REALIZADO"; tooltipMsg = "O colaborador concluiu este curso internamente através da nossa plataforma ou instrutor.";
                const dataDb = realizado.dataRealizacao || "2024-05-20"; 
                const parts = dataDb.split('-');
                subTexto = parts.length === 3 ? `Em ${parts[2]}/${parts[1]}/${parts[0]}` : `Em ${dataDb}`;
            } else {
                const agendado = config.agendamentos.find(a => a.colaboradorId === colab.id && a.treinamentoId === treino.id);
                if (agendado) {
                    let dataAgendStr = ""; let dataAgendObj = null;
                    if(agendado.dataAgendamento) { const dParts = agendado.dataAgendamento.split('-'); if(dParts.length === 3) { dataAgendStr = `${dParts[2]}/${dParts[1]}/${dParts[0]}`; dataAgendObj = new Date(dParts[0], dParts[1] - 1, dParts[2]); } }
                    
                    if (agendado.status === "Falta") {
                        statusTexto = "Falta ❌"; cssClass = "st-falta"; origemResolucao = 'falta';
                        tooltipTitulo = "ATENÇÃO: AUSÊNCIA"; tooltipMsg = "Colaborador faltou. Reagendar."; subTexto = dataAgendStr ? `Em ${dataAgendStr}` : "Data n/d";
                    } else if (agendado.status === "Agendado") {
                        if (dataAgendObj && dataAgendObj < hoje) {
                            statusTexto = "Expirado ⚠️"; cssClass = "st-expirado"; origemResolucao = 'agendado';
                            tooltipTitulo = "ALERTA: SEM BAIXA"; tooltipMsg = "Data passou sem registro."; subTexto = `Era p/ ${dataAgendStr}`;
                        } else {
                            statusTexto = "Inscrito 📅"; cssClass = "st-inscrito"; origemResolucao = 'agendado';
                            tooltipTitulo = "PROCESSO ATIVO"; tooltipMsg = "Inscrição confirmada."; subTexto = dataAgendStr ? `Para ${dataAgendStr}` : "Data n/d";
                        }
                    } else { 
                        // Normaliza status "Pendente" sem ícone
                        if (agendado.status === "Pendente") {
                            statusTexto = "Pendente ⏳";
                        } else {
                            statusTexto = agendado.status; 
                        }
                    }
                } else { if(!ehO && !ehR) { tooltipTitulo = "OPCIONAL"; tooltipMsg = "Não exigido."; } }
            }
        }

        // 3. Atualiza Estatísticas
        if (statusTexto.includes("✅")) stats.realizados_geral++;
        if (ehO && !statusTexto.includes("✅")) stats.pendentesO++; 
        if (ehO || ehR) {
            stats.gestao_requisitos++; 
            if (origemResolucao === 'homologado') stats.gestao_homologados++;
            else if (origemResolucao !== 'nenhuma' && !statusTexto.includes('Pendente')) { 
                stats.gestao_inscritos++;
                if (origemResolucao === 'interno') stats.gestao_realizados_internos++;
                if (origemResolucao === 'agendado') stats.gestao_agendados++;
                if (origemResolucao === 'falta') stats.gestao_faltas++;
            }
        }

        // 4. Renderização com Filtros
        const passaFiltroTipo = (statusAtivo === "todos" || tipoReq === statusAtivo); 
        const passaFiltroStatus = !mostrarStatus || (selectStatusVal === "todos" || statusTexto === selectStatusVal);

        if (passaFiltroTipo) {
            todosStatusNaTela.push(statusTexto); 
            if (passaFiltroStatus) {
                contadorLinhasVisiveis++;
                const nomeCursoLimpo = treino.nome.indexOf(':') > -1 ? treino.nome.substring(treino.nome.indexOf(':') + 1).trim() : treino.nome;
                
                let htmlRow = `
                    <tr>
                        <td style="font-weight:600; color: #1e293b; text-align: center;">${cargoLente.nome}</td>
                        <td style="color: #475569; text-align: left; padding-left: 15px;">${nomeCursoLimpo}</td>
                        <td style="color: #64748b; text-align: center;">${ehO ? '<strong>Obrigatório</strong>' : (ehR ? 'Recomendado' : 'Não Obrigatório')}</td>`;
                
                if (mostrarStatus) {
                    htmlRow += `
                        <td style="vertical-align: middle;">
                            <div class="status-cell-wrapper">
                                <div class="status-badge ${cssClass}">
                                    <span>${statusTexto}</span>
                                    ${subTexto ? `<span class="badge-sub">${subTexto}</span>` : ''}
                                    <div class="tooltip-box">
                                        <span class="tooltip-title">${tooltipTitulo}</span>
                                        ${tooltipMsg}
                                    </div>
                                </div>
                            </div>
                        </td>`;
                }
                
                htmlRow += `</tr>`;
                tbody.innerHTML += htmlRow;
            }
        }
    });

    // Atualiza Contador Header
    const summaryDiv = document.getElementById('gridSummary');
    if(summaryDiv) {
        summaryDiv.style.display = 'flex'; 
        document.getElementById('lblFiltrados').textContent = contadorLinhasVisiveis;
        document.getElementById('lblTotal').textContent = stats.total;
    }

    atualizarSelectStatus(todosStatusNaTela);

    // --- CÁLCULO DE SCORE E PREPARAÇÃO PARA STORYTELLING ---
    let obrigatóriosPendentes = stats.pendentesO; 
    let obrigatóriosResolvendo = 0;
    
    // Contagem detalhada de "Em Resolução" (Inscritos/Agendados)
    config.treinamentos.forEach(t => {
        const ehO = cargoLente.obrigatorios?.includes(t.id);
        if (ehO) {
            const ag = config.agendamentos.find(a => a.colaboradorId === colab.id && a.treinamentoId === t.id);
            if (ag && (ag.status === 'Agendado' || ag.status === 'Inscrito')) {
                obrigatóriosResolvendo++;
            }
        }
    });

    let percentual = 0;
    let resolvidos = 0;
    if (stats.mandatory > 0) {
        resolvidos = stats.mandatory - stats.pendentesO;
        percentual = Math.round((resolvidos / stats.mandatory) * 100);
    }

    // --- ATUALIZAÇÃO DOS CARDS LATERAIS (NÚMEROS) ---
    const partesNome = colab.nome.trim().split(' ');
    const nomeCurto = partesNome.length > 1 ? `${partesNome[0]} ${partesNome[partesNome.length - 1]}` : partesNome[0];
    
    if(document.getElementById('countTotal')) document.getElementById('countTotal').textContent = stats.total;
    if(document.getElementById('countObrigatórios')) document.getElementById('countObrigatórios').textContent = stats.mandatory;
    if(document.getElementById('countRecomendados')) document.getElementById('countRecomendados').textContent = stats.recommended;
    if(document.getElementById('countNaoObrigatorios')) document.getElementById('countNaoObrigatorios').textContent = stats.none;

    if(document.getElementById('countPrioritarios')) document.getElementById('countPrioritarios').textContent = stats.gestao_requisitos;
    if(document.getElementById('countHomologados')) document.getElementById('countHomologados').textContent = stats.gestao_homologados;
    if(document.getElementById('countInscritos')) document.getElementById('countInscritos').textContent = stats.gestao_inscritos;
    if(document.getElementById('countAgendados')) document.getElementById('countAgendados').textContent = stats.gestao_agendados;
    if(document.getElementById('countRealizadosInternos')) document.getElementById('countRealizadosInternos').textContent = stats.gestao_realizados_internos;
    if(document.getElementById('countFaltas')) document.getElementById('countFaltas').textContent = stats.gestao_faltas;

    if(document.getElementById('countPendentes')) document.getElementById('countPendentes').textContent = stats.pendentesO;
    if(document.getElementById('countCríticos')) document.getElementById('countCríticos').textContent = stats.pendentesO;
    if(document.getElementById('countEmResolucao')) document.getElementById('countEmResolucao').textContent = obrigatóriosResolvendo;

    // --- STORYTELLING AVANÇADO (O CORAÇÃO DA TELA) ---
    const cNum = 'color: #fbbf24; font-weight: 700; font-size: 1.1em;'; 
    const cTxt = 'color: #38bdf8; font-weight: 600;'; 
    const cSuccess = 'color: #4ade80; font-weight: 700;'; 
    const cAlert = 'color: #f87171; font-weight: 700;'; 

    // 1. ABA ESCOPO
    if(document.getElementById('storyScope')) {
        const txtTotal = stats.total === 1 ? 'competência mapeada' : 'competências mapeadas';
        const txtObrig = stats.mandatory === 1 ? 'é um requisito <strong>Obrigatório</strong>' : 'são requisitos <strong>Obrigatórios</strong>';
        const txtRecom = stats.recommended === 1 ? 'é <strong>Recomendado</strong>' : 'são <strong>Recomendados</strong>';
        
        document.getElementById('storyScope').innerHTML = `
            <div style="line-height: 1.8;">
                O perfil em análise é de <strong style="${cTxt}">${nomeCurto}</strong>.<br>
                Sob a ótica da função <strong style="${cTxt}">${cargoLente.nome}</strong>, seu mapa de desenvolvimento conecta-se a um universo de <strong style="${cNum}">${stats.total}</strong> ${txtTotal}.<br><br>
                
                Deste total:
                <ul style="margin: 8px 0; padding-left: 20px; color: #cbd5e1;">
                    <li><strong style="${cNum}">${stats.mandatory}</strong> ${txtObrig} (Foco Prioritário);</li>
                    <li><strong style="${cNum}">${stats.recommended}</strong> ${txtRecom} para aprimoramento;</li>
                    <li>Os demais <strong style="${cNum}">${stats.none}</strong> itens são opcionais/livres.</li>
                </ul>
            </div>
        `;
    }

    // 2. ABA GESTÃO
    if(document.getElementById('storyAgenda')) {
        const emAndamento = obrigatóriosResolvendo; 
        const gapReal = stats.pendentesO - emAndamento;
        
        const txtReq = stats.mandatory === 1 ? 'requisito mapeado' : 'requisitos mapeados';
        const txtConcluido = resolvidos === 1 ? 'já foi concluído' : 'já foram concluídos';
        const txtGap = gapReal === 1 ? 'item exige' : 'itens exigem';
        
        let msgFalta = "";
        if (stats.gestao_faltas > 0) {
            const txtFalta = stats.gestao_faltas === 1 ? 'falta registrada' : 'faltas registradas';
            msgFalta = `<br><span style="color:#f87171; font-size: 11px;">⚠️ Atenção: Consta <strong>${stats.gestao_faltas}</strong> ${txtFalta} que precisa de reagendamento.</span>`;
        }

        document.getElementById('storyAgenda').innerHTML = `
            <div style="line-height: 1.8;">
                Olhando para os <strong style="color: #fff;">${stats.mandatory}</strong> ${txtReq} como obrigatórios:<br><br>
                
                <ul style="margin: 8px 0; padding-left: 0; list-style: none;">
                    <li style="margin-bottom: 8px;">
                        ✅ <strong style="${cSuccess}">${resolvidos}</strong> ${txtConcluido} (Treinamento ou Homologação);
                    </li>
                    <li style="margin-bottom: 8px;">
                        📅 <strong style="${cTxt}">${emAndamento}</strong> possui(em) inscrição ou agendamento confirmado;
                    </li>
                    <li style="margin-bottom: 8px; border-left: 3px solid #f87171; padding-left: 10px;">
                         <strong style="${cAlert}">${gapReal}</strong> ${txtGap} ação imediata do gestor (Inscrição Pendente).
                    </li>
                </ul>
                ${msgFalta}
            </div>
        `;
    }

    // 3. ABA SCORE (DIAGNÓSTICO E CÁLCULO)
    // Atualiza Tooltip da Memória de Cálculo
    const scoreTooltipBox = document.getElementById('scoreCalculationDetails');
    if(scoreTooltipBox) {
        scoreTooltipBox.innerHTML = `
            <span class="tooltip-title" style="color:#fbbf24; border-bottom-color:#fbbf24;">MEMÓRIA DE CÁLCULO</span>
            Fórmula: (Concluídos ÷ Obrigatórios) × 100<br><br>
            <strong>Neste perfil:</strong><br>
            ( <span style="color:#fbbf24; font-weight:700">${resolvidos}</span> ÷ <span style="color:#fff; font-weight:700">${stats.mandatory}</span> ) × 100 = <strong>${percentual}%</strong>
        `;
    }

    const scoreEl = document.getElementById('scorePercent');
    const scoreBar = document.getElementById('progressBar');
    const scoreCard = document.getElementById('scoreCardColor');
    const scoreSub = document.getElementById('scoreSubtext');

    if (scoreEl) scoreEl.textContent = `${percentual}%`;
    
    if (scoreBar && scoreCard && scoreSub) {
        scoreBar.style.width = `${percentual}%`;
        scoreCard.classList.remove('b-alert', 'b-warn', 'b-good');
        
        let statusScore = "";
        let textoDiagnostico = "";
        const txtPendencia = stats.pendentesO === 1 ? 'pendência crítica' : 'pendências críticas';
        const txtItem = stats.pendentesO === 1 ? 'item' : 'itens';

        if (percentual < 50) {
            scoreCard.classList.add('b-alert'); statusScore = "Nível Crítico";
            textoDiagnostico = `
                Situação: <strong style="${cAlert}">NÍVEL CRÍTICO</strong><br>
                Aderência atual de apenas ${percentual}%.<br><br>
                O colaborador possui <strong style="${cAlert}">${stats.pendentesO}</strong> ${txtPendencia} em sua trilha obrigatória. Isso representa um risco elevado de não-conformidade.<br><br>
                🚨 <strong>Ação Recomendada:</strong> Realizar a inscrição imediata nestes ${txtItem}.
            `;
        } else if (percentual < 80) {
            scoreCard.classList.add('b-warn'); statusScore = "Requer Atenção";
            textoDiagnostico = `
                Situação: <strong style="${cNum}">REQUER ATENÇÃO</strong><br>
                Aderência parcial de ${percentual}%.<br><br>
                Embora haja progresso, ainda restam <strong style="${cNum}">${stats.pendentesO}</strong> ${txtItem} obrigatórios sem conclusão.<br>
                Verifique se já existem agendamentos para estes casos e monitore a presença.<br><br>
                💡 <strong>Foco:</strong> Fechar os gaps restantes.
            `;
        } else if (percentual < 100) {
            scoreCard.classList.add('b-good'); statusScore = "Alta Aderência";
            textoDiagnostico = `
                Situação: <strong style="${cSuccess}">ALTA PERFORMANCE</strong><br>
                Excelente índice de ${percentual}%.<br><br>
                O colaborador cumpriu a grande maioria dos requisitos. Restam apenas <strong style="${cSuccess}">${stats.pendentesO}</strong> ${txtItem} para a conformidade total.<br><br>
                🎯 <strong>Reta Final:</strong> Agende os itens finais para fechar o ciclo.
            `;
        } else {
            scoreCard.classList.add('b-good'); statusScore = "Conformidade Total";
            textoDiagnostico = `
                Situação: <strong style="${cSuccess}">CONFORMIDADE TOTAL (100%)</strong><br>
                Parabéns! O perfil está totalmente aderente à função.<br><br>
                Todos os requisitos obrigatórios foram atendidos.<br>
                🚀 <strong>Próximo Nível:</strong> Incentive o colaborador a iniciar os cursos <strong>Recomendados</strong> (Upskilling).
            `;
        }
        
        scoreSub.textContent = statusScore;
        if(document.getElementById('storyScore')) document.getElementById('storyScore').innerHTML = `<div style="line-height: 1.6;">${textoDiagnostico}</div>`;
    }

    // --- EVENTOS DE TOOLTIP GLOBAL ---
    document.querySelectorAll('.status-badge, .info-trigger').forEach(el => {
        el.addEventListener('mouseenter', function() {
            const content = this.querySelector('.tooltip-box').innerHTML;
            globalTooltip.innerHTML = content;
            globalTooltip.classList.add('show');
            const rect = this.getBoundingClientRect();
            const tooltipRect = globalTooltip.getBoundingClientRect();
            let topPos = (rect.top < 150) ? rect.bottom + 10 : rect.top - tooltipRect.height - 10;
            const leftPos = (rect.right + 10) - tooltipRect.width;
            globalTooltip.style.top = `${topPos}px`;
            globalTooltip.style.left = `${leftPos}px`;
        });
        el.addEventListener('mouseleave', function() { globalTooltip.classList.remove('show'); });
    });
}
 
 
// --- FUNÇÃO PARA LIMPAR TUDO (RESET TOTAL) ---
function limparFiltros() {
    // 1. Limpa inputs do topo
    const colabInput = document.getElementById('colabFilter');
    if(colabInput) colabInput.value = '';

    // 2. Esconde e reseta Selects Dinâmicos (Lente e Status)
    document.getElementById('lenteWrapper').style.display = 'none';
    const lenteSelect = document.getElementById('lenteFilter');
    if(lenteSelect) lenteSelect.innerHTML = '';
    
    document.getElementById('statusFiltroWrapper').style.display = 'none';
    const statusSelect = document.getElementById('statusSelect');
    if(statusSelect) statusSelect.value = 'todos';

    // 3. Reseta Variável Global de Filtro de Tipo e Botões
    statusAtivo = 'todos';
    document.querySelectorAll('#typeFilterGroup .btn-toggle').forEach(btn => {
        btn.classList.remove('active');
        if(btn.getAttribute('data-target') === 'todos') {
            btn.classList.add('active');
        }
    });

    // 4. Limpa a Interface Principal (Título e Tabela)
    document.getElementById('displayName').textContent = 'Selecione um colaborador';
    const cargoBadge = document.getElementById('displayCargo');
    if(cargoBadge) cargoBadge.textContent = '';
    
    document.querySelector('#individualTable tbody').innerHTML = '';

    // 5. ZERA OS NÚMEROS DOS CARDS (SIDE PANEL)
    const idsParaZerar = [
        'countTotal', 'countObrigatórios', 'countRecomendados', 'countNaoObrigatorios', 
        'countPrioritarios', 'countHomologados', 'countInscritos', 'countAgendados', 
        'countRealizadosInternos', 'countFaltas', 'countPendentes'
    ];

    idsParaZerar.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.textContent = '0';
    });

    // 6. RESETA OS TEXTOS NARRATIVOS (SIDE PANEL)
    const textoPadrao = "Aguardando seleção de colaborador...";
    
    if(document.getElementById('storyScope')) {
        document.getElementById('storyScope').textContent = textoPadrao;
    }
    if(document.getElementById('storyAgenda')) {
        document.getElementById('storyAgenda').textContent = textoPadrao;
    }

    // 7. ZERA O SCORE E BARRA DE PROGRESSO
    const scoreEl = document.getElementById('scorePercent');
    if(scoreEl) scoreEl.textContent = '0%';
    
    const bar = document.getElementById('progressBar');
    if(bar) {
        bar.style.width = '0%';
        bar.style.background = '#334155'; // Volta para a cor cinza escura
    }

    // Reseta a cor do Card de Score para o padrão (Amarelo ou Cinza)
    const scoreCard = document.getElementById('scoreCardColor');
    if(scoreCard) {
        scoreCard.classList.remove('b-alert', 'b-good', 'b-warn');
        scoreCard.classList.add('b-warn'); // Estado neutro/padrão
    }
}