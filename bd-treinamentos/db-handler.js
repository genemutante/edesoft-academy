// =============================================================================
// db-handler.js - Camada de Serviço do Supabase (VERSÃO FINAL COM CARGOS)
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

        // 2. Busca Cargos (Via View ou Tabela)
        const { data: cargosRaw, error: errC } = await supabase
            .from('view_matriz_cargos')
            .select('*')
            .order('id', { ascending: true });

        if (errC) throw errC;

        const cargos = cargosRaw.map(c => ({
            ...c,
            corClass: c.cor_class 
        }));

        return { treinamentos: treinos, cargos: cargos };
    },

    // --- 2. GERENCIAR TREINAMENTOS ---
    async salvarTreinamento(treino) {
        const payload = {
            nome: treino.nome,
            categoria: treino.categoria,
            descricao: treino.desc,
            cor: treino.color,
            link_externo: treino.link
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
        // Remove regras primeiro (Cascata manual)
        await supabase.from('matriz_regras').delete().eq('treinamento_id', id);

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
    },

    // --- 5. REGISTRAR LOG (AUDITORIA) ---
    async registrarLog(usuario, acao, detalhes, ip) {
        const { error } = await supabase
            .from('logs_sistema')
            .insert({
                usuario: usuario,
                acao: acao,
                detalhes: detalhes,
                ip: ip || 'IP não detectado'
            });

        if (error) {
            console.error("Erro silencioso ao gravar log:", error);
        }
    }, // <--- A VÍRGULA QUE FALTAVA ESTAVA AQUI!

// --- 6. GERENCIAR CARGOS (CRIAR / EDITAR) ---
    async salvarCargo(cargo) {
        const payload = {
            nome: cargo.nome,
            cor_class: cargo.corClass, // O banco espera 'cor_class'
            ordem: cargo.ordem || 99
        };

        if (cargo.id) {
            payload.id = cargo.id;
        }

        const { data, error } = await supabase
            .from('cargos') 
            .upsert(payload)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- 7. EXCLUIR CARGO (COM LIMPEZA DE REGRAS) ---
    async excluirCargo(id) {
        // 1. Limpa regras vinculadas ao cargo na matriz para evitar dados órfãos
        const { error: errRegras } = await supabase
            .from('matriz_regras')
            .delete()
            .eq('cargo_id', id);
        
        if (errRegras) throw errRegras;
        
        // 2. Exclui o cargo de fato da tabela física
        const { error: errCargo } = await supabase
            .from('cargos')
            .delete()
            .eq('id', id);

        if (errCargo) throw errCargo;
    },

    // --- 8. AUTENTICAÇÃO ---
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
}; // Fim do objeto DBHandler

