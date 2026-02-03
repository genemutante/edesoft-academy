// /scripts-treinamentos/declaracao-script.js
import { DBHandler } from "../bd-treinamentos/db-handler.js";

let COLABORADORES = [];
let TREINAMENTOS = [];
let currentMode = 'TREINAMENTO';

// Escuta a mudança de aba vinda do HTML
window.addEventListener('modeChange', (e) => {
    currentMode = e.detail.mode;
});

document.addEventListener('DOMContentLoaded', async () => {
    await carregarCombos();
});

async function carregarCombos() {
    try {
        // Carrega Colaboradores Ativos
        COLABORADORES = await DBHandler.listarColaboradores({ somenteAtivos: true });
        const selColab = document.getElementById('selectColaborador');
        selColab.innerHTML = '<option value="">Selecione o Colaborador...</option>' + 
            COLABORADORES.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');

        // Carrega Treinamentos do Banco
        const dados = await DBHandler.carregarDadosIniciais();
        TREINAMENTOS = dados.treinamentos;
        const selTreino = document.getElementById('selectTreinamento');
        selTreino.innerHTML = '<option value="">Selecione o Treinamento...</option>' + 
            TREINAMENTOS.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
            
    } catch (e) {
        console.error("Erro ao carregar combos:", e);
    }
}

window.registrarEvento = async function() {
    const session = JSON.parse(localStorage.getItem('rh_session'));
    
    const payload = {
        colaborador_id: document.getElementById('selectColaborador').value,
        data_homologacao: document.getElementById('dataEvento').value,
        nota: document.getElementById('notaRegistro').value || 0,
        instrutor: document.getElementById('responsavelNome').value,
        validade_meses: document.getElementById('validadeMeses').value,
        usuario_registro: session.user,
        // Campos condicionais
        treinamento_id: currentMode === 'TREINAMENTO' ? document.getElementById('selectTreinamento').value : null,
        atividade_externa: currentMode === 'EXPERIENCIA' ? document.getElementById('txtAtividadeExterna').value : null
    };

    // Validação básica
    if (!payload.colaborador_id || !payload.data_homologacao) {
        alert("Campos obrigatórios: Colaborador e Data.");
        return;
    }
    if (currentMode === 'TREINAMENTO' && !payload.treinamento_id) {
        alert("Selecione o treinamento interno.");
        return;
    }
    if (currentMode === 'EXPERIENCIA' && !payload.atividade_externa) {
        alert("Descreva a atividade externa.");
        return;
    }

    try {
        await DBHandler.salvarHomologacao(payload);

        // --- REGISTRO DE LOG (AUDITORIA) ---
        const colabNome = document.getElementById('selectColaborador').options[document.getElementById('selectColaborador').selectedIndex].text;
        
        let infoEvento = "";
        if (currentMode === 'TREINAMENTO') {
            const treinoNome = document.getElementById('selectTreinamento').options[document.getElementById('selectTreinamento').selectedIndex].text;
            infoEvento = `Treinamento Interno: ${treinoNome}`;
        } else {
            infoEvento = `Atividade Externa: ${payload.atividade_externa}`;
        }

        const detalhesLog = `• Tipo: ${currentMode}\n• Colaborador: ${colabNome}\n• ${infoEvento}\n• Nota: ${payload.nota}\n• Validade: ${payload.validade_meses} meses`;
        
        await DBHandler.registrarLog(
            session.user, 
            "REGISTRAR_HOMOLOGACAO", 
            detalhesLog, 
            "Registro de Homologação"
        );

        alert("✅ Registro concluído com sucesso e auditoria gravada!");
        window.location.reload();
        
    } catch (e) {
        alert("Erro ao salvar: " + e.message);
    }
};
