# Prompt: Implementation / Full Stack / Reliability para fechamento de release e rollout

Use o texto abaixo no chat do proximo agente.

```text
Voce vai atuar como agente de Implementation / Full Stack / Reliability do projeto `saars.inplast`, entrando depois da rodada do SPEC Reviewer que consolidou a governanca de release/deploy.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Fechar a trilha operacional de release/rollout no Coolify usando a documentacao canonica ja reorganizada, sem reabrir escopo funcional do produto.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/release_deploy_governanca.md`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/release_rollout_status.md`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_incidente_release_ghcr_coolify_2026-04-09.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/coolify_deploy_guide.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/.env.coolify.example`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docker-compose.coolify.image.yaml`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/.github/workflows/publish-image.yml`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_implementation_fullstack_reliability_release_rollout_pos_governanca_2026-04-10.md`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_implementation_fullstack_reliability_release_ghcr_coolify_2026-04-09.md`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_code_reviewer_release_ghcr_coolify_2026-04-09.md`

Contexto importante:
- a documentacao de governanca foi consolidada
- o produto esta funcionalmente aprovado no recorte validado
- o rollout ainda nao esta aprovado
- o bloqueio atual esta na trilha de imagem/tag no GHCR e no fechamento operacional do Coolify

Seu foco agora nao e reorganizar documentos do zero.
Seu foco e usar a trilha nova para fechar a operacao.

Priorize primeiro:
1. confirmar qual tag de imagem realmente existe e esta acessivel no GHCR
2. definir a estrategia correta para o Coolify: `main`, `latest` ou `sha-*`
3. corrigir qualquer drift restante entre workflow, compose, env e runbook
4. registrar evidencia suficiente para atualizar o status de rollout, se aplicavel

O que voce deve evitar:
- nao reabrir escopo funcional de frontend/backend sem evidencia objetiva
- nao alterar `SPEC.json` nem `BACKLOG.json`
- nao tratar `coolify_deploy_guide.md` sozinho como fonte de aprovacao
- nao promover rollout para aprovado sem evidencia operacional

Saida esperada:
1. findings curtos
2. caminho operacional correto para o Coolify
3. arquivos alterados, se houver
4. validacoes executadas
5. status final recomendado para `docs/release_rollout_status.md`
6. riscos residuais

Perguntas que sua entrega deve responder:
1. Qual tag deve ser usada no Coolify hoje?
2. O GHCR esta acessivel do jeito esperado ou exige credenciais extras?
3. O workflow de imagem esta coerente com a expectativa do deploy?
4. O rollout continua bloqueado ou ja pode ser marcado como aprovado?

Regra central:
Nao misture `funcionalmente aprovado` com `rollout aprovado`.
So atualize o snapshot de rollout se a evidencia operacional realmente fechar esse gate.
```
