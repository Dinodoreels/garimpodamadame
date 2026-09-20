# Remix of lojadamulherada

Vou adicionar a integração com Shopify ao prompt completo. Aqui está a versão atualizada:

---

# PROMPT COMPLETO: PRÍNCIPE IMPORTS (Lovable Cloud + Shopify)

## 🎯 Visão Geral do Projeto

Criar uma loja virtual premium de importados chamada "PRÍNCIPE IMPORTS" usando:
- **Lovable Cloud** para autenticação, pedidos, usuários e configurações
- **Shopify** para catálogo de produtos e checkout

---

## 🎨 Identidade Visual

- **Nome:** PRÍNCIPE IMPORTS
- **Slogan:** "Sua satisfação é nossa prioridade"
- **Cores:** Preto, dourado, branco
- **Estilo:** Luxo, premium, sofisticado
- **WhatsApp:** +55 11 99999-9999
- **Instagram:** @principeimports

---

## 📱 Estrutura de Páginas

### 1. Home (`/`)
- Hero com banner, título e botões CTA
- Produtos em destaque (do Shopify)
- Seção "Por que comprar conosco" (benefícios)
- CTA WhatsApp
- Badge Instagram

### 2. Catálogo (`/catalog`)
- Busca por nome de produto
- Ordenação (preço, nome, recentes)
- Grid responsivo de produtos (Shopify)
- Contador de resultados

### 3. Lançamentos (`/releases`)
- Produtos novos em destaque (Shopify)
- Seção de depoimentos
- Vídeo promocional

### 4. Sobre (`/about`)
- História da marca
- Valores e diferenciais

### 5. Contato (`/contact`)
- Formulário de contato
- Links WhatsApp
- Redes sociais

### 6. Detalhe do Produto (`/product/:handle`)
- Galeria de imagens com thumbnails
- Seletor de variantes (tamanho, cor)
- Ajuste de quantidade
- Botão "Adicionar ao Carrinho"
- Botão "Comprar via WhatsApp"
- Badge de disponibilidade
- Especificações técnicas

### 7. Carrinho (Drawer lateral)
- Lista de itens do carrinho
- Alterar quantidade
- Remover item
- Total calculado
- Botão "Finalizar Compra" → Checkout Shopify

### 8. Favoritos (`/favorites`) - Requer autenticação
- Lista de produtos favoritados
- Persistido no Lovable Cloud

### 9. Conta (`/account`) - Requer autenticação
- Dados do perfil
- Histórico de pedidos (do Lovable Cloud)
- Status e código de rastreio
- Logout

---

## 🔐 Autenticação (Lovable Cloud)

### Login (`/auth`)
- Email/senha
- Login com Google (OAuth)
- Link "Esqueci minha senha"

### Cadastro
- Nome completo
- Telefone
- Email
- Senha
- Aceite de termos

### Recuperação de Senha
- Envio de email de reset

### Validação
- Zod com mensagens em português
- Feedback visual de erros

---

## 🛠️ Painel Administrativo (`/admin`)

### Dashboard
- Estatísticas: vendas hoje/semana/mês
- Pedidos por status
- Usuários ativos

### Gráficos de Vendas (Recharts)
- **LineChart:** Tendência de vendas (30 dias)
- **BarChart:** Vendas por dia da semana
- **PieChart:** Distribuição de status dos pedidos

### Gestão de Pedidos
- Listar todos os pedidos
- Ver detalhes do pedido
- Alterar status (pendente → processando → enviado → entregue)
- Adicionar código de rastreio
- Badges coloridos por status

### Gestão de Usuários
- Listar usuários cadastrados
- Ver perfil e histórico
- Buscar por nome/email

### Configurações do Site
- Pares chave/valor para configurações dinâmicas

---

## 🛒 Integração Shopify

### Configuração
```typescript
const SHOPIFY_API_VERSION = '2025-07';
const SHOPIFY_STORE_PERMANENT_DOMAIN = '';
const SHOPIFY_STOREFRONT_TOKEN = '';
```

