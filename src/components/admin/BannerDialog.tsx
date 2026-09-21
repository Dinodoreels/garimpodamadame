import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, Video, ImageIcon, Film } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Banner, 
  BannerInsert, 
  useCreateBanner, 
  useUpdateBanner, 
  useUploadBannerImage,
  useUploadBannerVideo,
} from '@/hooks/useBanners';

const POSITION_OPTIONS = [
  { value: '50% 0%', label: 'Topo' },
  { value: '50% 25%', label: 'Cima' },
  { value: '50% 50%', label: 'Centro' },
  { value: '50% 75%', label: 'Baixo' },
  { value: '50% 100%', label: 'Rodapé' },
  { value: '0% 50%', label: 'Esquerda' },
  { value: '100% 50%', label: 'Direita' },
];

interface BannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banner?: Banner | null;
}

export function BannerDialog({ open, onOpenChange, banner }: BannerDialogProps) {
  const createBanner = useCreateBanner();
  const updateBanner = useUpdateBanner();
  const uploadImage = useUploadBannerImage();
  const uploadVideo = useUploadBannerVideo();

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    button_text: 'VER MAIS',
    button_link: '/catalog',
    show_button: true,
    show_title: true,
    show_subtitle: true,
    show_overlay: true,
    click_url: '',
    overlay_opacity: 50,
    is_active: true,
    position: 0,
    media_type: 'image' as string,
    video_url: '',
    video_source: 'youtube' as 'youtube' | 'upload',
    desktop_object_position: '50% 50%',
    mobile_object_position: '50% 50%',
  });
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mobileImageUrl, setMobileImageUrl] = useState('');
  const [mobileImagePreview, setMobileImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (banner) {
      const isVideoFile = banner.media_type === 'video_file';
      setForm({
        title: banner.title,
        subtitle: banner.subtitle || '',
        button_text: banner.button_text,
        button_link: banner.button_link,
        show_button: banner.show_button ?? true,
        show_title: banner.show_title ?? true,
        show_subtitle: banner.show_subtitle ?? true,
        show_overlay: banner.show_overlay ?? true,
        click_url: banner.click_url || '',
        overlay_opacity: banner.overlay_opacity,
        is_active: banner.is_active,
        position: banner.position,
        media_type: isVideoFile ? 'video' : (banner.media_type || 'image'),
        video_url: banner.video_url || '',
        video_source: isVideoFile ? 'upload' : 'youtube',
        desktop_object_position: banner.desktop_object_position || '50% 50%',
        mobile_object_position: banner.mobile_object_position || '50% 50%',
      });
      setImageUrl(banner.image_url);
      setImagePreview(banner.image_url);
      setMobileImageUrl(banner.mobile_image_url || '');
      setMobileImagePreview(banner.mobile_image_url || null);
      setVideoPreviewUrl(isVideoFile ? banner.video_url : null);
    } else {
      setForm({
        title: '',
        subtitle: '',
        button_text: 'VER MAIS',
        button_link: '/catalog',
        show_button: true,
        show_title: true,
        show_subtitle: true,
        show_overlay: true,
        click_url: '',
        overlay_opacity: 50,
        is_active: true,
        position: 0,
        media_type: 'image',
        video_url: '',
        video_source: 'youtube',
        desktop_object_position: '50% 50%',
        mobile_object_position: '50% 50%',
      });
      setImageUrl('');
      setImagePreview(null);
      setMobileImageUrl('');
      setMobileImagePreview(null);
      setVideoPreviewUrl(null);
    }
  }, [banner, open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const url = await uploadImage.mutateAsync(file);
      setImageUrl(url);
    } finally {
      setUploading(false);
    }
  };

  const handleMobileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setMobileImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setUploading(true);
    try {
      const url = await uploadImage.mutateAsync(file);
      setMobileImageUrl(url);
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const url = await uploadVideo.mutateAsync(file);
      setForm(f => ({ ...f, video_url: url }));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isVideoUpload = form.media_type === 'video' && form.video_source === 'upload';
    const isYoutube = form.media_type === 'video' && form.video_source === 'youtube';
    const needsImage = form.media_type === 'image' && !imageUrl;
    const needsVideo = form.media_type === 'video' && !form.video_url;
    if (needsImage || needsVideo) return;

    const finalMediaType = isVideoUpload ? 'video_file' : (isYoutube ? 'video' : 'image');

    const bannerData: BannerInsert = {
      ...form,
      media_type: finalMediaType,
      image_url: form.media_type === 'image' 
        ? imageUrl 
        : (imageUrl || (isYoutube && getYouTubeId(form.video_url) 
            ? `https://img.youtube.com/vi/${getYouTubeId(form.video_url)}/maxresdefault.jpg` 
            : 'https://placehold.co/1920x1080/1a1a1a/333?text=Video')),
      subtitle: form.subtitle || null,
      click_url: form.click_url || null,
      video_url: form.media_type === 'video' ? form.video_url : null,
      mobile_image_url: form.media_type === 'image' ? (mobileImageUrl || null) : null,
    };

    // Remove video_source from data sent to DB
    const { video_source, ...rest } = bannerData as any;

    if (banner) {
      await updateBanner.mutateAsync({ id: banner.id, ...rest });
    } else {
      await createBanner.mutateAsync(rest);
    }

    onOpenChange(false);
  };

  const isLoading = createBanner.isPending || updateBanner.isPending || uploading;

  function getYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^&?/]+)/);
    return match ? match[1] : null;
  }

  const hasValidMedia = form.media_type === 'image' ? !!imageUrl : !!form.video_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {banner ? 'Editar Banner' : 'Novo Banner'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Media Type Selector */}
          <div className="space-y-2">
            <Label>Tipo de Mídia</Label>
            <div className="flex gap-2">
              <Button type="button" variant={form.media_type === 'image' ? 'default' : 'outline'} size="sm" onClick={() => setForm(f => ({ ...f, media_type: 'image' }))} className="flex-1 gap-2">
                <ImageIcon className="h-4 w-4" /> Imagem
              </Button>
              <Button type="button" variant={form.media_type === 'video' ? 'default' : 'outline'} size="sm" onClick={() => setForm(f => ({ ...f, media_type: 'video' }))} className="flex-1 gap-2">
                <Video className="h-4 w-4" /> Vídeo
              </Button>
            </div>
          </div>

          {/* Video sub-options */}
          {form.media_type === 'video' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Origem do Vídeo</Label>
                <div className="flex gap-2">
                  <Button type="button" variant={form.video_source === 'youtube' ? 'default' : 'outline'} size="sm" onClick={() => setForm(f => ({ ...f, video_source: 'youtube', video_url: '' }))} className="flex-1 gap-2">
                    <Video className="h-4 w-4" /> YouTube
                  </Button>
                  <Button type="button" variant={form.video_source === 'upload' ? 'default' : 'outline'} size="sm" onClick={() => { setForm(f => ({ ...f, video_source: 'upload', video_url: '' })); setVideoPreviewUrl(null); }} className="flex-1 gap-2">
                    <Film className="h-4 w-4" /> Upload
                  </Button>
                </div>
              </div>

              {form.video_source === 'youtube' ? (
                <div className="space-y-2">
                  <Label>URL do YouTube</Label>
                  <Input
                    value={form.video_url}
                    onChange={(e) => setForm(f => ({ ...f, video_url: e.target.value }))}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                  {form.video_url && getYouTubeId(form.video_url) && (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                      <iframe
                        src={`https://www.youtube.com/embed/${getYouTubeId(form.video_url)}?autoplay=0&rel=0`}
                        title="Preview"
                        className="absolute inset-0 w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Cole a URL de um vídeo do YouTube</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Arquivo de Vídeo</Label>
                  {videoPreviewUrl || form.video_url ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                      <video
                        src={videoPreviewUrl || form.video_url}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      {/* Overlay Preview */}
                      {form.show_overlay && (
                        <div 
                          className="absolute inset-0 bg-gradient-to-br from-black via-black/80 to-black pointer-events-none"
                          style={{ opacity: form.overlay_opacity / 100 }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setVideoPreviewUrl(null);
                          setForm(f => ({ ...f, video_url: '' }));
                        }}
                        className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors z-10"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors">
                      <Film className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
                        {uploading ? 'Enviando...' : 'Clique para enviar vídeo'}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">.mp4 ou .webm (até 50MB)</span>
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/mp4,video/webm"
                        onChange={handleVideoUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Image Upload (only for image type) */}
          {form.media_type === 'image' && (
            <div className="space-y-2">
              <Label>Imagem do Banner</Label>
              <div className="relative">
                {imagePreview ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      style={{ objectPosition: form.desktop_object_position }}
                    />
                    {form.show_overlay && (
                      <div 
                        className="absolute inset-0 bg-gradient-to-br from-black via-black/80 to-black"
                        style={{ opacity: form.overlay_opacity / 100 }}
                      />
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                      {form.show_title && form.title && (
                        <h3 className="text-xl lg:text-2xl font-light text-white mb-2">{form.title}</h3>
                      )}
                      {form.show_subtitle && form.subtitle && (
                        <p className="text-sm text-white/70 mb-4">{form.subtitle}</p>
                      )}
                      {form.show_button && form.button_text && (
                        <span className="text-xs text-white border border-white/30 px-4 py-2 rounded">{form.button_text}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setImagePreview(null); setImageUrl(''); }}
                      className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      {uploading ? 'Enviando...' : 'Clique para enviar imagem'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
              {/* Desktop focus position */}
              <div className="space-y-2">
                <Label>Foco da imagem (Desktop)</Label>
                <div className="flex flex-wrap gap-2">
                  {POSITION_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      size="sm"
                      variant={form.desktop_object_position === opt.value ? 'default' : 'outline'}
                      onClick={() => setForm(f => ({ ...f, desktop_object_position: opt.value }))}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Define qual parte da imagem fica visível no desktop.</p>
              </div>

              {/* Mobile image */}
              <div className="space-y-2">
                <Label>Imagem para Celular (opcional)</Label>
                {mobileImagePreview ? (
                  <div className="relative w-40 aspect-[9/16] rounded-lg overflow-hidden bg-muted mx-auto">
                    <img
                      src={mobileImagePreview}
                      alt="Preview Mobile"
                      className="w-full h-full object-cover"
                      style={{ objectPosition: form.mobile_object_position }}
                    />
                    <button
                      type="button"
                      onClick={() => { setMobileImagePreview(null); setMobileImageUrl(''); }}
                      className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-40 aspect-[9/16] mx-auto border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground text-center px-2">
                      {uploading ? 'Enviando...' : 'Imagem vertical para celular'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMobileImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
                <p className="text-xs text-muted-foreground">Se não enviar, usaremos a imagem principal no celular.</p>
              </div>

              {/* Mobile focus position */}
              <div className="space-y-2">
                <Label>Foco da imagem (Celular)</Label>
                <div className="flex flex-wrap gap-2">
                  {POSITION_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      size="sm"
                      variant={form.mobile_object_position === opt.value ? 'default' : 'outline'}
                      onClick={() => setForm(f => ({ ...f, mobile_object_position: opt.value }))}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="show-title">Mostrar título</Label>
                <p className="text-xs text-muted-foreground">Você pode ocultar sem apagar o texto salvo.</p>
              </div>
              <Switch id="show-title" checked={form.show_title} onCheckedChange={(checked) => setForm(f => ({ ...f, show_title: checked }))} />
            </div>
            {form.show_title && (
              <Input id="title" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: PROMOÇÃO DE VERÃO" />
            )}
          </div>

          {/* Subtitle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="show-subtitle">Mostrar subtítulo</Label>
                <p className="text-xs text-muted-foreground">Você pode ocultar sem apagar o texto salvo.</p>
              </div>
              <Switch id="show-subtitle" checked={form.show_subtitle} onCheckedChange={(checked) => setForm(f => ({ ...f, show_subtitle: checked }))} />
            </div>
            {form.show_subtitle && (
              <Input id="subtitle" value={form.subtitle} onChange={(e) => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="Ex: Até 50% de desconto em produtos selecionados" />
            )}
          </div>

          {/* Click URL */}
          <div className="space-y-2">
            <Label htmlFor="click_url">Link de Direcionamento (opcional)</Label>
            <Input id="click_url" value={form.click_url} onChange={(e) => setForm(f => ({ ...f, click_url: e.target.value }))} placeholder="Ex: /catalog ou https://exemplo.com" />
            <p className="text-xs text-muted-foreground">Ao clicar em qualquer área do banner, o usuário será redirecionado para este link</p>
          </div>

          {/* Show Button Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Mostrar Botão</Label>
              <p className="text-xs text-muted-foreground">Exibir botão de ação no banner</p>
            </div>
            <Switch checked={form.show_button} onCheckedChange={(checked) => setForm(f => ({ ...f, show_button: checked }))} />
          </div>

          {/* Button Text & Link */}
          {form.show_button && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="button_text">Texto do Botão</Label>
                <Input id="button_text" value={form.button_text} onChange={(e) => setForm(f => ({ ...f, button_text: e.target.value }))} placeholder="VER MAIS" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="button_link">Link de Destino</Label>
                <Input id="button_link" value={form.button_link} onChange={(e) => setForm(f => ({ ...f, button_link: e.target.value }))} placeholder="/catalog" />
              </div>
            </div>
          )}

          {/* Overlay */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="show-overlay">Aplicar cor sobre a imagem</Label>
                <p className="text-xs text-muted-foreground">Desative para mostrar a imagem com suas cores originais.</p>
              </div>
              <Switch id="show-overlay" checked={form.show_overlay} onCheckedChange={(checked) => setForm(f => ({ ...f, show_overlay: checked }))} />
            </div>
            {form.show_overlay && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Intensidade da cor</Label>
                  <span className="text-sm text-muted-foreground">{form.overlay_opacity}%</span>
                </div>
                <Slider value={[form.overlay_opacity]} onValueChange={([value]) => setForm(f => ({ ...f, overlay_opacity: value }))} min={0} max={100} step={5} />
              </div>
            )}
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Banner Ativo</Label>
              <p className="text-xs text-muted-foreground">Banners inativos não aparecem na loja</p>
            </div>
            <Switch checked={form.is_active} onCheckedChange={(checked) => setForm(f => ({ ...f, is_active: checked }))} />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={isLoading || !hasValidMedia} className="flex-1">
              {isLoading ? 'Salvando...' : banner ? 'Salvar Alterações' : 'Criar Banner'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
