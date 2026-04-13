# Prompt: TESTE Auditor para release GHCR e deploy no Coolify pos-remediacao

Use o texto abaixo no chat do agente responsavel pelos testes desta trilha.

```text
Voce vai atuar como TESTE Auditor do projeto `saars.inplast`, com foco exclusivo em validar a remediacao da trilha de release por imagem no GHCR e o caminho correto de deploy no Coolify.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Confirmar se a correcao aplicada no workflow de publish realmente fecha o incidente da tag ausente no GHCR e se a estrategia correta de release por imagem para o Coolify ficou operacional e reproduzivel.

Arquivos obrigatorios para leitura inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_incidente_release_ghcr_coolify_2026-04-09.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_remediacao_release_ghcr_coolify_2026-04-10.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_teste_auditor_release_ghcr_coolify_pos_remediacao_2026-04-10.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/.github/workflows/publish-image.yml`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docker-compose.coolify.image.yaml`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docker-compose.coolify.yaml`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/.env.coolify.example`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/coolify_deploy_guide.md`
11. `/Users/sistemas2/Documents/Playground 2/saars.inplast/Dockerfile`
12. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docker/start-pcp.sh`

Contexto confirmado da rodada anterior:
- o incidente original era `not found` para a tag `sha-bd1216d61bc8020b93e6a1d805fced92b33de8dd`
- `main` e `latest` existiam no GHCR
- a tag que existia para o commit antigo era `sha-bd1216d`
- a causa confirmada foi o workflow usar `type=sha` sem `format=long`
- o workflow foi corrigido para `type=sha,format=long,prefix=sha-`
- a documentacao foi alinhada para usar `sha-<commit completo>` como padrao de release aprovada no Coolify

Sua prioridade nesta rodada:
1. confirmar se o patch realmente fecha a causa
2. confirmar se ja houve novo publish apos a correcao
3. se houver novo publish, verificar se a nova tag por SHA longa existe no GHCR
4. validar se `main` continua funcional como trilha movel
5. validar qual valor de `PCP_IMAGE` deve ser recomendado agora para o operador

Casos minimos de teste:

Bloco 1. Workflow
- confirmar que `.github/workflows/publish-image.yml` esta com `type=sha,format=long,prefix=sha-`
- confirmar se houve run novo de publish apos essa correcao
- se nao houve run novo, reportar isso explicitamente como bloqueio parcial de validacao

Bloco 2. GHCR
- validar existencia de `ghcr.io/pradocmd/saars-inplast:main`
- validar existencia de `ghcr.io/pradocmd/saars-inplast:latest`
- validar existencia de `ghcr.io/pradocmd/saars-inplast:sha-<commit completo>` do novo publish, se houver
- diferenciar claramente:
  - tag nao existe porque nao houve novo publish
  - tag nao existe porque o workflow falhou
  - tag existe, mas ha problema de permissao

Bloco 3. Coolify
- confirmar que `docker-compose.coolify.image.yaml` continua aceitando `PCP_IMAGE`
- confirmar que `.env.coolify.example` e `coolify_deploy_guide.md` agora deixam claro:
  - `main` para homologacao
  - `sha-<commit completo>` para rollout aprovado
- identificar qual e o caminho operacional seguro agora:
  - usar a nova SHA longa
  - usar `main` provisoriamente
  - ou usar a SHA curta antiga apenas como workaround temporario

Bloco 4. Evidencia final
- sempre que possivel, traga evidencias objetivas de registry, workflow e compose
- nao trate suposicao como confirmacao

Regras de trabalho:
- primeiro testar, depois reportar
- nao alterar `SPEC.json` nem `BACKLOG.json`
- nao tocar codigo sem reportar antes
- nao reabrir auth, RBAC, multiempresa ou `web-react` sem evidencia direta de impacto na release

Saida esperada:
1. findings priorizados
2. testes executados
3. o que esta validado em codigo
4. o que esta validado no registry
5. recomendacao final clara de rollout

Perguntas que sua entrega deve responder explicitamente:
1. O patch no workflow fecha a causa raiz do incidente?
2. A imagem por SHA longa ja existe hoje no GHCR?
3. O Coolify pode usar essa imagem sem credenciais extras?
4. Qual e o valor exato de `PCP_IMAGE` que deve ser usado agora?
5. Ja podemos seguir para rollout controlado ou ainda nao?
```
