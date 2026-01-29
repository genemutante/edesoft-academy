// =============================================================================
// ARQUIVO: cadastro-script.js
// Gestão de Colaboradores - Versão Premium (UX/UI + Soft Delete)
// =============================================================================

// --- VARIÁVEIS GLOBAIS ---
let db;
let config;
let currentSort = { col: 'nome', asc: true }; // Controle de Ordenação
let currentColabId = null; // ID do colaborador sendo manipulado no momento

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    try {
        db = DBHandler.get();
        config = db.dados ? db.dados : db;
        
        popularFiltrosDinamicos();
        renderizarTabela();
        popularSelectsAuxiliares();

        // --- NOVO: MÁSCARA DE CPF AUTOMÁTICA ---
        const inputCPF = document.getElementById('cpf');
        if (inputCPF) {
            inputCPF.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é número
                if (value.length > 11) value = value.slice(0, 11); // Limita a 11 dígitos
                
                // Aplica a formatação visual (000.000.000-00)
                if (value.length > 9) {
                    value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, '$1.$2.$3-$4');
                } else if (value.length > 6) {
                    value = value.replace(/^(\d{3})(\d{3})(\d{3}).*/, '$1.$2.$3');
                } else if (value.length > 3) {
                    value = value.replace(/^(\d{3})(\d{3}).*/, '$1.$2');
                }
                e.target.value = value;
            });
        }

    } catch (e) {
        console.error(e);
        alert("Erro crítico ao carregar banco de dados: " + e.message);
    }
});

// =============================================================================
// 1. HELPERS DE FORMATAÇÃO E UX (PREMIUM)
// =============================================================================
const Formatter = {
    // Converte YYYY-MM-DD para DD/MM/AAAA
    dateToView: (isoDate) => {
        if (!isoDate || isoDate.length !== 10) return '-';
        const [y, m, d] = isoDate.split('-');
        return `${d}/${m}/${y}`;
    },
    // Converte float para R$
    currencyToView: (val) => {
        if (val === undefined || val === null || val === '') return '-';
        return parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
};

// Alterna entre a Tela de Lista e a Tela de Formulário
function alternarTela(telaAlvo) {
    document.getElementById('viewList').style.display = 'none';
    document.getElementById('viewForm').style.display = 'none';
    
    const target = document.getElementById(telaAlvo);
    target.style.display = 'flex'; 
    
    if(telaAlvo === 'viewForm') {
        // RESET CORRIGIDO: Agora quem rola é o Form inteiro
        const formContainer = document.getElementById('mainForm');
        if(formContainer) formContainer.scrollTop = 0;
    } else {
        const tableArea = document.querySelector('.table-scroll-area');
        if(tableArea) tableArea.scrollTop = 0;
    }
}
// Controle de Abas
function openTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    btn.classList.add('active');
}

// =============================================================================
// 2. CRUD: AÇÕES DO GRID (Visualizar, Editar, Novo, Inativar)
// =============================================================================

// --- VISUALIZAR (MODO LEITURA - READ ONLY) ---
function visualizarColaborador(id) {
    const colab = config.colaboradores.find(c => c.id === id);
    if (!colab) return;
    currentColabId = id;

    // 1. Preenche os inputs (valor cru para garantir integridade)
    preencherFormulario(colab);

    // 2. Aplica máscaras visuais (transforma datas e moedas em texto legível)
    aplicarMascarasLeitura(colab);

    // 3. Ajuste de Interface (CSS .mode-view faz a mágica visual)
    document.getElementById('formTitle').textContent = `Ficha: ${colab.nome}`;
    const form = document.getElementById('mainForm');
    form.classList.add('mode-view');
    
    // Gestão de Botões
    document.getElementById('btnSalvar').style.display = 'none';       
    document.getElementById('btnIrParaEdicao').style.display = 'inline-block'; 
    document.getElementById('btnCancelarVoltar').textContent = 'Voltar'; 
    const btnExcluir = document.getElementById('btnExcluir');
    if(btnExcluir) btnExcluir.style.display = 'none';
    
    // Reseta para primeira aba
    document.querySelector('.tab-link').click();
    alternarTela('viewForm');
}

