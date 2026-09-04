import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ProductFormData } from '@/components/admin/ProductDialog';

export function useProductManagement() {
  const [isLoading, setIsLoading] = useState(false);

  const handleTokenError = (errorMsg: string): boolean => {
    if (errorMsg.includes('TOKEN_') || errorMsg.includes('401') || errorMsg.includes('Invalid API key')) {
      toast.error('Token Shopify expirado', {
        description: 'Reconecte o Shopify em Configurações → Conectores para restaurar o acesso.',
      });
      return true;
    }
    return false;
  };

  const createProduct = async (data: ProductFormData) => {
    setIsLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('manage-product', {
        body: {
          action: 'create',
          product: data,
        },
      });

      if (error) {
        if (handleTokenError(error.message || '')) {
          throw new Error('Token Shopify expirado ou inválido');
        }
        throw new Error(error.message);
      }

      if (!response.success) {
        if (handleTokenError(response.error || '')) {
          throw new Error('Token Shopify expirado ou inválido');
        }
        throw new Error(response.error || 'Erro ao criar produto');
      }

      toast.success('Produto criado com sucesso!');
      return response.product;
    } catch (error) {
      console.error('Error creating product:', error);
      const errMsg = error instanceof Error ? error.message : '';
      if (!errMsg.includes('Token Shopify')) {
        toast.error('Erro ao criar produto', {
          description: errMsg || 'Tente novamente',
        });
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProduct = async (productId: number, data: ProductFormData) => {
    setIsLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('manage-product', {
        body: {
          action: 'update',
          productId,
          product: data,
        },
      });

      if (error) {
        if (handleTokenError(error.message || '')) {
          throw new Error('Token Shopify expirado ou inválido');
        }
        throw new Error(error.message);
      }

      if (!response.success) {
        if (handleTokenError(response.error || '')) {
          throw new Error('Token Shopify expirado ou inválido');
        }
        throw new Error(response.error || 'Erro ao atualizar produto');
      }

      toast.success('Produto atualizado com sucesso!');
      return response.product;
    } catch (error) {
      console.error('Error updating product:', error);
      const errMsg = error instanceof Error ? error.message : '';
      if (!errMsg.includes('Token Shopify')) {
        toast.error('Erro ao atualizar produto', {
          description: errMsg || 'Tente novamente',
        });
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProduct = async (productId: number) => {
    setIsLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('manage-product', {
        body: {
          action: 'delete',
          productId,
        },
      });

      if (error) {
        // Check for token-related errors
        const errorMsg = error.message || '';
        if (errorMsg.includes('TOKEN_') || errorMsg.includes('401') || errorMsg.includes('Invalid API key')) {
          toast.error('Token Shopify expirado', {
            description: 'Reconecte o Shopify em Configurações → Conectores para restaurar o acesso.',
          });
          throw new Error('Token Shopify expirado ou inválido');
        }
        throw new Error(error.message);
      }

      if (!response.success) {
        const respError = response.error || '';
        if (respError.includes('TOKEN_')) {
          toast.error('Token Shopify expirado', {
            description: 'Reconecte o Shopify em Configurações → Conectores para restaurar o acesso.',
          });
          throw new Error('Token Shopify expirado ou inválido');
        }
        throw new Error(respError || 'Erro ao excluir produto');
      }

      toast.success('Produto excluído com sucesso!');
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      const errMsg = error instanceof Error ? error.message : '';
      // Only show generic toast if not already shown
      if (!errMsg.includes('Token Shopify')) {
        toast.error('Erro ao excluir produto', {
          description: errMsg || 'Tente novamente',
        });
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
