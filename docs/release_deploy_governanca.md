# Governanca de release e deploy

Data de consolidacao: 2026-04-10
Projeto: `saars.inplast`
Escopo deste documento: definir a trilha canonica de release, deploy e rollout sem reabrir escopo funcional do produto

## 1. Objetivo

Este documento passa a ser a referencia principal de governanca para release e deploy do modulo PCP.

Ele existe para responder, sem depender de reconstruir o historico inteiro:

- o que esta funcionalmente aprovado
- o que esta aprovado apenas como configuracao de release
- o que ainda nao esta aprovado para rollout
- qual e a ordem correta entre QA, release e deploy
- qual documento consultar em cada etapa

## 2. Referencias canonicas

Use estes documentos nesta ordem:

1. `docs/release_deploy_governanca.md`
   - fonte principal de governanca
   - explica o processo correto e a separacao entre estado funcional e estado de rollout
2. `docs/release_rollout_status.md`
   - snapshot atual do status de release/rollout
   - responde o que esta aprovado hoje e o que continua bloqueado
3. `coolify_deploy_guide.md`
   - runbook operacional para executar o deploy no Coolify
   - nao deve ser usado sozinho para inferir que o rollout ja esta aprovado
4. `docs/relatorio_incidente_release_ghcr_coolify_2026-04-09.md`
   - historico do incidente de release
   - evidencia do bloqueio de imagem/tag no GHCR

## 3. Separacao obrigatoria de estados

### 3.1 Estado funcional aprovado

Significa:

- a funcionalidade passou por implementacao e QA no escopo validado
- o produto esta consistente no recorte testado
- isso nao implica que a trilha de release esteja aprovada

Evidencias atuais dessa camada:

- `docs/relatorio_implementation_ux_ui_engineer_web_react_consolidacao_semantica_operacional_2026-04-09.md`
- `docs/relatorio_teste_auditor_web_react_consolidacao_semantica_operacional_2026-04-09.md`

### 3.2 Estado de release aprovado

Significa:

- compose, env, workflow e estrategia de imagem estao coerentes
- a versao a ser implantada esta identificada de forma reproduzivel
- o artefato esperado existe e esta acessivel no registry alvo

Isso ainda nao significa, por si so, que o deploy em ambiente alvo ja ocorreu com sucesso.

### 3.3 Estado de rollout aprovado

Significa:

- o artefato certo foi validado
- o ambiente alvo conseguiu puxar esse artefato
- o deploy subiu com sucesso
- os checks minimos de runtime foram aprovados no ambiente implantado

Sem essa camada, nao trate um estado “funcionalmente aprovado” como “pronto para rollout”.

## 4. Ordem correta de operacao

O fluxo canonico agora e este:

1. implementacao funcional
2. QA funcional
3. congelamento do snapshot funcional aprovado
4. validacao da trilha de release
5. verificacao do artefato real de imagem no registry
6. aprovacao de rollout
7. deploy no Coolify
8. verificacao pos-deploy

Traducao pratica:

- QA funcional aprova produto
- release aprova artefato e trilha
- rollout aprova implantacao real

## 5. O que cada documento responde

### `docs/release_deploy_governanca.md`

Responde:

- qual e a trilha oficial
- qual a ordem entre QA, release e rollout
- qual doc usar em cada etapa

### `docs/release_rollout_status.md`

Responde:

- o que esta aprovado hoje
- o que continua bloqueado
- qual e o proximo gate para destravar rollout

### `coolify_deploy_guide.md`

Responde:

- como executar o deploy no Coolify
- quais arquivos e variaveis usar
- como operar a stack

Nao responde sozinho:

- se o rollout esta aprovado
- se a tag esperada realmente existe no GHCR
- se o artefato atual ja foi validado no ambiente alvo

### `docs/relatorio_incidente_release_ghcr_coolify_2026-04-09.md`

Responde:

- qual foi o incidente
- qual foi a evidencia do bloqueio
- quais trilhas paralelas foram abertas

Nao deve ser tratado como runbook principal.

## 6. Estado atual consolidado desta trilha

Na data desta consolidacao documental:

- o produto esta em bom estado funcional no recorte validado
- a trilha de release/deploy teve um incidente ligado a artefato/tag no GHCR
- por isso, a aprovacao funcional nao deve ser lida como aprovacao de rollout

O snapshot oficial do status atual fica em:

- `docs/release_rollout_status.md`

## 7. Regra de seguranca para operacao

Nao use `coolify_deploy_guide.md` isoladamente para concluir que:

- `main` esta aprovado para rollout
- `latest` esta aprovado para rollout
- `sha-*` esta aprovado para rollout

Antes do deploy, confirme no snapshot de status:

- se o artefato foi verificado
- qual tag esta aprovada
- se o registry esta acessivel do ambiente alvo

## 8. O que continua historico e nao canonico

Os documentos abaixo continuam uteis como historico, mas nao sao a fonte principal para operar release/deploy:

- prompts de agentes da rodada
- handoffs de investigacao e remediacao
- relatorios de implementacao ou QA que tratam produto e nao rollout

Eles devem ser usados como apoio de contexto, nao como runbook principal.

## 9. Responsabilidade por trilha

### Produto / implementacao / QA

Responsavel por:

- estado funcional aprovado
- coerencia de comportamento do app
- regressao funcional

### Release / reliability

Responsavel por:

- workflow de imagem
- estrategia de tag
- acessibilidade do GHCR
- coerencia entre compose, env, registry e deploy target

### Governanca documental

Responsavel por:

- manter este mapa atualizado
- manter o snapshot de status claro
- evitar que guias operacionais passem a comunicar aprovacao que nao foi dada

## 10. Resultado esperado daqui para frente

Depois desta consolidacao:

- a referencia principal de release/deploy passa a ser este documento
- o guia do Coolify vira explicitamente um runbook operacional
- o estado funcional aprovado fica separado do estado de rollout aprovado
- a proxima pessoa consegue retomar o contexto sem reconstituir toda a trilha de handoffs e prompts
