# Plano — Checklist no padrão do Checklist Fácil

> Plano criado em 12/11/2026 e em andamento.
> Base: doc do Josué ("Especificação – Modelos de Checklist"), conversa com o Gabriel
> e o que vimos ao vivo no Checklist Fácil (CF).

## Andamento (12/11/2026)

| SQL (rodar nesta ordem, junto com a publicação do código) | O que faz | Status |
|---|---|---|
| `20261112120000_checklist_setores.sql` | Fase 1: setores, colaboradores, locais | Rodado |
| `20261112150000_checklist_setores_aquamania.sql` | Aquamania separado em 6 setores; Avaliação de qualidade → Auditoria e Qualidade | Rodado |
| `20261112160000_checklist_fase2.sql` | Fase 2: visão por setor, líder edita checklists do setor, pausar/cancelar/excluir, data de referência, área como local | Rodado |
| `20261112170000_checklist_fase3.sql` | Fase 3 (parte 1): peso, obrigatórios por resposta, condicionais | Rodado |
| `20261112180000_checklist_patrimonio.sql` | Características da UH, tipos de item e itens por local; pergunta confere item | Rodado |
| `20261112181000_checklist_patrimonio_uhs.sql` | Preenche as 171 UHs da planilha (685 itens) | Rodado |
| `20261112190000_checklist_identificador.sql` | Pergunta que identifica cada aplicação | Rodado |
| `20261112200000_checklist_patrimonio_mobilia.sql` | Itens separados em Eletrônicos e Mobília, nº de patrimônio por item, UH 1104 → 1105 | Rodado |
| `20261112210000_checklist_equipe.sql` | Equipe dentro do checklist: líder cria login só do Checklist e dá acesso aos setores dele | Rodado |
| `20261112220000_checklist_avaliado.sql` | "Quem é avaliado" em cada checklist (líder escolhe / a própria pessoa / perguntar no começo); colaborador ligado ao login; trava no banco para ninguém aplicar no nome de outro | Rodado |
| `20261112230000_checklist_complementos.sql` | Pergunta pode não aceitar comentário e/ou foto | Rodado |
| `20261112231000_checklist_fase4_cf.sql` | Fase 4: pesos e comentário/foto dos 44 checklists do CF; cria o checklist 968170 (Jardinagem) | Rodado |
| `20261112240000_checklist_plano_campos.sql` | Plano de ação configurável: prazo, onde, por quê, como e custo (opcional/obrigatório por pergunta) | Rodado |
| `20261112250000_checklist_equipe_seguranca.sql` | Equipe: o líder vê só quem divide setor com ele (ou sem setor) e não vê administradores | Rodado |
| `20261116120000_checklist_locais_arvore.sql` | Árvore de locais (Unidade → Categoria → Tipo → Classificação → Local), ficha por categoria, etiquetas de setor, checklist ligado à árvore; exemplos das duas unidades | Rodado |
| `20261116130000_checklist_grupos_item.sql` | Grupos de itens editáveis (criar "Máquinas" etc.); tipo de item aponta para o grupo | **Falta rodar** |

Sem SQL (só código): Cadastros da Manutenção/TI para o líder (cada um só o próprio sistema;
Solicitações só para a TI), relatórios com filtros, telas novas de Equipe e Cadastros.

**Árvore de locais** (documento do Josué "Classificação de Áreas"): Unidade = propriedade;
categoria/tipo/classificação em `gov_lugares`; o local continua em `gov_acomodacoes` (mesmos ids)
com `lugar_id`. Categorias com o mesmo nome nas duas unidades (Lazer, Alimentos e Bebidas,
Operacional...) para o filtro juntar. O SQL termina listando os locais que ficaram sem lugar.

**O que a exportação do CF não traz** (Fase 4): condicionais, obrigatórios por resposta,
peso por opção e campos do plano de ação. Isso tem que vir do CF na tela ou do JSON do Josué.

Vai vir: planilha nova das UHs (com mobília, patrimônio e números atualizados) para renovar o cadastro.

Ainda falta da Fase 3: subáreas de verdade (área dentro de área; hoje é o texto `grupo`)
e opções de lista com peso.

## Por quê

