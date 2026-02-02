/**
 * module-guard.js - Versão Ultra-Resistente
 * Detecta e remove botões sensíveis mesmo em listas carregadas após o login.
 */

const aplicarProtecaoGranular = () => {
    const params = new URLSearchParams(window.location.search);
    const isReadonly = params.get('readonly') === 'true';
    const hideDetails = params.get('hide_details') === 'true';

    // 1. BLOQUEIO DE EDIÇÃO (READ-ONLY)
    if (isReadonly) {
        const actionSelectors = ['button[type="submit"]', '.btn-save', '.btn-delete', '.btn-danger', '.btn-success'];
        document.querySelectorAll(actionSelectors.join(',')).forEach(el => el.remove());
        document.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
    }

    // 2. BLOQUEIO DE DETALHES (LGPD)
    if (hideDetails) {
        // Seletores estendidos para garantir que pegue o ícone de "olho"
        const detailSelectors = [
            '.btn-visualizar', '.btn-detalhes', '.action-view', '.lupa-detalhe',
            'button[title*="Visualizar"]', 'button[title*="Detalhes"]', 
            '.btn-eye', 'td i.fa-eye', 'td i.bi-eye', 'button .fa-eye'
        ];

        document.querySelectorAll(detailSelectors.join(',')).forEach(el => {
            // Se o ícone estiver dentro de um botão, removemos o botão pai
            const btnPai = el.closest('button') || el.closest('a') || el;
            btnPai.remove();
        });
    }
};

// --- O SEGREDO: VIGILÂNCIA CONSTANTE ---
const observer = new MutationObserver(() => {
    aplicarProtecaoGranular();
});

// Inicia a observação assim que o corpo da página estiver disponível
document.addEventListener('DOMContentLoaded', () => {
    // Executa uma vez no início
    aplicarProtecaoGranular();

    // Começa a vigiar mudanças no HTML (novas linhas na tabela)
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Adiciona um CSS de backup para esconder via estilo (camada extra)
    if (new URLSearchParams(window.location.search).get('hide_details') === 'true') {
        const style = document.createElement('style');
        style.innerHTML = `
            .btn-visualizar, .btn-detalhes, .action-view, [title*="Visualizar"], [title*="Detalhes"] { 
                display: none !important; 
            }
        `;
        document.head.appendChild(style);
    }
});
