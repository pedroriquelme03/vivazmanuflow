-- Dados do projeto antigo "CheckList Vivaz" (Supabase qxxvtogrwymdnbuafbjd),
-- copiados em 19/10/2026. Precisa da migration 20261019160000_governanca_checklist.sql.
-- Só mexe nas tabelas gov_*. Os ids originais são mantidos e tudo usa
-- ON CONFLICT DO NOTHING, então rodar de novo não duplica nada.

INSERT INTO public.gov_acomodacoes (id, numero, tipo, ativo, criado_em) VALUES
  ('8978021a-aed4-466f-b8dc-5338176be584', '1001', 'apartamento', true, '2026-09-18 11:42:09.944064+00'),
  ('685e88ce-f8b9-4e0c-9191-4918db2140ce', '1002', 'apartamento', true, '2026-09-18 11:42:09.944064+00'),
  ('e48f61a2-23a6-4c2c-8316-9899801f18c0', '1003', 'apartamento', true, '2026-09-18 11:42:09.944064+00'),
  ('cb2fc358-dc52-4a61-b83c-410d106f45e3', '1004', 'apartamento', true, '2026-09-18 11:42:09.944064+00'),
  ('2a4c7dcb-bb38-4a57-808f-8ea388ac1b27', '1005', 'suite', true, '2026-09-18 11:42:09.944064+00'),
  ('15cbbd4f-95ab-4de0-9b93-e3728fbf681f', '1006', 'suite', true, '2026-09-18 11:42:09.944064+00'),
  ('6c581566-9a93-476a-ae1e-9bdbceeba5bf', '2001', 'apartamento', true, '2026-09-18 11:42:09.944064+00'),
  ('992edc40-30b1-4127-97b6-ad23bfd553e4', '2002', 'apartamento', true, '2026-09-18 11:42:09.944064+00'),
  ('741eeaaa-4dae-4176-be05-82980fe820d5', '2003', 'suite', true, '2026-09-18 11:42:09.944064+00')
ON CONFLICT DO NOTHING;

INSERT INTO public.gov_camareiras (id, nome, ativo, criado_em) VALUES
  ('d1df5e50-570b-4c2e-9613-b2385fec8300', 'Ana Souza', true, '2026-09-18 11:42:09.944064+00'),
  ('21812e08-7eeb-4745-b5ce-447593c5d7f5', 'Joana Oliveira', true, '2026-09-18 11:42:09.944064+00'),
  ('c096e402-380f-4f31-9707-bd97bee89d6f', 'Maria Silva', true, '2026-09-18 11:42:09.944064+00'),
  ('6e52729b-3d7a-4e23-844f-deb2773368a7', 'Rita Santos', true, '2026-09-18 11:42:09.944064+00')
ON CONFLICT DO NOTHING;

INSERT INTO public.gov_processos (id, nome, descricao, tipo, ativo, criado_em) VALUES
  ('6d34ea96-aa09-4bd7-b4c5-10e8e8c6e31c', 'Checklist Pós-Checkout', 'Conferência de limpeza e arrumação após o checkout do hóspede.', 'ambos', true, '2026-09-18 11:42:09.944064+00')
ON CONFLICT DO NOTHING;

INSERT INTO public.gov_secoes (id, processo_id, nome, ordem, criado_em) VALUES
  ('60d0a2c5-5e63-4475-af3a-61eb9827c660', '6d34ea96-aa09-4bd7-b4c5-10e8e8c6e31c', 'Acomodação', 1, '2026-09-18 11:42:09.944064+00'),
  ('ea23a60f-d85c-44d0-aa04-57b04131cc2f', '6d34ea96-aa09-4bd7-b4c5-10e8e8c6e31c', 'Banheiro', 2, '2026-09-18 11:42:09.944064+00')
ON CONFLICT DO NOTHING;

