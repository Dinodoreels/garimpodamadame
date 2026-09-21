CREATE OR REPLACE FUNCTION private.get_consignor_supplier_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.suppliers WHERE user_id = _user_id LIMIT 1 $$;
CREATE OR REPLACE FUNCTION private.get_managed_store_ids(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT store_id FROM public.store_employees WHERE user_id = _user_id AND role = 'gerente' AND is_active = true $$;
CREATE OR REPLACE FUNCTION private.can_user_access_order(_user_id uuid, _order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.orders WHERE id = _order_id AND user_id = _user_id) $$;
CREATE OR REPLACE FUNCTION private.can_seller_access_order(_user_id uuid, _order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.orders WHERE id = _order_id AND created_by = _user_id AND private.has_role(_user_id, 'vendedor'::public.app_role)) $$;
CREATE OR REPLACE FUNCTION private.can_consignor_access_order(_user_id uuid, _order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id WHERE oi.order_id = _order_id AND p.supplier_id = private.get_consignor_supplier_id(_user_id) AND private.has_role(_user_id, 'consignador'::public.app_role)) $$;
CREATE OR REPLACE FUNCTION private.can_manage_inbound(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT private.has_any_role(_user_id, ARRAY['admin','gestor_cd','inbound']) $$;
CREATE OR REPLACE FUNCTION private.can_view_inbound(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT private.has_any_role(_user_id, ARRAY['admin','gestor_cd','inbound','qc','estoque','commerce','viewer','vendedor']) $$;
CREATE OR REPLACE FUNCTION private.can_commerce_inbound(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT private.has_any_role(_user_id, ARRAY['admin','gestor_cd','commerce']) $$;
CREATE OR REPLACE FUNCTION private.can_qc_inbound(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT private.has_any_role(_user_id, ARRAY['admin','gestor_cd','qc']) $$;
CREATE OR REPLACE FUNCTION private.can_stock_inbound(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT private.has_any_role(_user_id, ARRAY['admin','gestor_cd','estoque']) $$;
CREATE OR REPLACE FUNCTION private.is_cd_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT private.has_any_role(_user_id, ARRAY['admin','gestor_cd']) $$;

CREATE OR REPLACE FUNCTION public.get_consignor_supplier_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private
AS $$ SELECT private.get_consignor_supplier_id(_user_id) $$;
CREATE OR REPLACE FUNCTION public.get_managed_store_ids(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private
AS $$ SELECT * FROM private.get_managed_store_ids(_user_id) $$;
CREATE OR REPLACE FUNCTION public.can_user_access_order(_user_id uuid, _order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private
AS $$ SELECT private.can_user_access_order(_user_id, _order_id) $$;
CREATE OR REPLACE FUNCTION public.can_seller_access_order(_user_id uuid, _order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private
AS $$ SELECT private.can_seller_access_order(_user_id, _order_id) $$;
CREATE OR REPLACE FUNCTION public.can_consignor_access_order(_user_id uuid, _order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private
AS $$ SELECT private.can_consignor_access_order(_user_id, _order_id) $$;
CREATE OR REPLACE FUNCTION public.can_manage_inbound(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private
AS $$ SELECT private.can_manage_inbound(_user_id) $$;
CREATE OR REPLACE FUNCTION public.can_view_inbound(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private
AS $$ SELECT private.can_view_inbound(_user_id) $$;
CREATE OR REPLACE FUNCTION public.can_commerce_inbound(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private
AS $$ SELECT private.can_commerce_inbound(_user_id) $$;
CREATE OR REPLACE FUNCTION public.can_qc_inbound(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private
AS $$ SELECT private.can_qc_inbound(_user_id) $$;
CREATE OR REPLACE FUNCTION public.can_stock_inbound(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private
AS $$ SELECT private.can_stock_inbound(_user_id) $$;
CREATE OR REPLACE FUNCTION public.is_cd_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, private
AS $$ SELECT private.is_cd_manager(_user_id) $$;

GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_consignor_supplier_id(uuid), private.get_managed_store_ids(uuid), private.can_user_access_order(uuid, uuid), private.can_seller_access_order(uuid, uuid), private.can_consignor_access_order(uuid, uuid), private.can_manage_inbound(uuid), private.can_view_inbound(uuid), private.can_commerce_inbound(uuid), private.can_qc_inbound(uuid), private.can_stock_inbound(uuid), private.is_cd_manager(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_user_access_order(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_consignor_supplier_id(uuid), public.get_managed_store_ids(uuid), public.can_seller_access_order(uuid, uuid), public.can_consignor_access_order(uuid, uuid), public.can_manage_inbound(uuid), public.can_view_inbound(uuid), public.can_commerce_inbound(uuid), public.can_qc_inbound(uuid), public.can_stock_inbound(uuid), public.is_cd_manager(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_access_order(uuid, uuid) TO anon, authenticated;
GRANT ALL ON FUNCTION private.get_consignor_supplier_id(uuid), private.get_managed_store_ids(uuid), private.can_user_access_order(uuid, uuid), private.can_seller_access_order(uuid, uuid), private.can_consignor_access_order(uuid, uuid), private.can_manage_inbound(uuid), private.can_view_inbound(uuid), private.can_commerce_inbound(uuid), private.can_qc_inbound(uuid), private.can_stock_inbound(uuid), private.is_cd_manager(uuid), public.get_consignor_supplier_id(uuid), public.get_managed_store_ids(uuid), public.can_user_access_order(uuid, uuid), public.can_seller_access_order(uuid, uuid), public.can_consignor_access_order(uuid, uuid), public.can_manage_inbound(uuid), public.can_view_inbound(uuid), public.can_commerce_inbound(uuid), public.can_qc_inbound(uuid), public.can_stock_inbound(uuid), public.is_cd_manager(uuid) TO service_role;