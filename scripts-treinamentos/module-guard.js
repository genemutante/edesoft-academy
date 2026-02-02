/**
 * module-guard.js
 * Proteção de Interface Granular para Módulos Academy
 * Aplica regras de 'Somente Leitura' e 'Privacidade LGPD' via URL Params
 */

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const isReadonly = params.get('readonly') === 'true';
    const hideDetails = params.get('hide_details') === 'true';

    // --- 1. LÓGICA DE MODO LEITURA (READ-ONLY) ---
    if (isReadonly) {
        console.log("⚠️ [Guard] Modo de Leitura Ativado.");

        // Seletores de botões que alteram dados (gravar, excluir, novo)
        const actionSelectors = [
            'button[type="submit"]',
            '.btn-save',
            '.btn-delete',
            '.btn-danger',
            '.btn-success',
            '.btn-primary:not(.btn-filter)', // Mantém botões de filtro se existirem
            '#btnSalvar',
            '#btnExcluir'
        ];

        // Remove os botões de ação (remove() é mais seguro que display:none)
        document.querySelectorAll(actionSelectors.join(',')).forEach(el => {
            el.remove();
        });

        // Desativa todos os campos de entrada de dados
        document.querySelectorAll('input, select, textarea').forEach(el => {
            el.disabled = true;
            el.style.backgroundColor = '#f8fafc';
            el.style.cursor = 'not-allowed';
            el.title = "Acesso em modo de leitura";
        });

        // Adiciona um banner informativo no topo da página
        const banner = document.createElement('div');
        banner.style = 'background: #fff7ed; color: #c2410c; padding: 10px; text-align: center; font-size: 12px; border-bottom: 1px solid #ffedd5; font-family: "Inter", sans-serif; font-weight: 500;';
        banner.innerHTML = '👁️ <b>Modo de Visualização:</b> Você não tem permissão para alterar dados neste módulo.';
        document.body.prepend(banner);
    }

    // --- 2. LÓGICA DE PRIVACIDADE (HIDE DETAILS / LGPD) ---
    if (hideDetails) {
        console.log("🔒 [Guard] Restrição de detalhes ativada (LGPD).");

        // Seletores de botões que abrem fichas individuais ou dados sensíveis
        const detailSelectors = [
            '.btn-visualizar',
            '.btn-detalhes',
            '.action-view',
            '.lupa-detalhe',
            'button[title*="Visualizar"]',
            'button[title*="Detalhes"]',
            '.btn-eye'
        ];

        // Remove os botões que dão acesso à ficha completa do colaborador
        document.querySelectorAll(detailSelectors.join(',')).forEach(el => {
            el.remove();
        });

        // Se houver uma tabela, podemos avisar na coluna de ações
        const infoMsg = document.createElement('div');
        infoMsg.style = 'background: #f0f9ff; color: #075985; padding: 6px; text-align: center; font-size: 11px; font-weight: 600;';
        infoMsg.innerHTML = 'ℹ️ Detalhes individuais ocultos por regra de privacidade.';
        
        // Adiciona o aviso logo abaixo do banner de leitura (se houver) ou no topo
        document.body.prepend(infoMsg);
    }
});
