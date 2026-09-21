import { useState, useMemo } from 'react';
import { Search, Plus, Pencil, Trash2, Filter, X, Loader2, GripVertical, Package, Tags, Truck, AlertCircle, Link2 } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAdminProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useReorderProducts, useToggleProductStatus, ProductFormData as AdminProductFormData } from '@/hooks/useProductAdmin';
import { ProductFormData as DialogProductFormData } from '@/components/admin/ProductDialog';
import { SimpleProductDialog } from '@/components/admin/SimpleProductDialog';
import { DeleteProductDialog } from '@/components/admin/DeleteProductDialog';
import { Product } from '@/hooks/useProducts';
import { StockDialog } from '@/components/admin/StockDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useProductCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, ProductCategory } from '@/hooks/useProductCategories';
import type { SizeType } from '@/hooks/useProductCategories';
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, Supplier } from '@/hooks/useSuppliers';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRealtimeInvalidator } from '@/hooks/useRealtimeInvalidator';
import { searchProducts } from '@/lib/productSearch';

// Helper function to upload image to Supabase Storage
async function uploadImageToStorage(base64: string, filename: string): Promise<string> {
  // Check if it's already a valid URL
  if (base64.startsWith('http://') || base64.startsWith('https://')) {
    return base64;
  }

  // Remove data URL prefix if present
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  
  // Convert base64 to blob
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  
  // Detect image type from base64 header or default to jpeg
  let mimeType = 'image/jpeg';
  if (base64.includes('data:image/png')) {
    mimeType = 'image/png';
  } else if (base64.includes('data:image/webp')) {
    mimeType = 'image/webp';
  } else if (base64.includes('data:image/gif')) {
    mimeType = 'image/gif';
  }
  
  const blob = new Blob([byteArray], { type: mimeType });
  
  // Generate unique filename
  const extension = mimeType.split('/')[1];
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${filename.replace(/\.[^.]+$/, '')}.${extension}`;
  
  // Upload to storage
  const { error } = await supabase.storage
    .from('product-images')
    .upload(uniqueName, blob, { contentType: mimeType });
    
  if (error) throw error;
  
  // Get public URL
  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(uniqueName);
    
  return data.publicUrl;
}

function ChannelBadges({ product }: { product: Product }) {
  const publication = product.marketplace_publications?.[0];
  const blingLink = product.bling_links?.[0];
  const pendingFields = publication?.pending_fields ?? [];
  const missingPhysicalData = pendingFields.some((field) => field === 'weight' || field === 'dimensions' || field === 'weight dimensions');
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {blingLink?.bling_product_id ? <Badge variant="outline" className="gap-1"><Link2 className="h-3 w-3" />Enviado ao Bling</Badge> : <Badge variant="outline">Aguardando Bling</Badge>}
      {publication?.status === 'published' || product.tiktok_links?.some((link) => link.status === 'synced') ? (
        <Badge variant="secondary">TikTok publicado</Badge>
      ) : publication?.status === 'error' || product.tiktok_links?.some((link) => link.status === 'error') ? (
        <Badge variant="destructive">TikTok com erro</Badge>
      ) : pendingFields.includes('confirmation') ? (
        <Badge variant="outline">TikTok: confirmar dados</Badge>
      ) : missingPhysicalData ? (
        <Badge variant="outline">TikTok: falta peso e medidas</Badge>
      ) : pendingFields.includes('tiktok_category') ? (
        <Badge variant="outline">TikTok: falta categoria</Badge>
      ) : (
        <Badge variant="outline">TikTok não enviado</Badge>
      )}
    </div>
  );
}

// Sortable row component for desktop table
function SortableProductRow({ product, formatCurrency, handleEdit, handleDeleteClick, onStockClick, onStatusChange, statusUpdating }: {
  product: Product;
  formatCurrency: (n: number) => string;
  handleEdit: (p: Product) => void;
  handleDeleteClick: (p: Product) => void;
  onStockClick: (p: Product) => void;
  onStatusChange: (p: Product, active: boolean) => void;
  statusUpdating: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const firstImage = product.images?.[0];
  const totalStock = (product.variants || []).reduce((sum, v) => sum + v.inventory_quantity, 0);

  return (
    <TableRow ref={setNodeRef} style={style} className="hover:bg-muted/30">
      <TableCell className="w-8 px-1">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell>
        {firstImage ? (
          <img src={firstImage.url} alt={firstImage.alt_text || product.title} className="w-12 h-12 object-cover bg-muted" />
        ) : (
          <div className="w-12 h-12 bg-muted" />
        )}
      </TableCell>
      <TableCell className="font-medium max-w-[200px]">
        <span className="block truncate">{product.title}</span>
        <ChannelBadges product={product} />
      </TableCell>
      <TableCell className="font-light text-muted-foreground">{product.product_type || '-'}</TableCell>
      <TableCell className="font-light text-muted-foreground hidden lg:table-cell">{product.vendor || '-'}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch
            checked={product.status === 'active'}
            disabled={statusUpdating}
            onCheckedChange={(active) => onStatusChange(product, active)}
            aria-label={`${product.status === 'active' ? 'Desativar' : 'Ativar'} ${product.title}`}
          />
          <span className="text-xs whitespace-nowrap">{product.status === 'active' ? 'Ativo' : 'Inativo'}</span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <button onClick={() => onStockClick(product)} className="inline-flex items-center gap-1 hover:text-primary transition-colors">
          <Badge variant={totalStock > 0 ? 'outline' : 'destructive'} className="cursor-pointer">
            {totalStock}
          </Badge>
        </button>
      </TableCell>
      <TableCell className="text-right font-medium whitespace-nowrap">{formatCurrency(product.price)}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(product)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteClick(product)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function Products() {
  const { data: products = [], isLoading, refetch } = useAdminProducts();
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();
  const reorderMutation = useReorderProducts();
  const toggleStatusMutation = useToggleProductStatus();
  const { data: categories = [], isLoading: categoriesLoading } = useProductCategories();
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const { data: suppliers = [] } = useSuppliers();
  const createSupplierMutation = useCreateSupplier();
  const updateSupplierMutation = useUpdateSupplier();
  const deleteSupplierMutation = useDeleteSupplier();
  
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterVendor, setFilterVendor] = useState<string>('');
  const [filterSupplier, setFilterSupplier] = useState<string>('');
  const [filterConsignment, setFilterConsignment] = useState<string>('');
  const [filterLote, setFilterLote] = useState<string>('');
  const [packagingOnly, setPackagingOnly] = useState(false);
  const [focusPackaging, setFocusPackaging] = useState(false);
  
  // Product management state
  const [simpleDialogOpen, setSimpleDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  useRealtimeInvalidator(['products', 'product_variants', 'product_images', 'bling_product_links', 'tiktok_product_links'], ['admin-products']);
  const focusedProductId = new URLSearchParams(window.location.search).get('product');

  const handleStatusChange = (product: Product, active: boolean) => {
    toggleStatusMutation.mutate({ id: product.id, active });
  };

  // Category management state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [categoryLabel, setCategoryLabel] = useState('');
  const [categoryValue, setCategoryValue] = useState('');
  const [categoryHasSizes, setCategoryHasSizes] = useState(false);
  const [categorySizeType, setCategorySizeType] = useState<SizeType>('none');
  const [categoryTracksExpiry, setCategoryTracksExpiry] = useState(false);
  const [categoryExpiryAlertDays, setCategoryExpiryAlertDays] = useState(60);

  // Supplier management state
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [supplierContact, setSupplierContact] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierType, setSupplierType] = useState<'own' | 'consignment'>('own');
  const [supplierNotes, setSupplierNotes] = useState('');
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const canReorder = !search && !filterType && !filterVendor && !filterSupplier && !filterConsignment;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = products.findIndex(p => p.id === active.id);
    const newIndex = products.findIndex(p => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(products, oldIndex, newIndex);
    reorderMutation.mutate(newOrder.map(p => p.id));
  };

  // Extract unique vendors for filter (Tipo agora usa product_categories oficial)
  const { uniqueVendors } = useMemo(() => {
    const vendors = [...new Set(products.map(p => p.vendor).filter(Boolean))] as string[];
    return { uniqueVendors: vendors };
  }, [products]);

  // Conjunto de valores oficiais de categoria
  const categoryValues = useMemo(
    () => new Set(categories.map((c) => c.value)),
    [categories]
  );

  // Quantos produtos não têm categoria oficial atribuída
  const productsWithoutCategory = useMemo(
    () => products.filter((p) => !p.product_type || !categoryValues.has(p.product_type)),
    [products, categoryValues]
  );
  const productsWithoutPackaging = useMemo(
    () => products.filter((product) => {
      const packageFields = product as Product & { weight_grams?: number | null; length_cm?: number | null; width_cm?: number | null; height_cm?: number | null };
      return product.status === 'active' && [packageFields.weight_grams, packageFields.length_cm, packageFields.width_cm, packageFields.height_cm].some(value => Number(value) <= 0);
    }),
    [products],
  );

  const filteredProducts = useMemo(() => {
    return searchProducts(products, search).filter((product) => {
      if (focusedProductId && product.id !== focusedProductId) return false;
      if (packagingOnly && !productsWithoutPackaging.some(item => item.id === product.id)) return false;
      let matchesType = true;
      if (filterType === '__none__') {
        matchesType = !product.product_type || !categoryValues.has(product.product_type);
      } else if (filterType) {
        matchesType = product.product_type === filterType;
      }
      const matchesVendor = !filterVendor || product.vendor === filterVendor;
      const matchesSupplier = !filterSupplier || (product as any).supplier_id === filterSupplier;
      const matchesConsignment = !filterConsignment ||
        (filterConsignment === 'consignment' ? (product as any).is_consignment === true : (product as any).is_consignment !== true);
      const matchesLote = !filterLote ||
        (filterLote === 'lote' ? (product as any).is_lote === true : (product as any).is_lote !== true);
      return matchesType && matchesVendor && matchesSupplier && matchesConsignment && matchesLote;
    });
  }, [products, search, filterType, filterVendor, filterSupplier, filterConsignment, filterLote, categoryValues, focusedProductId, packagingOnly, productsWithoutPackaging]);

  const hasActiveFilters = filterType || filterVendor || filterSupplier || filterConsignment || filterLote || packagingOnly;

  const clearFilters = () => {
    setFilterType('');
    setFilterVendor('');
    setFilterSupplier('');
    setFilterConsignment('');
    setFilterLote('');
    setPackagingOnly(false);
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
    setFocusPackaging(false);
    setSelectedProduct(product);
    setEditDialogOpen(true);
  };

  const handlePackagingEdit = (product: Product) => {
    setFocusPackaging(true);
    setSelectedProduct(product);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleStockClick = (product: Product) => {
    setStockProduct(product);
    setStockDialogOpen(true);
  };

  // Simple dialog submit (for creation)
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

  // Convert from dialog format to admin API format (with image uploads)
  const convertDialogToAdminFormat = async (data: DialogProductFormData): Promise<AdminProductFormData> => {
    const firstVariantPrice = data.variants[0]?.price;
    const firstVariantCost = data.variants[0]?.cost ?? 0;
    const rawPrice = typeof firstVariantPrice === 'string' 
      ? parseFloat(firstVariantPrice) || 0 
      : firstVariantPrice || 0;
    // Ensure price is never accidentally set to cost value
    const price = rawPrice > 0 ? rawPrice : 0;

    // Upload images to storage and get public URLs
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
      manufacturer: data.manufacturer,
      ncm: data.ncm,
      cest: data.cest,
      fiscal_origin: data.fiscal_origin,
      condition: data.condition,
      warranty_months: data.warranty_months,
      marketplace_attributes: data.marketplace_attributes,
      suggestions_confirmed: data.suggestions_confirmed,
      weight_grams: data.weight_grams,
      length_cm: data.length_cm,
      width_cm: data.width_cm,
      height_cm: data.height_cm,
      price,
      compare_at_price: data.compare_at_price ? parseFloat(data.compare_at_price) || undefined : undefined,
      status: 'active',
      is_available: true,
      expiry_date: data.expiry_date || null,
      is_lote: !!data.is_lote,
      images: processedImages,
      variants: data.variants.map(v => ({
        title: [v.option1, v.option2].filter(Boolean).join(' / ') || 'Default',
        sku: v.sku,
        gtin: v.gtin,
        price: typeof v.price === 'string' ? parseFloat(v.price) || 0 : v.price || 0,
        compare_at_price: data.compare_at_price ? parseFloat(data.compare_at_price) || undefined : undefined,
        cost: v.cost ?? 0,
        option1: v.option1,
        option2: v.option2,
        inventory_quantity: v.inventory_quantity ?? 0,
        is_available: (v.inventory_quantity ?? 0) > 0 || v.inventory_policy === 'continue',
        inventory_policy: v.inventory_policy || 'deny',
        volume_ml: v.volume_ml ?? null,
        expiry_date: v.expiry_date || null,
      })),
      options: data.options.map((opt, index) => ({
        name: opt.name,
        values: opt.values,
        position: index,
      })),
    };
  };

  // Edit dialog submit (for editing existing products)
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

  const openCategoryDialog = (cat?: ProductCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryLabel(cat.label);
      setCategoryValue(cat.value);
      setCategoryHasSizes(cat.has_sizes);
      setCategorySizeType((cat.size_type as SizeType) || (cat.has_sizes ? 'clothing' : 'none'));
      setCategoryTracksExpiry(!!cat.tracks_expiry);
      setCategoryExpiryAlertDays(cat.expiry_alert_days ?? 60);
    } else {
      setEditingCategory(null);
      setCategoryLabel('');
      setCategoryValue('');
      setCategoryHasSizes(false);
      setCategorySizeType('none');
      setCategoryTracksExpiry(false);
      setCategoryExpiryAlertDays(60);
    }
    setCategoryDialogOpen(true);
  };

  const handleCategoryLabelChange = (val: string) => {
    setCategoryLabel(val);
    if (!editingCategory) {
      setCategoryValue(val.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, ''));
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryLabel.trim() || !categoryValue.trim()) {
      toast.error('Preencha nome e valor');
      return;
    }
    const position = editingCategory ? editingCategory.position : categories.length;
    const has_sizes = categorySizeType !== 'none';
    if (editingCategory) {
      await updateCategoryMutation.mutateAsync({
        id: editingCategory.id,
        label: categoryLabel,
        value: categoryValue,
        has_sizes,
        size_type: categorySizeType,
        tracks_expiry: categoryTracksExpiry,
        expiry_alert_days: categoryExpiryAlertDays,
      });
    } else {
      await createCategoryMutation.mutateAsync({
        label: categoryLabel,
        value: categoryValue,
        has_sizes,
        size_type: categorySizeType,
        position,
        tracks_expiry: categoryTracksExpiry,
        expiry_alert_days: categoryExpiryAlertDays,
      });
    }
    setCategoryDialogOpen(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    await deleteCategoryMutation.mutateAsync(id);
  };

  const openSupplierDialog = (s?: Supplier) => {
    if (s) {
      setEditingSupplier(s);
      setSupplierName(s.name);
      setSupplierContact(s.contact_name || '');
      setSupplierPhone(s.phone || '');
      setSupplierEmail(s.email || '');
      setSupplierType(s.type as 'own' | 'consignment');
      setSupplierNotes(s.notes || '');
    } else {
      setEditingSupplier(null);
      setSupplierName('');
      setSupplierContact('');
      setSupplierPhone('');
      setSupplierEmail('');
      setSupplierType('own');
      setSupplierNotes('');
    }
    setSupplierDialogOpen(true);
  };

  const handleSaveSupplier = async () => {
    if (!supplierName.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (editingSupplier) {
      await updateSupplierMutation.mutateAsync({
        id: editingSupplier.id,
        name: supplierName,
        contact_name: supplierContact || null,
        phone: supplierPhone || null,
        email: supplierEmail || null,
        type: supplierType,
        notes: supplierNotes || null,
      });
    } else {
      await createSupplierMutation.mutateAsync({
        name: supplierName,
        contact_name: supplierContact || null,
        phone: supplierPhone || null,
        email: supplierEmail || null,
        type: supplierType,
        notes: supplierNotes || null,
      });
    }
    setSupplierDialogOpen(false);
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return;
    await deleteSupplierMutation.mutateAsync(id);
  };

  const getInitialFormData = (): DialogProductFormData | undefined => {
    if (!selectedProduct) return undefined;
    
    return {
      id: selectedProduct.id,
      title: selectedProduct.title || '',
      body: selectedProduct.description || '',
      product_type: selectedProduct.product_type || '',
      vendor: selectedProduct.vendor || '',
      manufacturer: selectedProduct.manufacturer || '',
      ncm: selectedProduct.ncm || '',
      cest: selectedProduct.cest || '',
      fiscal_origin: selectedProduct.fiscal_origin ?? null,
      condition: selectedProduct.condition || 'new',
      warranty_months: selectedProduct.warranty_months ?? null,
      marketplace_attributes: (selectedProduct.marketplace_attributes && typeof selectedProduct.marketplace_attributes === 'object' && !Array.isArray(selectedProduct.marketplace_attributes)
        ? selectedProduct.marketplace_attributes
        : {}) as Record<string, string>,
      suggestions_confirmed: Boolean(selectedProduct.suggestions_confirmed_at),
      weight_grams: (selectedProduct as any).weight_grams ?? undefined,
      length_cm: (selectedProduct as any).length_cm ?? undefined,
      width_cm: (selectedProduct as any).width_cm ?? undefined,
      height_cm: (selectedProduct as any).height_cm ?? undefined,
      tags: '',
      fulfillment_type: 'in_stock' as const,
      dropship_lead_time: 7,
      dropship_message: '',
      is_lote: (selectedProduct as any).is_lote === true,
      compare_at_price: selectedProduct.compare_at_price ? String(selectedProduct.compare_at_price) : '',
      variants: selectedProduct.variants?.map(v => ({
        price: String(v.price),
        sku: v.sku || '',
        gtin: v.gtin || '',
        cost: v.cost ?? 0,
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
      <div>
        <h1 className="text-xl md:text-2xl font-light tracking-wide">Produtos</h1>
        <p className="text-sm text-muted-foreground font-light mt-1">
          Gerencie seus produtos, categorias e fornecedores
        </p>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList>
          <TabsTrigger value="products" className="font-light">
            <Package className="h-4 w-4 mr-2" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="categories" className="font-light">
            <Tags className="h-4 w-4 mr-2" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="font-light">
            <Truck className="h-4 w-4 mr-2" />
            Fornecedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          {productsWithoutCategory.length > 0 && filterType !== '__none__' && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {productsWithoutCategory.length} {productsWithoutCategory.length === 1 ? 'produto sem categoria' : 'produtos sem categoria'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Categorias ajudam clientes a encontrar produtos no catálogo. Atribua uma agora.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterType('__none__')}
                className="shrink-0"
              >
                Filtrar
              </Button>
            </div>
          )}

          {productsWithoutPackaging.length > 0 && !packagingOnly && (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-center">
              <Package className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{productsWithoutPackaging.length} produto{productsWithoutPackaging.length === 1 ? '' : 's'} sem peso ou dimensões</p>
                <p className="text-xs text-muted-foreground">Frete, etiqueta e publicação ficam bloqueados até informar as medidas reais.</p>
              </div>
              <Button variant="outline" size="sm" onClick={()=>setPackagingOnly(true)}>Ver pendências</Button>
              {productsWithoutPackaging.slice(0,1).map(product=><Button key={product.id} size="sm" onClick={()=>handlePackagingEdit(product)}>Corrigir agora</Button>)}
            </div>
          )}

          <div className="flex justify-end">
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
            placeholder="Buscar por nome, SKU, código, marca ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 font-light"
          />
        </div>

        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[180px] font-light">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.value} className="font-light">
                  {cat.label}
                </SelectItem>
              ))}
              {productsWithoutCategory.length > 0 && (
                <SelectItem value="__none__" className="font-light text-destructive">
                  Sem categoria ({productsWithoutCategory.length})
                </SelectItem>
              )}
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

          <Select value={filterSupplier} onValueChange={setFilterSupplier}>
            <SelectTrigger className="w-full sm:w-[160px] font-light">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Fornecedor" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id} className="font-light">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterLote} onValueChange={setFilterLote}>
            <SelectTrigger className="w-full sm:w-[140px] font-light">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Lote" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lote" className="font-light">Só lotes</SelectItem>
              <SelectItem value="not_lote" className="font-light">Sem lote</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterConsignment} onValueChange={setFilterConsignment}>
            <SelectTrigger className="w-full sm:w-[140px] font-light">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="own" className="font-light">Próprio</SelectItem>
              <SelectItem value="consignment" className="font-light">Consignado</SelectItem>
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

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground font-light border border-border">
            Nenhum produto encontrado
          </div>
        ) : (
          filteredProducts.map((product) => {
            const firstImage = product.images?.[0];
            return (
              <div key={product.id} className="border border-border p-3 flex gap-3">
                {firstImage ? (
                  <img
                    src={firstImage.url}
                    alt={firstImage.alt_text || product.title}
                    className="w-12 h-12 object-cover bg-muted shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="font-medium truncate">{product.title}</p><ChannelBadges product={product} /></div>
                    <span className="font-medium whitespace-nowrap text-sm">{formatCurrency(product.price)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground truncate">
                      {[product.product_type, product.vendor].filter(Boolean).join(' | ') || '-'}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Switch
                        checked={product.status === 'active'}
                        disabled={toggleStatusMutation.isPending}
                        onCheckedChange={(active) => handleStatusChange(product, active)}
                        aria-label={`${product.status === 'active' ? 'Desativar' : 'Ativar'} ${product.title}`}
                      />
                      <span className="text-[10px]">{product.status === 'active' ? 'Ativo' : 'Inativo'}</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-1 mt-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(product)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteClick(product)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block border border-border overflow-x-auto">
        {canReorder && (
          <p className="text-xs text-muted-foreground px-4 py-2 border-b border-border bg-muted/30">
            <GripVertical className="h-3 w-3 inline mr-1" />
            Arraste para reordenar os produtos. Limpe os filtros para reordenar.
          </p>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {canReorder && <TableHead className="w-8"></TableHead>}
                <TableHead className="font-light text-xs tracking-[0.1em] uppercase w-16"></TableHead>
                <TableHead className="font-light text-xs tracking-[0.1em] uppercase whitespace-nowrap">Produto</TableHead>
                <TableHead className="font-light text-xs tracking-[0.1em] uppercase whitespace-nowrap">Tipo</TableHead>
                <TableHead className="font-light text-xs tracking-[0.1em] uppercase whitespace-nowrap hidden lg:table-cell">Marca</TableHead>
                <TableHead className="font-light text-xs tracking-[0.1em] uppercase whitespace-nowrap">Status</TableHead>
                <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-center whitespace-nowrap">Estoque</TableHead>
                <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-right whitespace-nowrap">Preço</TableHead>
                <TableHead className="font-light text-xs tracking-[0.1em] uppercase w-20 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <SortableContext items={filteredProducts.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canReorder ? 10 : 9} className="text-center py-12 text-muted-foreground font-light">
                      Nenhum produto encontrado
                    </TableCell>
                  </TableRow>
                ) : canReorder ? (
                  filteredProducts.map((product) => (
                    <SortableProductRow
                      key={product.id}
                      product={product}
                      formatCurrency={formatCurrency}
                      handleEdit={handleEdit}
                      handleDeleteClick={handleDeleteClick}
                      onStockClick={handleStockClick}
                      onStatusChange={handleStatusChange}
                      statusUpdating={toggleStatusMutation.isPending}
                    />
                  ))
                ) : (
                  filteredProducts.map((product) => {
                    const firstImage = product.images?.[0];
                    return (
                      <TableRow key={product.id} className="hover:bg-muted/30">
                        <TableCell>
                          {firstImage ? (
                            <img src={firstImage.url} alt={firstImage.alt_text || product.title} className="w-12 h-12 object-cover bg-muted" />
                          ) : (
                            <div className="w-12 h-12 bg-muted" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px]"><span className="block truncate">{product.title}</span><ChannelBadges product={product} /></TableCell>
                        <TableCell className="font-light text-muted-foreground">{product.product_type || '-'}</TableCell>
                        <TableCell className="font-light text-muted-foreground hidden lg:table-cell">{product.vendor || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={product.status === 'active'}
                              disabled={toggleStatusMutation.isPending}
                              onCheckedChange={(active) => handleStatusChange(product, active)}
                              aria-label={`${product.status === 'active' ? 'Desativar' : 'Ativar'} ${product.title}`}
                            />
                            <span className="text-xs whitespace-nowrap">{product.status === 'active' ? 'Ativo' : 'Inativo'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const totalStock = (product.variants || []).reduce((sum, v) => sum + v.inventory_quantity, 0);
                            return (
                              <button onClick={() => handleStockClick(product)} className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                                <Badge variant={totalStock > 0 ? 'outline' : 'destructive'} className="cursor-pointer">
                                  {totalStock}
                                </Badge>
                              </button>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap">{formatCurrency(product.price)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(product)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteClick(product)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </SortableContext>
          </Table>
        </DndContext>
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground font-light">
        {filteredProducts.length} {filteredProducts.length === 1 ? 'produto' : 'produtos'} encontrado{filteredProducts.length !== 1 ? 's' : ''}
        {hasActiveFilters && ` (filtrado de ${products.length} total)`}
      </div>

        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => openCategoryDialog()} className="bg-gold text-gold-foreground hover:bg-gold/90 font-light">
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </div>

          <div className="border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase">Nome</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase">Valor</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-center">Usa Tamanhos</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-right w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground font-light">
                      Nenhuma categoria cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.label}</TableCell>
                      <TableCell className="text-muted-foreground font-light">{cat.value}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={cat.has_sizes ? 'default' : 'secondary'}>
                          {cat.has_sizes ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openCategoryDialog(cat)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteCategory(cat.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => openSupplierDialog()} className="bg-gold text-gold-foreground hover:bg-gold/90 font-light">
              <Plus className="h-4 w-4 mr-2" />
              Novo Fornecedor
            </Button>
          </div>

          <div className="border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase">Nome</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase">Contato</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase">Telefone</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-center">Tipo</TableHead>
                  <TableHead className="font-light text-xs tracking-[0.1em] uppercase text-right w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-light">
                      Nenhum fornecedor cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground font-light">{s.contact_name || '-'}</TableCell>
                      <TableCell className="text-muted-foreground font-light">{s.phone || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={s.type === 'consignment' ? 'default' : 'secondary'}>
                          {s.type === 'consignment' ? 'Consignação' : 'Próprio'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openSupplierDialog(s)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteSupplier(s.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-light">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-light">Nome</Label>
              <Input value={categoryLabel} onChange={(e) => handleCategoryLabelChange(e.target.value)} placeholder="Ex: Saias" className="font-light" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-light">Valor (identificador)</Label>
              <Input value={categoryValue} onChange={(e) => setCategoryValue(e.target.value.toUpperCase())} placeholder="Ex: SAIAS" className="font-light" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-light">Tipo de numeração</Label>
              <Select value={categorySizeType} onValueChange={(v) => { setCategorySizeType(v as SizeType); setCategoryHasSizes(v !== 'none'); }}>
                <SelectTrigger className="font-light">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem tamanho</SelectItem>
                  <SelectItem value="clothing">👕 Roupa (PP, P, M, G…)</SelectItem>
                  <SelectItem value="shoes">👟 Calçado (33–48)</SelectItem>
                  <SelectItem value="pants">👖 Calça (36–62)</SelectItem>
                  <SelectItem value="volume_ml">🧴 Volume em ml (perfumes, cremes, batons)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-3">
                <Switch checked={categoryTracksExpiry} onCheckedChange={setCategoryTracksExpiry} />
                <Label className="text-sm font-light">Controla validade</Label>
              </div>
              {categoryTracksExpiry && (
                <div className="space-y-1 pt-1">
                  <Label className="text-xs font-light text-muted-foreground">Avisar quantos dias antes de vencer</Label>
                  <Input
                    type="number"
                    min={1}
                    value={categoryExpiryAlertDays}
                    onChange={(e) => setCategoryExpiryAlertDays(parseInt(e.target.value) || 60)}
                    className="font-light"
                  />
                  <p className="text-[10px] text-muted-foreground">Produtos vencidos ficam indisponíveis automaticamente.</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)} className="font-light">Cancelar</Button>
            <Button onClick={handleSaveCategory} className="bg-gold text-gold-foreground hover:bg-gold/90 font-light" disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}>
              {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Dialog */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-light">{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-light">Nome *</Label>
              <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Nome do fornecedor" className="font-light" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-light">Tipo</Label>
              <Select value={supplierType} onValueChange={(v: 'own' | 'consignment') => setSupplierType(v)}>
                <SelectTrigger className="font-light">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="own">Próprio</SelectItem>
                  <SelectItem value="consignment">Consignação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-light">Contato</Label>
              <Input value={supplierContact} onChange={(e) => setSupplierContact(e.target.value)} placeholder="Nome do contato" className="font-light" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-light">Telefone</Label>
                <Input value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} placeholder="(00) 00000-0000" className="font-light" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-light">Email</Label>
                <Input value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} placeholder="email@..." className="font-light" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierDialogOpen(false)} className="font-light">Cancelar</Button>
            <Button onClick={handleSaveSupplier} className="bg-gold text-gold-foreground hover:bg-gold/90 font-light" disabled={createSupplierMutation.isPending || updateSupplierMutation.isPending}>
              {(createSupplierMutation.isPending || updateSupplierMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        focusPackaging={focusPackaging}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteProductDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        productTitle={selectedProduct?.title || ''}
        isDeleting={deleteProductMutation.isPending}
      />

      {/* Stock Dialog */}
      <StockDialog
        open={stockDialogOpen}
        onOpenChange={setStockDialogOpen}
        product={stockProduct}
      />
    </div>
  );
}
