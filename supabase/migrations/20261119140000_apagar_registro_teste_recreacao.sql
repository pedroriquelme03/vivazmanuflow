-- Apaga o registro de atividade de TESTE da Recreação (19/11/2026, Hidroginástica,
-- 25 participantes, observação "Teste do sistema"). As respostas vão junto.
-- Só apaga se ainda for exatamente esse registro de teste. Pode rodar de novo.

DELETE FROM public.gov_inspecoes i
USING public.gov_processos p
WHERE i.id = 'e161337b-5a59-46b3-a327-dc9d2da6b2a5'
  AND p.id = i.processo_id
  AND p.codigo_origem = 'vivaz-recreacao-registro'
  AND EXISTS (
    SELECT 1 FROM public.gov_respostas r
    WHERE r.inspecao_id = i.id AND r.valor = 'Teste do sistema'
  );
