// VARIÁVEIS GLOBAIS
let db;
let config;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Carrega DB
    db = DBHandler.get();
    config = db.dados ? db.dados : db;

    // 2. Popula selects
    popularSelects();

    // 3. Configura o Botão de Salvar (Adicionei o listener via JS para ficar limpo)
    document.querySelector('.btn-submit').onclick = registrarHomologacao;
});

function popularSelects() {
    // Popula Colaboradores
    const selColab = document.getElementById('selColaborador');
    if (config && config.colaboradores) {
        selColab.innerHTML = '<option value="">Selecione o colaborador...</option>';
        config.colaboradores.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.nome;
            selColab.appendChild(opt);
        });
    }

    // Popula Cursos
    const selCurso = document.getElementById('selCurso');
    if (config && config.treinamentos) {
        selCurso.innerHTML = '<option value="">Selecione o curso...</option>';
        const cursosOrdenados = [...config.treinamentos].sort((a,b) => a.nome.localeCompare(b.nome));
        
        cursosOrdenados.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            const nomeLimpo = t.nome.indexOf(':') > -1 ? t.nome.substring(t.nome.indexOf(':') + 1).trim() : t.nome;
            opt.textContent = nomeLimpo;
            selCurso.appendChild(opt);
        });
    }
}

function toggleForm() {
    const tipos = document.getElementsByName('tipoComprovacao');
    let selecionado = 'certificado';
    for (const t of tipos) { if (t.checked) selecionado = t.value; }

    const formCert = document.getElementById('formCertificado');
    const formExp = document.getElementById('formExperiencia');

    if (selecionado === 'experiencia') {
        formCert.style.display = 'none';
        formExp.style.display = 'block';
        formExp.style.opacity = 0; setTimeout(() => formExp.style.opacity = 1, 50);
    } else {
        formExp.style.display = 'none';
        formCert.style.display = 'block';
        formCert.style.opacity = 0; setTimeout(() => formCert.style.opacity = 1, 50);
    }
}

// --- AQUI ESTÁ A FUNÇÃO DE GRAVAR ---
// --- FUNÇÃO DE GRAVAR (FLUXO CONTÍNUO) ---
// --- FUNÇÃO DE GRAVAR (COM LINK EXTERNO) ---
function registrarHomologacao() {
    const colabId = document.getElementById('selColaborador').value;
    const cursoId = document.getElementById('selCurso').value;
    
    if(!colabId || !cursoId) {
        alert("Erro: Selecione o colaborador e o curso.");
        return;
    }

    const tipos = document.getElementsByName('tipoComprovacao');
    let tipoSelecionado = 'certificado';
    for (const t of tipos) { if (t.checked) tipoSelecionado = t.value; }

    let novaHomologacao = {
        id: Date.now(), 
        colaboradorId: parseInt(colabId),
        treinamentoId: parseInt(cursoId),
        dataHomologacao: new Date().toISOString().split('T')[0]
    };

    // LÓGICA CONDICIONAL DE PREENCHIMENTO
    if (tipoSelecionado === 'experiencia') {
        // --- FLUXO B: DECLARAÇÃO DE EXPERIÊNCIA ---
        novaHomologacao.origem = "Declaração de Experiência";
        const texto = document.querySelector('.form-input.area').value;
        const check = document.getElementById('checkVerdade').checked;
        
        if(!check) { alert("Obrigatório: Confirme a veracidade das informações."); return; }
        if(texto.length < 15) { alert("Erro: A justificativa técnica está muito curta."); return; }
        
        novaHomologacao.evidencia = texto;

    } else {
        // --- FLUXO A: CERTIFICADO (LINK) ---
        novaHomologacao.origem = "Certificação Externa";
        
        const instituicao = document.getElementById('certInstituicao').value;
        const link = document.getElementById('certLink').value;
        const nomeCurso = document.getElementById('certNome').value;

        if(!instituicao || !link) {
            alert("Erro: Para certificações, a Instituição e o Link da evidência são obrigatórios.");
            return;
        }

        // Validação simples de URL
        if(!link.toLowerCase().startsWith("http")) {
            alert("Erro: O link deve começar com http:// ou https://");
            return;
        }

        // Formata a evidência para guardar o link
        // Usaremos um prefixo "LINK:" para o sistema saber renderizar depois
        novaHomologacao.evidencia = `LINK|${link}|${instituicao}`;
    }

    // 1. ATUALIZA A MEMÓRIA
    if (!config.homologacoes) config.homologacoes = [];
    config.homologacoes.push(novaHomologacao);

    // 2. SALVA NO DISCO
    DBHandler.save(db, `Homologação: Curso ${cursoId} para Colab ${colabId}`);

    // 3. FEEDBACK E LIMPEZA
    alert("✅ Homologação registrada com sucesso!");

    // Limpeza inteligente dos campos
    document.getElementById('selCurso').value = "";
    
    // Limpa campos de Experiência
    document.querySelector('.form-input.area').value = "";
    if(document.getElementById('checkVerdade')) document.getElementById('checkVerdade').checked = false;
    
    // Limpa campos de Certificado
    document.getElementById('certInstituicao').value = "";
    document.getElementById('certData').value = "";
    document.getElementById('certNome').value = "";
    document.getElementById('certLink').value = "";
    
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
}




