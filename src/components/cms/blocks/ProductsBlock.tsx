 import { useProducts } from '@/hooks/useProducts';
 import { ProductSection } from '@/components/home/ProductSection';
 
 interface ProductsBlockProps {
   content: {
     title?: string;
     subtitle?: string;
     filter?: 'all' | 'new' | 'promo';
     limit?: number;
   };
 }
 
 export function ProductsBlock({ content }: ProductsBlockProps) {
   const { data: products, isLoading } = useProducts();
 
   const filteredProducts = (() => {
     if (!products) return [];
     const limit = content.limit || 8;
     let filtered = [...products];
     
     if (content.filter === 'promo') {
       filtered = filtered.filter(p => p.compare_at_price && p.compare_at_price > p.price);
     } else if (content.filter === 'new') {
       // Sort by created_at descending
       filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
     }
     
     return filtered.slice(0, limit);
   })();
 
   return (
     <ProductSection
       title={content.title || 'Produtos'}
       subtitle={content.subtitle}
       products={filteredProducts}
       isLoading={isLoading}
     />
   );
 }