// --- EDITAR (MODO EDIÇÃO) ---
function editarColaborador(id) {
    const colab = config.colaboradores.find(c => c.id === id);
    if (!colab) return;
    currentColabId = id;

    // 1. Preenche dados (Valor real/cru para edição correta)
    preencherFormulario(colab);
    
    // 2. Prepara interface (remove bloqueios)
    prepararInterfaceEdicao(`Editando: ${colab.nome.split(' ')[0]}`);
    
    alternarTela('viewForm');
}

// --- NOVO CADASTRO ---
function novoColaborador() {
    currentColabId = null;
    document.getElementById('mainForm').reset();
    document.getElementById('colabId').value = "";
    
    prepararInterfaceEdicao("Novo Colaborador");
    alternarTela('viewForm');
}

// Helper: Transição de Visualizar -> Editar
function ativarModoEdicao() {
    if(currentColabId) {
        editarColaborador(currentColabId);
    }
}

// Helper: Configura a tela para edição (destrava campos)
function prepararInterfaceEdicao(titulo) {
    document.getElementById('formTitle').textContent = titulo;
    const form = document.getElementById('mainForm');
    
    // Remove modo leitura
    form.classList.remove('mode-view');
    
    // Restaura valores RAW se necessário (garantia)
    if(currentColabId) {
        const colab = config.colaboradores.find(c => c.id === currentColabId);
        if(colab) preencherFormulario(colab); 
    }

    // Botões
    document.getElementById('btnSalvar').style.display = 'inline-block';
    document.getElementById('btnIrParaEdicao').style.display = 'none';
    document.getElementById('btnCancelarVoltar').textContent = 'Cancelar';
    
    const btnExcluir = document.getElementById('btnExcluir');
    if(btnExcluir) btnExcluir.style.display = 'none'; // Segurança

    document.querySelector('.tab-link').click();
}

// Ação do Botão "Voltar/Cancelar"
function acaoVoltar() {
    document.getElementById('viewForm').style.display = 'none';
    document.getElementById('viewList').style.display = 'block';
    renderizarTabela(); // Atualiza grid
}

// --- INATIVAR / REATIVAR (SOFT DELETE) ---
// Variável temporária para saber QUEM estamos desligando
let idColabParaDesligar = null;

// --- FUNÇÃO PRINCIPAL DE AÇÃO (Chamada pelo botão do Grid) ---
function alternarStatusColaborador(id, queroReativar) {
    const colab = config.colaboradores.find(c => c.id === id);
    if (!colab) return;

    if (queroReativar) {
        // Reativação direta (com confirm simples é ok, pois é positivo)
        if (confirm(`Deseja reativar ${colab.nome}?`)) {
            colab.dataDemissao = null;
            colab.motivoDemissao = null;
            colab.atualizadoEm = new Date().toISOString();
            DBHandler.save(db, `Reativação: ${colab.nome}`);
            renderizarTabela();
        }
    } else {
        // ABERTURA DO MODAL DE DESLIGAMENTO
        idColabParaDesligar = id;
        
        // Prepara o Modal
        document.getElementById('modalMsg').innerHTML = `Você está prestes a desligar <strong>${colab.nome}</strong>.`;
        document.getElementById('modalDataDemissao').value = new Date().toISOString().split('T')[0]; // Hoje
        document.getElementById('modalMotivo').value = "";
        
        // Mostra
        document.getElementById('modalDesligamento').style.display = 'flex';
        document.getElementById('modalDataDemissao').focus();
    }
}

// --- CONFIRMAR NO MODAL ---
function confirmarDesligamento() {
    if (!idColabParaDesligar) return;

    const data = document.getElementById('modalDataDemissao').value;
    const motivo = document.getElementById('modalMotivo').value;

    if (!data) {
        alert("A data de desligamento é obrigatória.");
        return;
    }

    const colab = config.colaboradores.find(c => c.id === idColabParaDesligar);
    if (colab) {
        colab.dataDemissao = data;
        colab.motivoDemissao = motivo;
        colab.atualizadoEm = new Date().toISOString();
        
        DBHandler.save(db, `Desligamento: ${colab.nome}`);
        renderizarTabela();
        popularFiltrosDinamicos();
    }
    
    fecharModalDesligamento();
}

// --- FECHAR MODAL ---
function fecharModalDesligamento() {
    document.getElementById('modalDesligamento').style.display = 'none';
    idColabParaDesligar = null;
}



// =============================================================================
// 3. MAPA DE DADOS (PREENCHIMENTO E SALVAMENTO)
// =============================================================================

