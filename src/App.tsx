import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { CMSThemeProvider } from "@/providers/CMSThemeProvider";
import { PixelProvider } from "@/components/providers/PixelProvider";
import Index from "./pages/Index";
import Catalog from "./pages/Catalog";
import Releases from "./pages/Releases";
import Lote from "./pages/Lote";
import About from "./pages/About";
import Contact from "./pages/Contact";
import ProductDetail from "./pages/ProductDetail";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Account from "./pages/Account";
import Favorites from "./pages/Favorites";
import OrderTracking from "./pages/OrderTracking";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import CookiePolicy from "./pages/CookiePolicy";
import NotFound from "./pages/NotFound";
import CMSPage from "./pages/CMSPage";
import Unsubscribe from "./pages/Unsubscribe";
import MelhorEnvioCallback from "./pages/MelhorEnvioCallback";
const PromoPage = lazy(() => import("./pages/PromoPage"));
const KitDetail = lazy(() => import("./pages/KitDetail"));
const KitsList = lazy(() => import("./pages/KitsList"));
import CheckoutSuccess from "./pages/checkout/Success";
import CheckoutFailure from "./pages/checkout/Failure";
import CheckoutPending from "./pages/checkout/Pending";
import { CookieConsent } from "@/components/ui/CookieConsent";
import { BackToTop } from "@/components/ui/BackToTop";
import { CustomerSupportChat } from "@/components/ui/CustomerSupportChat";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import { PushNotificationProvider } from "@/components/providers/PushNotificationProvider";
import { LegalConsentGate } from "@/components/legal/LegalConsentGate";

// Lazy load admin & seller routes
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const NewOrder = lazy(() => import("./pages/admin/NewOrder"));
const Customers = lazy(() => import("./pages/admin/Customers"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const Finance = lazy(() => import("./pages/admin/Finance"));
const Expenses = lazy(() => import("./pages/admin/Expenses"));
const Accounting = lazy(() => import("./pages/admin/Accounting"));
const Promotions = lazy(() => import("./pages/admin/Promotions"));
const Content = lazy(() => import("./pages/admin/Content"));
const Closing = lazy(() => import("./pages/admin/Closing"));
const InventoryClosing = lazy(() => import("./pages/admin/InventoryClosing"));
const AdminStores = lazy(() => import("./pages/admin/Stores"));
const CashRegister = lazy(() => import("./pages/admin/CashRegister"));
const ProductLabels = lazy(() => import("./pages/admin/ProductLabels"));
const Kits = lazy(() => import("./pages/admin/Kits"));
const PromotionsAdvanced = lazy(() => import("./pages/admin/PromotionsAdvanced"));
const Consignment = lazy(() => import("./pages/admin/Consignment"));
const Pricing = lazy(() => import("./pages/admin/Pricing"));
const EmailMarketing = lazy(() => import("./pages/admin/EmailMarketing"));
const Expiry = lazy(() => import("./pages/admin/Expiry"));
const TikTokShop = lazy(() => import("./pages/admin/TikTokShop"));

// Inbound Intelligence / Garimpo Scan
const InboundDashboard = lazy(() => import("./pages/admin/inbound/Dashboard"));
const InboundReceipts = lazy(() => import("./pages/admin/inbound/Receipts"));
const InboundReceiptDetail = lazy(() => import("./pages/admin/inbound/ReceiptDetail"));
const InboundLots = lazy(() => import("./pages/admin/inbound/Lots"));
const InboundScan = lazy(() => import("./pages/admin/inbound/Scan"));
const InboundTeam = lazy(() => import("./pages/admin/inbound/Team"));
const InboundItems = lazy(() => import("./pages/admin/inbound/Items"));
const InboundItemDetail = lazy(() => import("./pages/admin/inbound/ItemDetail"));
const InboundLocations = lazy(() => import("./pages/admin/inbound/Locations"));
const InboundHistory = lazy(() => import("./pages/admin/inbound/History"));
const GalpaoLogin = lazy(() => import("./pages/GalpaoLogin"));
const GalpaoScan = lazy(() => import("./pages/GalpaoScan"));
const InboundTriage = lazy(() => import("./pages/admin/inbound/Placeholders").then(m => ({ default: m.InboundTriage })));
const InboundQC = lazy(() => import("./pages/admin/inbound/Items").then(m => ({ default: () => <m.default states={['IDENTIFIED','QC_PENDING']} title="Controle de qualidade" subtitle="Produtos aguardando aprovação, quarentena ou reprovação" /> })));
const InboundIdentified = lazy(() => import("./pages/admin/inbound/Items"));
const InboundPending = lazy(() => import("./pages/admin/inbound/Pendings"));
const InboundStock = lazy(() => import("./pages/admin/inbound/Items").then(m => ({ default: () => <m.default states={['QC_APPROVED','PRICED','ADDRESS_PENDING','STOCKED','AVAILABLE']} title="Estoque Inbound" subtitle="Endereçamento, guarda e liberação para os canais de venda" /> })));
const InboundLabels = lazy(() => import("./pages/admin/inbound/Placeholders").then(m => ({ default: m.InboundLabels })));

const SellerLayout = lazy(() => import("./pages/seller/SellerLayout"));
const SellerDashboard = lazy(() => import("./pages/seller/Dashboard"));
const SellerOrders = lazy(() => import("./pages/seller/Orders"));
const SellerProducts = lazy(() => import("./pages/seller/Products"));
const SellerCashRegister = lazy(() => import("./pages/seller/CashRegister"));

const ConsignorLayout = lazy(() => import("./pages/consignor/ConsignorLayout"));
const ConsignorDashboard = lazy(() => import("./pages/consignor/Dashboard"));
const ConsignorItems = lazy(() => import("./pages/consignor/Items"));
const ConsignorSales = lazy(() => import("./pages/consignor/Sales"));
const ConsignorSettlement = lazy(() => import("./pages/consignor/Settlement"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      refetchOnWindowFocus: false,
    },
  },
});