INSERT INTO public.gov_perguntas (id, secao_id, texto, ordem, criado_em) VALUES
  ('f802f0a2-a072-4e9d-92d4-ed30326b0b70', '60d0a2c5-5e63-4475-af3a-61eb9827c660', 'A cama está arrumada corretamente?', 1, '2026-09-18 11:42:09.944064+00'),
  ('5c905600-3172-4988-812e-3dfeccad57ef', '60d0a2c5-5e63-4475-af3a-61eb9827c660', 'A roupa de cama foi trocada?', 2, '2026-09-18 11:42:09.944064+00'),
  ('b3f51948-02b8-4e53-8251-8a4c177dd65b', '60d0a2c5-5e63-4475-af3a-61eb9827c660', 'O piso está limpo e sem detritos?', 3, '2026-09-18 11:42:09.944064+00'),
  ('1d22e936-85b1-4350-abf7-7dc4acf1b17a', '60d0a2c5-5e63-4475-af3a-61eb9827c660', 'Móveis e superfícies estão sem poeira?', 4, '2026-09-18 11:42:09.944064+00'),
  ('306bca8f-0363-453f-94be-68d81b184053', '60d0a2c5-5e63-4475-af3a-61eb9827c660', 'O frigobar foi conferido e reabastecido?', 5, '2026-09-18 11:42:09.944064+00'),
  ('ea9ed78e-b8f8-447d-9cd1-aed2a55f3d5d', '60d0a2c5-5e63-4475-af3a-61eb9827c660', 'A TV e o controle estão funcionando?', 6, '2026-09-18 11:42:09.944064+00'),
  ('d8483bf9-e3fe-401c-a171-dd1fce45e281', '60d0a2c5-5e63-4475-af3a-61eb9827c660', 'O ar-condicionado está funcionando e limpo?', 7, '2026-09-18 11:42:09.944064+00'),
  ('1d6b07e4-e7a5-462e-a5f5-0e0a56f79070', 'ea23a60f-d85c-44d0-aa04-57b04131cc2f', 'O vaso sanitário está limpo e higienizado?', 1, '2026-09-18 11:42:09.944064+00'),
  ('a5d8579e-563c-4189-aebb-27efefbe1dd9', 'ea23a60f-d85c-44d0-aa04-57b04131cc2f', 'O box e o chuveiro estão limpos?', 2, '2026-09-18 11:42:09.944064+00'),
  ('8869029a-6563-42c4-a96e-951807953884', 'ea23a60f-d85c-44d0-aa04-57b04131cc2f', 'A pia e a bancada estão limpas?', 3, '2026-09-18 11:42:09.944064+00'),
  ('dc5bd95e-6235-491b-8c0c-06a0776eae8d', 'ea23a60f-d85c-44d0-aa04-57b04131cc2f', 'As toalhas foram trocadas?', 4, '2026-09-18 11:42:09.944064+00'),
  ('d740363e-c5d2-46cb-99e3-0cdfeefabf53', 'ea23a60f-d85c-44d0-aa04-57b04131cc2f', 'Os amenities foram repostos?', 5, '2026-09-18 11:42:09.944064+00'),
  ('f6138987-4fea-4cb8-abdb-1b17b8238693', 'ea23a60f-d85c-44d0-aa04-57b04131cc2f', 'O espelho está limpo e sem manchas?', 6, '2026-09-18 11:42:09.944064+00')
ON CONFLICT DO NOTHING;

-- Inspeção (a única do projeto antigo, feita como teste pela conta admin@vivaz.com).
-- O inspetor é procurado pelo e-mail em usuarios; se não existir, fica com o
-- admin ativo mais antigo. Sem nenhum admin, a inspeção é pulada.
INSERT INTO public.gov_inspecoes
  (id, processo_id, acomodacao_id, tipo, camareira_id, inspetor_id, status, criado_em, finalizada_em)
SELECT v.id::uuid, v.processo_id::uuid, v.acomodacao_id::uuid, v.tipo, v.camareira_id::uuid,
       insp.id, v.status, v.criado_em::timestamptz, v.finalizada_em::timestamptz
