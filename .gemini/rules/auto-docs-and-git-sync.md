---
description: Regra de ouro do projeto Multcar Pro - Atualização automática de documentação e sincronização com GitHub
globs: *
---

# Regra Permanente do Projeto Multcar Pro

Sempre que qualquer modificação de código, layout, protocolo, correção de bugs ou novas funcionalidades for realizada:

1. **Atualizar os Arquivos Markdown (`.md`):**
   - Atualizar `RELATORIO_COMPLETO_PROJETO_MULTCAR.md` com os detalhes técnicos e seções relevantes da mudança.
   - Atualizar `PROXIMO_PASSO_OBD2_CAR_SCANNER.md` com o status do projeto e os próximos passos.
   - Atualizar `ESPECIFICACAO_PROTOCOLO_XTOOL_AD10.md` se houver alteração de hardware/GATT/CAN.

2. **Sincronizar Artefatos Locais:**
   - Garantir que `multcar-app/www/index.html` esteja sincronizado com `index.html` e `preview-dashboard.html`.
   - Se houver alteração em APK, recompilar com Gradle e copiar o `.apk` novo para a raiz `Multcar_Pro_v1.0.apk`.

3. **Commit e Push Automático para o GitHub:**
   - Realizar `git add -A`.
   - Fazer `git commit` com mensagem padronizada no formato Conventional Commits.
   - Fazer `git push origin main` com `BypassSandbox: true` para que o repositório `https://github.com/welloliver1974/multcar.git` esteja sempre atualizado para o deploy na VPS.

