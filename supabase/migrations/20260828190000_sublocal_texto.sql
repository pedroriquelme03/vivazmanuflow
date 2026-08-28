-- Sublocal digitado na abertura (sem cadastro prévio em locais).

ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS sublocal text;

CREATE OR REPLACE FUNCTION public.definir_sublocal(
  p_token text,
  p_sublocal text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.demandas
  SET sublocal = nullif(trim(p_sublocal), '')
  WHERE token_acompanhamento::text = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Não foi possível gravar o sublocal';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rotulo_sublocal(p_token text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    nullif(trim(d.sublocal), ''),
    l.nome
  )
  FROM public.demandas d
  LEFT JOIN public.locais l ON l.id = d.local_id
  WHERE d.token_acompanhamento::text = p_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.definir_sublocal(text, text)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rotulo_sublocal(text)
  TO anon, authenticated;
