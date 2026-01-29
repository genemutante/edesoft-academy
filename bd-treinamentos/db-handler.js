// =============================================================================
// db-handler.js - Camada de Serviço do Supabase
// =============================================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configuração (Suas chaves)
const SUPABASE_URL = 'https://mtblwyrcidrszwvjgxao.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10Ymx3eXJjaWRyc3p3dmpneGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MTg4NTUsImV4cCI6MjA4NTI5NDg1NX0.6CipXB_HI0t0Gcle3pTlZTe9rqoh-8-EhfxQy-VodH0';

// Cliente Privado
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const DBHandler = {

    // --- 1. LEITURA INICIAL ---
    async carregarDadosIniciais() {
        console.log("🔄 Buscando dados do Supabase...");
        
        const { data: treinos, error: errT } = await supabase
            .from('treinamentos')
            .select('id, nome, categoria, desc:desc_curta, color, link')
            .order('nome');
            
        if (errT) throw errT;

        const { data: cargos, error: errC } = await supabase
            .from('view_matriz_cargos')
            .select('*')
            .order('nome');

        if (errC) throw errC;

        return { treinamentos: treinos, cargos: cargos };
    },

    // --- 2. GERENCIAR TREINAMENTOS ---
    async salvarTreinamento(treino) {
        const payload = {
            nome: treino.nome,
            categoria: treino.categoria,
            desc_curta: treino.desc,
            link: treino.link,
            color: treino.color
        };

        if (treino.id) {
            payload.id = treino.id;
        }

        const { data, error } = await supabase
            .from('treinamentos')
            .upsert(payload)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- 3. EXCLUIR TREINAMENTO ---
    async excluirTreinamento(id) {
        const { error } = await supabase
            .from('treinamentos')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
    },

    // --- 4. ATUALIZAR MATRIZ ---
    async atualizarRegra(cargoId, treinoId, novoStatus) {
        // Limpa regra anterior
        const { error: errDel } = await supabase
            .from('matriz_regras')
            .delete()
            .match({ cargo_id: cargoId, treinamento_id: treinoId });
            
        if (errDel) throw errDel;

        // Insere nova regra se necessário
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
    }, // <--- A VÍRGULA SALVADORA ESTÁ AQUI

    // --- 5. AUTENTICAÇÃO ---
    async validarLogin(username, password) {
        const { data, error } = await supabase
            .from('usuarios_sistema')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .maybeSingle();

        if (error) throw error;
        return data;
    }
};
