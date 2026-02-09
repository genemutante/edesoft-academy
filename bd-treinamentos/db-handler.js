// bd-treinamentos/db-handler.js (ESM + compat global)
// ================================================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// 🔐 Credenciais (anon key)
const SUPABASE_URL = "https://mtblwyrcidrszwvjgxao.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10Ymx3eXJjaWRyc3p3dmpneGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MTg4NTUsImV4cCI6MjA4NTI5NDg1NX0.6CipXB_HI0t0Gcle3pTlZTe9rqoh-8-EhfxQy-VodH0";

// ✅ Client único
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

function normalizeError(err) {
    if (!err) return null;
    if (typeof err === "string") return err;
    if (err.message) return err.message;
    try {
        return JSON.stringify(err);
    } catch {
        return "Erro desconhecido";
    }
}

export const DBHandler = {
    supabaseClient,

    // =========================
    // 1) LEITURA INICIAL (MATRIZ TREINAMENTOS)
    // =========================
    async carregarDadosIniciais() {
        console.log("🔄 Buscando dados do Supabase...");

        const { data: treinosRaw, error: errT } = await supabaseClient
            .from("treinamentos")
            .select("id, nome, categoria, descricao, cor, link_externo")
            .order("categoria", { ascending: true })
            .order("nome", { ascending: true });

        if (errT) throw new Error(normalizeError(errT));

        const treinos = (treinosRaw || []).map((t) => ({
            id: t.id,
            nome: t.nome,
            categoria: t.categoria,
            desc: t.descricao,
            color: t.cor,
            link: t.link_externo,
        }));

        const { data: cargosRaw, error: errC } = await supabaseClient
            .from("view_matriz_cargos")
            .select("*")
            .order("id", { ascending: true });

        if (errC) throw new Error(normalizeError(errC));

        const cargos = (cargosRaw || []).map((c) => ({
            ...c,
            corClass: c.cor_class,
        }));

        return { treinamentos: treinos, cargos };
    },

    // =========================
    // 2) TREINAMENTOS
    // =========================
    async salvarTreinamento(treino) {
        const payload = {
            nome: treino.nome,
            categoria: treino.categoria,
            descricao: treino.desc,
            cor: treino.color,
            link_externo: treino.link,
        };

        if (treino.id) payload.id = treino.id;

        const { data, error } = await supabaseClient
            .from("treinamentos")
            .upsert(payload)
            .select()
            .single();

        if (error) throw new Error(normalizeError(error));
        return data;
    },

    async excluirTreinamento(id) {
        const { error: errRegras } = await supabaseClient
            .from("matriz_regras")
            .delete()
            .eq("treinamento_id", id);

        if (errRegras) throw new Error(normalizeError(errRegras));

        const { error } = await supabaseClient.from("treinamentos").delete().eq("id", id);
        if (error) throw new Error(normalizeError(error));
    },

    // =========================
    // 3) MATRIZ (REGRAS)
    // =========================
    async atualizarRegra(cargoId, treinoId, novoStatus) {
        const { error: errDel } = await supabaseClient
            .from("matriz_regras")
            .delete()
            .match({ cargo_id: cargoId, treinamento_id: treinoId });

        if (errDel) throw new Error(normalizeError(errDel));

        if (novoStatus !== "none") {
            const tipo = novoStatus === "mandatory" ? "OBRIGATORIO" : "RECOMENDADO";

            const { error: errIns } = await supabaseClient.from("matriz_regras").insert({
                cargo_id: cargoId,
                treinamento_id: treinoId,
                tipo,
            });

            if (errIns) throw new Error(normalizeError(errIns));
        }
    },

    // =========================
    // 4) LOGS
    // =========================
async registrarLog(usuario, acao, detalhes, tela) {
    try {
        const { error } = await supabaseClient.from("logs_sistema").insert({
            usuario: usuario,
            acao: acao,
            detalhes: detalhes,
            tela: tela || "Sistema",
            ip: "Automático (Cloud)" // O Supabase registra o IP na camada de auth, mas podemos marcar como automático
        });

        if (error) throw error;
    } catch (err) {
        console.error("Erro ao gravar log de auditoria:", err);
    }
},

    // =========================
    // 5) CARGOS
    // =========================
    async salvarCargo(cargo) {
        const payload = {
            nome: cargo.nome,
            cor_class: cargo.corClass,
            ordem: cargo.ordem || 99,
        };

        if (cargo.id) payload.id = cargo.id;

        const { data, error } = await supabaseClient
            .from("cargos")
            .upsert(payload)
            .select()
            .single();

        if (error) throw new Error(normalizeError(error));
        return data;
    },

    async excluirCargo(id) {
        const { error: errRegras } = await supabaseClient
            .from("matriz_regras")
            .delete()
            .eq("cargo_id", id);

        if (errRegras) throw new Error(normalizeError(errRegras));

        const { error: errCargo } = await supabaseClient.from("cargos").delete().eq("id", id);
        if (errCargo) throw new Error(normalizeError(errCargo));
    },

    async listarCargos() {
        const { data, error } = await supabaseClient.from("cargos").select("*");
        if (error) throw new Error(normalizeError(error));
        return data;
    },

    // =========================
    // 6) AUTH & SECURITY
    // =========================
    async validarLogin(username, password) {
        const { data, error } = await supabaseClient
            .from("usuarios_sistema")
            .select("*")
            .eq("username", username)
            .eq("password", password)
            .maybeSingle();

        if (error) throw new Error(normalizeError(error));
        return data;
    },

    async alterarSenha(username, senhaAtual, novaSenha) {
        const { data, error } = await supabaseClient
            .from("usuarios_sistema")
            .select("id, password")
            .eq("username", username);

        if (error) throw new Error("Erro na base de dados.");
        if (!data || data.length === 0 || data[0].password !== senhaAtual) {
            throw new Error("A senha atual está incorreta.");
        }

        const { error: updateError } = await supabaseClient
            .from("usuarios_sistema")
            .update({ password: novaSenha })
            .eq("id", data[0].id);

        if (updateError) throw new Error("Não foi possível atualizar a senha.");
        return true;
    },

    /**
     * Busca módulos e permissões granulares (Ver | Editar | Detalhes)
     */
    async buscarModulosPermitidos(role) {
        const { data, error } = await supabaseClient
            .from("acesso_modulos")
            .select(`
                pode_editar,
                ver_detalhes,
                modulos_sistema (
                    id, label, path, icon_svg, ordem
                )
            `)
            .eq("role", role);

        if (error) throw new Error("Erro ao carregar permissões: " + error.message);
        
        // Mapeia para um objeto plano facilitando o uso no front-end
        return data.map(item => ({
            ...item.modulos_sistema,
            pode_editar: item.pode_editar,
            ver_detalhes: item.ver_detalhes
        }));
    },

    // =========================
    // 7) COLABORADORES
    // =========================
    async listarColaboradores({ somenteAtivos = false } = {}) {
        let q = supabaseClient.from("colaboradores").select("*").order("nome", { ascending: true });
        if (somenteAtivos) q = q.is("data_demissao", null);

        const { data, error } = await q;
        if (error) throw new Error(normalizeError(error));
        return data || [];
    },

    async buscarColaboradorPorId(id) {
        const { data, error } = await supabaseClient
            .from("colaboradores")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw new Error(normalizeError(error));
        return data;
    },

    async inserirColaborador(payload) {
        const { data, error } = await supabaseClient
            .from("colaboradores")
            .insert([payload])
            .select()
            .single();

        if (error) throw new Error(normalizeError(error));
        return data;
    },

    async atualizarColaborador(id, payload) {
        const { data, error } = await supabaseClient
            .from("colaboradores")
            .update(payload)
            .eq("id", id)
            .select()
            .single();

        if (error) throw new Error(normalizeError(error));
        return data;
    },

    async desativarColaborador(id, { dataDemissao, motivoDemissao } = {}) {
        const payload = {
            data_demissao: dataDemissao || new Date().toISOString().slice(0, 10),
            motivo_demissao: motivoDemissao || null,
        };
        return this.atualizarColaborador(id, payload);
    },

    async reativarColaborador(id) {
        return this.atualizarColaborador(id, { data_demissao: null, motivo_demissao: null });
    },

// Dentro do export const DBHandler = { ... }

    // =========================
    // 8) HOMOLOGAÇÕES (MÓDULO 4)
    // =========================
async listarHomologacoes() {
    const { data, error } = await supabaseClient
        .from("homologacoes_treinamentos")
        .select(`
            *,
            colaboradores (nome, departamento, genero),
            treinamentos (nome, categoria)
        `)
        .order("data_homologacao", { ascending: false });

    if (error) throw error;
    return data;
},


    async salvarHomologacao(payload) {
        const { data, error } = await supabaseClient
            .from("homologacoes_treinamentos")
            .upsert([payload])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async excluirHomologacao(id) {
        const { error } = await supabaseClient
            .from("homologacoes_treinamentos")
            .delete()
            .eq("id", id);
        if (error) throw error;
    },

async buscarHomologacaoPorId(id) {
    const { data, error } = await supabaseClient
        .from("homologacoes_treinamentos")
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw error;
    return data;
},


// =========================
    // 9) TREINAMENTOS (CATÁLOGO)
    // =========================
    async listarTreinamentos() {
        // O select '*, aulas:aulas_treinamentos(*)' faz o JOIN automático
        // A sintaxe aulas:aulas_treinamentos renomeia o retorno para "aulas" no JSON
        const { data, error } = await supabaseClient
            .from("treinamentos")
            .select(`
                *,
                aulas:aulas_treinamentos (
                    id,
                    titulo,
                    duracao_minutos,
                    ordem
                )
            `)
            .order("trilha", { ascending: true })
            .order("subtrilha", { ascending: true })
            .order("ordem_curso_modulo", { ascending: true });

        if (error) throw error;
        return data;
    },
    
    // Método extra para facilitar a criação de aulas futura
    async salvarAula(payload) {
        const { data, error } = await supabaseClient
            .from("aulas_treinamentos")
            .upsert([payload])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async excluirAula(id) {
         const { error } = await supabaseClient
            .from("aulas_treinamentos")
            .delete()
            .eq("id", id);
        if (error) throw error;
    }
    

    // =========================
    // 10) INTEGRAÇÃO YOUTUBE
    // =========================
    async sincronizarAulasPorPlaylist(cursoId, novasAulas) {
        // 1. Remove todas as aulas atuais deste curso (Limpeza)
        const { error: deleteError } = await supabaseClient
            .from("aulas_treinamentos")
            .delete()
            .eq("treinamento_id", cursoId);

        if (deleteError) throw deleteError;

        // 2. Insere as novas aulas vindas do YouTube
        const { data, error: insertError } = await supabaseClient
            .from("aulas_treinamentos")
            .insert(novasAulas)
            .select();

        if (insertError) throw insertError;

        return data;
    },


    
};


// No final do ficheiro db-handler.js
window.DBHandler = DBHandler;










