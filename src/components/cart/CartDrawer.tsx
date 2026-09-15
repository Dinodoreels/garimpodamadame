import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ShoppingCart, Minus, Plus, Trash2, ExternalLink, Loader2, Gift, MessageCircle } from "lucide-react";
import { Package, Bookmark, BookmarkCheck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCartStore } from "@/stores/cartStore";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useFreeShippingSettings } from "@/hooks/useShippingSettings";
import { useAddresses } from "@/hooks/useAddresses";
import { ShippingCalculator } from "./ShippingCalculator";
import { ShippingAddressModal } from "./ShippingAddressModal";
import { DiscountInput } from "./DiscountInput";
import { LoyaltyRedemption } from "./LoyaltyRedemption";
import { CartItemsList } from "./CartItemsList";
import { calculateShipping } from "@/lib/shipping";
import { toast } from "sonner";
import { DiscountCode } from "@/hooks/useDiscounts";
import { useCMSThemeContext } from "@/providers/CMSThemeProvider";

export function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [isCalculatingAuto, setIsCalculatingAuto] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { addresses } = useAddresses();
  const { data: freeShippingSettings } = useFreeShippingSettings();
  const theme = useCMSThemeContext();
  const social = (theme?.social as Record<string, string>) || {};
  const whatsappNumber = social.whatsapp || '5511999999999';
  const { 
    items, 
    isLoading, 
    updateQuantity, 
    removeItem, 
    createCheckout,
    clearCart,
    clearActiveItems,
    removeKit,
    toggleSavedForLater,
    getTotalItems,
    getTotalPrice,
    getDiscountedPrice,
    getGrandTotal,
    shippingCost,
    setShipping,
    appliedDiscount,
    setDiscount,
    loyaltyPointsUsed,
    loyaltyDiscount,
    setLoyaltyRedemption,
  } = useCartStore();
  
  const totalItems = getTotalItems();
  const subtotal = getTotalPrice();
  const discountedSubtotal = getDiscountedPrice();
  const grandTotal = getGrandTotal();

  // Free shipping calculations (based on discounted subtotal)
  const freeShippingEnabled = freeShippingSettings?.enabled ?? false;
  const freeShippingMinValue = freeShippingSettings?.min_value ?? 500;
  const amountToFreeShipping = freeShippingEnabled ? Math.max(0, freeShippingMinValue - discountedSubtotal) : 0;
  const qualifiesForFreeShipping = freeShippingEnabled && discountedSubtotal >= freeShippingMinValue;
  const progressToFreeShipping = freeShippingEnabled 
    ? Math.min(100, (discountedSubtotal / freeShippingMinValue) * 100) 
    : 0;

  const handleApplyDiscount = (discount: DiscountCode | null, amount: number) => {
    if (discount) {
      setDiscount({
        id: discount.id,
        code: discount.code,
        type: discount.type,
        value: discount.value,
        discountAmount: amount,
      });
    } else {
      setDiscount(null);
    }
  };

  const handleApplyLoyalty = (points: number, discount: number) => {
    setLoyaltyRedemption(points, discount);
  };

  // Process checkout after shipping is confirmed
  const processCheckout = useCallback(async () => {
    try {
      const checkoutUrl = await createCheckout();
      if (checkoutUrl) {
        clearCart();
        const opened = window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
        if (!opened) {
          window.location.href = checkoutUrl;
        }
      } else {
        toast.error("Erro ao criar checkout", { position: "top-center" });
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      toast.error("Erro ao finalizar compra", { position: "top-center" });
    }
  }, [createCheckout, clearCart]);

  const handleCheckout = async () => {
    // Check if user is logged in
    if (!user) {
      toast.error("Faça login para finalizar compra", {
        position: "top-center",
        action: {
          label: "Entrar",
          onClick: () => {
            setIsOpen(false);
            navigate("/auth");
          }
        }
      });
      return;
    }

    // Check if profile is complete
    const isProfileComplete = profile?.full_name && profile?.phone && profile?.cpf && profile?.birth_date;
    if (!isProfileComplete) {
      toast.error("Complete seu perfil para finalizar a compra", {
        position: "top-center",
        description: "Preencha nome, telefone, CPF e data de nascimento.",
        action: {
          label: "Completar Perfil",
          onClick: () => {
            setIsOpen(false);
            navigate("/account");
          }
        }
      });
      return;
    }

    // If shipping already calculated, proceed to checkout
    if (shippingCost > 0 || qualifiesForFreeShipping) {
      await processCheckout();
      return;
    }

    // Try to find default address and auto-calculate shipping
    const defaultAddress = addresses.find(a => a.is_default);
    
    if (defaultAddress) {
      setIsCalculatingAuto(true);
      try {
        const result = await calculateShipping(defaultAddress.zip_code, {
          subtotal,
          hasDropshipItems: false, // Could be enhanced to check items
        });

        if (result) {
          // Set shipping with full address
          setShipping(
            result.cost,
            result.state,
            result.city,
            defaultAddress.zip_code,
            result.estimatedDays,
            {
              recipient_name: defaultAddress.recipient_name,
              street: defaultAddress.street,
              number: defaultAddress.number,
              complement: defaultAddress.complement,
              neighborhood: defaultAddress.neighborhood,
              city: defaultAddress.city,
              state: defaultAddress.state,
              zip_code: defaultAddress.zip_code,
            },
            result.option.service,
            result.option
          );

          // Proceed to checkout
          await processCheckout();
        } else {
          toast.error("Não foi possível calcular o frete", { position: "top-center" });
          setShowAddressModal(true);
        }
      } catch (error) {
        console.error('Auto shipping calculation failed:', error);
        setShowAddressModal(true);
      } finally {
        setIsCalculatingAuto(false);
      }
    } else {
      // No default address, show modal
      setShowAddressModal(true);
    }
  };

  const formatPrice = (amount: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative min-w-[44px] min-h-[44px] hover:bg-transparent hover:scale-105 transition-transform"
          data-cart-trigger
        >
          <ShoppingCart className="h-5 w-5" />
          {totalItems > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-chrome text-white animate-scale-in">
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-display text-xl">Carrinho</SheetTitle>
            {items.filter(i => !i.savedForLater).length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive">
                    <Trash2 className="h-3 w-3 mr-1" /> Limpar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Limpar carrinho?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Todos os itens ativos serão removidos. Itens salvos para depois serão mantidos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => clearActiveItems()} className="bg-destructive hover:bg-destructive/90">
                      Limpar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <SheetDescription>
            {totalItems === 0 ? "Seu carrinho está vazio" : `${totalItems} ${totalItems !== 1 ? 'itens' : 'item'} no carrinho`}
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex flex-col flex-1 pt-6 min-h-0">
          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Seu carrinho está vazio</p>
              </div>
            </div>
          ) : (
            <>
              {/* Free Shipping Banner - Fixed at top */}
              {freeShippingEnabled && items.length > 0 && (
                <div className="flex-shrink-0 mb-4 p-3 bg-gradient-to-r from-chrome/10 to-gold/10 rounded-lg border border-chrome/20">
                  {qualifiesForFreeShipping ? (
                    <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                      <Gift className="h-4 w-4" />
                      <span>Parabéns! Você ganhou frete grátis! 🎉</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Gift className="h-3 w-3" />
                          Frete grátis acima de {formatPrice(freeShippingMinValue)}
                        </span>
                        <span className="font-medium text-chrome">
                          Faltam {formatPrice(amountToFreeShipping)}
                        </span>
                      </div>
                      <Progress value={progressToFreeShipping} className="h-2" />
                    </div>
                  )}
                </div>
              )}

              {/* Scrollable items area */}
              <div className="flex-1 overflow-y-auto pr-2 min-h-0 space-y-4">
                {/* Cart Items grouped by kit */}
                <CartItemsList
                  items={items}
                  formatPrice={formatPrice}
                  onUpdateQty={updateQuantity}
                  onRemove={removeItem}
                  onRemoveKit={removeKit}
                  onToggleSaved={toggleSavedForLater}
                />

                {/* Shipping Calculator */}
                <ShippingCalculator />
                
                {/* Discount Input */}
                <div className="pt-2">
                  <DiscountInput
                    subtotal={subtotal}
                    appliedDiscount={appliedDiscount ? {
                      id: appliedDiscount.id,
                      code: appliedDiscount.code,
                      type: appliedDiscount.type,
                      value: appliedDiscount.value,
                      min_order_value: null,
                      max_discount: null,
                      max_uses: null,
                      uses_per_user: 1,
                      uses_count: 0,
                      starts_at: null,
                      expires_at: null,
                      is_active: true,
                      created_at: '',
                      updated_at: '',
                    } : null}
                    discountAmount={appliedDiscount?.discountAmount || 0}
                    onApplyDiscount={handleApplyDiscount}
                  />
                </div>

                {/* Loyalty Redemption */}
                <div className="pt-2">
                  <LoyaltyRedemption
                    onApplyPoints={handleApplyLoyalty}
                    appliedPoints={loyaltyPointsUsed}
                    maxDiscount={discountedSubtotal}
                  />
                </div>
              </div>
              
              {/* Fixed checkout section */}
              <div className="flex-shrink-0 space-y-3 pt-4 border-t bg-background">
                {/* Summary */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {appliedDiscount && (
                    <div className="flex justify-between text-green-600">
                      <span>Desconto ({appliedDiscount.code})</span>
                      <span>-{formatPrice(appliedDiscount.discountAmount)}</span>
                    </div>
                  )}
                  {loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-primary">
                      <span>Pontos ({loyaltyPointsUsed.toLocaleString('pt-BR')} pts)</span>
                      <span>-{formatPrice(loyaltyDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frete</span>
                    <span>
                      {qualifiesForFreeShipping ? (
                        <span className="text-green-600 font-medium">GRÁTIS</span>
                      ) : shippingCost > 0 ? (
                        formatPrice(shippingCost)
                      ) : (
                        <span className="text-muted-foreground italic">Calcule acima</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-xl font-bold text-chrome">
                      {formatPrice(qualifiesForFreeShipping ? discountedSubtotal : grandTotal)}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={handleCheckout}
                    className="w-full h-14 sm:h-12 text-base sm:text-sm bg-chrome hover:bg-chrome-dark text-white touch-manipulation transition-all duration-300 hover:shadow-lg group" 
                    size="lg"
                    disabled={items.length === 0 || isLoading || isCalculatingAuto}
                  >
                    {isLoading || isCalculatingAuto ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isCalculatingAuto ? 'Calculando frete...' : 'Processando...'}
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                        Finalizar Compra
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full h-12 sm:h-10 text-sm border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 touch-manipulation transition-all duration-300 group"
                    size="lg"
                    disabled={items.length === 0}
                    onClick={() => {
                      const itemsList = items.map(item => {
                        const variantInfo = item.variant.title !== 'Default'
                          ? ` (${[item.variant.option1, item.variant.option2, item.variant.option3].filter(Boolean).join(' / ')})`
                          : '';
                        return `▸ ${item.product.title}${variantInfo} — Qtd: ${item.quantity} — ${formatPrice(item.variant.price * item.quantity)}`;
                      }).join('\n');

                      const shippingLine = qualifiesForFreeShipping
                        ? '🚚 Frete: GRÁTIS'
                        : shippingCost > 0
                          ? `🚚 Frete: ${formatPrice(shippingCost)}`
                          : '🚚 Frete: A calcular';

                      const discountLine = appliedDiscount
                        ? `🏷️ Cupom: ${appliedDiscount.code} (-${formatPrice(appliedDiscount.discountAmount)})\n`
                        : '';

                      const totalValue = qualifiesForFreeShipping ? discountedSubtotal : grandTotal;

                      const message = [
                        `🛒 *PEDIDO VIA WHATSAPP*`,
                        ``,
                        `📦 *Itens:*`,
                        itemsList,
                        ``,
                        `💰 Subtotal: ${formatPrice(subtotal)}`,
                        discountLine,
                        shippingLine,
                        ``,
                        `💳 *Total: ${formatPrice(totalValue)}*`,
                        ``,
                        `Gostaria de finalizar este pedido!`
                      ].filter(line => line !== undefined).join('\n');

                      const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <MessageCircle className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    Comprar via WhatsApp
                  </Button>
                </div>
                
                {/* Trust Badges */}
                <div className="flex items-center justify-center gap-4 pt-2">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <span>Compra Segura</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                      <line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                    <span>Pix & Cartão</span>
                  </div>
                </div>
                
                {!user && (
                  <p className="text-xs text-center text-muted-foreground">
                    Você precisará fazer login para finalizar
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>

      {/* Shipping Address Modal */}
      <ShippingAddressModal
        open={showAddressModal}
        onOpenChange={setShowAddressModal}
        onConfirm={processCheckout}
        subtotal={subtotal}
      />
    </Sheet>
  );
}
