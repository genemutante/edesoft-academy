// /scripts-treinamentos/declaracao-script.js
import { DBHandler } from "../bd-treinamentos/db-handler.js";

// Variável de controle de modo (Global para o módulo)
let currentMode = 'CERTIFICADO';

document.addEventListener('DOMContentLoaded', async () => {
    await carregarCombos();
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
    } catch (e) { console.error("Erro ao carregar combos:", e); }
}

// --- FUNÇÕES EXPOSTAS PARA O WINDOW (Necessário em type="module") ---

window.selectMode = function(mode, el) {
    currentMode = mode.toUpperCase();
    document.querySelectorAll('.evidence-button').forEach(btn => btn.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('form-certificado').style.display = (mode === 'certificado') ? 'block' : 'none';
    document.getElementById('form-notorio').style.display = (mode === 'notorio') ? 'block' : 'none';
    document.getElementById('main-title').textContent = mode === 'certificado' ? '3. Detalhes da Homologação (Certificado)' : '3. Parecer de Notório Saber';
};

window.toggleInstituicao = function(isEdesoft) {
    const input = document.getElementById('certInstituicao');
    input.value = isEdesoft ? "Edesoft-Academy" : "";
    input.readOnly = isEdesoft;
    if(!isEdesoft) input.focus();
};

window.toggleNota = function(isNA) {
    const input = document.getElementById('certNota');
    input.value = "";
    input.readOnly = isNA;
    input.placeholder = isNA ? "N/A" : "0.0";
    if(!isNA) input.focus();
};

window.salvarHomologacao = async function() {
    const sessionRaw = localStorage.getItem('rh_session');
    if (!sessionRaw) return alert("Sessão expirada.");
    const session = JSON.parse(sessionRaw);

    const btn = document.getElementById('btnSalvar');
    const idColab = document.getElementById('selectColaborador').value;
    const idTreino = document.getElementById('selectTreinamento').value;

    if (!idColab || !idTreino) return alert("Selecione o Colaborador e a Competência.");

    let payload = {
        colaborador_id: idColab,
        treinamento_id: idTreino,
        usuario_registro: session.user,
        status: 'Homologado (RH)',
        atividade_externa: currentMode // Diferencia 'CERTIFICADO' de 'NOTORIO'
    };

    if (currentMode === 'CERTIFICADO') {
        const notaNA = document.getElementById('checkNotaNA').checked;
        payload.data_homologacao = document.getElementById('certData').value;
        payload.instrutor = document.getElementById('certInstituicao').value;
        payload.nota = notaNA ? null : document.getElementById('certNota').value;
        payload.observacoes = document.getElementById('certLink').value ? `Link: ${document.getElementById('certLink').value}` : null;
    } else {
        if (!document.getElementById('checkRH').checked) return alert("Confirme a validação técnica.");
        payload.data_homologacao = new Date().toISOString().split('T')[0];
        payload.instrutor = document.getElementById('notorioAprovador').value;
        payload.nota = null;
        payload.observacoes = `Justificativa: ${document.getElementById('notorioJustificativa').value}\nEvidências: ${document.getElementById('notorioEvidencias').value}`;
    }

    try {
        btn.disabled = true;
        btn.textContent = "Gravando...";

        await DBHandler.salvarHomologacao(payload);

        // LOG DE AUDITORIA
        const colabNome = document.getElementById('selectColaborador').options[document.getElementById('selectColaborador').selectedIndex].text;
        const treinoNome = document.getElementById('selectTreinamento').options[document.getElementById('selectTreinamento').selectedIndex].text;
        const detalhesLog = `• Colaborador: ${colabNome}\n• Competência: ${treinoNome}\n• Tipo: ${payload.atividade_externa}\n• Inst/Aprovador: ${payload.instrutor}`;
        
        await DBHandler.registrarLog(session.user, "CERTIFICAR_COMPETENCIA", detalhesLog, "Homologação de Competência");

        alert("✅ Homologação registrada com sucesso!");
        window.location.reload();
    } catch (e) {
        alert("Erro ao salvar: " + e.message);
        btn.disabled = false;
        btn.textContent = "Registrar Homologação";
    }
};