// Preenche os 71 campos do formulário com dados do objeto
function preencherFormulario(colab) {
    document.getElementById('colabId').value = colab.id;
    
    // Lista de campos simples (Text, Select)
    const camposTexto = [
        'nome', 'saudacao', 'genero', 'estadoCivil', 'nacionalidade', 'naturalidade', 'racaEtnia', 
        'nomePai', 'nomeMae', 'tipoDeficiencia', 'cpf', 'rg', 'orgaoExpedidor', 'cnh', 'pis', 
        'tituloEleitor', 'zonaEleitoral', 'secaoEleitoral', 'ctpsNum', 'ctpsSerie', 'reservista', 'cnpj',
        'emailPessoal', 'celular', 'telefone', 'telefoneEmergencia', 'cep', 'logradouro', 'numero', 
        'complemento', 'bairro', 'cidade', 'estado', 'funcao', 'departamento', 'unidade', 'matricula', 
        'emailEmpresarial', 'tipoContrato', 'duracaoContrato', 'moeda', 'grauHierarquico', 'turno', 'bancoHoras',
        'banco', 'agencia', 'contaCorrente', 'escolaridade', 'motivoDemissao', 'observacoes'
    ];
    camposTexto.forEach(id => setVal(id, colab[id]));

    // Datas (Inputs date exigem YYYY-MM-DD)
    const camposData = ['dataNascimento', 'dataExpedicao', 'dataAdmissao', 'vencimentoContrato', 'dataDemissao'];
    camposData.forEach(id => setVal(id, colab[id]));

    // Numéricos
    setVal('salario', colab.salario);
    setVal('valorRescisao', colab.valorRescisao);

    // Relacionais
    setVal('cargoAtualId', colab.cargoAtualId);
    setVal('gestorId', colab.gestorId);

    // Checkboxes
    setCheck('pcd', colab.pcd);
    setCheck('candidato', colab.candidato);
}

// Aplica formatação visual (somente visualização)
function aplicarMascarasLeitura(colab) {
    // 1. Vazios viram "-"
    document.querySelectorAll('#mainForm input[type="text"], #mainForm textarea').forEach(el => {
        if (!el.value) el.value = "-";
    });

    // 2. Datas viram DD/MM/AAAA
    const camposData = ['dataNascimento', 'dataExpedicao', 'dataAdmissao', 'vencimentoContrato', 'dataDemissao'];
    camposData.forEach(id => {
        const el = document.getElementById(id);
        if(el && colab[id]) {
            el.setAttribute('type', 'text'); // Hack visual
            el.value = Formatter.dateToView(colab[id]);
        } else if (el) {
             el.setAttribute('type', 'text');
             el.value = "-";
        }
    });

    // 3. Moedas viram R$
    const camposMoeda = ['salario', 'valorRescisao'];
    camposMoeda.forEach(id => {
        const el = document.getElementById(id);
        if(el && colab[id]) {
            el.setAttribute('type', 'text');
            el.value = Formatter.currencyToView(colab[id]);
        }
    });
}

