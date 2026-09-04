 import { createContext, useContext, useEffect } from 'react';
 import { useCMSTheme, type CMSTheme } from '@/hooks/useCMS';
 
 const CMSThemeContext = createContext<CMSTheme | null>(null);
 
 export function useCMSThemeContext() {
   return useContext(CMSThemeContext);
 }
 
 interface CMSThemeProviderProps {
   children: React.ReactNode;
 }
 
 export function CMSThemeProvider({ children }: CMSThemeProviderProps) {
   const { data: theme } = useCMSTheme();
 
    useEffect(() => {
      if (!theme) return;
      const root = document.documentElement;
      const colors = (theme.colors || {}) as Record<string, string>;

      // Apply light colors as CSS variables
      const colorKeys = ['primary', 'secondary', 'accent', 'background', 'foreground'] as const;
      colorKeys.forEach(key => {
        const value = colors[key];
        if (value) {
          root.style.setProperty(`--${key}`, value);
        }
      });

      // Apply dark colors via injected <style> tag
      const darkEntries = colorKeys
        .filter(k => colors[`dark_${k}`])
        .map(k => `--${k}: ${colors[`dark_${k}`]};`);

      let styleEl = document.getElementById('cms-dark-overrides') as HTMLStyleElement | null;
      if (darkEntries.length > 0) {
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'cms-dark-overrides';
          document.head.appendChild(styleEl);
        }
        styleEl.textContent = `.dark {\n  ${darkEntries.join('\n  ')}\n}`;
      } else if (styleEl) {
        styleEl.remove();
      }

      // Apply favicon
      if (theme.favicon_url) {
        const existingLink = document.querySelector("link[rel='icon']") as HTMLLinkElement;
        if (existingLink) {
          existingLink.href = theme.favicon_url;
        } else {
          const link = document.createElement('link');
          link.rel = 'icon';
          link.href = theme.favicon_url;
          document.head.appendChild(link);
        }
      }

      // Apply document title from SEO
      if (theme.seo?.title) {
        document.title = theme.seo.title;
      }

      // Apply meta description
      if (theme.seo?.description) {
        let meta = document.querySelector("meta[name='description']") as HTMLMetaElement;
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = 'description';
          document.head.appendChild(meta);
        }
        meta.content = theme.seo.description;
      }

      return () => {
        colorKeys.forEach(key => {
          root.style.removeProperty(`--${key}`);
        });
        const el = document.getElementById('cms-dark-overrides');
        el?.remove();
      };
    }, [theme]);
 
   return (
     <CMSThemeContext.Provider value={theme || null}>
       {children}
     </CMSThemeContext.Provider>
   );
 }