Promover o usuário `madamedoluar4@gmail.com` para administrador.

## O que será feito

1. Buscar o `id` do usuário em `auth.users` pelo email.
2. Inserir registro em `public.user_roles` com `role = 'admin'` (com `ON CONFLICT DO NOTHING` para evitar duplicidade).

## Pré-requisito

O usuário precisa já ter feito cadastro (existir em `auth.users`). Se ainda não cadastrou, o passo falhará — nesse caso, ele deve criar conta primeiro em `/auth` e eu rodo de novo.

## SQL

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE email = 'madamedoluar4@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
```