// Salva os dados (Extrai do HTML para JSON)
function salvarColaborador() {
    const id = document.getElementById('colabId').value;
    
    // Objeto Gigante com 71 Campos
    const formData = {
        id: id ? parseInt(id) : Date.now(),
        // Pessoais
        nome: getVal('nome'), saudacao: getVal('saudacao'), dataNascimento: getVal('dataNascimento'),
        genero: getVal('genero'), estadoCivil: getVal('estadoCivil'), nacionalidade: getVal('nacionalidade'),
        naturalidade: getVal('naturalidade'), racaEtnia: getVal('racaEtnia'), nomePai: getVal('nomePai'),
        nomeMae: getVal('nomeMae'), pcd: getCheck('pcd'), tipoDeficiencia: getVal('tipoDeficiencia'), candidato: getCheck('candidato'),
        
        // Docs
        cpf: getVal('cpf'), rg: getVal('rg'), orgaoExpedidor: getVal('orgaoExpedidor'), dataExpedicao: getVal('dataExpedicao'),
        cnh: getVal('cnh'), pis: getVal('pis'), tituloEleitor: getVal('tituloEleitor'), zonaEleitoral: getVal('zonaEleitoral'),
        secaoEleitoral: getVal('secaoEleitoral'), ctpsNum: getVal('ctpsNum'), ctpsSerie: getVal('ctpsSerie'), reservista: getVal('reservista'), cnpj: getVal('cnpj'),

        // Contato
        emailPessoal: getVal('emailPessoal'), celular: getVal('celular'), telefone: getVal('telefone'), telefoneEmergencia: getVal('telefoneEmergencia'),
        cep: getVal('cep'), logradouro: getVal('logradouro'), numero: getVal('numero'), complemento: getVal('complemento'),
        bairro: getVal('bairro'), cidade: getVal('cidade'), estado: getVal('estado'),

        // Contrato
        cargoAtualId: parseInt(getVal('cargoAtualId')) || null, funcao: getVal('funcao'), departamento: getVal('departamento'),
        unidade: getVal('unidade'), matricula: getVal('matricula'), email: getVal('emailEmpresarial'), emailEmpresarial: getVal('emailEmpresarial'),
        dataAdmissao: getVal('dataAdmissao'), tipoContrato: getVal('tipoContrato'), duracaoContrato: getVal('duracaoContrato'),
        vencimentoContrato: getVal('vencimentoContrato'), gestorId: parseInt(getVal('gestorId')) || null,
        salario: parseFloat(getVal('salario')) || 0, moeda: getVal('moeda'), grauHierarquico: getVal('grauHierarquico'),
        turno: getVal('turno'), bancoHoras: getVal('bancoHoras'),

        // Outros
        banco: getVal('banco'), agencia: getVal('agencia'), contaCorrente: getVal('contaCorrente'), escolaridade: getVal('escolaridade'),
        dataDemissao: getVal('dataDemissao'), valorRescisao: parseFloat(getVal('valorRescisao')) || null,
        motivoDemissao: getVal('motivoDemissao'), observacoes: getVal('observacoes'),

        atualizadoEm: new Date().toISOString()
    };

    if (id) {
        const index = config.colaboradores.findIndex(c => c.id === parseInt(id));
        if (index > -1) {
            // Preserva foto e data criação
            formData.foto = config.colaboradores[index].foto;
            formData.criadoEm = config.colaboradores[index].criadoEm;
            config.colaboradores[index] = formData;
        }
    } else {
        formData.criadoEm = new Date().toISOString();
        formData.foto = `https://ui-avatars.com/api/?name=${encodeURI(formData.nome)}&background=random&color=fff`;
        config.colaboradores.push(formData);
    }

    DBHandler.save(db, `Colaborador ${formData.nome} salvo`);
    alert("✅ Dados salvos com sucesso!");
    
    popularFiltrosDinamicos();
    acaoVoltar();
}

// =============================================================================
// 4. LÓGICA DO GRID (Listagem, Filtros, Ordenação)
// =============================================================================