### Funcionalidades
- Buscar todos os produtos via Storefront API
- Buscar produto por handle
- Exibir variantes, preços, imagens
- Carrinho com Zustand (persistido em localStorage)
- Checkout via Cart Create Mutation
- URL de checkout com `channel=online_store`

### Hook de Produtos
```typescript
// src/hooks/useShopifyProducts.ts
useShopifyProducts(limit, searchQuery)
useShopifyProductByHandle(handle)
```

### Cart Store (Zustand)
```typescript
// src/stores/cartStore.ts
- items: CartItem[]
- addItem, updateQuantity, removeItem, clearCart
- createCheckout() → Shopify Checkout URL
- getTotalItems(), getTotalPrice()
```

### Componentes
- **ProductCard:** Imagem, título, preço, botão adicionar ao carrinho
- **CartDrawer:** Lista de itens, total, botão finalizar
- **ProductDetail:** Galeria, variantes, quantidade, adicionar ao carrinho

---

## 🗄️ Banco de Dados (Lovable Cloud)

### Tabelas

```sql
-- Perfis de usuário
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Roles de usuário
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  role TEXT NOT NULL, -- 'admin', 'customer'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pedidos (sincronizado manualmente ou via webhook)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  order_number TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  total DECIMAL(10,2),
  items JSONB,
  shipping_address JSONB,
  tracking_code TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Favoritos
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  product_handle TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_handle)
);

-- Configurações do site
CREATE TABLE site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Funções
- `handle_new_user()`: Trigger para criar perfil
- `generate_order_number()`: Gerar número único
- `is_admin(user_id)`: Verificar se é admin
- `has_role(user_id, role)`: Verificar role

### RLS (Row Level Security)
- Habilitado em todas as tabelas
- Usuários veem apenas seus dados
- Admins têm acesso total

---

## 🧩 Componentes Reutilizáveis

- **Header:** Logo, navegação, busca, carrinho, menu mobile
- **Footer:** Links, redes sociais, copyright
- **ProductCard:** Card de produto Shopify
- **CartDrawer:** Drawer lateral do carrinho
- **shadcn/ui:** Forms, Tabs, Cards, Badges, Dialogs, Selects, Skeletons

---

## 🎣 Hooks Customizados

| Hook | Função |
|------|--------|
| `useAuth` | Autenticação e sessão |
| `useShopifyProducts` | Produtos do Shopify |
| `useCartStore` | Estado do carrinho (Zustand) |
| `useOrders` | CRUD de pedidos |
| `useUserType` | Verificar tipo de usuário |
| `useSiteSettings` | Configurações do site |
| `useFavorites` | Favoritos do usuário |

---

## 🛠️ Tecnologias

- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- React Router DOM
- React Query (TanStack Query)
- Recharts (gráficos)
- Zustand (carrinho)
- Zod (validação)
- Lucide Icons
- Sonner (toasts)

---

## 📱 Responsividade

- Mobile-first
- Menu hamburger no mobile
- Grid adaptativo (1-4 colunas)
- Cart drawer responsivo

---

## 👤 Admin Padrão

- **Email:** dslfotos2@gmail.com
- **Role:** admin (inserido automaticamente no primeiro cadastro)

---

## ⚠️ Regras Importantes

1. **Produtos:** Sempre do Shopify, nunca mock data
2. **Checkout:** Sempre via Storefront API Cart Create
3. **Pedidos/Usuários:** Gerenciados no Lovable Cloud
4. **Favoritos:** Salvos no Lovable Cloud por `product_handle`
5. **Sem reviews falsos:** Não criar reviews fictícios

---

## 🔄 Fluxo de Compra

```
1. Usuário navega produtos (Shopify)
2. Adiciona ao carrinho (Zustand)
3. Clica "Finalizar Compra"
4. createCheckout() → Shopify Checkout URL
5. Abre checkout Shopify em nova aba
6. (Opcional) Webhook Shopify → Salva pedido no Lovable Cloud

logo da loja em anexo

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://garimpodamadame.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c11ae612-f464-4d54-bac7-129a84de80b0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
