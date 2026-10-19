-- Solicitante também pode inscrever o celular.
-- Quem abre o chamado fica marcado, para não receber o aviso dele mesmo.

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

ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS aberto_por uuid REFERENCES public.usuarios (id)
  ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.demandas_marcar_aberto_por()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.aberto_por IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.aberto_por := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS demandas_marcar_aberto_por ON public.demandas;
CREATE TRIGGER demandas_marcar_aberto_por
  BEFORE INSERT ON public.demandas
  FOR EACH ROW
  EXECUTE FUNCTION public.demandas_marcar_aberto_por();