function renderizarTabela() {
    const tbody = document.querySelector('#colabTable tbody');
    tbody.innerHTML = '';
    
    // Captura filtros
    const termo = document.getElementById('searchBox').value.toLowerCase();
    const fStatus = document.getElementById('filtroStatus') ? document.getElementById('filtroStatus').value : 'todos';
    const fDepto = document.getElementById('filtroDepto') ? document.getElementById('filtroDepto').value : '';
    const fCargo = document.getElementById('filtroCargo') ? document.getElementById('filtroCargo').value : '';

    // Filtragem
    let listaFiltrada = config.colaboradores.filter(colab => {
        if (termo && !colab.nome.toLowerCase().includes(termo) && !colab.cpf?.includes(termo)) return false;
        
        const isDesligado = !!colab.dataDemissao; 
        if (fStatus === 'ativos' && isDesligado) return false;
        if (fStatus === 'desligados' && !isDesligado) return false;

        if (fDepto && colab.departamento !== fDepto) return false;
        
        let nomeCargo = getNomeCargo(colab);
        if (fCargo && nomeCargo !== fCargo) return false;

        return true;
    });

    // Ordenação
    listaFiltrada.sort((a, b) => {
        let valA, valB;
        switch (currentSort.col) {
            case 'cargo': valA = getNomeCargo(a).toLowerCase(); valB = getNomeCargo(b).toLowerCase(); break;
            case 'status': valA = a.dataDemissao ? 1 : 0; valB = b.dataDemissao ? 1 : 0; break;
            default: valA = (a[currentSort.col] || '').toLowerCase(); valB = (b[currentSort.col] || '').toLowerCase();
        }
        if (valA < valB) return currentSort.asc ? -1 : 1;
        if (valA > valB) return currentSort.asc ? 1 : -1;
        return 0;
    });

    // Renderização
    listaFiltrada.forEach(colab => {
        const isDesligado = !!colab.dataDemissao;
        const nomeCargo = getNomeCargo(colab);
        
        // Data formatada para a tabela
        let dataAdm = colab.dataAdmissao ? Formatter.dateToView(colab.dataAdmissao) : '-';

        // Badge Status
        let statusHtml = isDesligado 
            ? `<span style="font-size:11px; background:#fee2e2; color:#991b1b; padding:2px 6px; border-radius:4px;">Desligado</span>`
            : `<span style="font-size:11px; background:#dcfce7; color:#166534; padding:2px 6px; border-radius:4px;">Ativo</span>`;

        // Botão de Bloqueio/Reativação
        let btnBloqueio = '';
        if (isDesligado) {
            btnBloqueio = `<button class="btn-icon-action btn-reactivate" onclick="alternarStatusColaborador(${colab.id}, true)" title="Reativar Cadastro">♻️</button>`;
        } else {
            btnBloqueio = `<button class="btn-icon-action btn-inactivate" onclick="alternarStatusColaborador(${colab.id}, false)" title="Inativar (Demitir)">🚫</button>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600; color: #334155;">${colab.nome}</td>
            <td style="font-size:13px;">${nomeCargo}</td>
            <td style="font-size:13px;">${colab.departamento || '-'}</td>
            <td style="font-size:13px;">${dataAdm}</td>
            <td>${statusHtml}</td>
            <td class="actions-cell">
                <button class="btn-icon-action btn-view" onclick="visualizarColaborador(${colab.id})" title="Consultar Ficha">👁️</button>
                <button class="btn-icon-action btn-edit" onclick="editarColaborador(${colab.id})" title="Editar Dados">✏️</button>
                ${btnBloqueio}
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Contador
    const elContador = document.getElementById('contadorRegistros');
    if(elContador) elContador.textContent = `Exibindo ${listaFiltrada.length} de ${config.colaboradores.length} registros`;
}

function ordenar(coluna) {
    if (currentSort.col === coluna) {
        currentSort.asc = !currentSort.asc;
    } else {
        currentSort.col = coluna;
        currentSort.asc = true;
    }
    document.querySelectorAll('th.sortable span').forEach(s => s.textContent = '');
    const icon = currentSort.asc ? '▲' : '▼';
    const span = document.getElementById(`sort-${coluna}`);
    if(span) span.textContent = icon;
    renderizarTabela();
}

function limparFiltros() {
    document.getElementById('filtroStatus').value = 'todos';
    document.getElementById('filtroDepto').value = '';
    document.getElementById('filtroCargo').value = '';
    document.getElementById('searchBox').value = '';
    renderizarTabela();
}

function popularFiltrosDinamicos() {
    const deptos = [...new Set(config.colaboradores.map(c => c.departamento).filter(Boolean))].sort();
    const selDepto = document.getElementById('filtroDepto');
    if(selDepto) {
        selDepto.innerHTML = '<option value="">Departamento: Todos</option>';
        deptos.forEach(d => selDepto.innerHTML += `<option value="${d}">${d}</option>`);
    }
    const cargos = [...new Set(config.colaboradores.map(c => getNomeCargo(c)).filter(Boolean))].sort();
    const selCargo = document.getElementById('filtroCargo');
    if(selCargo) {
        selCargo.innerHTML = '<option value="">Cargo: Todos</option>';
        cargos.forEach(c => selCargo.innerHTML += `<option value="${c}">${c}</option>`);
    }
}

// =============================================================================
// 5. HELPER FUNCTIONS GENÉRICAS
// =============================================================================

function popularSelectsAuxiliares() {
    const selCargo = document.getElementById('cargoAtualId');
    if(selCargo) {
        selCargo.innerHTML = '<option value="">Selecione o Cargo...</option>';
        config.cargos.forEach(c => selCargo.innerHTML += `<option value="${c.id}">${c.nome}</option>`);
    }
    const selGestor = document.getElementById('gestorId');
    if(selGestor) {
        selGestor.innerHTML = '<option value="">Sem Superior...</option>';
        config.colaboradores.forEach(c => selGestor.innerHTML += `<option value="${c.id}">${c.nome}</option>`);
    }
}

function getNomeCargo(colab) {
    if (colab.cargoAtualId) {
        const cObj = config.cargos.find(x => x.id === parseInt(colab.cargoAtualId));
        if (cObj) return cObj.nome;
    }
    return colab.funcao || colab.cargo || '';
}

// Getters e Setters inteligentes
function getVal(id) { return document.getElementById(id) ? document.getElementById(id).value : ""; }

function setVal(id, val) { 
    const el = document.getElementById(id);
    if(el) {
        // Reseta o type para o padrão caso tenha sido alterado pela máscara de leitura
        if(id.includes('data')) el.setAttribute('type', 'date');
        if(id === 'salario' || id === 'valorRescisao') el.setAttribute('type', 'number');
        
        el.value = (val === null || val === undefined) ? "" : val; 
    }
}

function setCheck(id, val) { if(document.getElementById(id)) document.getElementById(id).checked = val ? true : false; }
function getCheck(id) { return document.getElementById(id) ? document.getElementById(id).checked : false; }

function buscarCep(cep) {
    const limpo = cep.replace(/\D/g, '');
    if (limpo.length === 8) {
        fetch(`https://viacep.com.br/ws/${limpo}/json/`).then(res => res.json()).then(data => {
            if (!data.erro) {
                setVal('logradouro', data.logradouro); setVal('bairro', data.bairro);
                setVal('cidade', data.localidade); setVal('estado', data.uf);
                document.getElementById('numero').focus();
            }
        });
    }
}

