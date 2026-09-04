import { useState, useMemo } from 'react';
import { Search, Plus, Pencil, Trash2, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAdminProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, ProductFormData as AdminProductFormData } from '@/hooks/useProductAdmin';
import { ProductFormData as DialogProductFormData } from '@/components/admin/ProductDialog';
import { SimpleProductDialog } from '@/components/admin/SimpleProductDialog';
import { DeleteProductDialog } from '@/components/admin/DeleteProductDialog';
import { Product } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Helper function to upload image to Supabase Storage
async function uploadImageToStorage(base64: string, filename: string): Promise<string> {
  if (base64.startsWith('http://') || base64.startsWith('https://')) {
    return base64;
  }

  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  
  let mimeType = 'image/jpeg';
  if (base64.includes('data:image/png')) {
    mimeType = 'image/png';
  } else if (base64.includes('data:image/webp')) {
    mimeType = 'image/webp';
  } else if (base64.includes('data:image/gif')) {
    mimeType = 'image/gif';
  }
  
  const blob = new Blob([byteArray], { type: mimeType });
  const extension = mimeType.split('/')[1];
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${filename.replace(/\.[^.]+$/, '')}.${extension}`;
  
  const { error } = await supabase.storage
    .from('product-images')
    .upload(uniqueName, blob, { contentType: mimeType });
    
  if (error) throw error;
  
  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(uniqueName);
    
  return data.publicUrl;
}

export default function SellerProducts() {
  const { data: products = [], isLoading, refetch } = useAdminProducts();
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();
  
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterVendor, setFilterVendor] = useState<string>('');
  
  const [simpleDialogOpen, setSimpleDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { uniqueTypes, uniqueVendors } = useMemo(() => {
    const types = [...new Set(products.map(p => p.product_type).filter(Boolean))] as string[];
    const vendors = [...new Set(products.map(p => p.vendor).filter(Boolean))] as string[];
    return { uniqueTypes: types, uniqueVendors: vendors };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.title.toLowerCase().includes(search.toLowerCase());
      const matchesType = !filterType || product.product_type === filterType;
      const matchesVendor = !filterVendor || product.vendor === filterVendor;
      return matchesSearch && matchesType && matchesVendor;
    });
  }, [products, search, filterType, filterVendor]);

  const hasActiveFilters = filterType || filterVendor;

  const clearFilters = () => {
    setFilterType('');
    setFilterVendor('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const handleCreate = () => {
    setSimpleDialogOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  const convertDialogToAdminFormat = async (data: DialogProductFormData): Promise<AdminProductFormData> => {
    const firstVariantPrice = data.variants[0]?.price;
    const price = typeof firstVariantPrice === 'string' 
      ? parseFloat(firstVariantPrice) || 0 
      : firstVariantPrice || 0;

    const processedImages: AdminProductFormData['images'] = [];
    
    for (const img of data.images) {
      if (img.base64) {
        try {
          const url = await uploadImageToStorage(img.base64, img.filename || 'image');
          processedImages.push({
            url,
            alt_text: undefined,
            position: img.position ?? processedImages.length,
          });
        } catch (error) {
          console.error('Error uploading image:', error);
          throw new Error('Falha ao fazer upload da imagem');
        }
      }
    }

    return {
      title: data.title,
      description: data.body,
      product_type: data.product_type,
      vendor: data.vendor,
      price,
      status: 'active',
      is_available: true,
      images: processedImages,
      variants: data.variants.map(v => ({
        title: [v.option1, v.option2].filter(Boolean).join(' / ') || 'Default',
        sku: v.sku,
        price: typeof v.price === 'string' ? parseFloat(v.price) || 0 : v.price || 0,
        option1: v.option1,
        option2: v.option2,
        inventory_quantity: v.inventory_quantity ?? 0,
        is_available: (v.inventory_quantity ?? 0) > 0 || v.inventory_policy === 'continue',
        inventory_policy: v.inventory_policy || 'deny',
      })),
      options: data.options.map((opt, index) => ({
        name: opt.name,
        values: opt.values,
        position: index,
      })),
    };
  };

  const handleSimpleSubmit = async (data: DialogProductFormData) => {
    try {
      setIsUploading(true);
      const adminData = await convertDialogToAdminFormat(data);
      await createProductMutation.mutateAsync(adminData);
      setSimpleDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar produto');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditSubmit = async (data: DialogProductFormData) => {
    try {
      setIsUploading(true);
      const adminData = await convertDialogToAdminFormat(data);
      if (selectedProduct) {
        await updateProductMutation.mutateAsync({ id: selectedProduct.id, data: adminData });
      }
      setEditDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar produto');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    await deleteProductMutation.mutateAsync(selectedProduct.id);
    setDeleteDialogOpen(false);
  };

  const getInitialFormData = (): DialogProductFormData | undefined => {
    if (!selectedProduct) return undefined;
    
    return {
      title: selectedProduct.title || '',
      body: selectedProduct.description || '',
      product_type: selectedProduct.product_type || '',
      vendor: selectedProduct.vendor || '',
      tags: '',
      fulfillment_type: 'in_stock' as const,
      dropship_lead_time: 7,
      dropship_message: '',
      variants: selectedProduct.variants?.map(v => ({
        price: String(v.price),
        sku: v.sku || '',
        option1: v.option1 || undefined,
        option2: v.option2 || undefined,
        inventory_quantity: v.inventory_quantity,
        inventory_policy: (v as any).inventory_policy || (v.is_available ? 'continue' : 'deny') as 'continue' | 'deny',
      })) || [{ price: String(selectedProduct.price), sku: '' }],
      options: selectedProduct.options?.map(opt => ({
        name: opt.name,
        values: opt.values,
      })) || [],
      images: selectedProduct.images?.map((img, index) => ({
        id: img.id,
        base64: img.url,
        filename: `image-${index}`,
        is_primary: index === 0,
        position: img.position,
      })) || [],
      videos: [],
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-light tracking-wide">Produtos</h1>
          <p className="text-sm text-muted-foreground font-light mt-1">
            Gerencie seus produtos
          </p>
        </div>
        <Button 
          onClick={handleCreate}
          className="bg-gold text-gold-foreground hover:bg-gold/90 font-light"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 font-light"
          />
        </div>

        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[140px] font-light">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {uniqueTypes.map((type) => (
                <SelectItem key={type} value={type} className="font-light">
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterVendor} onValueChange={setFilterVendor}>
            <SelectTrigger className="w-full sm:w-[140px] font-light">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Marca" />
            </SelectTrigger>
            <SelectContent>
              {uniqueVendors.map((vendor) => (
                <SelectItem key={vendor} value={vendor} className="font-light">
                  {vendor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearFilters}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-light text-xs tracking-[0.1em] uppercase w-16 hidden sm:table-cell"></TableHead>
              <TableHead className="font-light text-xs tracking-[0.1em] uppercase whitespace-nowrap">Produto</TableHead>
              <TableHead className="font-light text-xs tracking-[0.1em] uppercase whitespace-nowrap hidden md:table-cell">Tipo</TableHead>
              <TableHead className="font-light text-xs tracking-[0.1em] uppercase whitespace-nowrap hidden lg:table-cell">Marca</TableHead>
              <TableHead className="font-light text-xs tracking-[0.1em] uppercase whitespace-nowrap hidden sm:table-cell">Status</TableHead>
              <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-right whitespace-nowrap">Preço</TableHead>
              <TableHead className="font-light text-xs tracking-[0.1em] uppercase w-20 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground font-light">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const firstImage = product.images?.[0];
                
                return (
                  <TableRow key={product.id} className="hover:bg-muted/30">
                    <TableCell className="hidden sm:table-cell">
                      {firstImage ? (
                        <img 
                          src={firstImage.url} 
                          alt={firstImage.alt_text || product.title}
                          className="w-12 h-12 object-cover bg-muted"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{product.title}</TableCell>
                    <TableCell className="font-light text-muted-foreground hidden md:table-cell">
                      {product.product_type || '-'}
                    </TableCell>
                    <TableCell className="font-light text-muted-foreground hidden lg:table-cell">
                      {product.vendor || '-'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                        {product.status === 'active' ? 'Ativo' : product.status === 'draft' ? 'Rascunho' : 'Arquivado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">
                      {formatCurrency(product.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(product)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground font-light">
        {filteredProducts.length} {filteredProducts.length === 1 ? 'produto' : 'produtos'} encontrado{filteredProducts.length !== 1 ? 's' : ''}
        {hasActiveFilters && ` (filtrado de ${products.length} total)`}
      </div>

      {/* Simple Product Dialog (for creation) */}
      <SimpleProductDialog
        open={simpleDialogOpen}
        onOpenChange={setSimpleDialogOpen}
        onSubmit={handleSimpleSubmit}
      />

      {/* Edit Product Dialog */}
      <SimpleProductDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleEditSubmit}
        mode="edit"
        initialData={getInitialFormData()}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteProductDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        productTitle={selectedProduct?.title || ''}
        isDeleting={deleteProductMutation.isPending}
      />
    </div>
  );
}