O módulo Checklist (`/governanca`, tabelas `gov_*`) hoje é quase só Sim/Não: lista de
checklists solta, "subárea" é só um texto (`grupo`), não tem condicional, peso, plano de
ação configurável, nem como mexer num checklist em andamento de outra pessoa. A
"camareira" é só um nome, e as "acomodações" só servem para UH. A ideia é trazer o
padrão do CF para dentro do sistema, do nosso jeito e mais organizado.

## Decisões já tomadas

| Tema | Decisão |
|---|---|
| Cadastros | **Novos, só do Checklist.** Locais/Setores/Sublocais dos chamados não são usados. |
| Organização | **Propriedade → Setor → Checklists** (Vivaz / Aquamania → Governança, Manutenção… → checklists), tanto para criar quanto para aplicar. |
| Colaborador | **Nome + setor** (cargo depois). **Sem login.** Substitui a lista de Camareiras. |
| Quem aplica × quem fez | Igual ao CF: quem **aplica** é o usuário logado (líder/aplicador). No CF a camareira é uma pergunta "Nome da camareira" (lista). Aqui vira campo próprio: **colaborador avaliado**, escolhido de uma lista do setor — e entra nos filtros/relatórios. |
| Em andamento | **Admin e líder do setor** podem continuar, pausar, cancelar e excluir. |
| Cadastro com login | Continua só admin (já é assim). Só admin cria admin (já é assim). |
| Locais | Nem sempre é UH: local pode ser **UH ou área** (casa de máquinas, bilheteria, piscina…), por propriedade. Aquamania não tem UH. |

**Validação (aprovar/reprovar)**: no CF é o "Fluxo de análise", que é pago e vocês não
usam (por isso os status "Em análise/Reprovado" ficam vazios lá). Fica para depois.

**Data e hora**: no CF a data de início é automática. Aqui: início e fim são gravados
sozinhos (dá a duração), e quem aplica pode informar a **data de referência**
(padrão = hoje) — útil quando lança um checklist feito antes.

## Modelo de dados (como fica)

```
propriedades (já existe: Vivaz, Aquamania — só o nome do hotel/parque)
 └─ gov_setores            id, propriedade_id, nome, ativo, ordem
     ├─ colaboradores      id, setor_id, nome, ativo          (tabela gov_camareiras)
     ├─ gov_usuario_setores usuario_id, setor_id              (líder/aplicador vê só os seus setores)
     └─ gov_processos      + setor_id, assunto, identificador_pergunta_id   (checklist)
         └─ gov_secoes     + parent_id (subárea dentro de subárea), descricao
             └─ gov_perguntas + peso, complementos[], exige{}, plano_campos{}
                 ├─ gov_pergunta_opcoes  id, pergunta_id, texto, ordem, peso, exige[]
                 └─ gov_dependencias     pergunta_id, gatilho, filho_pergunta_id | filho_secao_id
gov_acomodacoes (= locais)  + propriedade_id; tipo suite | apartamento | area
gov_camareiras  (= colaboradores) + setor_id
gov_inspecoes  + iniciado_em, data_referencia, status (+ pausada, cancelada)
gov_planos_acao + por_que, onde, como, quanto_custa, prazo
```

- **Sem renomear tabelas por enquanto**: `gov_camareiras` guarda os colaboradores e
  `gov_acomodacoes` os locais (comentário na tabela explica). Renomear quebraria telas e
  relatórios entre rodar o SQL e publicar o código; dá para renomear quando as telas de
  preenchimento forem reescritas (Fase 2).
- **Respostas antigas não quebram**: `gov_respostas` já guarda cópia do texto da
  pergunta/seção, então mudar o modelo não altera aplicações passadas.
- **`exige`** (complementos obrigatórios por resposta): mapa `resposta → [comentario,
  foto, plano_acao]`, ex.: `{"nao": ["plano_acao"]}`; nas listas fica em cada opção.
- **`plano_campos`**: por pergunta, cada campo do plano de ação (prioridade, o que, por
  que, onde, quem, quando, como, quanto) fica oculto, opcional ou obrigatório.
- **Nota**: soma dos pesos conformes ÷ soma dos pesos respondidos × 100. N/A e itens
  escondidos por condicional ficam fora.

## Fases

Cada fase é uma entrega própria (migration + código + testes), funcionando sozinha.

### Fase 1 — Cadastros e permissões
- Setores por propriedade; colaboradores (nome + setor, ativo/inativo); locais (UH ou
  área, por propriedade); vínculo usuário ↔ setores.
