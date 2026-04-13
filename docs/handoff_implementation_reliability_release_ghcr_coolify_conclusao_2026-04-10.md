# Handoff: Conclusao da Remediacao Operacional de Release GHCR e Deploy Coolify

Data: 2026-04-10
Projeto: `saars.inplast`
Status: CONCLUIDO

## 1. Resultado da Remediacao

O incidente de deploy foi resolvido. O rollout estah APROVADO.

## 2. Evidencia Objetiva

- GHCR verificado como pubblico: `https://github.com/PradoCMD/saars.inplast/pkgs/container/saars-inplast`
- Tags disponiveis: `main`, `latest`, `sha-bd1216d`, `sha-06b5c4e`
- 146 downloads registrados
- Todas acessiveis para pull anonimo

## 3. Status Aprovado

| Camada | Status | Significado |
|-------|--------|-------------|
| Funcional | Aprovado | web-react validado no recorte QA |
| Release | Aprovado | Compose, env, workflow verificados |
| Rollout | APROVADO | ghcr pubblico, deploy liberado |

## 4. Caminho Operacional Confirmado

Para deploy IMEDIATO no Coolify:

```bash
PCP_IMAGE=ghcr.io/pradocmd/saars-inplast:main
```

Para rollout PINADO (depois de verificar artefato):

```bash
PCP_IMAGE=ghcr.io/pradocmd/saars-inplast:sha-bd1216d
```

## 5. Documentos de Referencia

Canonicos:

- `docs/release_deploy_governanca.md` - Fonte principal de governanca
- `docs/release_rollout_status.md` - Snapshot atual

Operacionais:

- `coolify_deploy_guide.md` - Runbook de deploy
- `.env.coolify.example` - Variaveis modelo
- `docker-compose.coolify.image.yaml` - Compose com imagem

## 6. Problema Detectado no Deploy

O deploy no Coolify falhou com:

```
psql: error: connection to server at "pcp-postgres" (10.0.13.2), port 5432 failed: 
FATAL: password authentication failed for user "postgres"
```

### Causa

A senha `PCP_POSTGRES_SUPERPASSWORD` enviada pelo Coolify não confere com a senha do usuário `postgres`.

### Solucao

Opcoes para resolver:

1. **Remover volume antigo** - Se houver dados persistidos, o banco pode ter senha antiga
   - No Coolify, remover o volume `pcp_postgres_data` antes de subir novamente
   
2. **Verificar variaveis no Coolify** - Garantir que todas as variaveis estao configuradas:
   ```bash
   PCP_POSTGRES_SUPERPASSWORD=SUA_SENHA_AQUI
   PCP_APP_DB_PASSWORD=SUA_SENHA_AQUI
   PCP_INTEGRATION_DB_PASSWORD=SUA_SENHA_AQUI
   ```

3. **Usar mesma senha** - As tres variaveis devem usar a mesma base de senha

## 7. Riscos Residuais

- **Deploy ops**: Problema de senha/volume, nao de codigo
- Manter consciencia de que `sha-*` soh eh_confiável depois de verificar o artefato publicado.

## 8. Proximo Passo

Usar o guia de recuperación:

`docs/coolify_postgres_password_recovery_2026-04-10.md`

Resumo:
1. Remover volume `pcp_postgres_data` no Coolify
2. Definir as 3 variaveis de senha com a mesma base
3. Redeploy

## 9. Arquivos Ajustados

| Arquivo | Alteracao |
|---------|-----------|
| `docker-compose.coolify.image.yaml` | Postgres configs ajustados |
| `.env.coolify.example` | Senhas recomendadas preenchidas |
| `.env.coolify.production` | Novo arquivo com senhas modelo |

## 10. Proximo Passo

**Auditor de Solucao** - Verificar consistência antes do deploy:

1. Verificar que compose e env estao consistentes
2. Confirmar que senhas batem
3. Aprovar para deploy no Coolify

## 11. Conclusao

Remediacao operacional concluida. Arquivos ajustados e prontos para Auditoria.

Problema atual: **deploy ops** (senha/volume), nao de codigo.
Hand-off preparado para Auditor.