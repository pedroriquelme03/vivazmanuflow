-- Módulo Governança: checklist de arrumação das acomodações após o checkout.
-- Veio do projeto checklist-vivaz e passa a usar o login e os usuários do sistema.
-- Admin do sistema é admin da governança. Os demais entram pelo campo
-- usuarios.governanca_papel: 'lider' inspeciona e escolhe a camareira,
-- 'camareira' faz o próprio checklist.

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS governanca_papel text
  CHECK (governanca_papel IN ('lider', 'camareira'));

CREATE OR REPLACE FUNCTION private.governanca_papel()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN u.role = 'admin'::user_role THEN 'admin'
    ELSE u.governanca_papel
  END
  FROM public.usuarios u
  WHERE u.id = auth.uid() AND u.ativo;
$$;

GRANT EXECUTE ON FUNCTION private.governanca_papel() TO authenticated;

-- Cadastros -----------------------------------------------------------------

CREATE TABLE public.gov_acomodacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE,
  tipo text NOT NULL CHECK (tipo IN ('suite', 'apartamento')),
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.gov_camareiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.gov_processos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'ambos' CHECK (tipo IN ('suite', 'apartamento', 'ambos')),
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.gov_secoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.gov_processos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.gov_perguntas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secao_id uuid NOT NULL REFERENCES public.gov_secoes(id) ON DELETE CASCADE,
  texto text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- Inspeções -----------------------------------------------------------------

CREATE TABLE public.gov_inspecoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.gov_processos(id) ON DELETE RESTRICT,
  acomodacao_id uuid NOT NULL REFERENCES public.gov_acomodacoes(id) ON DELETE RESTRICT,
  tipo text NOT NULL CHECK (tipo IN ('suite', 'apartamento')),
  camareira_id uuid REFERENCES public.gov_camareiras(id) ON DELETE SET NULL,
  inspetor_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'finalizada' CHECK (status IN ('em_andamento', 'finalizada')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  finalizada_em timestamptz
);

CREATE INDEX gov_inspecoes_criado_em_idx ON public.gov_inspecoes (criado_em DESC);
CREATE INDEX gov_inspecoes_inspetor_idx ON public.gov_inspecoes (inspetor_id);

CREATE TABLE public.gov_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspecao_id uuid NOT NULL REFERENCES public.gov_inspecoes(id) ON DELETE CASCADE,
  -- A pergunta pode sair do checklist depois; o texto fica guardado na resposta.
  pergunta_id uuid REFERENCES public.gov_perguntas(id) ON DELETE SET NULL,
  pergunta_texto text NOT NULL,
  secao_nome text NOT NULL,
  secao_ordem integer NOT NULL DEFAULT 0,
  pergunta_ordem integer NOT NULL DEFAULT 0,
  resposta text CHECK (resposta IN ('sim', 'nao')),
  comentario text,
  anexo_url text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX gov_respostas_inspecao_idx ON public.gov_respostas (inspecao_id);

CREATE TABLE public.gov_planos_acao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resposta_id uuid NOT NULL REFERENCES public.gov_respostas(id) ON DELETE CASCADE,
  prioridade text NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta')),
  o_que_fazer text NOT NULL,
  quem_vai_fazer text,
  quem_pediu text,
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX gov_planos_acao_resposta_idx ON public.gov_planos_acao (resposta_id);

-- RLS -----------------------------------------------------------------------

ALTER TABLE public.gov_acomodacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gov_camareiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gov_processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gov_secoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gov_perguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gov_inspecoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gov_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gov_planos_acao ENABLE ROW LEVEL SECURITY;

-- Cadastros: quem tem acesso à governança lê, só admin escreve.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gov_acomodacoes', 'gov_camareiras', 'gov_processos', 'gov_secoes', 'gov_perguntas'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (private.governanca_papel() IS NOT NULL)',
      t || '_ler', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (private.governanca_papel() = ''admin'') WITH CHECK (private.governanca_papel() = ''admin'')',
      t || '_admin', t
    );
  END LOOP;
END;
$$;

-- Inspeções: admin e líder veem todas; camareira vê as próprias.
CREATE POLICY gov_inspecoes_ler ON public.gov_inspecoes
  FOR SELECT TO authenticated
  USING (
    private.governanca_papel() IN ('admin', 'lider')
    OR (inspetor_id = auth.uid() AND private.governanca_papel() IS NOT NULL)
  );

CREATE POLICY gov_inspecoes_criar ON public.gov_inspecoes
  FOR INSERT TO authenticated
  WITH CHECK (
    inspetor_id = auth.uid()
    AND private.governanca_papel() IS NOT NULL
    -- Só líder e admin escolhem a camareira.
    AND (camareira_id IS NULL OR private.governanca_papel() IN ('admin', 'lider'))
  );

CREATE POLICY gov_inspecoes_admin ON public.gov_inspecoes
  FOR ALL TO authenticated
  USING (private.governanca_papel() = 'admin')
  WITH CHECK (private.governanca_papel() = 'admin');

CREATE POLICY gov_respostas_ler ON public.gov_respostas
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.gov_inspecoes i WHERE i.id = inspecao_id)
  );

CREATE POLICY gov_respostas_criar ON public.gov_respostas
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gov_inspecoes i
      WHERE i.id = inspecao_id AND i.inspetor_id = auth.uid()
    )
  );

CREATE POLICY gov_respostas_admin ON public.gov_respostas
  FOR ALL TO authenticated
  USING (private.governanca_papel() = 'admin')
  WITH CHECK (private.governanca_papel() = 'admin');

CREATE POLICY gov_planos_acao_ler ON public.gov_planos_acao
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.gov_respostas r WHERE r.id = resposta_id)
  );

CREATE POLICY gov_planos_acao_criar ON public.gov_planos_acao
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.gov_respostas r
      JOIN public.gov_inspecoes i ON i.id = r.inspecao_id
      WHERE r.id = resposta_id AND i.inspetor_id = auth.uid()
    )
  );

CREATE POLICY gov_planos_acao_admin ON public.gov_planos_acao
  FOR ALL TO authenticated
  USING (private.governanca_papel() = 'admin')
  WITH CHECK (private.governanca_papel() = 'admin');

-- Admin define quem entra na governança ----------------------------------------

CREATE OR REPLACE FUNCTION public.admin_definir_governanca(
  p_user_id uuid,
  p_papel text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF private.meu_role() IS DISTINCT FROM 'admin'::user_role THEN
    RAISE EXCEPTION 'Apenas administrador';
  END IF;

  IF p_papel IS NOT NULL AND p_papel NOT IN ('lider', 'camareira') THEN
    RAISE EXCEPTION 'Papel inválido';
  END IF;

  UPDATE public.usuarios
  SET governanca_papel = p_papel, atualizado_em = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_definir_governanca(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_definir_governanca(uuid, text) TO authenticated;

-- Fotos dos itens ---------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('governanca', 'governanca', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY governanca_fotos_enviar ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'governanca' AND private.governanca_papel() IS NOT NULL
  );
