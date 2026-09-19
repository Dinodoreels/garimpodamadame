DROP POLICY IF EXISTS "Inbound pode gerenciar recebimentos" ON public.truck_receipts;

CREATE POLICY "Equipe inbound pode cadastrar recebimentos"
ON public.truck_receipts
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_inbound(auth.uid()));

CREATE POLICY "Equipe inbound pode atualizar recebimentos"
ON public.truck_receipts
FOR UPDATE
TO authenticated
USING (public.can_manage_inbound(auth.uid()))
WITH CHECK (public.can_manage_inbound(auth.uid()));

CREATE POLICY "Somente administradores podem excluir recebimentos"
ON public.truck_receipts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));