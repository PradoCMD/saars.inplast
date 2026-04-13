# Relatório de Remediação GHCR
**Data:** 2026-04-10  
**Agente:** Implementation Engineer  

---

## Problema Identificado

- **Pacote:** `ghcr.io/pradocmd/saars.inplast`
- **Status:** Privado (HTTP 401)
- **Sintoma:** Todas as tags (`main`, `latest`, `sha-*`) retornam `401 Unauthorized`

---

## Evidência de Falha

```bash
$ curl -s -o /dev/null -w "%{http_code}" https://ghcr.io/v2/pradocmd/saars-inplast/manifests/main
401
```

---

## Solução Aplicada

### Ação Requerida (Manual)

O pacote precisa ser alterado de **privado** para **público**. Esta ação **não pode ser executada programaticamente** e requer intervenção manual:

1. Acesse: https://github.com/pradocmd/saars-inplast/settings/packages
2. Localize o pacote `saars-inplast`
3. Altere a visibilidade de `Private` para `Public`
4. Confirme a mudança

### Alternativa (se necessário)

Após alterar visibilidade, re-publicar a imagem:
- Acionar workflow `publish-image.yml` manualmente
- Ou fazer push de commits para branch `main`

---

## Verificação Post-Remediação

Após aplicar a correção, executar:

```bash
curl -s -o /dev/null -w "%{http_code}" https://ghcr.io/v2/pradocmd/saars-inplast/manifests/main
```

**esperado:** `200`

---

## Recomendação Final

1. **Alterar visibilidade do pacote para public** no GitHub (ação manual necessária)
2. Re-testar acesso anónimo
3. Deploy no Coolify deve funcionar após correção

---

## Status

⏳ **Aguardando ação manual do administrador do repositório**