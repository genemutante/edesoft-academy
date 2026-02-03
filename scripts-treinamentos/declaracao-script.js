// /scripts-treinamentos/declaracao-script.js
import { DBHandler } from "../bd-treinamentos/db-handler.js";

let currentMode = 'CERTIFICADO'; // Controla a diferenciação no banco

document.addEventListener('DOMContentLoaded', async () => {
    await carregarCombos();
    // Inicia com a data de hoje
    const hoje = new Date().toISOString().split('T')[0];
    if (document.getElementById('certData')) document.getElementById('certData').value = hoje;
});

async function carregarCombos() {
    try {
        const colabs = await DBHandler.listarColaboradores({ somenteAtivos: true });
        document.getElementById('selectColaborador').innerHTML = '<option value="">Selecione o colaborador...</option>' + 
            colabs.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');

        const { treinamentos } = await DBHandler.carregarDadosIniciais();
        document.getElementById('selectTreinamento').innerHTML = '<option value="">Selecione a competência alvo...</option>' + 
            treinamentos.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
    } catch (e) { console.error(e); }
}

// Alternar entre os modos e atualizar a variável de diferenciação
window.selectMode = function(mode, el) {
    currentMode = mode.toUpperCase();
    document.querySelectorAll('.evidence-button').forEach(btn => btn.classList.remove('active'));
    el.classList.add('active');
    
    document.getElementById('form-certificado').style.display = (mode === 'certificado') ? 'block' : 'none';
    document.getElementById('form-notorio').style.display = (mode === 'notorio') ? 'block' : 'none';
};

// Regra da Instituição Edesoft
window.toggleInstituicao = function(isEdesoft) {
    const input = document.getElementById('certInstituicao');
    input.value = isEdesoft ? "Edesoft-Academy" : "";
    input.readOnly = isEdesoft;
};

// Regra da Nota N/A
window.toggleNota = function(isNA) {
    const input = document.getElementById('certNota');
    input.value = "";
    input.readOnly = isNA;
    input.placeholder = isNA ? "N/A" : "0.0";
};

window.salvarRegistro = async function() {
    const session = JSON.parse(localStorage.getItem('rh_session'));
    const btn = document.getElementById('btnSalvar');
    
    // Captura IDs dos combos
    const idColab = document.getElementById('selectColaborador').value;
    const idTreino = document.getElementById('selectTreinamento').value;

    if (!idColab || !idTreino) return alert("Selecione Colaborador e Competência.");

    // Montagem do Payload conforme sua Tabela SQL
    let payload = {
        colaborador_id: idColab,
        treinamento_id: idTreino,
        usuario_registro: session.user,
        atividade_externa: currentMode, // <--- Aqui está a diferenciação (CERTIFICADO ou NOTORIO)
        status: 'Homologado (RH)'
    };

    if (currentMode === 'CERTIFICADO') {
        const isNA = document.getElementById('checkNotaNA').checked;
        payload.data_homologacao = document.getElementById('certData').value;
        payload.instrutor = document.getElementById('certInstituicao').value;
        payload.nota = isNA ? null : document.getElementById('certNota').value;
        payload.observacoes = document.getElementById('certLink').value ? `Link: ${document.getElementById('certLink').value}` : null;
    } else {
        if (!document.getElementById('checkRH').checked) return alert("Confirme a validação técnica.");
        payload.data_homologacao = new Date().toISOString().split('T')[0];
        payload.instrutor = document.getElementById('notorioAprovador').value;
        payload.nota = null;
        payload.observacoes = `Parecer: ${document.getElementById('notorioJustificativa').value} | Evidências: ${document.getElementById('notorioEvidencias').value}`;
    }

    try {
        btn.disabled = true;
        btn.textContent = "Gravando...";
        
        await DBHandler.salvarHomologacao(payload);

        // Registro de Auditoria
        const colabNome = document.getElementById('selectColaborador').options[document.getElementById('selectColaborador').selectedIndex].text;
        await DBHandler.registrarLog(session.user, "HOMOLOGACAO_COMPETENCIA", `• Tipo: ${currentMode}\n• Colaborador: ${colabNome}`, "Homologação de Competência");

        alert("✅ Homologação registrada com sucesso!");
        window.location.reload();
    } catch (e) {
        alert("Erro ao salvar: " + e.message);
        btn.disabled = false;
        btn.textContent = "Registrar Homologação";
    }
};
