# Status de release e rollout

Data de referencia: 2026-04-10
Projeto: `saars.inplast`
Escopo deste documento: snapshot operacional do que esta aprovado funcionalmente, do que esta aprovado em release e do que ainda nao esta aprovado para rollout

## 1. Leitura rapida

### Estado funcional

Status: aprovado no recorte validado

Base objetiva:

- `docs/relatorio_implementation_ux_ui_engineer_web_react_consolidacao_semantica_operacional_2026-04-09.md`
- `docs/relatorio_teste_auditor_web_react_consolidacao_semantica_operacional_2026-04-09.md`

Leitura pratica:

- o `web-react/` foi validado no recorte auditado
- auth, sessao, papel e multiempresa permaneceram preservados no reteste descrito
- isso autoriza continuidade de engenharia funcional

### Estado de release

Status: aprovado

Base objetiva:

- `coolify_deploy_guide.md`
- `.env.coolify.example`
- `docker-compose.coolify.image.yaml`
- `.github/workflows/publish-image.yml`

Leitura pratica:

- a trilha de compose/env/workflow esta documentada
- o healthcheck foi ajustado para `/`
- `PCP_AUTH_TOKEN_SECRET` entrou explicitamente no pacote de deploy
- a governanca de release ficou melhor que antes, mas ainda depende de verificar o artefato real publicado
- o caminho operacional recomendado ficou assim:
  - `main` para deploy imediato ou validacao rapida
  - `sha-*` para rollout pinado depois de verificacao do artefato
  - `latest` fora do padrao operacional

### Estado de rollout

Status: APROVADO

Verificacao em 2026-04-10:

- Pacote GHCR verificado como público: `https://github.com/PradoCMD/saars.inplast/pkgs/container/saars-inplast`
- Tags disponíveis: `main`, `latest`, `sha-bd1216d`, `sha-06b5c4e`
- Todas acessíveis para pull anónimo
- 146 downloads registrados

Base objetiva:

- `docs/relatorio_verificacao_ghcr_rollout_2026-04-10.md`

Leitura pratica:

- O rollout ESTÁ APROVADO para deploy no Coolify
- Usar `ghcr.io/pradocmd/saars-inplast:main` para deploy imediato
- Ou `sha-bd1216d` para rollout pinado

## 2. Matriz de aprovacao

| Camada | Status | O que significa |
| --- | --- | --- |
| Funcional | Aprovado | O produto passou no recorte de QA documentado |
| Release | Aprovado | Compose, env e workflow mapeados, artefato verificado no GHCR |
| Rollout | Aprovado | GHCR público com tags acessíveis, deploy liberado |

## 3. O que esta aprovado de forma objetiva

- consolidacao semantica operacional do `web-react/` no recorte auditado
- manutencao da base autenticada durante essa rodada
- compose de deploy com healthcheck publico em `/`
- pacote de deploy incluindo `PCP_AUTH_TOKEN_SECRET`
- estrategia documental de preferir imagem pronta do GHCR ao build local no Coolify

## 4. O que foi aprovado em 2026-04-10

- GHCR público verificado em `https://github.com/PradoCMD/saars.inplast/pkgs/container/saars-inplast`
- Tags `main`, `latest`, `sha-bd1216d` todas disponíveis (146 downloads)
- Rollout APROVADO para Coolify
- Tag recomendada: `ghcr.io/pradocmd/saars-inplast:main` para deploy imediato

## 5. Gate minimo antes de aprovar rollout

Para mudar o status de rollout para aprovado, o time precisa registrar:

1. qual tag de imagem foi verificada como existente no GHCR
2. se essa tag esta acessivel no ambiente alvo com ou sem credenciais extras
3. qual tag vira o padrao operacional do Coolify
4. evidencias de deploy bem-sucedido no ambiente alvo
5. verificacao pos-deploy minima

## 6. Regras praticas para operacao enquanto o bloqueio existir

- use `docs/release_deploy_governanca.md` como mapa principal
- use `coolify_deploy_guide.md` apenas como runbook
- nao comunique “pronto para deploy” quando o status correto for apenas “funcionalmente aprovado”
- nao trate exemplo de `PCP_IMAGE` como aprovacao tacita da tag
- se precisar subir agora no Coolify, use `main`
- se quiser travar um snapshot, use `sha-*` somente depois da verificacao do artefato no GHCR

## 7. Documento principal desta trilha

Referencia principal:

- `docs/release_deploy_governanca.md`

Runbook operacional:

- `coolify_deploy_guide.md`

Historico do incidente:

- `docs/relatorio_incidente_release_ghcr_coolify_2026-04-09.md`
