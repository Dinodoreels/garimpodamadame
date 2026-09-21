import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteContent } from '@/hooks/useSiteContent';

const SITE_URL = 'https://ogarimpodigital.com.br';
const BRAND = 'O Garimpo Digital';
const DEFAULT_SHARE_IMAGE = 'https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/373e73cf-0243-4554-8858-759808ce0000/id-preview-663a6460--7b27380b-a8d2-4cc8-bfc2-71a5b0665cda.lovable.app-1775859891069.png';

const ROUTE_META: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'O Garimpo Digital — Produtos selecionados e ofertas',
    description: 'Encontre produtos selecionados, novidades, kits e ofertas no O Garimpo Digital, com entrega para todo o Brasil.',
  },
  '/catalog': {
    title: `Catálogo | ${BRAND}`,
    description: 'Explore o catálogo do O Garimpo Digital e encontre produtos, novidades e ofertas disponíveis.',
  },
  '/releases': {
    title: `Novidades | ${BRAND}`,
    description: 'Confira os produtos recém-chegados e os lançamentos disponíveis no O Garimpo Digital.',
  },
  '/lote': {
    title: `Venda em lote | ${BRAND}`,
    description: 'Consulte as opções de venda em lote disponíveis no O Garimpo Digital.',
  },
  '/about': {
    title: `Sobre nós | ${BRAND}`,
    description: 'Conheça a história, a curadoria e o propósito do O Garimpo Digital.',
  },
  '/contact': {
    title: `Contato | ${BRAND}`,
    description: 'Entre em contato com a equipe do O Garimpo Digital para tirar dúvidas sobre produtos e pedidos.',
  },
  '/kits': {
    title: `Kits e combos | ${BRAND}`,
    description: 'Conheça os kits e combos disponíveis no O Garimpo Digital.',
  },
  '/termos': {
    title: `Termos de Uso | ${BRAND}`,
    description: 'Leia os Termos de Uso do O Garimpo Digital.',
  },
  '/privacidade': {
    title: `Política de Privacidade | ${BRAND}`,
    description: 'Saiba como o O Garimpo Digital trata e protege seus dados pessoais.',
  },
  '/cookies': {
    title: `Política de Cookies | ${BRAND}`,
    description: 'Entenda como o O Garimpo Digital utiliza cookies e gerencie suas preferências.',
  },
  '/rastrear': {
    title: `Consultar entrega | ${BRAND}`,
    description: 'Consulte a entrega do seu pedido no O Garimpo Digital usando o número informado na compra.',
  },
  '/order-tracking': {
    title: `Acompanhar pedido | ${BRAND}`,
    description: 'Acompanhe o andamento, o envio e o código de rastreio do seu pedido no O Garimpo Digital.',
  },
};

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function removeMeta(selector: string) {
  document.head.querySelector(selector)?.remove();
}

export function applySeoMetadata(title: string, description: string, path: string, image?: string) {
  const canonicalUrl = `${SITE_URL}${path === '/' ? '/' : path}`;
  const shareImage = image ? new URL(image, SITE_URL).href : DEFAULT_SHARE_IMAGE;
  document.title = title;
  setMeta("meta[name='description']", 'name', 'description', description);
  setMeta("meta[property='og:title']", 'property', 'og:title', title);
  setMeta("meta[property='og:description']", 'property', 'og:description', description);
  setMeta("meta[property='og:url']", 'property', 'og:url', canonicalUrl);
  setMeta("meta[name='twitter:title']", 'name', 'twitter:title', title);
  setMeta("meta[name='twitter:description']", 'name', 'twitter:description', description);
  setMeta("meta[property='og:image']", 'property', 'og:image', shareImage);
  setMeta("meta[name='twitter:image']", 'name', 'twitter:image', shareImage);

  let canonical = document.head.querySelector<HTMLLinkElement>("link[rel='canonical']");
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalUrl;
}

export function RouteSeo() {
  const { pathname } = useLocation();
  const { data: settings } = useSiteContent<{ routes?: Array<{ path: string; title: string; description: string; image?: string }> }>('seo_metadata');

  useEffect(() => {
    const saved = settings?.routes?.find((route) => route.path === pathname);
    const metadata = saved || ROUTE_META[pathname];
    if (!metadata || pathname.startsWith('/product/')) return;
    applySeoMetadata(metadata.title, metadata.description, pathname, 'image' in metadata ? metadata.image : undefined);
  }, [pathname, settings]);

  return null;
}