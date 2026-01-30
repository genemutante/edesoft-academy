// Importa o cliente do Supabase (ajuste o caminho se necessário)
import { supabase } from './supabase-client.js';

export const DBHandler = {

    // --- 1. LEITURA INICIAL ---
    async carregarDadosIniciais() {
        console.log("🔄 Buscando dados do Supabase...");
        
        // 1. Busca Treinamentos
        const { data: treinosRaw, error: errT } = await supabase
            .from('treinamentos')
            .select('id, nome, categoria, descricao, cor, link_externo') 
            .order('categoria', { ascending: true }) 
            .order('nome', { ascending: true });
            
        if (errT) throw errT;

        const treinos = treinosRaw.map(t => ({
            id: t.id,
            nome: t.nome,
            categoria: t.categoria,
            desc: t.descricao,
            color: t.cor,
            link: t.link_externo
        }));

        // 2. Busca Cargos (Via View)
        const { data: cargosRaw, error: errC } = await supabase
            .from('view_matriz_cargos')
            .select('*')
            .order('id', { ascending: true });

        if (errC) throw errC;

        // Mapeia cor_class para corClass
        const cargos = cargosRaw.map(c => ({
            ...c,
            corClass: c.cor_class 
        }));

        return { treinamentos: treinos, cargos: cargos };
    }, // <--- VÍRGULA IMPORTANTE AQUI

    // --- 2. ATUALIZAR REGRA (Obrigatoriedade) ---
    async atualizarRegra(cargoId, treinoId, novoStatus) {
        // Primeiro: Remove qualquer regra existente para esse par (limpeza)
        const { error: errDel } = await supabase
            .from('matriz_regras')
            .delete()
            .match({ cargo_id: cargoId, treinamento_id: treinoId });

        if (errDel) throw errDel;

        // Segundo: Se o status não for 'none', insere a nova regra
        if (novoStatus !== 'none') {
            const tipoRegra = (novoStatus === 'mandatory') ? 'OBRIGATORIO' : 'RECOMENDADO';
            
            const { error: errIns } = await supabase
                .from('matriz_regras')
                .insert({
                    cargo_id: cargoId,
                    treinamento_id: treinoId,
                    tipo: tipoRegra
                });

            if (errIns) throw errIns;
        }
    }, // <--- VÍRGULA IMPORTANTE AQUI

    // --- 3. SALVAR TREINAMENTO (Novo ou Edição) ---
    async salvarTreinamento(treino) {
        const payload = {
            nome: treino.nome,
            categoria: treino.categoria,
            descricao: treino.desc,
            link_externo: treino.link,
            cor: treino.color
        };

        if (treino.id) {
            // UPDATE
            const { data, error } = await supabase
                .from('treinamentos')
                .update(payload)
                .eq('id', treino.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            // INSERT
            const { data, error } = await supabase
                .from('treinamentos')
                .insert(payload)
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    }, // <--- VÍRGULA IMPORTANTE AQUI

    // --- 4. EXCLUIR TREINAMENTO ---
    async excluirTreinamento(id) {
        // Primeiro remove as regras associadas (Cascata manual por segurança)
        await supabase.from('matriz_regras').delete().eq('treinamento_id', id);

        // Remove o treinamento
        const { error } = await supabase
            .from('treinamentos')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }, // <--- VÍRGULA IMPORTANTE AQUI

    // --- 5. REGISTRAR LOG (AUDITORIA) ---
    async registrarLog(usuario, acao, detalhes) {
        const { error } = await supabase
            .from('logs_sistema')
            .insert({
                usuario: usuario,
                acao: acao,
                detalhes: detalhes,
                ip: '192.168.1.10' // Pode pegar via API externa se quiser no futuro
            });

        if (error) {
            console.error("Erro silencioso ao gravar log:", error);
            // Não damos throw aqui para não travar a operação principal se o log falhar
        }
    }
};