- Checklists ganham setor: migrar do `categoria` atual (prefixo GOVERNANÇA,
  MANUTENÇÃO, AQUAMANIA…) — a lista final de setores a gente valida antes.
- Camareiras viram colaboradores do setor Governança; acomodações viram locais.
- Telas no menu do Checklist: **Setores** (admin), **Colaboradores** (admin; líder só
  do seu setor), **Locais** (admin) — com busca e filtros Propriedade / Setor / Ativo
  (reaproveitando `useListaCadastro` de `src/components/ListaCadastroControles.tsx`).
- Na tela **Setores**, o admin marca quem (líder/aplicador) acessa cada setor.
- RLS: líder só lê/escreve dados dos seus setores; admin tudo.

### Fase 2 — Navegação e aplicação
- **Preencher checklist**: Propriedade → Setor → Checklist → Local (se usa) →
  Colaborador + data de referência → perguntas. Só aparecem os setores da pessoa.
- **Gerenciar checklists**: mesma árvore, com busca e filtro ativo/inativo.
- **Em andamento**: admin/líder podem continuar o de outra pessoa, pausar, retomar,
  cancelar (fica no histórico) e excluir (com confirmação).
- **Inspeções**: filtros status, período, propriedade, setor, checklist, local,
  colaborador, aplicador; coluna de duração.

### Fase 3 — Editor completo (padrão CF)
- Subáreas de verdade (área dentro de área); o `grupo` "A › B" de hoje vira subárea
  automaticamente.
- Reordenar e mover perguntas entre áreas.
- Por pergunta: peso, dica, obrigatória, N/A, complementos disponíveis e obrigatórios
  por resposta, plano de ação configurável, item identificador.
- Listas com opções próprias (peso e complementos por opção).
- **Condicionais**: resposta X mostra pergunta ou área. Escondido não é obrigatório e
  não pontua.
- Preenchimento respeita tudo isso; nota com peso.

### Fase 4 — Completar os checklists que já existem
- Os 48 checklists do sistema já são a exportação do CF: **não recriar nem reescrever**.
- Só acrescentar o que ficou faltando no import (condicionais, peso, subáreas,
  complementos obrigatórios, opções de lista), casando pelo `codigo_origem` (id do CF).
- Fonte: planilhas em `Z:\Checklist Dados` e o próprio CF no Chrome.
- Validar com 608084 (simples) e 926747 (eventos, com condicionais).

### Fase 5 — Patrimônio por local
- Tipos de equipamento (TV, ar-condicionado, frigobar…) e patrimônio por local
  (tipo, marca, modelo).
- Pergunta pode ser ligada a um tipo; na hora aparece o modelo cadastrado e dá para
  marcar "modelo diferente" (e informar o real).
- Relatório: problemas por modelo e divergências.
- **Precisa da lista de patrimônio.**

### Depois
Cargo do colaborador; filtro por resposta de pergunta; relatórios por colaborador e
tempo; validação (aprovar/reprovar); demais configurações do CF (assinatura, e-mail,
PDF); tipos Cadastro (CPF, CEP…) e Especial (GPS, QR).

## Como cada fase é feita

1. Ler o guia do Next em `node_modules/next/dist/docs/` antes de mexer em rotas (AGENTS.md).
2. Migration nova em `supabase/migrations/` — aditiva, pode rodar de novo sem duplicar.
   **Rodar no Supabase antes de publicar o código.** Atualizar `src/lib/database.types.ts`.
3. Regras puras em `src/lib/` (visibilidade das condicionais, validação, nota) com
   testes em vitest.
4. Telas reaproveitando o que já existe (`src/lib/governanca.ts`, `ListaCadastroControles`,
   `GrupoFiltros`, `NovaInspecao`, `ProcessoEditor`).
5. Revisão com `/code-review` e `/simplify`; `npm test`, `npm run lint`, `npm run build`;
   conferir no navegador (dev server `vivazmanuflow-dev`).

## O que falta vocês mandarem
- Lista final de **setores** por propriedade (sugestão inicial vem dos prefixos atuais).
- Planilha de **colaboradores** (nome + setor) — pode ser depois, a tela de cadastro já resolve.
- **JSON** do Josué (fase 4) e **lista de patrimônio por UH/local** (fase 5).
