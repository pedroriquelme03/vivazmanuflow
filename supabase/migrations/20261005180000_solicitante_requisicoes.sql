-- Papel solicitante (abre chamado com login) e fila de pedido de acesso.
-- ADD VALUE precisa commitar antes de usar o enum em INSERT; aqui só adiciona.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'solicitante';

CREATE TABLE IF NOT EXISTS public.requisicoes_acesso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text NOT NULL,
  setor text NOT NULL,
  funcao text NOT NULL,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'atendida', 'recusada')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  resolvido_em timestamptz,
  resolvido_por uuid REFERENCES public.usuarios (id),
  usuario_id uuid REFERENCES public.usuarios (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS requisicoes_acesso_email_pendente_uidx
  ON public.requisicoes_acesso (lower(trim(email)))
  WHERE status = 'pendente';

ALTER TABLE public.requisicoes_acesso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "req_acesso_admin_select" ON public.requisicoes_acesso;
CREATE POLICY "req_acesso_admin_select"
  ON public.requisicoes_acesso
  FOR SELECT
  TO authenticated
  USING (private.meu_role() = 'admin'::user_role);

DROP POLICY IF EXISTS "req_acesso_admin_update" ON public.requisicoes_acesso;
CREATE POLICY "req_acesso_admin_update"
  ON public.requisicoes_acesso
  FOR UPDATE
  TO authenticated
  USING (private.meu_role() = 'admin'::user_role)
  WITH CHECK (private.meu_role() = 'admin'::user_role);

CREATE OR REPLACE FUNCTION public.solicitar_acesso(
  p_nome text,
  p_email text,
  p_setor text,
  p_funcao text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome text := trim(p_nome);
  v_email text := lower(trim(p_email));
  v_setor text := trim(p_setor);
  v_funcao text := trim(p_funcao);
BEGIN
  IF v_nome = '' OR v_email = '' OR v_setor = '' OR v_funcao = '' THEN
    RAISE EXCEPTION 'Preencha nome, e-mail, setor e função';
  END IF;
  IF v_email !~ '^[^@]+@[^@]+\.[^@]+' THEN
    RAISE EXCEPTION 'Informe um e-mail válido';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE lower(trim(u.email)) = v_email AND u.ativo = true
  ) THEN
    RAISE EXCEPTION 'Este e-mail já tem acesso. Use o Login';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.requisicoes_acesso r
    WHERE lower(trim(r.email)) = v_email AND r.status = 'pendente'
  ) THEN
    RAISE EXCEPTION 'Já existe um pedido com este e-mail. Aguarde o cadastro';
  END IF;

  INSERT INTO public.requisicoes_acesso (nome, email, setor, funcao)
  VALUES (v_nome, v_email, v_setor, v_funcao);
END;
$$;

REVOKE ALL ON FUNCTION public.solicitar_acesso(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.solicitar_acesso(text, text, text, text)
  TO anon, authenticated;

GRANT SELECT, UPDATE ON TABLE public.requisicoes_acesso TO authenticated;
