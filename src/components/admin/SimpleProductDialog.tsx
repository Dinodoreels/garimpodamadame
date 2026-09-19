import { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, ImagePlus, X, ChevronDown, Sparkles, Package, Truck, Plus, Minus, Video, ChevronLeft, ChevronRight, Maximize2, ArrowLeft, Trash2, Calculator, Music2, Search, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ImageData, ProductFormData } from './ProductDialog';
import { useProductCategories, useCreateCategory, useDeleteCategory, SizeType } from '@/hooks/useProductCategories';
import { useProductColors, useCreateColor, useDeleteColor } from '@/hooks/useProductColors';
import { useSuppliers, useCreateSupplier } from '@/hooks/useSuppliers';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PricingCalculator } from '@/components/admin/PricingCalculator';

const CLOTHING_SIZES = ['PP', 'P', 'M', 'G', 'GG', '2GG', '3GG', '4GG', '5GG', '6GG', '7GG', 'XG', 'XGG', 'EXG', 'ÚNICO'];
const PLUS_SIZES = ['46', '48', '50', '52', '54', '56', '58', '60', '62', '64', '66', '68'];
const PANTS_SIZES = ['36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58', '60', '62'];
const SHOE_SIZES_BR = ['33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48'];
const SHOE_SIZES_US = ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13', '14'];
const SHOE_SIZES_EU = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50'];
const VOLUME_ML_SIZES = ['10ml', '15ml', '30ml', '50ml', '75ml', '100ml', '150ml', '200ml', '250ml', '500ml'];

type MediaItem = {
  id: string;
  file?: File;
  preview: string;
  type: 'image' | 'video';
  isExisting?: boolean;
};

type AutoFillSuggestions = {
  title?: string | null;
  description?: string | null;
  product_type?: string | null;
  vendor?: string | null;
  manufacturer?: string | null;
  gtin?: string | null;
  price?: number | null;
  cost?: number | null;
  weight_grams?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  colors?: string[];
  sizes?: string[];
  images?: string[];
};

type TikTokCategory = {
  id: string;
  name: string;
  is_leaf: boolean;
  required_attributes: Array<Record<string, unknown>>;
};

interface SimpleProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProductFormData) => Promise<void>;
  mode?: 'create' | 'edit';
  initialData?: ProductFormData;
}

