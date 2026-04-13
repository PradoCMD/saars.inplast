# Handoff: SPEC Reviewer para governanca de documentacao de release e deploy

Data: 2026-04-09
Projeto: `saars.inplast`
Origem do handoff: coordenacao de release apos incidente de deploy
Destino: SPEC Reviewer
Escopo deste handoff: reorganizar a documentacao de release, deploy e governanca operacional sem alterar produto
Status de entrada: documentacao rica, mas espalhada em muitas rodadas e agora com um incidente de release que precisa ser consolidado

## 1. Objetivo deste handoff

Passar para o `SPEC Reviewer` a responsabilidade de organizar o trilho documental atual.

O objetivo nao e alterar comportamento do produto.
O objetivo e melhorar governanca e navegabilidade:

- o que esta aprovado
- o que foi incidente de release
- qual e o caminho certo de deploy
- qual e a ordem correta entre QA, release e rollout

## 2. Leitura obrigatoria

Leia nesta ordem:

1. `SPEC.json`
2. `BACKLOG.json`
3. `docs/relatorio_incidente_release_ghcr_coolify_2026-04-09.md`
4. `coolify_deploy_guide.md`
5. `.env.coolify.example`
6. `docker-compose.coolify.image.yaml`
7. `.github/workflows/publish-image.yml`
8. `docs/relatorio_teste_auditor_web_react_consolidacao_semantica_operacional_2026-04-09.md`
9. `docs/relatorio_implementation_ux_ui_engineer_web_react_consolidacao_semantica_operacional_2026-04-09.md`

## 3. Problema documental atual

Hoje o projeto tem bom historico de handoffs, mas a trilha de release/deploy ficou distribuida entre:

- handoffs de QA
- handoffs de implementacao
- ajuste de compose
- guia de Coolify
- incidente recente de GHCR/tag nao encontrada

Isso cria risco de:

- alguem operar a stack com expectativa errada de imagem/tag
- alguem confundir estado funcional aprovado com estado de release aprovado
- a governanca do projeto ficar boa no produto e fraca no rollout

## 4. O que voce deve produzir

Prioridades:

1. reorganizar a documentacao de release/deploy
2. consolidar o fluxo recomendado de rollout
3. separar claramente:
   - estado funcional aprovado
   - incidente de release
   - estrategia recomendada de deploy

Pode incluir:

- consolidacao de docs
- melhoria de naming
- sumario ou indice
- recomendacao de ordem operacional

## 5. O que voce nao deve fazer

- nao alterar `SPEC.json` como se isso fosse funcionalidade nova
- nao reabrir backlog de produto por causa do incidente de release
- nao mexer em codigo de app sem necessidade extrema

## 6. Resultado esperado da sua entrega

Sua devolutiva precisa trazer:

1. quais documentos foram reorganizados
2. o que foi consolidado
3. qual passa a ser a referencia canonica para release/deploy
4. quais lacunas documentais ainda restam

## 7. Conclusao do handoff

O projeto ja tem boa trilha de engenharia.
Agora precisamos deixar a trilha de release e deploy com a mesma qualidade de governanca.
