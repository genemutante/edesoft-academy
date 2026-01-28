/* db-handler.js - O Cérebro da Persistência */

const DB_KEY = "EDESOFT_PDI_DB_V1"; // Chave única no LocalStorage
const SENHA_ADMIN = "admin123"; // Simulação de segurança

const DBHandler = {
    
    // --- 1. ESTRUTURA PADRÃO (Para quando estiver vazio) ---
    defaults: {
        meta: {
            versao: "1.0",
            dataCriacao: new Date().toISOString(),
            autor: "Sistema Padrão",
            descricao: "Base inicial vazia"
        },
        dados: {
            colaboradores: [],
            cargos: [],
            treinamentos: [],
            treinamentos_realizados: [],
            agendamentos: [],
            homologacoes: [],
            historico_cargos: []
        }
    },

    // --- 2. INICIALIZAÇÃO ---
    init: function() {
        console.log("🔄 DBHandler: Iniciando...");
        const raw = localStorage.getItem(DB_KEY);
        
        if (!raw) {
            console.warn("⚠️ Base Local vazia. Verificando base estática...");
            // Tenta carregar do arquivo data.js se ele existir como variável global 'initialConfig'
            if (typeof initialConfig !== 'undefined') {
                this.save(initialConfig, "Carga Inicial Automática");
                return initialConfig;
            } else {
                // Se não tiver nada, inicia zerado
                this.save(this.defaults, "Criação de Base Limpa");
                return this.defaults;
            }
        } else {
            console.log("✅ Base Local carregada com sucesso.");
            return JSON.parse(raw);
        }
    },

    // --- 3. LEITURA (Get) ---
    get: function() {
        const raw = localStorage.getItem(DB_KEY);
        return raw ? JSON.parse(raw) : this.init();
    },

    // --- 4. GRAVAÇÃO (Set) ---
    save: function(dbObject, motivo = "Atualização do Sistema") {
        // Atualiza Metadados automaticamente
        dbObject.meta.dataUltimaModificacao = new Date().toISOString();
        dbObject.meta.ultimoLog = motivo;

        localStorage.setItem(DB_KEY, JSON.stringify(dbObject));
        console.log(`💾 DB Salvo: ${motivo}`);
        
        // Dispara evento para telas atualizarem se precisarem
        window.dispatchEvent(new Event('db-updated'));
    },

    // --- 5. EXPORTAÇÃO (Gerar Arquivo) ---
    exportarArquivo: function() {
        const db = this.get();
        const nomeArquivo = `Backup_PDI_${db.meta.versao}_${new Date().toISOString().slice(0,10)}.json`;
        
        const blob = new Blob([JSON.stringify(db, null, 4)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = url;
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // --- 6. IMPORTAÇÃO (Ler Arquivo) ---
    importarArquivo: function(file, callbackSucesso) {
        // Simulação de Segurança
        const senha = prompt("🔒 AÇÃO DESTRUTIVA: Esta importação irá SOBRESCREVER todos os dados atuais.\n\nDigite a senha de administrador para confirmar:");
        
        if (senha !== SENHA_ADMIN) {
            alert("⛔ Senha incorreta. Operação cancelada.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                
                // Validação básica se é um banco válido nosso
                if (!json.meta || !json.dados) {
                    throw new Error("Estrutura do arquivo inválida.");
                }

                // Salva no LocalStorage
                localStorage.setItem(DB_KEY, JSON.stringify(json));
                alert(`✅ Sucesso!\nBase "${json.meta.descricao}" (v${json.meta.versao}) importada.`);
                
                if (callbackSucesso) callbackSucesso();
                
            } catch (err) {
                alert("Erro ao ler arquivo: " + err.message);
            }
        };
        reader.readAsText(file);
    },

    // --- 7. LIMPEZA (Reset) ---
    resetarFabrica: function() {
        if (confirm("⚠️ Tem certeza? Isso apagará tudo e voltará ao estado inicial.")) {
            localStorage.removeItem(DB_KEY);
            location.reload();
        }
    }
};