# Tornar madamedoluar4@gmail.com administrador

## O que muda

A conta `madamedoluar4@gmail.com` passa a ter acesso de administrador ao painel da loja (produtos, pedidos, financeiro, configurações e integrações).

Hoje essa conta existe, mas não tem nenhuma função atribuída — por isso o painel fica bloqueado para ela.

## Como será feito

Uma alteração no banco de dados adiciona a função `admin` para o usuário `d36dd0bc-57fb-483e-87fd-caf78a94faa2` na tabela de funções (`public.user_roles`), sem duplicar caso já exista:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('d36dd0bc-57fb-483e-87fd-caf78a94faa2', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

Nenhum arquivo do site é alterado.

## Depois

Basta sair e entrar de novo com essa conta para o menu de administração aparecer.
