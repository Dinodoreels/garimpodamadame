import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Loader2, Plus, Minus, X, ImagePlus, Video, Sparkles, Bot, FileText, Tag, Scan, Wand2, Package, Truck, Check, Star, Calculator } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableImageItem } from './SortableImageItem';
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
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useProductCategories, SizeType } from '@/hooks/useProductCategories';
import { useProductColors, useCreateColor, useDeleteColor } from '@/hooks/useProductColors';
import { useSuppliers } from '@/hooks/useSuppliers';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PricingCalculator } from '@/components/admin/PricingCalculator';

// Tamanhos de roupa
const CLOTHING_SIZES = ['PP', 'P', 'M', 'G', 'GG', '2GG', '3GG', '4GG', '5GG', '6GG', '7GG', 'XG', 'XGG', 'EXG', 'ÚNICO'];
const PLUS_SIZES = ['46', '48', '50', '52', '54', '56', '58', '60', '62', '64', '66', '68'];
const PANTS_SIZES = ['36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58', '60', '62'];

// Numerações de calçados por sistema
const SHOE_SIZES_BR = ['33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48'];
const SHOE_SIZES_US = ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13', '14'];
const SHOE_SIZES_EU = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50'];

export interface ImageData {
  id: string;
  file?: File;
  base64?: string;
  filename?: string;
  is_primary?: boolean;
  position?: number;
}

export interface ProductFormData {
  title: string;
  body: string;
  product_type: string;
  vendor: string;
  tags: string;
  fulfillment_type: 'in_stock' | 'dropship';
  dropship_lead_time?: number;
  dropship_message?: string;
  weight_grams?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  expiry_date?: string | null;
  is_lote?: boolean;
  variants: Array<{
    price: string;
    sku: string;
    cost?: number;
    option1?: string;
    option2?: string;
    inventory_quantity?: number;
    is_available?: boolean;
    inventory_policy?: 'deny' | 'continue';
    volume_ml?: number | null;
    expiry_date?: string | null;
  }>;
  options: Array<{
    name: string;
    values: string[];
  }>;
  images: ImageData[];
  videos: Array<{ file?: File; base64?: string; filename?: string }>;
}

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProductFormData) => Promise<void>;
  initialData?: ProductFormData;
  mode: 'create' | 'edit';
}

const defaultFormData: ProductFormData = {
  title: '',
  body: '',
  product_type: '',
  vendor: '',
  tags: '',
  fulfillment_type: 'in_stock',
  dropship_lead_time: 7,
  dropship_message: '',
  is_lote: false,
  variants: [{ price: '', sku: '' }],
  options: [],
  images: [],
  videos: [],
};

