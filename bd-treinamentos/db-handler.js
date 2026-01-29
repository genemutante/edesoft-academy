// =============================================================================
// db-handler.js - Camada de Serviço do Supabase
// =============================================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configuração (Mesmas chaves que você usou antes)
const SUPABASE_URL = 'SUA_URL_DO_SUPABASE';
const SUPABASE_KEY = 'SUA_ANON_KEY_DO_SUPABASE';

// Cliente Privado (só este arquivo acessa diretamente)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const DBHandler = {

    // --- 1. LEITURA INICIAL (Carrega tudo para a tela) ---
    async carregarDadosIniciais() {
        console.log("🔄 Buscando dados do Supabase...");
        
        // Busca Treinamentos
        const { data: treinos, error: errT } = await supabase
            .from('treinamentos')
            .select('id, nome, categoria, desc:desc_curta, color, link')
            .order('nome');
            
        if (errT) throw errT;

        // Busca Cargos (usando a View que criamos)
        const { data: cargos, error: errC } = await supabase
            .from('view_matriz_cargos')
            .select('*')
            .order('nome');

        if (errC) throw errC;

        return { treinamentos: treinos, cargos: cargos };
    },

    // --- 2. GERENCIAR TREINAMENTOS (Criar / Editar) ---
    async salvarTreinamento(treino) {
        // Remove campos que não existem no banco ou são undefined
        const payload = {
            nome: treino.nome,
            categoria: treino.categoria,
            desc_curta: treino.desc, // Mapeia 'desc' do JS para 'desc_curta' do banco
            link: treino.link,
            color: treino.color
        };

        // Se tiver ID, é atualização. Se não, é criação.
        if (treino.id) {
            payload.id = treino.id;
        }

        const { data, error } = await supabase
            .from('treinamentos')
            .upsert(payload) // Upsert faz Insert ou Update dependendo se tem ID
            .select()
            .single();

        if (error) throw error;
        return data; // Retorna o objeto salvo (com o novo ID se for criação)
    },

    // --- 3. EXCLUIR TREINAMENTO ---
    async excluirTreinamento(id) {
        const { error } = await supabase
            .from('treinamentos')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
    },

    // --- 4. ATUALIZAR MATRIZ (Lógica Relacional) ---
    // Esta função substitui a lógica complexa de arrays do localStorage
    async atualizarRegra(cargoId, treinoId, novoStatus) {
        // 1. Primeiro limpamos qualquer regra existente para esse par (Reset)
        const { error: errDel } = await supabase
            .from('matriz_regras')
            .delete()
            .match({ cargo_id: cargoId, treinamento_id: treinoId });
            
        if (errDel) throw errDel;

        // 2. Se o novo status não for 'none', inserimos a nova regra
        if (novoStatus !== 'none') {
            const tipoBanco = novoStatus === 'mandatory' ? 'OBRIGATORIO' : 'RECOMENDADO';
            
            const { error: errIns } = await supabase
                .from('matriz_regras')
                .insert({
                    cargo_id: cargoId,
                    treinamento_id: treinoId,
                    tipo: tipoBanco
                });
                
            if (errIns) throw errIns;
        }
    }
};
