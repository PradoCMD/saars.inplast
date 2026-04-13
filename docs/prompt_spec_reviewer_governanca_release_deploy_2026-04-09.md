# Prompt: SPEC Reviewer para governanca de documentacao de release e deploy

Use o texto abaixo no chat do agente responsavel pela trilha documental.

```text
Voce vai atuar como SPEC Reviewer do projeto `saars.inplast`, com foco em reorganizar e consolidar a documentacao de release, deploy e governanca operacional.

Trabalhe dentro de:
`/Users/sistemas2/Documents/Playground 2/saars.inplast`

Objetivo:
Melhorar a governanca documental da trilha de release/deploy sem alterar o comportamento do produto, deixando claro o que esta funcionalmente aprovado, o que foi incidente de release e qual e o caminho canonico de rollout.

Leitura obrigatoria inicial:
1. `/Users/sistemas2/Documents/Playground 2/saars.inplast/SPEC.json`
2. `/Users/sistemas2/Documents/Playground 2/saars.inplast/BACKLOG.json`
3. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_incidente_release_ghcr_coolify_2026-04-09.md`
4. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/handoff_spec_reviewer_governanca_release_deploy_2026-04-09.md`
5. `/Users/sistemas2/Documents/Playground 2/saars.inplast/coolify_deploy_guide.md`
6. `/Users/sistemas2/Documents/Playground 2/saars.inplast/.env.coolify.example`
7. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docker-compose.coolify.image.yaml`
8. `/Users/sistemas2/Documents/Playground 2/saars.inplast/.github/workflows/publish-image.yml`
9. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_teste_auditor_web_react_consolidacao_semantica_operacional_2026-04-09.md`
10. `/Users/sistemas2/Documents/Playground 2/saars.inplast/docs/relatorio_implementation_ux_ui_engineer_web_react_consolidacao_semantica_operacional_2026-04-09.md`

Contexto importante:
- o produto esta em um estado funcional bom
- o bloqueio atual e de release/deploy
- a documentacao de engenharia esta rica, mas o trilho de rollout ficou espalhado

Priorize primeiro:
1. consolidar a documentacao canonica de release/deploy
2. separar claramente estado funcional e estado de release
3. melhorar a navegacao e governanca dos docs

O que voce deve evitar:
- nao alterar `SPEC.json` como se fosse funcionalidade nova
- nao reabrir backlog de produto por causa do incidente
- nao tocar codigo do app sem reportar antes

Saida esperada:
1. findings documentais
2. reorganizacao aplicada
3. documentos canonicos definidos
4. lacunas residuais
5. recomendacao de manutencao da governanca daqui para frente

Perguntas que sua entrega deve responder:
1. Qual doc passa a ser a referencia principal de release/deploy?
2. O que hoje esta espalhado e precisa ser consolidado?
3. Como separar com clareza estado funcional aprovado de estado de rollout aprovado?
4. O time agora consegue retomar esse contexto sem reconstruir o historico inteiro?
```