function StorefrontOverlays() {
  const { pathname } = useLocation();
  if (pathname === '/galpao' || pathname.startsWith('/galpao/') || pathname.startsWith('/admin')) return null;
  return <><CookieConsent /><BackToTop /><CustomerSupportChat /></>;
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="admin-theme">
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
         <CMSThemeProvider>
           <AnalyticsProvider>
           <PushNotificationProvider>
           <PixelProvider>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
          <LegalConsentGate />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/releases" element={<Releases />} />
            <Route path="/lote" element={<Lote />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/product/:handle" element={<ProductDetail />} />
            <Route path="/kits" element={<KitsList />} />
            <Route path="/kits/:handle" element={<KitDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/account" element={<Account />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/order-tracking" element={<OrderTracking />} />
            <Route path="/rastrear" element={<OrderTracking />} />
            
            {/* Legal Pages */}
            <Route path="/termos" element={<Terms />} />
            <Route path="/privacidade" element={<Privacy />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
             <Route path="/integracoes/melhor-envio/callback" element={<MelhorEnvioCallback />} />
            <Route path="/galpao" element={<GalpaoLogin />} />
            <Route path="/galpao/scan" element={<GalpaoScan />} />
            
             {/* CMS Dynamic Pages */}
             <Route path="/p/:slug" element={<CMSPage />} />
             <Route path="/promo/:slug" element={<PromoPage />} />
             
            {/* Checkout Result Pages */}
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/checkout/failure" element={<CheckoutFailure />} />
            <Route path="/checkout/pending" element={<CheckoutPending />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/new" element={<NewOrder />} />
              <Route path="customers" element={<Customers />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="stores" element={<AdminStores />} />
              <Route path="finance" element={<Finance />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="accounting" element={<Accounting />} />
              <Route path="promotions" element={<Promotions />} />
              <Route path="content" element={<Content />} />
              <Route path="closing" element={<Closing />} />
              <Route path="inventory-closing" element={<InventoryClosing />} />
              <Route path="cash-register" element={<CashRegister />} />
              <Route path="labels" element={<ProductLabels />} />
              <Route path="kits" element={<Kits />} />
              <Route path="promotions-advanced" element={<PromotionsAdvanced />} />
              <Route path="consignment" element={<Consignment />} />
              <Route path="pricing" element={<Pricing />} />
              <Route path="email-marketing" element={<EmailMarketing />} />
              <Route path="expiry" element={<Expiry />} />
              <Route path="integrations/tiktok-shop" element={<TikTokShop />} />

              {/* Inbound Intelligence / Garimpo Scan */}
              <Route path="inbound" element={<InboundDashboard />} />
              <Route path="inbound/receipts" element={<InboundReceipts />} />
              <Route path="inbound/receipts/:id" element={<InboundReceiptDetail />} />
              <Route path="inbound/lots" element={<InboundLots />} />
              <Route path="inbound/scan" element={<InboundScan />} />
              <Route path="inbound/triage" element={<InboundTriage />} />
              <Route path="inbound/qc" element={<InboundQC />} />
              <Route path="inbound/identified" element={<InboundIdentified />} />
              <Route path="inbound/items/:id" element={<InboundItemDetail />} />
              <Route path="inbound/pending" element={<InboundPending />} />
              <Route path="inbound/stock" element={<InboundStock />} />
              <Route path="inbound/locations" element={<InboundLocations />} />
              <Route path="inbound/labels" element={<InboundLabels />} />
              <Route path="inbound/history" element={<InboundHistory />} />
              <Route path="inbound/team" element={<InboundTeam />} />
               
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            
            {/* Seller Routes */}
            <Route path="/seller" element={<SellerLayout />}>
              <Route index element={<SellerDashboard />} />
              <Route path="orders" element={<SellerOrders />} />
              <Route path="orders/new" element={<NewOrder />} />
              <Route path="products" element={<SellerProducts />} />
              <Route path="cash-register" element={<SellerCashRegister />} />
            </Route>

            {/* Consignor Routes */}
            <Route path="/consignor" element={<ConsignorLayout />}>
              <Route index element={<ConsignorDashboard />} />
              <Route path="items" element={<ConsignorItems />} />
              <Route path="sales" element={<ConsignorSales />} />
              <Route path="settlement" element={<ConsignorSettlement />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          <StorefrontOverlays />
           </PixelProvider>
           </PushNotificationProvider>
           </AnalyticsProvider>
         </CMSThemeProvider>
       </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