// =============================================================================
// MOTOR DE VALIDAÇÃO & REGRAS DE NEGÓCIO
// =============================================================================

// Função Principal de Validação (Retorna true se tudo ok)
function validarFormulario() {
    let isValid = true;
    limparErros(); // Remove erros visuais anteriores

    const dados = {
        id: document.getElementById('colabId').value, // ID atual (se for edição)
        nome: getVal('nome'),
        cpf: getVal('cpf'),
        email: getVal('emailEmpresarial'),
        nascimento: getVal('dataNascimento'),
        admissao: getVal('dataAdmissao'),
        demissao: getVal('dataDemissao'),
        cargo: getVal('cargoAtualId'),
        salario: getVal('salario')
    };

    // 1. CAMPOS OBRIGATÓRIOS (Required)
    if (!dados.nome) { marcarErro('nome', 'Nome é obrigatório.'); isValid = false; }
    if (!dados.cargo) { marcarErro('cargoAtualId', 'Cargo é obrigatório.'); isValid = false; }
    if (!dados.admissao) { marcarErro('dataAdmissao', 'Data de admissão é obrigatória.'); isValid = false; }
    
    // 2. VALIDAÇÃO DE CPF (Matemática + Unicidade)
    if (!dados.cpf) {
        marcarErro('cpf', 'CPF é obrigatório.');
        isValid = false;
    } else {
        // Valida formato
        if (!validarCPF(dados.cpf)) {
            marcarErro('cpf', 'CPF inválido (Dígito verificador incorreto).');
            isValid = false;
        } 
        // Valida Unicidade (Se já existe outro colaborador com esse CPF)
        else {
            const cpfLimpo = dados.cpf.replace(/\D/g, '');
            const duplicado = config.colaboradores.find(c => {
                const cCpf = (c.cpf || '').replace(/\D/g, '');
                // É duplicado se CPF for igual E o ID for diferente (não sou eu mesmo editando)
                return cCpf === cpfLimpo && c.id != dados.id; 
            });
            
            if (duplicado) {
                marcarErro('cpf', 'Este CPF já está cadastrado para: ' + duplicado.nome);
                isValid = false;
            }
        }
    }

    // 3. REGRAS DE DATAS (Consistência Temporal)
    if (dados.nascimento && dados.admissao) {
        const nasc = new Date(dados.nascimento);
        const adm = new Date(dados.admissao);
        const diffAnos = (adm - nasc) / (1000 * 60 * 60 * 24 * 365.25);
        
        if (diffAnos < 14) {
            marcarErro('dataNascimento', 'Colaborador deve ter no mínimo 14 anos (Jovem Aprendiz).');
            isValid = false;
        }
    }

    if (dados.demissao && dados.admissao) {
        if (new Date(dados.demissao) < new Date(dados.admissao)) {
            marcarErro('dataDemissao', 'A demissão não pode ser anterior à admissão.');
            isValid = false;
        }
    }

    // 4. FORMATO DE EMAIL
    if (dados.email && !dados.email.includes('@')) {
        marcarErro('emailEmpresarial', 'Formato de e-mail inválido.');
        isValid = false;
    }

    // Se houve erro, foca no primeiro campo errado e abre a aba correta
    if (!isValid) {
        const primeiroErro = document.querySelector('.input-error');
        if (primeiroErro) {
            // Descobre em qual aba o erro está e abre ela
            const abaPai = primeiroErro.closest('.tab-content');
            if (abaPai) {
                const idAba = abaPai.id;
                const btnAba = document.querySelector(`button[onclick*="${idAba}"]`);
                if (btnAba) btnAba.click();
            }
            primeiroErro.focus();
        }
        alert("⚠️ Existem erros no formulário. Verifique os campos marcados em vermelho.");
    }

    return isValid;
}

