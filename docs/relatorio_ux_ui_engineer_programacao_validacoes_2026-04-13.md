# Relatório de Implementação: Validações e Resiliência (Programming Center)
**Data:** 13 de Abril de 2026
**Especialista:** UX/UI Design Engineer / Frontend Engineer
**Escopo:** `saars.inplast/web-react`

## 1. Objetivo da Sessão
Corrigir falhas graves identificadas nas validações de entrada do *Composer de Programação*, garantindo robustez de dados nos campos cruciais (datas e identificadores fabris) e implementando resiliência técnica (Timeout nativo) para contornar instabilidades de rede típicas no chão de fábrica da indústria.

## 2. Ações Implementadas

### A. Prevenção Rígida contra Time Travel (Cálculo de Lead Time)
- Adicionada barreira nativa `try/catch` no bloco de `handleSubmit` exigindo a presença de valores obrigatórios para `available_at` e `planned_start_at`.
- Inserção de bloqueio estrutural atestando coerência das datas informadas, cancelando a transmissão assíncrona caso a promessa de disponibilidade seja retroativa ao começo planejado, o que poderia travar o agrupamento em dashboard (`hoursBetween(...) < 0`).

### B. Sanitização em Nível de Payload
- Como salvaguarda para o cálculo dos lotes ordenados entre as máquinas ou rotas na fábrica, os campos `assembly_line_code` e `workstation_code` foram envelopados diretamente na construção do payload.
- Os parâmetros sofrem conversão proativa `trim()` e `toUpperCase()`, e reparam preenchimentos faltantes em `undefined`, estéril contra comportamentos indefinidos no backend.

### C. Imunidade de Tráfego e Destravamento da Interface (AbortTimeout)
- A utilidade `fetch` via `requestJson` encapsulada no sistema (em lib/api.js) foi exposta dinamicamente para suportar uma instância do navegador `AbortController()`.
- Agora, a ponte do frontend cria um contador explícito de **12 segundos** por envio. 
- Em vez de congelar a visualização (`submitBusy: true`) indefinidamente sob baixa banda e perda de pacote no centro da fábrica, a UI detecta perfeitamente o timeout (`AbortError`), retornando responsividade instantânea à tela informando o erro em tonalidade avermelhada e recomendando um novo disparo.
