CREATE POLICY "Service role manages Melhor Envio connection"
ON public.melhor_envio_config
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);