// --- UTILS DE VALIDAÇÃO ---

function marcarErro(idCampo, mensagem) {
    const el = document.getElementById(idCampo);
    if (!el) return;
    
    el.classList.add('input-error');
    
    // Cria a msg se não existir
    let msgDiv = el.parentNode.querySelector('.error-message');
    if (!msgDiv) {
        msgDiv = document.createElement('span');
        msgDiv.className = 'error-message';
        el.parentNode.appendChild(msgDiv);
    }
    msgDiv.textContent = mensagem;
}

function limparErros() {
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    document.querySelectorAll('.error-message').forEach(el => el.remove());
}

// Validador Matemático de CPF (Algoritmo Oficial)
function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf == '') return false;
    // Elimina CPFs invalidos conhecidos
    if (cpf.length != 11 || 
        cpf == "00000000000" || 
        cpf == "11111111111" || 
        cpf == "22222222222" || 
        cpf == "33333333333" || 
        cpf == "44444444444" || 
        cpf == "55555555555" || 
        cpf == "66666666666" || 
        cpf == "77777777777" || 
        cpf == "88888888888" || 
        cpf == "99999999999") 
            return false;
            
    let add = 0;
    for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev == 10 || rev == 11) rev = 0;
    if (rev != parseInt(cpf.charAt(9))) return false;
    
    add = 0;
    for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev == 10 || rev == 11) rev = 0;
    if (rev != parseInt(cpf.charAt(10))) return false;
    
    return true;
}

// --- ATUALIZAÇÃO DA FUNÇÃO SALVAR ---
function salvarColaborador() {
    // 1. CHAMA A VALIDAÇÃO ANTES DE TUDO
    if (!validarFormulario()) {
        return; // Para tudo se tiver erro
    }

    const id = document.getElementById('colabId').value;
    
    // ... (MANTENHA AQUI A CRIAÇÃO DO OBJETO formData QUE JÁ FIZEMOS ANTES) ...
    // ... (Só copie o trecho do 'const formData = { ... }' da resposta anterior) ...
    // Vou colocar resumido aqui para caber, mas use o completo:
    
    const formData = {
        id: id ? parseInt(id) : Date.now(),
        nome: getVal('nome'),
        cpf: getVal('cpf'),
        // ... (TODOS OS 71 CAMPOS AQUI) ...
        // Para fins de teste rápido, garanta que pegamos os usados na validação:
        cargoAtualId: parseInt(getVal('cargoAtualId')) || null,
        dataAdmissao: getVal('dataAdmissao'),
        dataNascimento: getVal('dataNascimento'),
        emailEmpresarial: getVal('emailEmpresarial'),
        dataDemissao: getVal('dataDemissao'),
        // ...
        
        atualizadoEm: new Date().toISOString()
    };

    // Lógica de Persistência (Igual anterior)
    if (id) {
        const index = config.colaboradores.findIndex(c => c.id === parseInt(id));
        if (index > -1) {
            formData.foto = config.colaboradores[index].foto;
            formData.criadoEm = config.colaboradores[index].criadoEm;
            config.colaboradores[index] = formData;
        }
    } else {
        formData.criadoEm = new Date().toISOString();
        formData.foto = `https://ui-avatars.com/api/?name=${encodeURI(formData.nome)}&background=random&color=fff`;
        config.colaboradores.push(formData);
    }

    DBHandler.save(db, `Colaborador ${formData.nome} salvo`);
    alert("✅ Dados validados e salvos com sucesso!");
    
    popularFiltrosDinamicos();
    acaoVoltar();
}
