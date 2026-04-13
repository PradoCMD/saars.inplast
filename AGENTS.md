# Agentes - Mesa de Trabalho SAARS INPLAST

**Versão:** 1.0  
**Criado:** 2026-04-10

---

## Visão Geral

5 agentes independentes que podem conversar entre si. Cada agente tem seu próprio arquivo `.md` na raiz e seus hand-offs em `docs/`.

---

## Lista de Agentes

| # | Agente | Arquivo | Função |
|---|-------|--------|-------|
| 1 | QA Engineer | `agente_qa_engineer.md` | Testes (SDET) - tenta "quebrar" o sistema |
| 2 | SPEC Reviewer | `agente_spec_reviewer.md` | Revisão técnica de SPECs |
| 3 | Implementation Engineer | `agente_implementation.md` | Implementação de código |
| 4 | Auditor de Solução | `agente_auditor_solucao.md` | Auditoria Spec vs. Código |
| 5 | UX/UI Design Engineer | `agente_ux_ui.md` | Melhorias de frontend |

---

## Fluxo de Trabalho

```
SPEC Reviewer → Implementation Engineer → QA Engineer → UX/UI Designer → Auditor de Solução
     ↑                                                            ↓
     └──────────────────────────────────────────────────────────────┘
```

---

## Hand-offs

### Estrutura de Arquivos

- **Prompt (contexto):** `prompt_agente_[nome]_[data].md`
- **Hand-off (transferência):** `handoff_agente_[nome]_[data].md`

### Localização

- Arquivos dos agentes: `saars.inplast/`
- Hand-offs: `saars.inplast/docs/`

### Regras de Leitura

Cada agente lê apenas:
1. Hand-offs que **ele mesmo criou**
2. Hand-offs que **outros agentes enviaram para ele**

---

## Como Usar

1. Selecione o agente appropriate para a tarefa
2. O agente inicia com sua "Instrução de Início"
3. Após completar, cria hand-off para próximo agente
4. Outro agente lê o hand-off e continua o trabalho

---

## quick Reference

- `agente_qa_engineer.md` - "QA Auditor pronto para o combate..." → skills: `skills/qa_engineer/`
- `agente_spec_reviewer.md` - "SPEC Reviewer pronto para análise..." → skills: `skills/spec_reviewer/`
- `agente_implementation.md` - "Implementador pronto!" → skills: `skills/implementation/`
- `agente_auditor_solucao.md` - "Bom dia! Sou seu Auditor de Solução..." → skills: `skills/auditor_solucao/`
- `agente_ux_ui.md` - "UX/UI Design Engineer pronto para elevar a qualidade..." → skills: `skills/ux_ui/`

---

## Skills

Cada agente tem acesso a skills específicas em `skills/[agente]/skills.json`.

### Origem das Skills
As skills são originadas do Codex em:
`/Users/sistemas2/Documents/Playground 2/skills/`

### Estrutura
```
saars.inplast/skills/
├── qa_engineer/
├── spec_reviewer/
├── implementation/
├── auditor_solucao/
└── ux_ui/
```