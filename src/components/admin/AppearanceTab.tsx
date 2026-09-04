import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Save, Loader2, Palette, Globe, RotateCcw, Type, Sun, Moon, Monitor, MessageCircle, Mail, AlertTriangle, Search, Link2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MediaPicker } from '@/components/cms/MediaPicker';
import { useCMSTheme, useUpdateCMSTheme, useCreateCMSTheme, type CMSTheme } from '@/hooks/useCMS';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// ========== COLOR UTILITIES ==========
const DEFAULT_COLORS: Record<string, string> = {
  primary: '0 0% 12%',
  secondary: '0 0% 97%',
  accent: '30 5% 45%',
  background: '0 0% 100%',
  foreground: '0 0% 12%',
};

const DEFAULT_DARK_COLORS: Record<string, string> = {
  dark_primary: '0 0% 95%',
  dark_secondary: '0 0% 12%',
  dark_accent: '30 5% 50%',
  dark_background: '0 0% 6%',
  dark_foreground: '0 0% 95%',
};

function hexToHsl(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslToHex(hslStr: string): string {
  const parts = hslStr.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return '#000000';
  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  let r2, g2, b2;
  if (s === 0) {
    r2 = g2 = b2 = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r2 = hue2rgb(p, q, h + 1/3);
    g2 = hue2rgb(p, q, h);
    b2 = hue2rgb(p, q, h - 1/3);
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}

const COLOR_FIELDS = [
  { key: 'primary', label: 'Primária' },
  { key: 'secondary', label: 'Secundária' },
  { key: 'accent', label: 'Destaque' },
  { key: 'background', label: 'Fundo' },
  { key: 'foreground', label: 'Texto' },
];

function ColorPreview({ colors, mode }: { colors: Record<string, string>; mode: 'light' | 'dark' }) {
  const prefix = mode === 'dark' ? 'dark_' : '';
  const defaults = mode === 'dark' ? DEFAULT_DARK_COLORS : DEFAULT_COLORS;
  const bg = colors[`${prefix}background`] || defaults[`${prefix}background`] || DEFAULT_COLORS.background;
  const fg = colors[`${prefix}foreground`] || defaults[`${prefix}foreground`] || DEFAULT_COLORS.foreground;
  const primary = colors[`${prefix}primary`] || defaults[`${prefix}primary`] || DEFAULT_COLORS.primary;
  const secondary = colors[`${prefix}secondary`] || defaults[`${prefix}secondary`] || DEFAULT_COLORS.secondary;
  const accent = colors[`${prefix}accent`] || defaults[`${prefix}accent`] || DEFAULT_COLORS.accent;

  return (
    <div style={{ background: `hsl(${bg})`, color: `hsl(${fg})` }} className="rounded-lg border overflow-hidden mt-4">
      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b">
        Preview — {mode === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
      </div>
      <div style={{ background: `hsl(${primary})`, color: 'hsl(0 0% 98%)' }} className="px-4 py-2.5 text-sm font-medium flex items-center justify-between">
        <span>Minha Loja</span>
        <div className="flex gap-3 text-xs opacity-80">
          <span>Início</span><span>Produtos</span><span>Contato</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          {['Produto 1', 'Produto 2', 'Produto 3'].map(t => (
            <div key={t} style={{ background: `hsl(${secondary})` }} className="flex-1 rounded p-3 space-y-1.5">
              <div className="h-8 rounded opacity-20" style={{ background: `hsl(${fg})` }} />
              <div className="text-[10px] font-medium">{t}</div>
              <div style={{ background: `hsl(${primary})`, color: 'hsl(0 0% 98%)' }} className="text-[9px] px-2 py-1 rounded text-center">Comprar</div>
            </div>
          ))}
        </div>
        <p className="text-xs">Texto de exemplo com a cor de foreground</p>
        <div className="flex gap-2">
          <div style={{ background: `hsl(${primary})`, color: 'hsl(0 0% 98%)' }} className="text-xs px-3 py-1.5 rounded">Primário</div>
          <div style={{ background: `hsl(${accent})`, color: 'hsl(0 0% 98%)' }} className="text-xs px-3 py-1.5 rounded">Destaque</div>
          <div style={{ background: `hsl(${secondary})` }} className="text-xs px-3 py-1.5 rounded border">Secundário</div>
        </div>
      </div>
    </div>
  );
}

function ColorEditor({ colors, onChange, onReset }: {
  colors: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset: () => void;
}) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  const handleReset = () => {
    if (mode === 'dark') {
      Object.entries(DEFAULT_DARK_COLORS).forEach(([k, v]) => onChange(k, v));
    } else {
      onReset();
    }
  };

  const prefix = mode === 'dark' ? 'dark_' : '';
  const defaults = mode === 'dark' ? DEFAULT_DARK_COLORS : DEFAULT_COLORS;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-medium">Cores do Site</CardTitle>
            </div>
            <CardDescription className="mt-1.5">Escolha as cores principais da sua loja</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Voltar ao padrão
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          <button
            onClick={() => setMode('light')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'light' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            ☀️ Claro
          </button>
          <button
            onClick={() => setMode('dark')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'dark' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            🌙 Escuro
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COLOR_FIELDS.map(({ key, label }) => {
            const fullKey = `${prefix}${key}`;
            const defaultValue = defaults[fullKey] || DEFAULT_COLORS[key];
            const hslValue = colors[fullKey] || defaultValue;
            const isDefault = hslValue === defaultValue;
            const hexValue = hslToHex(hslValue);
            return (
              <div key={fullKey} className="space-y-2">
                <Label className="text-xs">{label}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={hexValue}
                    onChange={e => onChange(fullKey, hexToHsl(e.target.value))}
                    className="h-10 w-12 rounded border border-input cursor-pointer bg-transparent p-0.5"
                  />
                  <Input
                    value={hslValue}
                    onChange={e => onChange(fullKey, e.target.value)}
                    className="flex-1 font-mono text-xs"
                    placeholder="0 0% 0%"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    disabled={isDefault}
                    onClick={() => onChange(fullKey, defaultValue)}
                    title="Restaurar padrão"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <ColorPreview colors={colors} mode={mode} />
      </CardContent>
    </Card>
  );
}

// ========== DEFAULT TEXTS ==========
const DEFAULT_TEXTS: Record<string, { label: string; defaultValue: string; group: string }> = {
  hero_badge: { label: 'Subtítulo Hero', defaultValue: 'IMPORTADOS SELECIONADOS', group: 'Hero' },
  hero_title: { label: 'Título Hero', defaultValue: 'O melhor do mundo, na sua quebrada.', group: 'Hero' },
  hero_subtitle: { label: 'Descrição Hero', defaultValue: 'Produtos importados originais com garantia, entrega rápida e atendimento personalizado.', group: 'Hero' },
  benefit_1_title: { label: 'Benefício 1 - Título', defaultValue: 'Qualidade', group: 'Benefícios' },
  benefit_1_desc: { label: 'Benefício 1 - Descrição', defaultValue: 'Produtos premium selecionados com alto padrão.', group: 'Benefícios' },
  benefit_2_title: { label: 'Benefício 2 - Título', defaultValue: 'Envio Rápido', group: 'Benefícios' },
  benefit_2_desc: { label: 'Benefício 2 - Descrição', defaultValue: 'Entrega expressa para todo o Brasil.', group: 'Benefícios' },
  benefit_3_title: { label: 'Benefício 3 - Título', defaultValue: 'Atendimento', group: 'Benefícios' },
  benefit_3_desc: { label: 'Benefício 3 - Descrição', defaultValue: 'Suporte personalizado via WhatsApp.', group: 'Benefícios' },
  benefit_4_title: { label: 'Benefício 4 - Título', defaultValue: 'Garantia', group: 'Benefícios' },
  benefit_4_desc: { label: 'Benefício 4 - Descrição', defaultValue: 'Proteção contra defeitos de fabricação.', group: 'Benefícios' },
  testimonial_1_name: { label: 'Depoimento 1 - Nome', defaultValue: 'Carlos S.', group: 'Depoimentos' },
  testimonial_1_text: { label: 'Depoimento 1 - Texto', defaultValue: 'Produto chegou exatamente como descrito. Qualidade impecável.', group: 'Depoimentos' },
  testimonial_2_name: { label: 'Depoimento 2 - Nome', defaultValue: 'Ana C.', group: 'Depoimentos' },
  testimonial_2_text: { label: 'Depoimento 2 - Texto', defaultValue: 'Melhor loja de importados. Entrega rápida e produto original.', group: 'Depoimentos' },
  testimonial_3_name: { label: 'Depoimento 3 - Nome', defaultValue: 'Rafael M.', group: 'Depoimentos' },
  testimonial_3_text: { label: 'Depoimento 3 - Texto', defaultValue: 'Recomendo. Preço justo e suporte excelente.', group: 'Depoimentos' },
  footer_tagline: { label: 'Slogan', defaultValue: 'O melhor do mundo, na sua quebrada.', group: 'Rodapé' },
  footer_description: { label: 'Descrição', defaultValue: 'Produtos originais importados com garantia de qualidade e atendimento personalizado.', group: 'Rodapé' },
  footer_newsletter_title: { label: 'Título Newsletter', defaultValue: 'Fique por dentro', group: 'Rodapé' },
  footer_newsletter_subtitle: { label: 'Subtítulo Newsletter', defaultValue: 'Receba novidades e ofertas exclusivas em primeira mão.', group: 'Rodapé' },
  footer_email: { label: 'Email de contato', defaultValue: 'contato@principeimports.com', group: 'Rodapé' },
  footer_security_1: { label: 'Texto Segurança 1', defaultValue: 'Site 100% Seguro', group: 'Rodapé' },
  footer_security_2: { label: 'Texto Segurança 2', defaultValue: 'Pix, Cartão e Boleto', group: 'Rodapé' },
  footer_security_3: { label: 'Texto Segurança 3', defaultValue: 'Entrega para todo Brasil', group: 'Rodapé' },
};

const DEFAULT_NAV_ITEMS = [
  { name: 'INÍCIO', href: '/' },
  { name: 'CATÁLOGO', href: '/catalog' },
  { name: 'LANÇAMENTOS', href: '/releases' },
  { name: 'SOBRE', href: '/about' },
  { name: 'CONTATO', href: '/contact' },
];

function SiteTextsEditor({ texts, onUpdate }: { texts: Record<string, unknown>; onUpdate: (key: string, value: unknown) => void }) {
  const navItems = (texts.nav_items as Array<{ name: string; href: string }>) || DEFAULT_NAV_ITEMS;

  const handleNavUpdate = (index: number, field: 'name' | 'href', value: string) => {
    const updated = [...navItems];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate('nav_items', updated);
  };

  const groups = ['Hero', 'Benefícios', 'Depoimentos', 'Rodapé'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Type className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-medium">Textos do Site</CardTitle>
        </div>
        <CardDescription>Textos editáveis do Hero, Benefícios, Depoimentos e Rodapé</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {groups.map(group => (
          <div key={group}>
            <h4 className="text-sm font-medium mb-3">
              {group === 'Hero' ? 'Hero (Página Inicial)' : group === 'Benefícios' ? 'Benefícios (Página Inicial)' : group === 'Depoimentos' ? 'Depoimentos (Página Inicial)' : 'Rodapé do site'}
            </h4>
            <div className="space-y-3">
              {Object.entries(DEFAULT_TEXTS)
                .filter(([, def]) => def.group === group)
                .map(([key, def]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{def.label}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={String(texts[key] || '')}
                        onChange={e => onUpdate(key, e.target.value)}
                        placeholder={def.defaultValue}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        disabled={!texts[key] || texts[key] === def.defaultValue}
                        onClick={() => onUpdate(key, '')}
                        title="Restaurar padrão"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}

        {/* Navigation */}
        <div>
          <h4 className="text-sm font-medium mb-3">Navegação</h4>
          <div className="space-y-3">
            {navItems.map((item, index) => (
              <div key={index} className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Texto</Label>
                  <Input
                    value={item.name}
                    onChange={e => handleNavUpdate(index, 'name', e.target.value)}
                    placeholder={DEFAULT_NAV_ITEMS[index]?.name || ''}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Destino</Label>
                  <Input
                    value={item.href}
                    onChange={e => handleNavUpdate(index, 'href', e.target.value)}
                    placeholder={DEFAULT_NAV_ITEMS[index]?.href || ''}
                  />
                </div>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => onUpdate('nav_items', DEFAULT_NAV_ITEMS)}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Voltar ao menu padrão
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ========== ADMIN THEME TOGGLE ==========
function AdminThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'system', label: 'Sistema', icon: Monitor },
    { value: 'dark', label: 'Escuro', icon: Moon },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-medium">Aparência do Painel</CardTitle>
        </div>
        <CardDescription>Escolha entre modo claro ou escuro</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {options.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                theme === value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ========== APPEARANCE TAB ==========
export function AppearanceTab() {
  const { data: theme, isLoading } = useCMSTheme();
  const updateTheme = useUpdateCMSTheme();
  const createTheme = useCreateCMSTheme();
  const [formData, setFormData] = useState<Partial<CMSTheme>>({});
  const [initialized, setInitialized] = useState(false);

  if (theme && !initialized) {
    setFormData({
      name: theme.name || '',
      logo_url: theme.logo_url || '',
      logo_dark_url: theme.logo_dark_url || '',
      favicon_url: theme.favicon_url || '',
      colors: theme.colors || { primary: '0 0% 9%', secondary: '0 0% 96%', accent: '0 0% 45%' },
      fonts: theme.fonts || { headings: 'Inter', body: 'Inter' },
      social: theme.social || {},
      seo: theme.seo || {},
      texts: (theme as CMSTheme & { texts?: Record<string, unknown> }).texts || {},
    });
    setInitialized(true);
  }

  const handleUpdate = (key: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleNestedUpdate = (parent: 'colors' | 'fonts' | 'social' | 'seo' | 'texts', key: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as Record<string, string> || {}),
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!theme?.id) return;
    await updateTheme.mutateAsync({
      id: theme.id,
      ...formData,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!theme) {
    return (
      <div className="space-y-6">
        <AdminThemeToggle />
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Palette className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="font-medium">Configure a aparência da sua loja</p>
              <p className="text-sm text-muted-foreground mt-1">
                Clique no botão abaixo para começar a personalizar sua loja.
              </p>
            </div>
            <Button onClick={() => createTheme.mutate()} disabled={createTheme.isPending}>
              {createTheme.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Inicializando...</>
                : <><Palette className="h-4 w-4 mr-2" />Começar configuração</>
              }
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminThemeToggle />

      {/* Branding */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-medium">Identidade Visual</CardTitle>
          </div>
          <CardDescription>Nome, logo e ícone da aba do navegador</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Nome da Loja</Label>
            <Input 
              value={String(formData.name || '')}
              onChange={e => handleUpdate('name', e.target.value)}
              placeholder="Príncipe Imports"
            />
            <p className="text-xs text-muted-foreground">
              Aparece no topo e rodapé do seu site
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <MediaPicker 
                    value={String(formData.logo_url || '')}
                    onChange={v => handleUpdate('logo_url', v)}
                  />
                </div>
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 mt-auto" disabled={!formData.logo_url} onClick={() => handleUpdate('logo_url', '')} title="Restaurar padrão">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Logo para fundo escuro</Label>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <MediaPicker 
                    value={String(formData.logo_dark_url || '')}
                    onChange={v => handleUpdate('logo_dark_url', v)}
                  />
                </div>
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 mt-auto" disabled={!formData.logo_dark_url} onClick={() => handleUpdate('logo_dark_url', '')} title="Restaurar padrão">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ícone da aba (Favicon)</Label>
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <MediaPicker 
                  value={String(formData.favicon_url || '')}
                  onChange={v => handleUpdate('favicon_url', v)}
                />
              </div>
              <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 mt-auto" disabled={!formData.favicon_url} onClick={() => handleUpdate('favicon_url', '')} title="Restaurar padrão">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <ColorEditor
        colors={(formData.colors || {}) as Record<string, string>}
        onChange={(key, value) => handleNestedUpdate('colors', key, value)}
        onReset={() => handleUpdate('colors', { ...DEFAULT_COLORS, ...DEFAULT_DARK_COLORS })}
      />

      {/* Dados de Contato Principal */}
      <Card className="border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-medium">Dados de Contato Principal</CardTitle>
          </div>
          <CardDescription>
            Esses dados alimentam o botão flutuante de WhatsApp, formulários de contato, rodapé e página de contato
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(!(formData.social as Record<string, string>)?.whatsapp && !(formData.social as Record<string, string>)?.email) && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>Configure WhatsApp e/ou Email para ativar os botões de contato do site</span>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5 text-green-500" />
                WhatsApp
              </Label>
              <Input 
                value={String((formData.social as Record<string, string>)?.whatsapp || '')}
                onChange={e => handleNestedUpdate('social', 'whatsapp', e.target.value)}
                placeholder="5511999999999"
              />
              <p className="text-xs text-muted-foreground">Número com DDD e código do país (ex: 5511999999999)</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" />
                Email
              </Label>
              <Input 
                type="email"
                value={String((formData.social as Record<string, string>)?.email || '')}
                onChange={e => handleNestedUpdate('social', 'email', e.target.value)}
                placeholder="contato@loja.com"
              />
              <p className="text-xs text-muted-foreground">Exibido no rodapé e página de contato</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Redes Sociais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Redes Sociais e Localização</CardTitle>
          <CardDescription>Informações adicionais que aparecem no rodapé e página de contato</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input 
                value={String((formData.social as Record<string, string>)?.instagram || '')}
                onChange={e => handleNestedUpdate('social', 'instagram', e.target.value)}
                placeholder="@loja"
              />
            </div>
            <div className="space-y-2">
              <Label>Facebook</Label>
              <Input 
                value={String((formData.social as Record<string, string>)?.facebook || '')}
                onChange={e => handleNestedUpdate('social', 'facebook', e.target.value)}
                placeholder="https://facebook.com/loja"
              />
            </div>
            <div className="space-y-2">
              <Label>TikTok</Label>
              <Input 
                value={String((formData.social as Record<string, string>)?.tiktok || '')}
                onChange={e => handleNestedUpdate('social', 'tiktok', e.target.value)}
                placeholder="@loja"
              />
            </div>
            <div className="space-y-2">
              <Label>YouTube</Label>
              <Input 
                value={String((formData.social as Record<string, string>)?.youtube || '')}
                onChange={e => handleNestedUpdate('social', 'youtube', e.target.value)}
                placeholder="https://youtube.com/@loja"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Localização</Label>
              <Input 
                value={String((formData.social as Record<string, string>)?.address || '')}
                onChange={e => handleNestedUpdate('social', 'address', e.target.value)}
                placeholder="Envio a partir de São Paulo - SP"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Horário</Label>
              <Input 
                value={String((formData.social as Record<string, string>)?.hours || '')}
                onChange={e => handleNestedUpdate('social', 'hours', e.target.value)}
                placeholder="Segunda a Sábado, das 9h às 18h"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEO */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Busca no Google (SEO)</CardTitle>
          <CardDescription>Organize como sua loja aparece na busca, com prévia, palavras-chave e orientações de qualidade</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(() => {
            const seo = (formData.seo as Record<string, string>) || {};
            const seoTitle = String(seo.title || '');
            const seoDescription = String(seo.description || '');
            const seoKeywords = String(seo.keywords || '');
            const canonicalUrl = String(seo.canonical_url || '');
            const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sualoja.com';
            const previewUrl = canonicalUrl || siteUrl;
            const titleLength = seoTitle.trim().length;
            const descriptionLength = seoDescription.trim().length;
            const keywordsCount = seoKeywords.split(',').map(item => item.trim()).filter(Boolean).length;

            const checks = [
              { ok: titleLength >= 30 && titleLength <= 60, label: 'Título com tamanho ideal', hint: `${titleLength}/60 caracteres` },
              { ok: descriptionLength >= 120 && descriptionLength <= 160, label: 'Descrição com tamanho ideal', hint: `${descriptionLength}/160 caracteres` },
              { ok: keywordsCount >= 3, label: 'Palavras-chave definidas', hint: `${keywordsCount} palavra(s)-chave` },
              { ok: Boolean(canonicalUrl), label: 'URL canônica preenchida', hint: canonicalUrl ? 'Configurada' : 'Opcional, mas recomendado' },
            ];

            return (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label>Título no Google</Label>
                        <span className="text-xs text-muted-foreground">{titleLength}/60</span>
                      </div>
                      <Input 
                        value={seoTitle}
                        onChange={e => handleNestedUpdate('seo', 'title', e.target.value)}
                        placeholder="Store Natália Pardal | Elegância, Presença e Identidade Feminina"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label>Descrição no Google</Label>
                        <span className="text-xs text-muted-foreground">{descriptionLength}/160</span>
                      </div>
                      <Textarea 
                        value={seoDescription}
                        onChange={e => handleNestedUpdate('seo', 'description', e.target.value)}
                        placeholder="Descubra produtos selecionados com elegância, qualidade e propósito para mulheres que desejam se posicionar com confiança."
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label>Palavras-chave</Label>
                        <span className="text-xs text-muted-foreground">Separadas por vírgula</span>
                      </div>
                      <Textarea
                        value={seoKeywords}
                        onChange={e => handleNestedUpdate('seo', 'keywords', e.target.value)}
                        placeholder="moda feminina elegante, loja feminina premium, roupas com identidade, elegância feminina"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>URL canônica</Label>
                      <div className="relative">
                        <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input 
                          value={canonicalUrl}
                          onChange={e => handleNestedUpdate('seo', 'canonical_url', e.target.value)}
                          placeholder="https://storenatalhapardal.lovable.app"
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-md border bg-card p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <Search className="h-4 w-4" />
                        Prévia da busca
                      </div>
                      <div className="space-y-1">
                        <p className="line-clamp-1 text-[22px] leading-7 text-primary">
                          {seoTitle || 'Título da sua loja no Google'}
                        </p>
                        <p className="line-clamp-1 text-sm text-green-700 dark:text-green-500">
                          {previewUrl}
                        </p>
                        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                          {seoDescription || 'A descrição da sua loja aparecerá aqui para ajudar clientes a entender sua proposta antes do clique.'}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-md border bg-card p-4 space-y-3">
                      <div>
                        <h4 className="text-sm font-medium">Checklist profissional</h4>
                        <p className="text-xs text-muted-foreground">Boas práticas para melhorar clareza e relevância</p>
                      </div>
                      <div className="space-y-2">
                        {checks.map((item) => (
                          <div key={item.label} className="flex items-start justify-between gap-3 rounded-sm border px-3 py-2 text-sm">
                            <div className="flex items-start gap-2">
                              {item.ok ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                              ) : (
                                <AlertCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                              )}
                              <span>{item.label}</span>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{item.hint}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-md border bg-secondary/40 p-4">
                      <h4 className="text-sm font-medium mb-2">Sugestão de uso</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Use o nome da marca + benefício principal no título.</li>
                        <li>• Inclua termos que sua cliente realmente pesquisaria.</li>
                        <li>• Evite repetir a mesma palavra-chave muitas vezes.</li>
                        <li>• Mantenha a descrição clara, específica e convidativa.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Textos do Site */}
      <SiteTextsEditor 
        texts={(formData.texts || {}) as Record<string, unknown>}
        onUpdate={(key, value) => handleNestedUpdate('texts', key, value)}
      />

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateTheme.isPending} size="lg">
          {updateTheme.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" />Salvar alterações</>
          )}
        </Button>
      </div>
    </div>
  );
}