export function ProductDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  initialData,
  mode 
}: ProductDialogProps) {
  const { data: categories = [] } = useProductCategories();
  const { data: productColors = [] } = useProductColors();
  const { data: suppliers = [] } = useSuppliers();
  const createColorMutation = useCreateColor();
  const deleteColorMutation = useDeleteColor();
  const [newColorDialogOpen, setNewColorDialogOpen] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [optionInput, setOptionInput] = useState({ name: '', values: '' });
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  
  // Novos estados para seletores visuais
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [customColorName, setCustomColorName] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sizeType, setSizeType] = useState<'clothing' | 'shoes' | 'pants'>('clothing');
  const [shoeSystem, setShoeSystem] = useState<'BR' | 'US' | 'EU'>('BR');
  const [variantInventory, setVariantInventory] = useState<Record<string, number>>({});
  const [variantEnabled, setVariantEnabled] = useState<Record<string, boolean>>({});
  const [defaultInventory, setDefaultInventory] = useState(10);
  const [fulfillmentType, setFulfillmentType] = useState<'in_stock' | 'dropship'>('in_stock');
  const [dropshipLeadTime, setDropshipLeadTime] = useState(7);
  const [dropshipMessage, setDropshipMessage] = useState('Este item é sob encomenda e será enviado em até X dias úteis.');
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Função auxiliar para gerar SKU (definida antes do useMemo que a usa)
  const generateSKU = (color: string, size: string): string => {
    const colorCode = color !== 'Default' ? color.toUpperCase().slice(0, 3) : '';
    const sizeCode = size !== 'Default' ? size : '';
    return [colorCode, sizeCode].filter(Boolean).join('-') || '';
  };

  // Detectar automaticamente o tipo de tamanho baseado na categoria
  useEffect(() => {
    const cat = categories.find(c => c.value === formData.product_type);
    if (cat?.size_type && cat.size_type !== 'none') {
      setSizeType(cat.size_type as 'clothing' | 'shoes' | 'pants');
    } else if (formData.product_type === 'CALCADOS') {
      setSizeType('shoes');
    } else if (cat?.has_sizes) {
      setSizeType('clothing');
    }
  }, [formData.product_type, categories]);

  // Gerar variantes automaticamente quando cores/tamanhos mudam
  const generatedVariants = useMemo(() => {
    if (selectedColors.length === 0 && selectedSizes.length === 0) return [];
    
    const basePrice = formData.variants[0]?.price || '';
    const newVariants: ProductFormData['variants'] = [];
    
    const colors = selectedColors.length > 0 ? selectedColors : ['Default'];
    const sizes = selectedSizes.length > 0 ? selectedSizes : ['Default'];
    
    for (const color of colors) {
      for (const size of sizes) {
        const key = `${color}-${size}`;
        const isEnabled = variantEnabled[key] ?? true;
        const sku = generateSKU(color, size);
        newVariants.push({
          price: basePrice,
          sku,
          option1: color !== 'Default' ? color : undefined,
          option2: size !== 'Default' ? size : undefined,
          inventory_quantity: !isEnabled 
            ? 0 
            : (fulfillmentType === 'dropship' 
              ? 0 
              : (variantInventory[key] ?? defaultInventory)),
          inventory_policy: fulfillmentType === 'dropship' ? 'continue' : 'deny',
        });
      }
    }
    
    return newVariants;
  }, [selectedColors, selectedSizes, formData.variants[0]?.price, variantInventory, variantEnabled, defaultInventory, fulfillmentType]);

  // Atualizar formData quando variantes geradas mudam
  useEffect(() => {
    if (generatedVariants.length > 0) {
      const newOptions: ProductFormData['options'] = [];
      if (selectedColors.length > 0) {
        newOptions.push({ name: 'Cor', values: selectedColors });
      }
      if (selectedSizes.length > 0) {
        newOptions.push({ name: 'Tamanho', values: selectedSizes });
      }
      
      setFormData(prev => ({
        ...prev,
        variants: generatedVariants,
        options: newOptions,
        fulfillment_type: fulfillmentType,
        dropship_lead_time: fulfillmentType === 'dropship' ? dropshipLeadTime : undefined,
        dropship_message: fulfillmentType === 'dropship' ? dropshipMessage : undefined,
      }));
    }
  }, [generatedVariants, selectedColors, selectedSizes, fulfillmentType, dropshipLeadTime, dropshipMessage]);

  const toggleColor = (colorName: string) => {
    setSelectedColors(prev => 
      prev.includes(colorName) 
        ? prev.filter(c => c !== colorName)
        : [...prev, colorName]
    );
  };

  const addCustomColor = () => {
    if (!customColorName.trim()) return;
    if (selectedColors.includes(customColorName.trim())) {
      toast.error('Cor já adicionada');
      return;
    }
    setSelectedColors(prev => [...prev, customColorName.trim()]);
    setCustomColorName('');
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) 
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  const selectAllSizes = () => {
    const sizes = sizeType === 'clothing' ? [...CLOTHING_SIZES, ...PLUS_SIZES] : sizeType === 'pants' ? PANTS_SIZES : (shoeSystem === 'US' ? SHOE_SIZES_US : shoeSystem === 'EU' ? SHOE_SIZES_EU : SHOE_SIZES_BR);
    setSelectedSizes(sizes);
  };

  const clearSizes = () => {
    setSelectedSizes([]);
  };

  const updateVariantInventory = (color: string, size: string, quantity: number) => {
    const key = `${color}-${size}`;
    setVariantInventory(prev => ({ ...prev, [key]: quantity }));
  };

  const applyDefaultToAll = () => {
    const newInventory: Record<string, number> = {};
    const colors = selectedColors.length > 0 ? selectedColors : ['Default'];
    const sizes = selectedSizes.length > 0 ? selectedSizes : ['Default'];
    
    for (const color of colors) {
      for (const size of sizes) {
        newInventory[`${color}-${size}`] = defaultInventory;
      }
    }
    setVariantInventory(newInventory);
    toast.success(`Estoque padrão (${defaultInventory}) aplicado a todas variantes`);
  };

  const getColorHex = (colorName: string): string => {
    const found = productColors.find(c => c.name === colorName);
    return found?.hex || '#808080';
  };

  const toggleVariantEnabled = (color: string, size: string) => {
    const key = `${color}-${size}`;
    setVariantEnabled(prev => ({
      ...prev,
      [key]: !(prev[key] ?? true)
    }));
  };

  const incrementInventory = (color: string, size: string) => {
    const key = `${color}-${size}`;
    const currentQty = variantInventory[key] ?? defaultInventory;
    updateVariantInventory(color, size, currentQty + 1);
  };

  const decrementInventory = (color: string, size: string) => {
    const key = `${color}-${size}`;
    const currentQty = variantInventory[key] ?? defaultInventory;
    if (currentQty > 0) {
      updateVariantInventory(color, size, currentQty - 1);
    }
  };

  const callProductAI = async (action: string, extraData: Record<string, any> = {}) => {
    setAiLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke('product-ai-assistant', {
        body: {
          action,
          title: formData.title,
          type: formData.product_type,
          vendor: formData.vendor,
          description: formData.body,
          ...extraData,
        }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('AI Error:', err);
      toast.error('Erro ao comunicar com a IA');
      return null;
    } finally {
      setAiLoading(null);
    }
  };

  // Resolve any ImageData (new File OR existing base64/URL) into base64 + mime
  const getImagePayload = async (img: ImageData): Promise<{ data: string; mime: string } | null> => {
    try {
      if (img.file) {
        const dataUrl: string = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.onerror = rej;
          r.readAsDataURL(img.file as File);
        });
        const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        return m ? { mime: m[1], data: m[2] } : null;
      }
      const src = img.base64;
      if (!src) return null;
      if (src.startsWith('data:')) {
        const m = src.match(/^data:([^;]+);base64,(.+)$/);
        return m ? { mime: m[1], data: m[2] } : null;
      }
      if (/^https?:\/\//.test(src)) {
        const resp = await fetch(src);
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

  const handleGenerateDescription = async () => {
    if (!formData.title) {
      toast.error('Adicione um título primeiro');
      return;
    }
    const result = await callProductAI('generateDescription');
    if (result?.description) {
      setFormData(prev => ({ ...prev, body: result.description }));
      toast.success('Descrição gerada!');
    }
  };

  const handleGenerateTags = async () => {
    if (!formData.title) {
      toast.error('Adicione um título primeiro');
      return;
    }
    const result = await callProductAI('generateTags');
    if (result?.tags) {
      setFormData(prev => ({ ...prev, tags: result.tags }));
      toast.success('Tags geradas!');
    }
  };

  const handleAnalyzeImage = async () => {
    if (formData.images.length === 0) {
      toast.error('Adicione uma imagem primeiro');
      return;
    }
    const payload = await getImagePayload(formData.images[0]);
    if (!payload) {
      toast.error('Não foi possível ler a imagem');
      return;
    }
    const result = await callProductAI('analyzeImage', { imageBase64: payload.data, imageMime: payload.mime });
    if (result?.error) {
      toast.error(result.error || 'A IA não conseguiu analisar a imagem.');
      return;
    }
    if (result) {
      const filled = ['title','type','description','tags'].filter(k => result[k]);
      if (filled.length === 0) {
        toast.error('A IA não extraiu informações desta imagem. Tente outra.');
        return;
      }
      if (result.title) setFormData(prev => ({ ...prev, title: result.title }));
      if (result.type) setFormData(prev => ({ ...prev, product_type: result.type }));
      if (result.description) setFormData(prev => ({ ...prev, body: result.description }));
      if (result.tags) setFormData(prev => ({ ...prev, tags: result.tags }));
      toast.success('Imagem analisada!');
    }
  };

  const handleAutoFill = async () => {
    let imageBase64: string | undefined;
    let imageMime: string | undefined;

    if (formData.images.length > 0) {
      const payload = await getImagePayload(formData.images[0]);
      if (payload) {
        imageBase64 = payload.data;
        imageMime = payload.mime;
      } else {
        console.warn('Não foi possível ler a imagem para envio à IA');
      }
    }

    const result = await callProductAI('autoFill', { imageBase64, imageMime });

    if (result?.error) {
      toast.error(result.error || 'A IA não conseguiu processar a resposta.');
      return;
    }
    if (result) {
      const filled = ['title','type','description','tags','weight_grams','length_cm','width_cm','height_cm']
        .filter(k => result[k] !== undefined && result[k] !== null && result[k] !== '');
      if (filled.length === 0) {
        toast.error('A IA não conseguiu extrair informações. Tente outra imagem.');
        return;
      }
      setFormData(prev => ({
        ...prev,
        ...(result.title && { title: result.title }),
        ...(result.type && { product_type: result.type }),
        ...(result.description && { body: result.description }),
        ...(result.tags && { tags: result.tags }),
      }));
      toast.success(`Campos preenchidos automaticamente! (${filled.length})`);
    }
  };

  useEffect(() => {
    if (open) {
      setFormData(initialData || defaultFormData);
      setImagePreviews([]);
      setVideoPreviews([]);
      setSelectedColors([]);
      setSelectedSizes([]);
      setVariantInventory({});
      setFulfillmentType(initialData?.fulfillment_type || 'in_stock');
      setDropshipLeadTime(initialData?.dropship_lead_time || 7);
      setDropshipMessage(initialData?.dropship_message || 'Este item é sob encomenda e será enviado em até X dias úteis.');
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    if (!formData.variants[0]?.price) {
      toast.error('Preço é obrigatório');
      return;
    }

    setIsSubmitting(true);
    try {
      const processedData = { ...formData };
      
      const processedImages: ImageData[] = await Promise.all(
        formData.images.map(async (img, index) => {
          const base: ImageData = {
            id: img.id,
            is_primary: img.is_primary,
            position: index,
          };
          if (img.file) {
            const base64 = await fileToBase64(img.file);
            return { ...base, base64, filename: img.file.name };
          }
          return { ...base, base64: img.base64, filename: img.filename };
        })
      );
      processedData.images = processedImages;
      
      const processedVideos = await Promise.all(
        formData.videos.map(async (vid) => {
          if (vid.file) {
            const base64 = await fileToBase64(vid.file);
            return { base64, filename: vid.file.name };
          }
          return vid;
        })
      );
      processedData.videos = processedVideos;
      
      await onSubmit(processedData);
      onOpenChange(false);
      setFormData(defaultFormData);
      setImagePreviews([]);
      setVideoPreviews([]);
      setSelectedColors([]);
      setSelectedSizes([]);
      setVariantInventory({});
    } catch (error) {
      console.error('Error submitting product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const updateVariant = (index: number, field: string, value: string) => {
    const newVariants = [...formData.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData({ ...formData, variants: newVariants });
  };

  const addOption = () => {
    if (!optionInput.name.trim() || !optionInput.values.trim()) {
      toast.error('Nome e valores da opção são obrigatórios');
      return;
    }

    const values = optionInput.values.split(',').map(v => v.trim()).filter(Boolean);
    if (values.length === 0) {
      toast.error('Adicione pelo menos um valor');
      return;
    }

    setFormData({
      ...formData,
      options: [...formData.options, { name: optionInput.name.trim(), values }],
    });
    setOptionInput({ name: '', values: '' });
  };

  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} não é uma imagem válida`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} é maior que 5MB`);
        return false;
      }
      return true;
    });

    const newPreviews: string[] = [];
    const newImages: ImageData[] = [];

    validFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      newPreviews.push(url);
      newImages.push({
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        is_primary: false,
        position: formData.images.length + newImages.length,
      });
    });

    setImagePreviews(prev => [...prev, ...newPreviews]);
    
    setFormData(prev => {
      const updatedImages = [...prev.images, ...newImages];
      // Se não há imagem principal, definir a primeira como principal
      const hasPrimary = updatedImages.some(img => img.is_primary);
      if (!hasPrimary && updatedImages.length > 0) {
        updatedImages[0].is_primary = true;
      }
      return { ...prev, images: updatedImages };
    });

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('video/')) {
        toast.error(`${file.name} não é um vídeo válido`);
        return false;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name} é maior que 50MB`);
        return false;
      }
      return true;
    });

    validFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      setVideoPreviews(prev => [...prev, url]);
    });

    setFormData(prev => ({
      ...prev,
      videos: [...prev.videos, ...validFiles.map(file => ({ file }))],
    }));

    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const removeImage = (imageId: string) => {
    const index = formData.images.findIndex(img => img.id === imageId);
    if (index === -1) return;
    
    if (imagePreviews[index]) {
      URL.revokeObjectURL(imagePreviews[index]);
    }
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    
    const removedImage = formData.images[index];
    setFormData(prev => {
      const updatedImages = prev.images.filter((_, i) => i !== index);
      // Se a imagem removida era principal, definir a primeira como principal
      if (removedImage?.is_primary && updatedImages.length > 0) {
        updatedImages[0].is_primary = true;
      }
      return { ...prev, images: updatedImages };
    });
  };

  const setAsPrimaryImage = (imageId: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map(img => ({
        ...img,
        is_primary: img.id === imageId,
      })),
    }));
    toast.success('Imagem principal definida');
  };

  // Dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = formData.images.findIndex(img => img.id === active.id);
      const newIndex = formData.images.findIndex(img => img.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        setFormData(prev => ({
          ...prev,
          images: arrayMove(prev.images, oldIndex, newIndex).map((img, idx) => ({
            ...img,
            position: idx,
          })),
        }));
        
        // Also reorder previews
        setImagePreviews(prev => arrayMove(prev, oldIndex, newIndex));
      }
    }
  };

  const removeVideo = (index: number) => {
    if (videoPreviews[index]) {
      URL.revokeObjectURL(videoPreviews[index]);
    }
    setVideoPreviews(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      videos: prev.videos.filter((_, i) => i !== index),
    }));
  };

  const shoeSystemSizes = { BR: SHOE_SIZES_BR, US: SHOE_SIZES_US, EU: SHOE_SIZES_EU };
  const currentSizes = sizeType === 'clothing' ? CLOTHING_SIZES : sizeType === 'pants' ? PANTS_SIZES : shoeSystemSizes[shoeSystem];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-light tracking-wide">
            {mode === 'create' ? 'Novo Produto' : 'Editar Produto'}
          </DialogTitle>
          <DialogDescription className="font-light">
            {mode === 'create' 
              ? 'Preencha os dados do produto para adicionar ao catálogo'
              : 'Atualize as informações do produto'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Painel Assistente IA */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAiPanel(!showAiPanel)}
              className="w-full flex items-center justify-center gap-2 border-dashed"
            >
              <Sparkles className="h-4 w-4" />
              {showAiPanel ? 'Ocultar Assistente IA' : 'Assistente IA - Configuração Automática'}
            </Button>

            {showAiPanel && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Bot className="h-4 w-4 text-primary" />
                  <span>Deixe a IA configurar seu produto automaticamente!</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleGenerateDescription}
                    disabled={!!aiLoading}
                    className="flex items-center gap-2"
                  >
                    {aiLoading === 'generateDescription' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    Gerar Descrição
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleGenerateTags}
                    disabled={!!aiLoading}
                    className="flex items-center gap-2"
                  >
                    {aiLoading === 'generateTags' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Tag className="h-4 w-4" />
                    )}
                    Sugerir Tags
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAnalyzeImage}
                    disabled={!!aiLoading || formData.images.length === 0}
                    className="flex items-center gap-2"
                  >
                    {aiLoading === 'analyzeImage' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Scan className="h-4 w-4" />
                    )}
                    Analisar Imagem
                  </Button>

                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handleAutoFill}
                    disabled={!!aiLoading}
                    className="flex items-center gap-2 bg-primary"
                  >
                    {aiLoading === 'autoFill' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    Preencher Tudo
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  💡 Dica: Adicione uma imagem para a IA identificar o produto automaticamente!
                </p>
              </div>
            )}
          </div>

          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
              Informações Básicas
            </h3>
            
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="font-light">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nome do produto"
                  className="font-light"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body" className="font-light">Descrição</Label>
                <Textarea
                  id="body"
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Descrição detalhada do produto"
                  className="font-light min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product_type" className="font-light">Tipo</Label>
                  <Select
                    value={formData.product_type}
                    onValueChange={(value) => setFormData({ ...formData, product_type: value })}
                  >
                    <SelectTrigger className="font-light">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendor" className="font-light">Marca</Label>
                  <Input
                    id="vendor"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    placeholder="Nome da marca"
                    className="font-light"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-light">Fornecedor</Label>
                  <Select value={(formData as any).supplier_id || ''} onValueChange={(v) => setFormData({ ...formData, vendor: formData.vendor } as any)}>
                    <SelectTrigger className="font-light">
                      <SelectValue placeholder="Selecione fornecedor..." />
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
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="is_lote" className="font-light">Vender em lote</Label>
                  <p className="text-xs text-muted-foreground font-light">
                    Aparece na aba LOTE da loja
                  </p>
                </div>
                <Switch
                  id="is_lote"
                  checked={!!formData.is_lote}
                  onCheckedChange={(v) => setFormData({ ...formData, is_lote: v })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags" className="font-light">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Tags separadas por vírgula"
                  className="font-light"
                />
              </div>
            </div>
          </div>

          {/* Mídia - Imagens */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
              Imagens
            </h3>
            
            <div className="space-y-3">
              {formData.images.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground">
                    Arraste para reordenar • Clique ⭐ para definir imagem principal
                  </p>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={formData.images.map(img => img.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-4 gap-3">
                        {formData.images.map((image, index) => (
                          <SortableImageItem
                            key={image.id}
                            id={image.id}
                            preview={imagePreviews[index] || ''}
                            isPrimary={image.is_primary ?? false}
                            onRemove={() => removeImage(image.id)}
                            onSetPrimary={() => setAsPrimaryImage(image.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </>
              )}

              <div
                onClick={() => imageInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-md p-6 text-center cursor-pointer hover:border-foreground/50 transition-colors"
              >
                <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground font-light">
                  Clique para adicionar imagens
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  JPG, PNG, WEBP (máx. 5MB)
                </p>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Mídia - Vídeos */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
              Vídeos
            </h3>
            
            <div className="space-y-3">
              {videoPreviews.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {videoPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <video
                        src={preview}
                        className="w-full aspect-video object-cover rounded-md border border-border"
                        controls
                      />
                      <button
                        type="button"
                        onClick={() => removeVideo(index)}
                        className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div
                onClick={() => videoInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-md p-6 text-center cursor-pointer hover:border-foreground/50 transition-colors"
              >
                <Video className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground font-light">
                  Clique para adicionar vídeos
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  MP4, WEBM (máx. 50MB)
                </p>
              </div>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm"
                multiple
                onChange={handleVideoSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Preço Base */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
              Preço Base
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price" className="font-light">Preço (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.variants[0]?.price || ''}
                  onChange={(e) => updateVariant(0, 'price', e.target.value)}
                  placeholder="0.00"
                  className="font-light"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku" className="font-light">SKU Base</Label>
                <Input
                  id="sku"
                  value={formData.variants[0]?.sku || ''}
                  onChange={(e) => updateVariant(0, 'sku', e.target.value)}
                  placeholder="Código do produto"
                  className="font-light"
                />
              </div>
            </div>

            {/* Calculator button */}
            <div className="flex justify-end">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Calculator className="h-4 w-4" />
                    Calculadora de precificação
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" side="left" align="start">
                  <PricingCalculator
                    initialCost={parseFloat(formData.variants[0]?.cost?.toString() || '0')}
                    initialPrice={parseFloat(formData.variants[0]?.price?.toString() || '0')}
                    onUsePrice={(newPrice) => updateVariant(0, 'price', newPrice.toFixed(2))}
                    compact
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Cores */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium tracking-wide uppercase text-muted-foreground flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 via-green-500 to-blue-500" />
              Cores
            </h3>
            
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Clique para selecionar:</p>
              
              {/* Paleta de cores */}
              <div className="flex flex-wrap gap-2">
                {productColors.map((color) => (
                  <div key={color.name} className="relative group/color">
                    <button
                      type="button"
                      onClick={() => toggleColor(color.name)}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all relative",
                        selectedColors.includes(color.name) 
                          ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background" 
                          : "border-border hover:border-foreground/50"
                      )}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    >
                      {selectedColors.includes(color.name) && (
                        <Check 
                          className={cn(
                            "h-4 w-4 absolute inset-0 m-auto",
                            ['Branco', 'Bege', 'Amarelo', 'Prata', 'Creme'].includes(color.name) 
                              ? "text-gray-800" 
                              : "text-white"
                          )} 
                        />
                      )}
                    </button>
                    <button
                      type="button"
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover/color:opacity-100 transition-opacity"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedColors(prev => prev.filter(c => c !== color.name));
                        deleteColorMutation.mutate(color.id);
                      }}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setNewColorDialogOpen(true)}
                  className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center hover:border-primary/50 transition-colors"
                  title="Nova cor"
                >
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

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

              {/* Cores selecionadas */}
              {selectedColors.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedColors.map((colorName) => (
                    <div
                      key={colorName}
                      className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-sm"
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-border"
                        style={{ backgroundColor: getColorHex(colorName) }}
                      />
                      <span>{colorName}</span>
                      <button
                        type="button"
                        onClick={() => toggleColor(colorName)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Cor personalizada */}
              <div className="flex gap-2">
                <Input
                  placeholder="Cor personalizada (ex: Vinho)"
                  value={customColorName}
                  onChange={(e) => setCustomColorName(e.target.value)}
                  className="font-light flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomColor())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addCustomColor}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Tamanhos */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
              Tamanhos
            </h3>
            
            <div className="space-y-3">
              {/* Toggle tipo de tamanho */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={sizeType === 'clothing' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setSizeType('clothing'); setSelectedSizes([]); }}
                  className="flex-1"
                >
                  👕 Roupas
                </Button>
                <Button
                  type="button"
                  variant={sizeType === 'shoes' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setSizeType('shoes'); setSelectedSizes([]); }}
                  className="flex-1"
                >
                  👟 Calçados
                </Button>
                <Button
                  type="button"
                  variant={sizeType === 'pants' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setSizeType('pants'); setSelectedSizes([]); }}
                  className="flex-1"
                >
                  👖 Calças
                </Button>
              </div>

              {/* Shoe system selector */}
              {sizeType === 'shoes' && (
                <div className="flex gap-1">
                  {(['BR', 'US', 'EU'] as const).map(sys => (
                    <Button
                      key={sys}
                      type="button"
                      variant={shoeSystem === sys ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setShoeSystem(sys); setSelectedSizes([]); }}
                      className="px-3"
                    >
                      {sys}
                    </Button>
                  ))}
                </div>
              )}

              {/* Grid de tamanhos */}
              <div className="flex flex-wrap gap-2">
                {currentSizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={cn(
                      "px-3 py-2 rounded-md border text-sm font-medium transition-all min-w-[44px]",
                      selectedSizes.includes(size)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:border-foreground/50"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
              {sizeType === 'clothing' && (
                <>
                  <p className="text-xs font-medium text-muted-foreground">Plus Size</p>
                  <div className="flex flex-wrap gap-2">
                    {PLUS_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(size)}
                        className={cn(
                          "px-3 py-2 rounded-md border text-sm font-medium transition-all min-w-[44px]",
                          selectedSizes.includes(size)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:border-foreground/50"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Ações de seleção */}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAllSizes}>
                  Selecionar Todos
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearSizes}>
                  Limpar
                </Button>
              </div>
            </div>
          </div>

          {/* Disponibilidade / Fulfillment */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
              Disponibilidade
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFulfillmentType('in_stock')}
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-all",
                  fulfillmentType === 'in_stock'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-foreground/30"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Package className="h-5 w-5" />
                  <span className="font-medium">Estoque Próprio</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Itens disponíveis para envio imediato
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFulfillmentType('dropship')}
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-all",
                  fulfillmentType === 'dropship'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-foreground/30"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="h-5 w-5" />
                  <span className="font-medium">Dropship / Encomenda</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Produtos sob encomenda com prazo de entrega
                </p>
              </button>
            </div>

            {fulfillmentType === 'dropship' && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-light">Prazo de entrega (dias úteis)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="90"
                      value={dropshipLeadTime}
                      onChange={(e) => setDropshipLeadTime(parseInt(e.target.value) || 7)}
                      className="font-light"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-light">Mensagem ao cliente</Label>
                  <Textarea
                    value={dropshipMessage}
                    onChange={(e) => setDropshipMessage(e.target.value)}
                    placeholder="Este item é sob encomenda e será enviado em até X dias úteis."
                    className="font-light min-h-[60px]"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 Produtos dropship permitem vendas mesmo sem estoque físico. O cliente será informado sobre o prazo.
                </p>
              </div>
            )}
          </div>

          {/* Estoque por Variante */}
          {(selectedColors.length > 0 || selectedSizes.length > 0) && fulfillmentType === 'in_stock' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium tracking-wide uppercase text-muted-foreground flex items-center justify-between">
                <span>Estoque por Variante ({generatedVariants.length} variantes)</span>
              </h3>
              
              <div className="space-y-3">
                {/* Estoque padrão */}
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Label className="font-light whitespace-nowrap">Estoque padrão:</Label>
                  <Input
                    type="number"
                    min="0"
                    value={defaultInventory}
                    onChange={(e) => setDefaultInventory(parseInt(e.target.value) || 0)}
                    className="w-20 font-light"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={applyDefaultToAll}>
                    Aplicar a todos
                  </Button>
                </div>

                {/* Tabela de variantes */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-medium">Variante</th>
                          <th className="text-left p-3 font-medium">SKU</th>
                          <th className="text-center p-3 font-medium w-16">Ativo</th>
                          <th className="text-center p-3 font-medium w-36">Quantidade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {generatedVariants.map((variant, idx) => {
                          const color = variant.option1 || 'Default';
                          const size = variant.option2 || 'Default';
                          const key = `${color}-${size}`;
                          const isEnabled = variantEnabled[key] ?? true;
                          const qty = variantInventory[key] ?? defaultInventory;
                          return (
                            <tr key={idx} className={cn("hover:bg-muted/30 transition-opacity", !isEnabled && "opacity-50")}>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {color !== 'Default' && (
                                    <span
                                      className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                                      style={{ backgroundColor: getColorHex(color) }}
                                    />
                                  )}
                                  <span>
                                    {color !== 'Default' ? color : ''}
                                    {color !== 'Default' && size !== 'Default' && ' / '}
                                    {size !== 'Default' ? size : ''}
                                    {color === 'Default' && size === 'Default' && 'Padrão'}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 text-muted-foreground font-mono text-xs">
                                {variant.sku || '-'}
                              </td>
                              <td className="p-3 text-center">
                                <Switch
                                  checked={isEnabled}
                                  onCheckedChange={() => toggleVariantEnabled(color, size)}
                                />
                              </td>
                              <td className="p-3">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => decrementInventory(color, size)}
                                    disabled={!isEnabled || qty <= 0}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={qty}
                                    onChange={(e) => updateVariantInventory(color, size, parseInt(e.target.value) || 0)}
                                    disabled={!isEnabled}
                                    className="w-16 h-8 text-center font-light"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => incrementInventory(color, size)}
                                    disabled={!isEnabled}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info Dropship */}
          {(selectedColors.length > 0 || selectedSizes.length > 0) && fulfillmentType === 'dropship' && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    {generatedVariants.length} variantes serão criadas em modo Dropship
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Estoque será 0 para todas variantes. Vendas continuarão mesmo sem estoque disponível.
                    Prazo de {dropshipLeadTime} dias úteis será informado ao cliente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Opções Adicionais (manual) */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
              Opções Adicionais
            </h3>
            
            {formData.options.filter(o => !['Cor', 'Tamanho'].includes(o.name)).length > 0 && (
              <div className="space-y-2">
                {formData.options.filter(o => !['Cor', 'Tamanho'].includes(o.name)).map((option, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 border border-border rounded-md"
                  >
                    <div>
                      <span className="font-medium">{option.name}:</span>{' '}
                      <span className="text-muted-foreground">
                        {option.values.join(', ')}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Nome (ex: Material)"
                value={optionInput.name}
                onChange={(e) => setOptionInput({ ...optionInput, name: e.target.value })}
                className="font-light flex-1"
              />
              <Input
                placeholder="Valores (ex: Algodão, Poliéster)"
                value={optionInput.values}
                onChange={(e) => setOptionInput({ ...optionInput, values: e.target.value })}
                className="font-light flex-[2]"
              />
              <Button type="button" variant="outline" onClick={addOption}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="font-light"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-gold text-gold-foreground hover:bg-gold/90 font-light"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === 'create' ? 'Criando...' : 'Salvando...'}
                </>
              ) : (
                mode === 'create' ? 'Criar Produto' : 'Salvar Alterações'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
