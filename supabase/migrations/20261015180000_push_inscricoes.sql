-- Inscrição do celular para avisar a equipe quando um chamado novo abre.

CREATE TABLE IF NOT EXISTS public.push_inscricoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_inscricoes_endpoint_unico UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS push_inscricoes_usuario_idx
  ON public.push_inscricoes (usuario_id);

ALTER TABLE public.push_inscricoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_inscricoes_proprio" ON public.push_inscricoes;
CREATE POLICY "push_inscricoes_proprio"
  ON public.push_inscricoes
  FOR ALL
  TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_inscricoes TO authenticated;

CREATE OR REPLACE FUNCTION public.salvar_push_inscricao(
  p_endpoint text,
  p_p256dh text,
  p_auth text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role public.user_role;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Faça login para receber avisos';
  END IF;

  SELECT u.role INTO v_role
  FROM public.usuarios u
  WHERE u.id = v_uid AND u.ativo;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Este acesso não recebe avisos de chamado';
  END IF;

  IF length(trim(coalesce(p_endpoint, ''))) < 12
    OR length(trim(coalesce(p_p256dh, ''))) < 8
    OR length(trim(coalesce(p_auth, ''))) < 8 THEN
    RAISE EXCEPTION 'Inscrição inválida';
  END IF;

  DELETE FROM public.push_inscricoes WHERE endpoint = trim(p_endpoint);

  INSERT INTO public.push_inscricoes (usuario_id, endpoint, p256dh, auth)
  VALUES (v_uid, trim(p_endpoint), trim(p_p256dh), trim(p_auth));
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_push_inscricao(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salvar_push_inscricao(text, text, text) TO authenticated;