export function SimpleProductDialog({ 
  open, 
  onOpenChange, 
  onSubmit,
  mode = 'create',
  initialData,
}: SimpleProductDialogProps) {
  const { data: categories = [] } = useProductCategories();
  const createCategoryMutation = useCreateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const { data: productColors = [] } = useProductColors();
  const createColorMutation = useCreateColor();
  const deleteColorMutation = useDeleteColor();
  const { data: suppliers = [] } = useSuppliers();
  const createSupplierMutation = useCreateSupplier();
  const [newCatDialogOpen, setNewCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSizeType, setNewCatSizeType] = useState<SizeType>('none');
  const [newCatTracksExpiry, setNewCatTracksExpiry] = useState(false);
  const [newCatExpiryAlertDays, setNewCatExpiryAlertDays] = useState(60);
  const [newColorDialogOpen, setNewColorDialogOpen] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');
  const [supplierId, setSupplierId] = useState('');
  const [newSupplierDialogOpen, setNewSupplierDialogOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierType, setNewSupplierType] = useState<'own' | 'consignment'>('own');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [productType, setProductType] = useState('');
  const [vendor, setVendor] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [gtin, setGtin] = useState('');
  const [ncm, setNcm] = useState('');
  const [cest, setCest] = useState('');
  const [fiscalOrigin, setFiscalOrigin] = useState('');
  const [condition, setCondition] = useState('new');
  const [warrantyMonths, setWarrantyMonths] = useState('');
  const [suggestionsConfirmed, setSuggestionsConfirmed] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [shoeSystem, setShoeSystem] = useState<'BR' | 'US' | 'EU'>('BR');
  
  // Media state
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  
  // Dropship state
  const [fulfillmentType, setFulfillmentType] = useState<'in_stock' | 'dropship'>('in_stock');
  const [dropshipLeadTime, setDropshipLeadTime] = useState(7);
  
  // Weight & dimensions state
  const [weightGrams, setWeightGrams] = useState('');
  const [lengthCm, setLengthCm] = useState('');
  const [widthCm, setWidthCm] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  
  // Variant inventory state
  const [variantInventory, setVariantInventory] = useState<Record<string, number>>({});
  const [variantEnabled, setVariantEnabled] = useState<Record<string, boolean>>({});
  
  // Cost state
  const [cost, setCost] = useState('');
  const [variantCost, setVariantCost] = useState<Record<string, number>>({});
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [autoFillSources, setAutoFillSources] = useState<string[]>([]);
  const [tiktokCategories, setTikTokCategories] = useState<TikTokCategory[]>([]);
  const [tiktokCategoryId, setTikTokCategoryId] = useState('');
  const [tiktokCategorySearch, setTikTokCategorySearch] = useState('');
  const [tiktokCategoryOpen, setTikTokCategoryOpen] = useState(false);
  const [loadingTikTokCategories, setLoadingTikTokCategories] = useState(false);
  const [publishingTikTok, setPublishingTikTok] = useState(false);
  const [tiktokStatus, setTikTokStatus] = useState<'idle' | 'pending' | 'published' | 'error'>('idle');
  const [tiktokMessage, setTikTokMessage] = useState('');
  const [marketplaceAttributes, setMarketplaceAttributes] = useState<Record<string, string>>({});
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Determine available sizes based on category size_type
  const selectedCategory = categories.find(c => c.value === productType);
  const categorySizeType = selectedCategory?.size_type || (selectedCategory?.has_sizes ? (productType === 'CALCADOS' ? 'shoes' : 'clothing') : 'none');
  const isFootwear = categorySizeType === 'shoes';
  const isPants = categorySizeType === 'pants';
  const isVolumeMl = categorySizeType === 'volume_ml';
  const shoeSystemSizes = { BR: SHOE_SIZES_BR, US: SHOE_SIZES_US, EU: SHOE_SIZES_EU };
  const availableSizes = isFootwear
    ? shoeSystemSizes[shoeSystem]
    : isPants
    ? PANTS_SIZES
    : isVolumeMl
    ? VOLUME_ML_SIZES
    : CLOTHING_SIZES;

  // Generate variant keys
  const getVariantKey = (color: string, size: string) => `${color || 'default'}-${size || 'default'}`;

  const getAllVariantKeys = useCallback(() => {
    const colors = selectedColors.length > 0 ? selectedColors : [''];
    const sizes = selectedSizes.length > 0 ? selectedSizes : [''];
    const keys: string[] = [];
    for (const color of colors) {
      for (const size of sizes) {
        keys.push(getVariantKey(color, size));
      }
    }
    return keys;
  }, [selectedColors, selectedSizes]);

  const resetForm = useCallback(() => {
    setTitle('');
    setPrice('');
    setProductType('');
    setVendor('');
    setManufacturer('');
    setGtin('');
    setNcm('');
    setCest('');
    setFiscalOrigin('');
    setCondition('new');
    setWarrantyMonths('');
    setSuggestionsConfirmed(false);
    setDescription('');
    setSelectedColors([]);
    setSelectedSizes([]);
    setMediaItems([]);
    setCurrentMediaIndex(0);
    setFulfillmentType('in_stock');
    setDropshipLeadTime(7);
    setWeightGrams('');
    setLengthCm('');
    setWidthCm('');
    setHeightCm('');
    setExpiryDate('');
    setVariantInventory({});
    setVariantEnabled({});
    setCost('');
    setVariantCost({});
    setShowAdvanced(false);
    setShowFullscreen(false);
    setSupplierId('');
    setAutoFillSources([]);
    setTikTokCategories([]);
    setTikTokCategoryId('');
    setTikTokCategorySearch('');
    setTikTokCategoryOpen(false);
    setTikTokStatus('idle');
    setTikTokMessage('');
    setMarketplaceAttributes({});
  }, []);

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return;
    try {
      const result = await createSupplierMutation.mutateAsync({
        name: newSupplierName.trim(),
        type: newSupplierType,
        contact_name: null,
        phone: null,
        email: null,
        notes: null,
      });
      setSupplierId(result.id);
      setNewSupplierDialogOpen(false);
      setNewSupplierName('');
      setNewSupplierType('own');
    } catch {}
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }
    const value = newCatName.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
    try {
      await createCategoryMutation.mutateAsync({
        label: newCatName.trim(),
        value,
        has_sizes: newCatSizeType !== 'none',
        size_type: newCatSizeType,
        position: categories.length,
        tracks_expiry: newCatTracksExpiry,
        expiry_alert_days: newCatExpiryAlertDays,
      });
      setProductType(value);
      setNewCatDialogOpen(false);
      setNewCatName('');
      setNewCatSizeType('none');
      setNewCatTracksExpiry(false);
      setNewCatExpiryAlertDays(60);
    } catch {}
  };


  const formatPriceForDisplay = (value: string | number | undefined): string => {
    if (!value) return '';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '';
    return numValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  useEffect(() => {
    if (open && mode === 'edit' && initialData) {
      setTitle(initialData.title || '');
      setPrice(formatPriceForDisplay(initialData.variants?.[0]?.price));
      setProductType(initialData.product_type || '');
      setVendor(initialData.vendor || '');
      setManufacturer(initialData.manufacturer || '');
      setGtin(initialData.variants?.[0]?.gtin || '');
      setNcm(initialData.ncm || '');
      setCest(initialData.cest || '');
      setFiscalOrigin(initialData.fiscal_origin == null ? '' : String(initialData.fiscal_origin));
      setCondition(initialData.condition || 'new');
      setWarrantyMonths(initialData.warranty_months == null ? '' : String(initialData.warranty_months));
      setSuggestionsConfirmed(Boolean(initialData.suggestions_confirmed));
      setMarketplaceAttributes(initialData.marketplace_attributes ?? {});
      setDescription(initialData.body || '');
      
      const colorOption = initialData.options?.find(o => o.name === 'Cor');
      const sizeOption = initialData.options?.find(o => o.name === 'Tamanho');
      setSelectedColors(colorOption?.values || []);
      setSelectedSizes(sizeOption?.values || []);
      
      if (initialData.images?.length) {
        const existingMedia: MediaItem[] = initialData.images.map((img, index) => ({
          id: img.id || crypto.randomUUID(),
          preview: img.base64 || '',
          type: 'image' as const,
          isExisting: true,
        }));
        setMediaItems(existingMedia);
        setCurrentMediaIndex(0);
      }
      
      setFulfillmentType(initialData.fulfillment_type || 'in_stock');
      setDropshipLeadTime(initialData.dropship_lead_time || 7);
      setExpiryDate(initialData.expiry_date ? String(initialData.expiry_date).slice(0, 10) : '');
      setWeightGrams(initialData.weight_grams ? String(initialData.weight_grams) : '');
      setLengthCm(initialData.length_cm ? String(initialData.length_cm) : '');
      setWidthCm(initialData.width_cm ? String(initialData.width_cm) : '');
      setHeightCm(initialData.height_cm ? String(initialData.height_cm) : '');
      
      const inventory: Record<string, number> = {};
      const enabled: Record<string, boolean> = {};
      const costs: Record<string, number> = {};
      initialData.variants?.forEach(v => {
        const key = getVariantKey(v.option1 || '', v.option2 || '');
        inventory[key] = v.inventory_quantity || 0;
        enabled[key] = v.inventory_policy !== 'deny' || (v.inventory_quantity ?? 0) > 0;
        costs[key] = v.cost || 0;
      });
      setVariantInventory(inventory);
      setVariantEnabled(enabled);
      setVariantCost(costs);
      
      if (initialData.variants?.[0]?.cost) {
        setCost(formatPriceForDisplay(initialData.variants[0].cost));
      }
      
      if (colorOption?.values?.length || sizeOption?.values?.length) {
        setShowAdvanced(true);
      }
    } else if (open && mode === 'create') {
      resetForm();
    }
  }, [open, mode, initialData]);

  const loadTikTokCategories = async () => {
    setLoadingTikTokCategories(true);
    setTikTokMessage('');
    try {
      const { data, error } = await supabase.functions.invoke('bling-tiktok-categories', { method: 'GET' });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const categories = (data?.categories ?? []) as TikTokCategory[];
      setTikTokCategories(categories.filter((category) => category.is_leaf));
      if (!categories.length) setTikTokMessage('Nenhuma categoria vinculada foi encontrada no canal TikTok do Bling. Vincule a categoria no Bling e tente novamente.');
    } catch (error) {
      setTikTokMessage(error instanceof Error ? error.message : 'Não foi possível buscar as categorias do TikTok.');
      setTikTokStatus('error');
    } finally {
      setLoadingTikTokCategories(false);
    }
  };

  const selectedTikTokCategory = tiktokCategories.find((category) => category.id === tiktokCategoryId);
  const filteredTikTokCategories = tiktokCategories.filter((category) =>
    !tiktokCategorySearch.trim() || category.name.toLocaleLowerCase('pt-BR').includes(tiktokCategorySearch.toLocaleLowerCase('pt-BR'))
  ).slice(0, 100);
  const requiredTikTokAttributes = (selectedTikTokCategory?.required_attributes ?? []).filter((attribute) =>
    attribute.required === true || attribute.obrigatorio === true
  );
  const attributeId = (attribute: Record<string, unknown>) => String(attribute.id ?? attribute.codigo ?? '');
  const attributeName = (attribute: Record<string, unknown>) => String(attribute.name ?? attribute.nome ?? attribute.descricao ?? attribute.id ?? 'Atributo');

  const handleConfirmAndPublishTikTok = async () => {
    if (!initialData?.id || !suggestionsConfirmed || !selectedTikTokCategory) return;
    const missingAttribute = requiredTikTokAttributes.find((attribute) => !marketplaceAttributes[attributeId(attribute)]?.trim());
    if (missingAttribute) {
      toast.error(`Preencha: ${attributeName(missingAttribute)}`);
      return;
    }
    setPublishingTikTok(true);
    setTikTokMessage('');
    try {
      const { data: confirmation, error: confirmationError } = await supabase.functions.invoke('bling-tiktok-categories', {
        body: {
          product_id: initialData.id,
          category_id: selectedTikTokCategory.id,
          category_name: selectedTikTokCategory.name,
          attributes: marketplaceAttributes,
        },
      });
      if (confirmationError) throw confirmationError;
      if (confirmation?.error) throw new Error(confirmation.error);
      const { data: publication, error: publicationError } = await supabase.functions.invoke('bling-publish-product', {
        body: { product_id: initialData.id },
      });
      if (publicationError) throw publicationError;
      if (publication?.error) throw new Error(publication.error);
      setTikTokStatus(publication?.status === 'published' || publication?.ok ? 'published' : 'pending');
      setTikTokMessage(publication?.status === 'published' || publication?.ok ? 'Produto publicado no TikTok Shop.' : 'Produto enviado e aguardando retorno do TikTok Shop.');
      toast.success('Produto enviado ao TikTok Shop');
    } catch (error) {
      setTikTokStatus('error');
      setTikTokMessage(error instanceof Error ? error.message : 'Não foi possível publicar no TikTok Shop.');
    } finally {
      setPublishingTikTok(false);
    }
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const files = e.target.files;
    if (files) {
      const newItems: MediaItem[] = Array.from(files).map(file => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        type,
      }));
      setMediaItems(prev => [...prev, ...newItems]);
    }
    e.target.value = '';
  };

  const handleRemoveMedia = (id: string) => {
    setMediaItems(prev => {
      const item = prev.find(m => m.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      const newItems = prev.filter(m => m.id !== id);
      if (currentMediaIndex >= newItems.length && newItems.length > 0) {
        setCurrentMediaIndex(newItems.length - 1);
      } else if (newItems.length === 0) {
        setCurrentMediaIndex(0);
      }
      return newItems;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    const newItems: MediaItem[] = [];
    
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        newItems.push({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          type: 'image',
        });
      } else if (file.type.startsWith('video/')) {
        newItems.push({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          type: 'video',
        });
      }
    });
    
    if (newItems.length > 0) {
      setMediaItems(prev => [...prev, ...newItems]);
    }
  };

  const navigateMedia = (direction: 'prev' | 'next') => {
    if (mediaItems.length <= 1) return;
    setCurrentMediaIndex(prev => {
      if (direction === 'prev') {
        return prev === 0 ? mediaItems.length - 1 : prev - 1;
      } else {
        return prev === mediaItems.length - 1 ? 0 : prev + 1;
      }
    });
  };

  const toggleColor = (colorName: string) => {
    setSelectedColors(prev => 
      prev.includes(colorName) 
        ? prev.filter(c => c !== colorName)
        : [...prev, colorName]
    );
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) 
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  const updateVariantInventory = (key: string, delta: number) => {
    setVariantInventory(prev => ({
      ...prev,
      [key]: Math.max(0, (prev[key] ?? 0) + delta),
    }));
  };

  const toggleVariantEnabled = (key: string) => {
    setVariantEnabled(prev => ({
      ...prev,
      [key]: !(prev[key] ?? true),
    }));
  };

  const getInventoryForVariant = (key: string) => variantInventory[key] ?? 0;
  const isVariantEnabled = (key: string) => variantEnabled[key] ?? true;
  
  const getCostForVariant = (key: string) => variantCost[key] ?? 0;
  const updateVariantCost = (key: string, value: number) => {
    setVariantCost(prev => ({
      ...prev,
      [key]: Math.max(0, value),
    }));
  };
  
  const calculateMargin = (priceValue: number, costValue: number) => {
    if (costValue <= 0 || priceValue <= 0) return null;
    const profit = priceValue - costValue;
    const marginPercent = ((profit / priceValue) * 100).toFixed(0);
    return { profit, marginPercent };
  };
  
  const hasVariants = selectedColors.length > 0 || selectedSizes.length > 0;
  useEffect(() => {
    if (cost && hasVariants) {
      const costNumber = parseFloat(cost.replace(/\./g, '').replace(',', '.')) || 0;
      if (costNumber > 0) {
        setVariantCost(prev => {
          const keys = getAllVariantKeys();
          const updated = { ...prev };
          let changed = false;
          for (const key of keys) {
            if (!updated[key] || updated[key] === 0) {
              updated[key] = costNumber;
              changed = true;
            }
          }
          return changed ? updated : prev;
        });
      }
    }
  }, [cost, hasVariants, getAllVariantKeys]);

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPrice(e.target.value);
    setCost(formatted);
  };

  const formatPrice = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseInt(numbers || '0', 10) / 100;
    return amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPrice(e.target.value);
    setPrice(formatted);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  // Returns base64 + mime for any MediaItem (new File OR existing URL OR data URL)
  const getImagePayload = async (item: MediaItem): Promise<{ data: string; mime: string } | null> => {
    try {
      if (item.file) {
        const dataUrl = await fileToBase64(item.file);
        const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        return m ? { mime: m[1], data: m[2] } : null;
      }
      if (item.preview?.startsWith('data:')) {
        const m = item.preview.match(/^data:([^;]+);base64,(.+)$/);
        return m ? { mime: m[1], data: m[2] } : null;
      }
      if (item.preview && /^https?:\/\//.test(item.preview)) {
        const resp = await fetch(item.preview);
        const blob = await resp.blob();
        const dataUrl: string = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onloadend = () => res(r.result as string);
          r.onerror = rej;
          r.readAsDataURL(blob);
        });
        const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        return m ? { mime: m[1] || blob.type || 'image/jpeg', data: m[2] } : null;
      }
      return null;
    } catch (e) {
      console.error('getImagePayload error:', e);
      return null;
    }
  };

  const generateSKU = (title: string): string => {
    return title
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8) + '-' + Date.now().toString(36).slice(-4).toUpperCase();
  };

  const handleCompleteAutoFill = async () => {
    const firstImage = mediaItems.find(item => item.type === 'image');
    if (!firstImage && !gtin.trim() && !title.trim()) {
      toast.error('Adicione uma foto, código de barras ou título primeiro');
      return;
    }

    setIsAiLoading(true);
    try {
      const imagePayload = firstImage ? await getImagePayload(firstImage) : null;
      const imageDataUrl = imagePayload ? `data:${imagePayload.mime};base64,${imagePayload.data}` : undefined;
      const { data, error } = await supabase.functions.invoke('product-auto-fill', {
        body: {
          title,
          description,
          product_type: productType,
          vendor,
          gtin,
          image_data_url: imageDataUrl,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const suggestions = (data?.suggestions ?? {}) as AutoFillSuggestions;
      const category = categories.find(item =>
        item.value.toLocaleLowerCase('pt-BR') === suggestions.product_type?.toLocaleLowerCase('pt-BR')
        || item.label.toLocaleLowerCase('pt-BR') === suggestions.product_type?.toLocaleLowerCase('pt-BR')
      );

      if (suggestions.title) setTitle(suggestions.title);
      if (suggestions.description) setDescription(suggestions.description);
      if (category) setProductType(category.value);
      if (suggestions.vendor) setVendor(suggestions.vendor);
      if (suggestions.manufacturer) setManufacturer(suggestions.manufacturer);
      if (suggestions.gtin) setGtin(suggestions.gtin);
      if (suggestions.price != null && suggestions.price > 0) setPrice(formatPriceForDisplay(suggestions.price));
      if (suggestions.cost != null && suggestions.cost >= 0) setCost(formatPriceForDisplay(suggestions.cost));
      if (suggestions.weight_grams != null && suggestions.weight_grams > 0) setWeightGrams(String(Math.round(suggestions.weight_grams)));
      if (suggestions.length_cm != null && suggestions.length_cm > 0) setLengthCm(String(suggestions.length_cm));
      if (suggestions.width_cm != null && suggestions.width_cm > 0) setWidthCm(String(suggestions.width_cm));
      if (suggestions.height_cm != null && suggestions.height_cm > 0) setHeightCm(String(suggestions.height_cm));
      if (suggestions.colors?.length) setSelectedColors(suggestions.colors);
      if (suggestions.sizes?.length) setSelectedSizes(suggestions.sizes);

      const knownImages = new Set(mediaItems.map(item => item.preview));
      const importedImages = (suggestions.images ?? [])
        .filter(url => /^https?:\/\//i.test(url) && !knownImages.has(url))
        .map(url => ({ id: crypto.randomUUID(), preview: url, type: 'image' as const, isExisting: true }));
      if (importedImages.length) setMediaItems(current => [...current, ...importedImages]);

      setSuggestionsConfirmed(false);
      setShowAdvanced(true);
      const sources = Array.isArray(data?.found_sources) ? data.found_sources.filter((value: unknown): value is string => typeof value === 'string') : [];
      setAutoFillSources(sources);
      toast.success('Produto preenchido para revisão', {
        description: sources.length ? `Fontes: ${sources.join(', ')}.` : 'Confira os campos antes de salvar.',
      });
      if (Array.isArray(data?.warnings) && data.warnings.length) {
        toast.warning('Algumas fontes não responderam', { description: 'Os dados encontrados nas outras fontes foram mantidos.' });
      }
    } catch (error) {
      console.error('Complete auto-fill error:', error);
      const message = error instanceof Error ? error.message : 'Não foi possível preencher o produto.';
      toast.error(message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    if (!price) {
      toast.error('Preço é obrigatório');
      return;
    }

    if (!productType) {
      toast.error('Selecione uma categoria para o produto', {
        description: 'Categorias ajudam clientes a encontrar produtos no catálogo.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const priceNumber = parseFloat(price.replace(/\./g, '').replace(',', '.'));

      const variants: ProductFormData['variants'] = [];
      const options: ProductFormData['options'] = [];

      if (selectedColors.length > 0) {
        options.push({ name: 'Cor', values: selectedColors });
      }
      if (selectedSizes.length > 0) {
        options.push({ name: 'Tamanho', values: selectedSizes });
      }

      if (selectedColors.length === 0 && selectedSizes.length === 0) {
        const stock = fulfillmentType === 'dropship' ? 0 : (variantInventory['default-default'] ?? 10);
        const costNumber = cost ? parseFloat(cost.replace(/\./g, '').replace(',', '.')) : 0;
        variants.push({
          price: String(priceNumber),
          sku: generateSKU(title),
          gtin: gtin.trim() || undefined,
          cost: costNumber,
          inventory_quantity: stock,
          is_available: stock > 0,
          inventory_policy: fulfillmentType === 'dropship' ? 'continue' : 'deny',
        });
      } else {
        const colors = selectedColors.length > 0 ? selectedColors : [''];
        const sizes = selectedSizes.length > 0 ? selectedSizes : [''];

        for (const color of colors) {
          for (const size of sizes) {
            const key = getVariantKey(color, size);
            const enabled = isVariantEnabled(key);
            const stock = enabled ? getInventoryForVariant(key) : 0;
            const isOnRequest = stock === 0 && fulfillmentType === 'in_stock';
            const variantCostValue = getCostForVariant(key);
            
            variants.push({
              price: String(priceNumber),
              sku: generateSKU(title) + (color ? `-${color.slice(0, 3).toUpperCase()}` : '') + (size ? `-${size}` : ''),
              gtin: variants.length === 0 ? gtin.trim() || undefined : undefined,
              cost: variantCostValue,
              option1: color || undefined,
              option2: size || undefined,
              inventory_quantity: stock,
              is_available: stock > 0 || fulfillmentType === 'dropship',
              inventory_policy: (fulfillmentType === 'dropship' || isOnRequest) ? 'continue' : 'deny',
            });
          }
        }
      }

      const images: ImageData[] = [];
      const imageMedia = mediaItems.filter(m => m.type === 'image');
      for (let i = 0; i < imageMedia.length; i++) {
        const media = imageMedia[i];
        let base64: string;
        
        if (media.isExisting) {
          base64 = media.preview;
        } else if (media.file) {
          base64 = await fileToBase64(media.file);
        } else {
          continue;
        }
        
        images.push({
          id: media.id,
          base64,
          filename: media.file?.name || `image-${i}`,
          is_primary: i === 0,
          position: i,
        });
      }

      const videos = mediaItems
        .filter(m => m.type === 'video')
        .map((m, i) => ({
          id: m.id,
          file: m.file,
          filename: m.file.name,
          position: i,
        }));

      const formData: ProductFormData = {
        title,
        body: description,
        product_type: productType,
        vendor,
        manufacturer,
        ncm: ncm.replace(/\D/g, '') || undefined,
        cest: cest.replace(/\D/g, '') || undefined,
        fiscal_origin: fiscalOrigin === '' ? null : Number(fiscalOrigin),
        condition,
        warranty_months: warrantyMonths ? Number(warrantyMonths) : null,
        suggestions_confirmed: suggestionsConfirmed,
        marketplace_attributes: marketplaceAttributes,
        tags: '',
        fulfillment_type: fulfillmentType,
        dropship_lead_time: fulfillmentType === 'dropship' ? dropshipLeadTime : undefined,
        weight_grams: parseInt(weightGrams) || undefined,
        length_cm: parseInt(lengthCm) || undefined,
        width_cm: parseInt(widthCm) || undefined,
        height_cm: parseInt(heightCm) || undefined,
        expiry_date: expiryDate || null,
        variants,
        options,
        images,
        videos,
      };

      await onSubmit(formData);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentMedia = mediaItems[currentMediaIndex];

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}>
        <DialogContent className="h-[100dvh] w-full max-w-full rounded-none p-0 md:h-auto md:max-h-[90vh] md:max-w-3xl md:rounded-lg md:p-6 flex flex-col overflow-hidden">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-background border-b md:border-b-0 px-4 py-2 md:py-3 md:px-0 md:py-0">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:hidden shrink-0"
                onClick={() => onOpenChange(false)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <DialogHeader className="text-left flex-1">
                <DialogTitle className="font-light tracking-wide text-base md:text-lg">
                  {mode === 'edit' ? 'Editar Produto' : 'Novo Produto'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {mode === 'edit' ? 'Atualize as informações do produto' : 'Cadastro rápido em segundos'}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-0">
            <form id="product-form" onSubmit={handleSubmit} className="space-y-3 md:space-y-5 pb-4">
              {/* Two Column Layout on Desktop, Single Column on Mobile */}
              <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                {/* Media Section */}
                <div className="space-y-2 md:space-y-3">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:block">
                    Mídia do Produto
                  </Label>
                  
                  {/* Carousel Area - compact 3:2 on mobile, 4:5 on desktop */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className={cn(
                      "relative w-full aspect-video md:aspect-[4/5] border flex items-center justify-center transition-all group",
                      mediaItems.length > 0 
                        ? "border-border bg-muted/10" 
                        : "border-dashed border-muted-foreground/30 bg-muted/5 cursor-pointer hover:border-primary/50 hover:bg-muted/20"
                    )}
                    onClick={() => mediaItems.length === 0 && imageInputRef.current?.click()}
                  >
                    {mediaItems.length > 0 ? (
                      <>
                        {currentMedia?.type === 'image' ? (
                          <img 
                            src={currentMedia.preview} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : currentMedia?.type === 'video' ? (
                          <video 
                            src={currentMedia.preview} 
                            className="w-full h-full object-cover"
                            controls
                          />
                        ) : null}
                        
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        
                        {mediaItems.length > 1 && (
                          <>
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); navigateMedia('prev'); }}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); navigateMedia('next'); }}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        
                        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); setShowFullscreen(true); }}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); handleRemoveMedia(currentMedia.id); }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {mediaItems.length > 1 && (
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 md:flex hidden">
                            {mediaItems.map((_, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex(idx); }}
                                className={cn(
                                  "w-2 h-2 rounded-full transition-all",
                                  idx === currentMediaIndex 
                                    ? "bg-white w-4" 
                                    : "bg-white/50 hover:bg-white/70"
                                )}
                              />
                            ))}
                          </div>
                        )}
                        
                        <Badge 
                          variant="secondary" 
                          className="absolute top-3 left-3 text-[10px] uppercase"
                        >
                          {currentMedia?.type === 'video' ? 'Vídeo' : 'Foto'} {currentMediaIndex + 1}/{mediaItems.length}
                        </Badge>
                      </>
                    ) : (
                      <div className="text-center p-4 md:p-8">
                        <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 border border-dashed border-muted-foreground/40 flex items-center justify-center">
                          <ImagePlus className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground/60" />
                        </div>
                        <p className="text-sm text-muted-foreground font-light">
                          Clique para adicionar
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          ou arraste fotos e vídeos
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Thumbnail Strip - mobile: horizontal scroll, replaces dots */}
                  {mediaItems.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {mediaItems.map((item, idx) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCurrentMediaIndex(idx)}
                          className={cn(
                            "shrink-0 w-9 h-9 md:w-12 md:h-12 rounded overflow-hidden border-2 transition-all",
                            idx === currentMediaIndex 
                              ? "border-primary" 
                              : "border-transparent opacity-60 hover:opacity-100"
                          )}
                        >
                          {item.type === 'image' ? (
                            <img src={item.preview} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Video className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </button>
                      ))}
                      {/* Add photo/video buttons inline */}
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="shrink-0 w-9 h-9 md:w-12 md:h-12 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors"
                      >
                        <ImagePlus className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        className="shrink-0 w-9 h-9 md:w-12 md:h-12 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors"
                      >
                        <Video className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  )}

                  {/* Add Media Buttons - only when no media (mobile uses thumbnails strip) */}
                  {mediaItems.length === 0 && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
                        Foto
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => videoInputRef.current?.click()}
                      >
                        <Video className="h-3.5 w-3.5 mr-1.5" />
                        Vídeo
                      </Button>
                    </div>
                  )}
                  
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleMediaSelect(e, 'image')}
                    className="hidden"
                  />
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={(e) => handleMediaSelect(e, 'video')}
                    className="hidden"
                  />
                </div>

                {/* Form Fields */}
                <div className="space-y-3 md:space-y-4">
                  {/* Title */}
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="title" className="text-xs font-medium">
                      Título <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Nome do produto"
                      className="font-light"
                    />
                  </div>

                  {/* Price, Cost, Type - 3 columns on mobile */}
                  <div className="grid grid-cols-3 gap-2 md:grid-cols-2 md:gap-3">
                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="price" className="text-xs font-medium">
                        Preço <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs md:text-sm">
                          R$
                        </span>
                        <Input
                          id="price"
                          value={price}
                          onChange={handlePriceChange}
                          placeholder="0,00"
                          className="pl-8 md:pl-10 font-light text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="cost" className="text-xs font-medium">Custo</Label>
                      <div className="relative">
                        <span className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs md:text-sm">
                          R$
                        </span>
                        <Input
                          id="cost"
                          value={cost}
                          onChange={handleCostChange}
                          placeholder="0,00"
                          className="pl-8 md:pl-10 font-light text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 md:space-y-2 md:col-span-2">
                      <Label htmlFor="type" className="text-xs font-medium">Tipo</Label>
                      <Select value={productType} onValueChange={setProductType}>
                        <SelectTrigger className="font-light text-sm">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((type) => (
                            <div key={type.value} className="relative flex items-center group">
                              <SelectItem value={type.value} className="flex-1 pr-8">
                                {type.label}
                              </SelectItem>
                              <button
                                type="button"
                                className="absolute right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (productType === type.value) {
                                    setProductType('');
                                  }
                                  deleteCategoryMutation.mutate(type.id);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          <Separator className="my-1" />
                          <button
                            type="button"
                            className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-primary font-medium"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setNewCatDialogOpen(true);
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Nova Categoria
                          </button>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Margin Indicator + Calculator */}
                  {(() => {
                    const priceNum = price ? parseFloat(price.replace(/\./g, '').replace(',', '.')) : 0;
                    const costNum = cost ? parseFloat(cost.replace(/\./g, '').replace(',', '.')) : 0;
                    const margin = calculateMargin(priceNum, costNum);
                    return (
                      <div className="flex items-center gap-2">
                        {margin && (
                          <div className={cn(
                            "text-xs p-2 rounded-md flex-1",
                            margin.profit > 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                          )}>
                            Margem: {margin.marginPercent}% (R$ {margin.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de lucro)
                          </div>
                        )}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" title="Calculadora de precificação">
                              <Calculator className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80" side="left" align="start">
                            <PricingCalculator
                              initialCost={costNum}
                              initialPrice={priceNum}
                              onUsePrice={(newPrice) => {
                                setPrice(newPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                              }}
                              compact
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    );
                  })()}

                  {/* Vendor */}
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="vendor" className="text-xs font-medium">Marca</Label>
                    <Input
                      id="vendor"
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      placeholder="Ex: Nike, Adidas..."
                      className="font-light"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="manufacturer" className="text-xs font-medium">Fabricante</Label>
                      <Input id="manufacturer" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="Nome do fabricante" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="gtin" className="text-xs font-medium">GTIN / EAN</Label>
                      <Input id="gtin" inputMode="numeric" value={gtin} onChange={(e) => setGtin(e.target.value.replace(/\D/g, '').slice(0, 14))} placeholder="Código de barras" />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCompleteAutoFill}
                    disabled={isAiLoading}
                    className="w-full justify-center font-medium"
                  >
                    {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {isAiLoading ? 'Buscando informações...' : 'Preencher automaticamente'}
                  </Button>
                  {autoFillSources.length > 0 && (
                    <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                      Dados encontrados em {autoFillSources.join(', ')}. Revise os campos abaixo antes de salvar.
                    </div>
                  )}

                  {/* Supplier */}
                  <div className="space-y-1.5 md:space-y-2">
                    <Label className="text-xs font-medium">Fornecedor (opcional)</Label>
                    <div className="flex gap-2">
                      <Select value={supplierId} onValueChange={setSupplierId}>
                        <SelectTrigger className="font-light flex-1">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {suppliers.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} {s.type === 'consignment' ? '(Consig.)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setNewSupplierDialogOpen(true)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {supplierId && suppliers.find(s => s.id === supplierId)?.type === 'consignment' && (
                      <p className="text-xs text-amber-600">📦 Produto consignado — será rastreado no painel de consignação</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Fulfillment Type - Full Width */}
              <div className="space-y-2 md:space-y-3 pt-1 md:pt-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Disponibilidade
                </Label>
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('in_stock')}
                    className={cn(
                      "flex items-center gap-2 md:gap-3 p-2 md:p-3 border transition-all text-left",
                      fulfillmentType === 'in_stock'
                        ? "border-primary bg-primary/5"
                        : "border-input hover:border-muted-foreground/50"
                    )}
                  >
                    <Package className={cn(
                      "h-4 w-4 md:h-5 md:w-5 shrink-0",
                      fulfillmentType === 'in_stock' ? "text-primary" : "text-muted-foreground"
                    )} />
                    <div>
                      <p className={cn(
                        "text-xs md:text-sm font-medium",
                        fulfillmentType === 'in_stock' ? "text-primary" : "text-foreground"
                      )}>
                        Estoque Próprio
                      </p>
                      <p className="text-[10px] md:text-xs text-muted-foreground hidden md:block">
                        Pronta entrega
                      </p>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('dropship')}
                    className={cn(
                      "flex items-center gap-2 md:gap-3 p-2 md:p-3 border transition-all text-left",
                      fulfillmentType === 'dropship'
                        ? "border-primary bg-primary/5"
                        : "border-input hover:border-muted-foreground/50"
                    )}
                  >
                    <Truck className={cn(
                      "h-4 w-4 md:h-5 md:w-5 shrink-0",
                      fulfillmentType === 'dropship' ? "text-primary" : "text-muted-foreground"
                    )} />
                    <div>
                      <p className={cn(
                        "text-xs md:text-sm font-medium",
                        fulfillmentType === 'dropship' ? "text-primary" : "text-foreground"
                      )}>
                        Dropship
                      </p>
                      <p className="text-[10px] md:text-xs text-muted-foreground hidden md:block">
                        Sob encomenda
                      </p>
                    </div>
                  </button>
                </div>
                
                {fulfillmentType === 'dropship' && (
                  <div className="flex items-center gap-3 mt-3">
                    <Label className="text-xs whitespace-nowrap">Prazo adicional:</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDropshipLeadTime(prev => Math.max(1, prev - 1))}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-12 text-center font-medium">{dropshipLeadTime}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDropshipLeadTime(prev => prev + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <span className="text-xs text-muted-foreground">dias úteis</span>
                    </div>
                  </div>
                )}

                {/* Validade (quando categoria controla validade) */}
                {selectedCategory?.tracks_expiry && (
                  <div className="space-y-2 md:space-y-3 pt-1 md:pt-2 border-t">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Validade
                    </Label>
                    <div className="space-y-1">
                      <Label className="text-xs">Data de validade do produto</Label>
                      <Input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Após essa data o produto fica indisponível na loja automaticamente.
                      </p>
                    </div>
                  </div>
                )}

                {/* Weight & Dimensions */}
                <div className="space-y-2 md:space-y-3 pt-1 md:pt-2 border-t">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Peso e Dimensões
                  </Label>
                  <div className="grid grid-cols-4 gap-2 md:gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Peso (g)</Label>
                      <Input
                        type="number"
                        value={weightGrams}
                        onChange={(e) => setWeightGrams(e.target.value)}
                        placeholder="300"
                        min={1}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Comp. (cm)</Label>
                      <Input
                        type="number"
                        value={lengthCm}
                        onChange={(e) => setLengthCm(e.target.value)}
                        placeholder="20"
                        min={1}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Larg. (cm)</Label>
                      <Input
                        type="number"
                        value={widthCm}
                        onChange={(e) => setWidthCm(e.target.value)}
                        placeholder="15"
                        min={1}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Alt. (cm)</Label>
                      <Input
                        type="number"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        placeholder="10"
                        min={1}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Options - Colors, Sizes, Variants */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-between font-light text-muted-foreground hover:text-foreground py-3 border-t border-border"
                  >
                    <span className="text-xs uppercase tracking-wider">Cores, Tamanhos e Estoque</span>
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform",
                      showAdvanced && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-3 md:space-y-5 pt-3 md:pt-4">
                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-xs font-medium">Descrição</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Descrição do produto..."
                      className="font-light min-h-[60px] md:min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-3 border-t pt-3">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dados fiscais e dos canais</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="space-y-1"><Label className="text-xs">NCM</Label><Input inputMode="numeric" value={ncm} onChange={(e) => setNcm(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="8 dígitos" /></div>
                      <div className="space-y-1"><Label className="text-xs">CEST</Label><Input inputMode="numeric" value={cest} onChange={(e) => setCest(e.target.value.replace(/\D/g, '').slice(0, 7))} placeholder="Se aplicável" /></div>
                      <div className="space-y-1"><Label className="text-xs">Origem fiscal</Label><Select value={fiscalOrigin} onValueChange={setFiscalOrigin}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="0">0 — Nacional</SelectItem><SelectItem value="1">1 — Importação direta</SelectItem><SelectItem value="2">2 — Adquirida no Brasil</SelectItem><SelectItem value="3">3 — Nacional, conteúdo importado</SelectItem><SelectItem value="4">4 — Nacional, processo básico</SelectItem><SelectItem value="5">5 — Nacional, até 40% importado</SelectItem><SelectItem value="6">6 — Importação sem similar</SelectItem><SelectItem value="7">7 — Adquirida sem similar</SelectItem><SelectItem value="8">8 — Nacional, mais de 70% importado</SelectItem></SelectContent></Select></div>
                      <div className="space-y-1"><Label className="text-xs">Garantia (meses)</Label><Input type="number" min="0" value={warrantyMonths} onChange={(e) => setWarrantyMonths(e.target.value)} placeholder="Ex: 3" /></div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Condição</Label><Select value={condition} onValueChange={setCondition}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">Novo</SelectItem><SelectItem value="used">Usado</SelectItem><SelectItem value="refurbished">Recondicionado</SelectItem></SelectContent></Select></div>
                    <label className="flex items-start gap-2 rounded-md border p-3 text-xs">
                      <Checkbox checked={suggestionsConfirmed} onCheckedChange={(checked) => setSuggestionsConfirmed(checked === true)} />
                      <span>Revisei e confirmo as informações sugeridas. Dados legais e fiscais não foram presumidos automaticamente.</span>
                    </label>
                    {mode === 'edit' && initialData?.id && (
                      <div className="space-y-3 rounded-md border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Music2 className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-sm font-medium">Publicação no TikTok Shop</p>
                              <p className="text-xs text-muted-foreground">Canal conectado pelo Bling</p>
                            </div>
                          </div>
                          {tiktokStatus === 'published' && <Badge variant="secondary"><CheckCircle2 className="mr-1 h-3 w-3" />Publicado</Badge>}
                        </div>

                        {!suggestionsConfirmed && (
                          <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            Confirme os dados revisados acima para liberar a publicação.
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label className="text-xs">Categoria real no TikTok</Label>
                          <Popover open={tiktokCategoryOpen} onOpenChange={setTikTokCategoryOpen}>
                            <PopoverTrigger asChild>
                              <Button type="button" variant="outline" className="w-full justify-between font-normal" onClick={() => !tiktokCategories.length && loadTikTokCategories()}>
                                <span className="truncate">{selectedTikTokCategory?.name || 'Buscar categoria do TikTok'}</span>
                                {loadingTikTokCategories ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 text-muted-foreground" />}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
                              <Input value={tiktokCategorySearch} onChange={(event) => setTikTokCategorySearch(event.target.value)} placeholder="Digite para buscar..." className="mb-2" />
                              <div className="max-h-64 overflow-auto">
                                {filteredTikTokCategories.map((category) => (
                                  <Button key={category.id} type="button" variant="ghost" className="h-auto w-full justify-start whitespace-normal py-2 text-left" onClick={() => { setTikTokCategoryId(category.id); setTikTokCategoryOpen(false); }}>
                                    {category.name}
                                  </Button>
                                ))}
                                {!loadingTikTokCategories && !filteredTikTokCategories.length && <p className="p-3 text-xs text-muted-foreground">Nenhuma categoria disponível.</p>}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {requiredTikTokAttributes.map((attribute) => {
                          const id = attributeId(attribute);
                          return (
                            <div key={id} className="space-y-1">
                              <Label className="text-xs">{attributeName(attribute)}</Label>
                              <Input value={marketplaceAttributes[id] ?? ''} onChange={(event) => setMarketplaceAttributes((current) => ({ ...current, [id]: event.target.value }))} />
                            </div>
                          );
                        })}

                        {tiktokMessage && <p className={cn('text-xs', tiktokStatus === 'error' ? 'text-destructive' : 'text-muted-foreground')}>{tiktokMessage}</p>}
                        <Button type="button" className="w-full" disabled={!suggestionsConfirmed || !selectedTikTokCategory || publishingTikTok} onClick={handleConfirmAndPublishTikTok}>
                          {publishingTikTok ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          Confirmar e publicar no TikTok
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Colors & Sizes */}
                  <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
                    {/* Colors - smaller circles on mobile */}
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Cores</Label>
                        <button
                          type="button"
                          onClick={() => setNewColorDialogOpen(true)}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> Nova
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {productColors.map((color) => (
                          <div key={color.name} className="relative group/color">
                            <button
                              type="button"
                              onClick={() => toggleColor(color.name)}
                              className={cn(
                                "w-6 h-6 md:w-8 md:h-8 rounded-full border-2 transition-all",
                                selectedColors.includes(color.name) 
                                  ? "border-primary ring-2 ring-primary/30 scale-110" 
                                  : "border-transparent hover:scale-105"
                              )}
                              style={{ backgroundColor: color.hex }}
                              title={color.name}
                            />
                            <button
                              type="button"
                              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover/color:opacity-100 transition-opacity"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedColors(prev => prev.filter(c => c !== color.name));
                                deleteColorMutation.mutate(color.id);
                              }}
                            >
                              <X className="h-2 w-2" />
                            </button>
                          </div>
                        ))}
                      </div>
                      {selectedColors.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {selectedColors.join(', ')}
                        </p>
                      )}

                      {/* Dialog nova cor */}
                      <Dialog open={newColorDialogOpen} onOpenChange={setNewColorDialogOpen}>
                        <DialogContent className="max-w-xs">
                          <DialogHeader>
                            <DialogTitle>Nova Cor</DialogTitle>
                            <DialogDescription>Adicione uma cor à paleta.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Nome</Label>
                              <Input value={newColorName} onChange={e => setNewColorName(e.target.value)} placeholder="Ex: Azul Serenity" />
                            </div>
                            <div className="flex items-center gap-3">
                              <Label className="text-xs">Cor</Label>
                              <input type="color" value={newColorHex} onChange={e => setNewColorHex(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                              <span className="text-xs text-muted-foreground">{newColorHex}</span>
                            </div>
                            <Button
                              size="sm"
                              className="w-full"
                              disabled={!newColorName.trim() || createColorMutation.isPending}
                              onClick={async () => {
                                await createColorMutation.mutateAsync({ name: newColorName.trim(), hex: newColorHex, position: productColors.length });
                                setNewColorDialogOpen(false);
                                setNewColorName('');
                                setNewColorHex('#000000');
                              }}
                            >
                              {createColorMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {/* Sizes - compact grid for shoes, wider for clothing */}
                    <div className="space-y-2 md:space-y-3">
                      <Label className="text-xs font-medium">
                        Tamanhos {isFootwear && <span className="text-muted-foreground">(Numeração)</span>}
                      </Label>
                      {isFootwear && (
                        <div className="flex gap-1 mb-1">
                          {(['BR', 'US', 'EU'] as const).map(sys => (
                            <button
                              key={sys}
                              type="button"
                              onClick={() => { setShoeSystem(sys); setSelectedSizes([]); }}
                              className={cn(
                                "px-2.5 py-1 text-xs font-medium rounded-md border transition-all",
                                shoeSystem === sys
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background border-input hover:bg-muted"
                              )}
                            >
                              {sys}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className={cn(
                        "grid gap-1 md:flex md:flex-wrap md:gap-1.5",
                        isFootwear ? "grid-cols-8" : "grid-cols-5"
                      )}>
                      {availableSizes.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => toggleSize(size)}
                            className={cn(
                              "text-xs font-medium border transition-all",
                              isFootwear ? "px-1.5 py-1 md:px-3 md:py-1.5" : "px-3 py-2 md:px-3 md:py-1.5",
                              selectedSizes.includes(size) 
                                ? "bg-primary text-primary-foreground border-primary" 
                                : "bg-background border-input hover:bg-muted"
                            )}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                      {categorySizeType === 'clothing' && (
                        <>
                          <p className="text-xs font-medium text-muted-foreground mt-2">Plus Size</p>
                          <div className="grid grid-cols-6 gap-1 md:flex md:flex-wrap md:gap-1.5">
                            {PLUS_SIZES.map((size) => (
                              <button
                                key={size}
                                type="button"
                                onClick={() => toggleSize(size)}
                                className={cn(
                                  "text-xs font-medium border transition-all px-3 py-2 md:px-3 md:py-1.5",
                                  selectedSizes.includes(size) 
                                    ? "bg-primary text-primary-foreground border-primary" 
                                    : "bg-background border-input hover:bg-muted"
                                )}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                      {selectedSizes.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {selectedSizes.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Variant Inventory - Cards on mobile, Table on desktop */}
                  {hasVariants && fulfillmentType === 'in_stock' && (
                    <div className="space-y-3">
                      <Label className="text-xs font-medium">Estoque por Variante</Label>
                      
                      {/* Mobile: Compact cards */}
                      <div className="md:hidden space-y-2">
                        {getAllVariantKeys().map(key => {
                          const [color, size] = key.split('-');
                          const qty = getInventoryForVariant(key);
                          const enabled = isVariantEnabled(key);
                          const isOnRequest = qty === 0 && enabled;
                          const costValue = getCostForVariant(key);
                          
                          return (
                            <div key={key} className={cn(
                              "flex items-center gap-2 p-2.5 border rounded-md",
                              !enabled && "opacity-50"
                            )}>
                              {/* Color + Size label */}
                              <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                                {selectedColors.length > 0 && (
                                  <span 
                                    className="w-3 h-3 rounded-full border shrink-0"
                                    style={{ backgroundColor: productColors.find(c => c.name === color)?.hex }}
                                  />
                                )}
                                <span className="text-xs font-medium truncate max-w-[60px]">
                                  {color !== 'default' ? color : ''} {size !== 'default' ? size : ''}
                                </span>
                              </div>

                              {/* Cost */}
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={costValue || ''}
                                onChange={(e) => updateVariantCost(key, parseFloat(e.target.value) || 0)}
                                placeholder="R$"
                                className="h-7 w-14 text-xs text-center"
                                disabled={!enabled}
                              />

                              {/* Qty controls */}
                              <div className="flex items-center gap-1 ml-auto">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6"
                                  disabled={!enabled}
                                  onClick={() => updateVariantInventory(key, -1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-6 text-center text-xs font-medium">
                                  {qty}
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6"
                                  disabled={!enabled}
                                  onClick={() => updateVariantInventory(key, 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>

                              {isOnRequest && (
                                <Badge variant="secondary" className="text-[9px] px-1 shrink-0">
                                  A pedir
                                </Badge>
                              )}

                              {/* Toggle */}
                              <Switch
                                checked={enabled}
                                onCheckedChange={() => toggleVariantEnabled(key)}
                                className="shrink-0"
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop: Table */}
                      <div className="hidden md:block border rounded-md overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {selectedColors.length > 0 && <TableHead className="text-xs">Cor</TableHead>}
                              {selectedSizes.length > 0 && <TableHead className="text-xs">Tamanho</TableHead>}
                              <TableHead className="text-xs text-center">Custo</TableHead>
                              <TableHead className="text-xs text-center">Qtd</TableHead>
                              <TableHead className="text-xs text-center w-20">Ativo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getAllVariantKeys().map(key => {
                              const [color, size] = key.split('-');
                              const qty = getInventoryForVariant(key);
                              const enabled = isVariantEnabled(key);
                              const isOnRequest = qty === 0 && enabled;
                              const costValue = getCostForVariant(key);
                              
                              return (
                                <TableRow key={key} className={cn(!enabled && "opacity-50")}>
                                  {selectedColors.length > 0 && (
                                    <TableCell className="text-xs py-2">
                                      <div className="flex items-center gap-2">
                                        <span 
                                          className="w-3 h-3 rounded-full border"
                                          style={{ backgroundColor: productColors.find(c => c.name === color)?.hex }}
                                        />
                                        {color || '-'}
                                      </div>
                                    </TableCell>
                                  )}
                                  {selectedSizes.length > 0 && (
                                    <TableCell className="text-xs py-2">{size !== 'default' ? size : '-'}</TableCell>
                                  )}
                                  <TableCell className="py-2">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={costValue || ''}
                                      onChange={(e) => updateVariantCost(key, parseFloat(e.target.value) || 0)}
                                      placeholder="0,00"
                                      className="h-7 w-16 text-xs text-center"
                                      disabled={!enabled}
                                    />
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <div className="flex items-center justify-center gap-1">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6"
                                        disabled={!enabled}
                                        onClick={() => updateVariantInventory(key, -1)}
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <span className="w-8 text-center text-sm font-medium">
                                        {qty}
                                      </span>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6"
                                        disabled={!enabled}
                                        onClick={() => updateVariantInventory(key, 1)}
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                      {isOnRequest && (
                                        <Badge variant="secondary" className="ml-2 text-[10px] whitespace-nowrap">
                                          A pedir
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2 text-center">
                                    <Switch
                                      checked={enabled}
                                      onCheckedChange={() => toggleVariantEnabled(key)}
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Variantes com estoque 0 serão marcadas como "A pedir"
                      </p>
                    </div>
                  )}

                </CollapsibleContent>
              </Collapsible>
            </form>
          </div>

          {/* Sticky Footer - Save Button */}
          <div className="sticky bottom-0 z-10 bg-background border-t px-4 py-2 md:py-3 md:px-0 md:py-0 md:pt-4 md:border-t-0 safe-area-pb">
            <Button
              type="submit"
              form="product-form"
              disabled={isSubmitting}
              className="w-full bg-gold text-gold-foreground hover:bg-gold/90 font-medium tracking-wide"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'SALVAR PRODUTO'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Preview Dialog */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden bg-black">
          <div className="relative w-full h-[85vh] flex items-center justify-center">
            {currentMedia?.type === 'image' ? (
              <img 
                src={currentMedia.preview} 
                alt="Preview" 
                className="max-w-full max-h-full object-contain"
              />
            ) : currentMedia?.type === 'video' ? (
              <video 
                src={currentMedia.preview} 
                className="max-w-full max-h-full"
                controls
                autoPlay
              />
            ) : null}
            
            {mediaItems.length > 1 && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  onClick={() => navigateMedia('prev')}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  onClick={() => navigateMedia('next')}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 p-2 rounded-lg">
              {mediaItems.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentMediaIndex(idx)}
                  className={cn(
                    "w-12 h-12 rounded overflow-hidden border-2 transition-all",
                    idx === currentMediaIndex 
                      ? "border-primary" 
                      : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  {item.type === 'image' ? (
                    <img src={item.preview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Video className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Category Dialog */}
      <Dialog open={newCatDialogOpen} onOpenChange={setNewCatDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-light">Nova Categoria</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Crie uma nova categoria de produto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Nome</Label>
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Ex: Acessórios"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Tipo de numeração</Label>
              <Select value={newCatSizeType} onValueChange={(v) => setNewCatSizeType(v as SizeType)}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem tamanhos</SelectItem>
                  <SelectItem value="clothing">👕 Vestimenta (PP, P, M, G...)</SelectItem>
                  <SelectItem value="shoes">👟 Calçado (33-48)</SelectItem>
                  <SelectItem value="pants">👖 Calça (36-62)</SelectItem>
                  <SelectItem value="volume_ml">🧴 Volume em ml (perfumes, cremes, batons)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 rounded-md border p-2.5">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={newCatTracksExpiry}
                  onChange={(e) => setNewCatTracksExpiry(e.target.checked)}
                  className="h-4 w-4"
                />
                Controla validade
              </label>
              {newCatTracksExpiry && (
                <div className="space-y-1 pl-6">
                  <Label className="text-[10px] text-muted-foreground">Avisar quantos dias antes de vencer</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newCatExpiryAlertDays}
                    onChange={(e) => setNewCatExpiryAlertDays(parseInt(e.target.value) || 60)}
                    className="text-sm h-8"
                  />
                  <p className="text-[10px] text-muted-foreground">Produtos vencidos ficam indisponíveis na loja.</p>
                </div>
              )}
            </div>
            <Button
              type="button"
              onClick={handleCreateCategory}
              disabled={createCategoryMutation.isPending || !newCatName.trim()}
              className="w-full"
            >
              {createCategoryMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Criar Categoria
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Supplier Dialog */}
      <Dialog open={newSupplierDialogOpen} onOpenChange={setNewSupplierDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-light">Novo Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-light">Nome</Label>
              <Input value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} placeholder="Nome do fornecedor" className="font-light" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-light">Tipo</Label>
              <Select value={newSupplierType} onValueChange={(v: 'own' | 'consignment') => setNewSupplierType(v)}>
                <SelectTrigger className="font-light">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="own">Próprio</SelectItem>
                  <SelectItem value="consignment">Consignação</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setNewSupplierDialogOpen(false)} className="font-light">Cancelar</Button>
            <Button onClick={handleCreateSupplier} disabled={createSupplierMutation.isPending} className="font-light">
              Criar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