FROM (VALUES
  ('093d5f9d-de11-4f3c-9005-aa762485dbe8', '6d34ea96-aa09-4bd7-b4c5-10e8e8c6e31c', '741eeaaa-4dae-4176-be05-82980fe820d5', 'suite', 'd1df5e50-570b-4c2e-9613-b2385fec8300', 'admin@vivaz.com', 'finalizada', '2026-09-18 13:11:30.202037+00', '2026-09-18 13:11:35.506+00')
) AS v(id, processo_id, acomodacao_id, tipo, camareira_id, email, status, criado_em, finalizada_em)
CROSS JOIN LATERAL (
  SELECT u.id
  FROM public.usuarios u
  WHERE (lower(u.email) = v.email OR u.role = 'admin'::user_role) AND u.ativo
  ORDER BY (lower(u.email) = v.email) DESC NULLS LAST, u.criado_em
  LIMIT 1
) AS insp
ON CONFLICT DO NOTHING;

INSERT INTO public.gov_respostas
  (id, inspecao_id, pergunta_id, pergunta_texto, secao_nome, secao_ordem, pergunta_ordem, resposta, comentario, anexo_url, criado_em)
SELECT v.id::uuid, v.inspecao_id::uuid, v.pergunta_id::uuid, v.pergunta_texto, v.secao_nome,
       v.secao_ordem, v.pergunta_ordem, v.resposta, v.comentario, v.anexo_url, v.criado_em::timestamptz
