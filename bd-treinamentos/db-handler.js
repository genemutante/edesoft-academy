// bd-treinamentos/db-handler.js  (ESM + compat global)
// ================================================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// 🔐 Credenciais (anon key) — ideal: colocar em variáveis de ambiente no futuro
const SUPABASE_URL = "https://mtblwyrcidrszwvjgxao.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10Ymx3eXJjaWRyc3p3dmpneGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MTg4NTUsImV4cCI6MjA4NTI5NDg1NX0.6CipXB_HI0t0Gcle3pTlZTe9rqoh-8-EhfxQy-VodH0";

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

    // 1. Treinamentos
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

    // 2. Cargos (via view)
    const { data: cargosRaw, error: errC } = await supabaseClient
      .from("view_matriz_cargos")
      .select("*")
      .order("id", { ascending: true });

    if (errC) throw new Error(normalizeError(errC));

    const cargos = (cargosRaw || []).map((c) => ({
      ...c,
      corClass: c.cor_class, // padroniza para o front
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
    // Cascata manual: remove regras
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
  async registrarLog(usuario, acao, detalhes, ip) {
    const { error } = await supabaseClient.from("logs_sistema").insert({
      usuario,
      acao,
      detalhes,
      ip: ip || "IP não detectado",
    });

    if (error) console.error("Erro silencioso ao gravar log:", error);
  },

  // =========================
  // 5) CARGOS (tabela física "cargos")
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

  // =========================
  // 6) AUTH
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

  async listarCargos() {
    const { data, error } = await supabaseClient
      .from("cargos")
      .select("id, nome")
      .order("nome", { ascending: true });

    if (error) throw new Error(normalizeError(error));
    return data || [];
  },
};

// ✅ Compat: expõe no global (para scripts antigos que usam DBHandler sem import)
globalThis.supabaseClient = supabaseClient;
globalThis.DBHandler = DBHandler;

console.log("✅ DBHandler (ESM) carregado e Supabase conectado.");

// Dentro de export const DBHandler = { ... }

async alterarSenha(username, senhaAtual, novaSenha) {
    // 1. Primeiro verificamos se a senha atual está correta
    const { data: usuario, error: errorBusca } = await supabaseClient
        .from("usuarios_sistema")
        .select("*")
        .eq("username", username)
        .eq("password", senhaAtual)
        .single();

    if (errorBusca || !usuario) {
        throw new Error("A senha atual está incorreta.");
    }

    // 2. Se estiver correta, atualizamos para a nova
    const { error: errorUpdate } = await supabaseClient
        .from("usuarios_sistema")
        .update({ password: novaSenha })
        .eq("username", username);

    if (errorUpdate) throw new Error("Erro ao atualizar a senha.");
    
    return true;
},
