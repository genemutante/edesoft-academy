// /scripts-treinamentos/declaracao-script.js
import { DBHandler } from "../bd-treinamentos/db-handler.js";

let COLABORADORES = [];
let TREINAMENTOS = [];

document.addEventListener('DOMContentLoaded', async () => {
    await carregarDadosIniciais();
});

async function carregarDadosIniciais() {
    try {
        // 1. Carregar Funcionários Ativos
        COLABORADORES = await DBHandler.listarColaboradores({ somenteAtivos: true });
        const selColab = document.getElementById('selectColaborador');
        selColab.innerHTML = '<option value="">Selecione o funcionário...</option>' + 
            COLABORADORES.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');

        // 2. Carregar Treinamentos Internos
        const dados = await DBHandler.carregarDadosIniciais();
        TREINAMENTOS = dados.treinamentos;
        const selTreino = document.getElementById('selectTreinamento');
        selTreino.innerHTML = '<option value="">Selecione o treinamento...</option>' + 
            TREINAMENTOS.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
            
    } catch (e) {
        console.error("Erro na inicialização:", e);
    }
}

window.registrarRegistro = async function() {
    const session = JSON.parse(localStorage.getItem('rh_session'));
    const mode = window.activeMode || 'TREINAMENTO';
    
    let payload = {
        colaborador_id: document.getElementById('selectColaborador').value,
        usuario_registro: session.user
    };

    // Mapeamento dinâmico baseado na aba ativa
    if (mode === 'TREINAMENTO') {
        payload.treinamento_id = document.getElementById('selectTreinamento').value;
        payload.data_homologacao = document.getElementById('dataTreino').value;
        payload.nota = document.getElementById('notaTreino').value || 0;
        payload.instrutor = document.getElementById('instrutorTreino').value;
        payload.validade_meses = document.getElementById('validadeTreino').value;
        payload.atividade_externa = null;
    } else {
        payload.treinamento_id = null;
        payload.atividade_externa = document.getElementById('txtAtividadeExterna').value;
        payload.data_homologacao = document.getElementById('dataExp').value;
        payload.nota = document.getElementById('notaExp').value || 0;
        payload.instrutor = document.getElementById('responsavelExp').value;
        payload.validade_meses = document.getElementById('validadeExp').value;
    }

    // Validação
    if (!payload.colaborador_id || !payload.data_homologacao) {
        alert("Campos obrigatórios: Colaborador e Data.");
        return;
    }
    if (mode === 'TREINAMENTO' && !payload.treinamento_id) {
        alert("Selecione o treinamento interno.");
        return;
    }
    if (mode === 'EXPERIENCIA' && !payload.atividade_externa) {
        alert("Informe a atividade externa.");
        return;
    }

    try {
        await DBHandler.salvarHomologacao(payload);

        // --- REGISTRO DE LOG (AUDIT TRAIL) ---
        const colabNome = document.getElementById('selectColaborador').options[document.getElementById('selectColaborador').selectedIndex].text;
        const infoCert = mode === 'TREINAMENTO' 
            ? `Treinamento: ${document.getElementById('selectTreinamento').options[document.getElementById('selectTreinamento').selectedIndex].text}`
            : `Experiência: ${payload.atividade_externa}`;

        const detalhesLog = `• Modo: ${mode}\n• Colaborador: ${colabNome}\n• ${infoCert}\n• Nota: ${payload.nota}`;
        
        await DBHandler.registrarLog(
            session.user, 
            "REGISTRO_CERTIFICACAO", 
            detalhesLog, 
            "Registro de Homologação"
        );

        alert("✅ Registro gravado com sucesso!");
        window.location.reload();
        
    } catch (e) {
        alert("Erro ao salvar no banco: " + e.message);
    }
};