FROM (VALUES
  ('f4ad7728-5b15-4d05-8ecb-d3e2aba6b446', '093d5f9d-de11-4f3c-9005-aa762485dbe8', 'f802f0a2-a072-4e9d-92d4-ed30326b0b70', 'A cama está arrumada corretamente?', 'Acomodação', 1, 1, 'nao', NULL, NULL, '2026-09-18 13:11:30.348915+00'),
  ('379bd69e-299b-4fe4-b909-bea6a8a838b8', '093d5f9d-de11-4f3c-9005-aa762485dbe8', '5c905600-3172-4988-812e-3dfeccad57ef', 'A roupa de cama foi trocada?', 'Acomodação', 1, 2, 'sim', NULL, NULL, '2026-09-18 13:11:30.348915+00'),
  ('fff5766a-6127-4ad9-86ba-848ce51b3533', '093d5f9d-de11-4f3c-9005-aa762485dbe8', 'b3f51948-02b8-4e53-8251-8a4c177dd65b', 'O piso está limpo e sem detritos?', 'Acomodação', 1, 3, 'sim', NULL, NULL, '2026-09-18 13:11:30.348915+00'),
  ('e5a7436d-a1f1-46f1-8932-ff27002416f9', '093d5f9d-de11-4f3c-9005-aa762485dbe8', '1d22e936-85b1-4350-abf7-7dc4acf1b17a', 'Móveis e superfícies estão sem poeira?', 'Acomodação', 1, 4, 'sim', NULL, NULL, '2026-09-18 13:11:30.348915+00'),
  ('bab15db9-d16d-4817-ab15-f87d5d9f0719', '093d5f9d-de11-4f3c-9005-aa762485dbe8', '306bca8f-0363-453f-94be-68d81b184053', 'O frigobar foi conferido e reabastecido?', 'Acomodação', 1, 5, 'sim', NULL, NULL, '2026-09-18 13:11:30.348915+00'),
  ('01bab78c-7dbf-4217-affa-49c3982b4331', '093d5f9d-de11-4f3c-9005-aa762485dbe8', 'ea9ed78e-b8f8-447d-9cd1-aed2a55f3d5d', 'A TV e o controle estão funcionando?', 'Acomodação', 1, 6, 'sim', NULL, NULL, '2026-09-18 13:11:30.348915+00'),
  ('e2e14f36-ad19-42f0-aecc-9db6a55eccd3', '093d5f9d-de11-4f3c-9005-aa762485dbe8', 'd8483bf9-e3fe-401c-a171-dd1fce45e281', 'O ar-condicionado está funcionando e limpo?', 'Acomodação', 1, 7, 'sim', 'teste', NULL, '2026-09-18 13:11:30.348915+00'),
  ('fc97ea19-fbb6-4b56-8368-788a6db7d042', '093d5f9d-de11-4f3c-9005-aa762485dbe8', '1d6b07e4-e7a5-462e-a5f5-0e0a56f79070', 'O vaso sanitário está limpo e higienizado?', 'Banheiro', 2, 1, 'sim', NULL, NULL, '2026-09-18 13:11:30.348915+00'),
  ('8b3e78db-fe8b-4ab8-850d-563c5fb9d7d9', '093d5f9d-de11-4f3c-9005-aa762485dbe8', 'a5d8579e-563c-4189-aebb-27efefbe1dd9', 'O box e o chuveiro estão limpos?', 'Banheiro', 2, 2, 'sim', NULL, NULL, '2026-09-18 13:11:30.348915+00'),
  ('062c96cd-58fb-4a44-9b6d-d0b0091ad216', '093d5f9d-de11-4f3c-9005-aa762485dbe8', '8869029a-6563-42c4-a96e-951807953884', 'A pia e a bancada estão limpas?', 'Banheiro', 2, 3, 'sim', NULL, NULL, '2026-09-18 13:11:30.348915+00'),
  ('057170e8-c044-434b-bda0-27aba463a1c8', '093d5f9d-de11-4f3c-9005-aa762485dbe8', 'dc5bd95e-6235-491b-8c0c-06a0776eae8d', 'As toalhas foram trocadas?', 'Banheiro', 2, 4, 'sim', NULL, NULL, '2026-09-18 13:11:30.348915+00'),
  ('5f15713d-0757-4a7f-8a9d-cd8d9ce68976', '093d5f9d-de11-4f3c-9005-aa762485dbe8', 'd740363e-c5d2-46cb-99e3-0cdfeefabf53', 'Os amenities foram repostos?', 'Banheiro', 2, 5, 'sim', NULL, NULL, '2026-09-18 13:11:30.348915+00'),
  ('221fdf91-ae0e-4949-bc55-cb2cc2eedd9a', '093d5f9d-de11-4f3c-9005-aa762485dbe8', 'f6138987-4fea-4cb8-abdb-1b17b8238693', 'O espelho está limpo e sem manchas?', 'Banheiro', 2, 6, 'sim', NULL, NULL, '2026-09-18 13:11:30.348915+00')
) AS v(id, inspecao_id, pergunta_id, pergunta_texto, secao_nome, secao_ordem, pergunta_ordem, resposta, comentario, anexo_url, criado_em)
WHERE EXISTS (SELECT 1 FROM public.gov_inspecoes i WHERE i.id = v.inspecao_id::uuid)
ON CONFLICT DO NOTHING;

INSERT INTO public.gov_planos_acao
  (id, resposta_id, prioridade, o_que_fazer, quem_vai_fazer, quem_pediu, observacao, criado_em)
SELECT v.id::uuid, v.resposta_id::uuid, v.prioridade, v.o_que_fazer, v.quem_vai_fazer,
       v.quem_pediu, v.observacao, v.criado_em::timestamptz
FROM (VALUES
  ('5adce680-daa6-40ef-b648-8121a0fa6abe', 'f4ad7728-5b15-4d05-8ecb-d3e2aba6b446', 'media', 'Arrrumar o quarto dnv', 'Ana Souza', 'Pedro Admin', NULL::text, '2026-09-18 13:11:30.481034+00')
) AS v(id, resposta_id, prioridade, o_que_fazer, quem_vai_fazer, quem_pediu, observacao, criado_em)
WHERE EXISTS (SELECT 1 FROM public.gov_respostas r WHERE r.id = v.resposta_id::uuid)
ON CONFLICT DO NOTHING;
