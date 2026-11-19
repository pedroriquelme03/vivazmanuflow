-- Varredura: perguntas Sim/Não que oferecem "abrir chamado para manutenção" no "Não".
-- Critério amplo, como combinado: tudo que pode precisar de conserto, pintura,
-- troca ou revisão de infraestrutura. Abrir ou não continua sendo decisão de
-- quem aplica (ex.: parede manchada pode ser só limpeza, ou pintura).
--   1) Setores de revisão de espaços e infraestrutura: todas as perguntas Sim/Não.
--   2) Nos outros setores (A&B, Almoxarifado, Bilheteria, Eventos...): só as que
--      falam de equipamento, estrutura, instalação ou conserto.
-- Só LIGA a opção; nada que já estava ligado é desligado.
-- Precisa de 20261112120000_checklist_setores.sql.

-- 1) Setores inteiros.
UPDATE public.gov_perguntas q
SET plano_acao = true
FROM public.gov_secoes s
JOIN public.gov_processos p ON p.id = s.processo_id
JOIN public.gov_setores st ON st.id = p.setor_id
WHERE q.secao_id = s.id
  AND q.tipo = 'sim_nao'
  AND q.plano_acao IS DISTINCT FROM true
  AND lower(btrim(st.nome)) IN (
    'manutenção', 'gerencial', 'governança', 'geral', 'supervisão noturna',
    'jardinagem', 'atrações', 'limpeza e resíduos', 'segurança', 'lazer/recreação', 'recepção'
  );

-- 2) Nos demais setores, pelo assunto da pergunta.
UPDATE public.gov_perguntas q
SET plano_acao = true
WHERE q.tipo = 'sim_nao'
  AND q.plano_acao IS DISTINCT FROM true
  AND q.texto ~* (
    'funcion|quebr|danific|avari|defeit|conserv|estado de uso|bom estado|íntegr|integr|'
    || 'vazam|infiltr|umidade|mofo|goteira|rachad|trinc|descasc|pintur|parede|piso|teto|forro|'
    || 'porta|janela|fechadur|maçaneta|vidro|espelho|telhad|calha|ralo|esgot|drenag|entup|'
    || 'torneira|chuveiro|descarga|vaso sanit|pia|registro|hidráulic|tubula|encanament|bomba|'
    || 'elétric|eletric|tomada|interruptor|fiação|fio|cabo|lâmpad|lampad|ilumina|luminária|disjuntor|quadro de|'
    || 'ar.condicionado|climatiza|ventila|exaust|coifa|geladeira|refrigera|freezer|câmara fria|camara fria|'
    || 'forno|fogão|fogao|equipament|máquina|maquina|motor|gerador|aquecedor|caldeira|filtro|'
    || 'prateleira|estrutur|mobili|móve|cadeira|mesa|banco|corrimão|guarda.corpo|grade|cerca|portão|'
    || 'extintor|hidrante|sinaliz|alarme|câmera|camera|tv|televis|telefone|controle|'
    || 'manuten|reparo|conserto|instala|fixad|solto|enferruj|ferrugem'
  );
