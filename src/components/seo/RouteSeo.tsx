import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://ogarimpodigital.com.br';
const BRAND = 'O Garimpo Digital';

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
    title: `Rastrear pedido | ${BRAND}`,
    description: 'Acompanhe a situação e a entrega do seu pedido no O Garimpo Digital.',
  },
  '/order-tracking': {
    title: `Rastrear pedido | ${BRAND}`,
    description: 'Acompanhe a situação e a entrega do seu pedido no O Garimpo Digital.',
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

export function applySeoMetadata(title: string, description: string, path: string, image?: string) {
  const canonicalUrl = `${SITE_URL}${path === '/' ? '/' : path}`;
  document.title = title;
  setMeta("meta[name='description']", 'name', 'description', description);
  setMeta("meta[property='og:title']", 'property', 'og:title', title);
  setMeta("meta[property='og:description']", 'property', 'og:description', description);
  setMeta("meta[property='og:url']", 'property', 'og:url', canonicalUrl);
  setMeta("meta[name='twitter:title']", 'name', 'twitter:title', title);
  setMeta("meta[name='twitter:description']", 'name', 'twitter:description', description);
  if (image) {
    setMeta("meta[property='og:image']", 'property', 'og:image', image);
    setMeta("meta[name='twitter:image']", 'name', 'twitter:image', image);
  }

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

  useEffect(() => {
    const metadata = ROUTE_META[pathname];
    if (!metadata || pathname.startsWith('/product/')) return;
    applySeoMetadata(metadata.title, metadata.description, pathname);
  }, [pathname]);

  return null;
}