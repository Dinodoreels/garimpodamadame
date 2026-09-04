 import { useState } from 'react';
 import { format } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Printer, Download } from 'lucide-react';
 import { FinanceSummary } from '@/hooks/useFinance';
 
 interface DREReportProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   period: 'current' | 'last' | 'year';
   summary: FinanceSummary;
   expenses: number;
   periodLabel: string;
 }
 
 export function DREReport({ open, onOpenChange, period, summary, expenses, periodLabel }: DREReportProps) {
   const formatCurrency = (value: number) => {
     return new Intl.NumberFormat('pt-BR', {
       style: 'currency',
       currency: 'BRL',
     }).format(value);
   };
 
   const currentDate = new Date();
   const reportTitle = period === 'year' 
     ? `Ano ${currentDate.getFullYear()}`
     : format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
 
   const handlePrint = () => {
     const printContent = document.getElementById('dre-report');
     if (!printContent) return;
 
     const printWindow = window.open('', '_blank');
     if (!printWindow) {
       alert('Permita pop-ups para imprimir o relatório');
       return;
     }
 
     printWindow.document.write(`
       <!DOCTYPE html>
       <html>
         <head>
           <title>DRE - ${reportTitle}</title>
           <style>
             * { margin: 0; padding: 0; box-sizing: border-box; }
             body { 
               font-family: 'Courier New', monospace; 
               font-size: 12px; 
               padding: 40px;
               max-width: 800px;
               margin: 0 auto;
             }
             .header {
               text-align: center;
               margin-bottom: 30px;
               border-bottom: 2px solid #000;
               padding-bottom: 20px;
             }
             .header h1 { font-size: 18px; margin-bottom: 5px; }
             .header h2 { font-size: 14px; font-weight: normal; }
             .header p { font-size: 10px; color: #666; margin-top: 10px; }
             table { width: 100%; border-collapse: collapse; }
             tr { border-bottom: 1px dotted #ddd; }
             td { padding: 8px 0; }
             td.label { text-align: left; }
             td.value { text-align: right; font-family: monospace; }
             tr.section-header td { 
               font-weight: bold; 
               padding-top: 16px;
               border-bottom: 1px solid #000;
             }
             tr.total td { 
               font-weight: bold; 
               border-top: 2px solid #000;
               border-bottom: none;
               padding-top: 12px;
             }
             tr.subtotal td {
               font-weight: bold;
               background: #f5f5f5;
             }
             .indent { padding-left: 20px; }
             .positive { color: #16a34a; }
             .negative { color: #dc2626; }
             .footer {
               margin-top: 40px;
               text-align: center;
               font-size: 10px;
               color: #666;
             }
             @media print {
               body { padding: 20px; }
               .no-print { display: none; }
             }
           </style>
         </head>
         <body>
           ${printContent.innerHTML}
           <div class="footer">
             <p>Relatório gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
             <p>Príncipe Imports - Sistema de Gestão Financeira</p>
           </div>
         </body>
       </html>
     `);
     printWindow.document.close();
     printWindow.print();
   };
 
   // Calculate DRE values
   const grossRevenue = summary.revenue;
   const discounts = 0; // Could be enhanced to track discounts separately
   const netRevenue = grossRevenue - discounts;
   const cogs = summary.productCosts; // Cost of Goods Sold
   const grossProfit = summary.grossProfit;
   const operatingExpenses = summary.expenses;
   const netProfit = summary.netProfit;
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle className="flex items-center justify-between">
             <span>Demonstrativo de Resultado (DRE)</span>
             <div className="flex gap-2">
               <Button variant="outline" size="sm" onClick={handlePrint}>
                 <Printer className="h-4 w-4 mr-2" />
                 Imprimir
               </Button>
             </div>
           </DialogTitle>
         </DialogHeader>
 
         <div id="dre-report" className="font-mono text-sm">
           <div className="text-center mb-6 pb-4 border-b-2 border-foreground">
             <h1 className="text-lg font-bold">DEMONSTRATIVO DE RESULTADO DO EXERCÍCIO</h1>
             <h2 className="text-base">{reportTitle.toUpperCase()}</h2>
             <p className="text-xs text-muted-foreground mt-2">Príncipe Imports</p>
           </div>
 
           <table className="w-full">
             <tbody>
               {/* RECEITA BRUTA */}
               <tr className="border-b border-foreground">
                 <td className="py-3 font-bold">RECEITA BRUTA DE VENDAS</td>
                 <td className="py-3 text-right font-bold">{formatCurrency(grossRevenue)}</td>
               </tr>
               <tr className="border-b border-dashed border-muted-foreground/30">
                 <td className="py-2 pl-4 text-muted-foreground">(+) Vendas de Produtos</td>
                 <td className="py-2 text-right">{formatCurrency(grossRevenue)}</td>
               </tr>
 
               {/* DEDUÇÕES */}
               <tr className="border-b border-foreground">
                 <td className="py-3 font-bold pt-6">(-) DEDUÇÕES</td>
                 <td className="py-3 text-right font-bold text-destructive pt-6">({formatCurrency(discounts)})</td>
               </tr>
               <tr className="border-b border-dashed border-muted-foreground/30">
                 <td className="py-2 pl-4 text-muted-foreground">(-) Descontos Concedidos</td>
                 <td className="py-2 text-right text-destructive">({formatCurrency(discounts)})</td>
               </tr>
 
               {/* RECEITA LÍQUIDA */}
               <tr className="bg-muted/50">
                 <td className="py-3 font-bold">(=) RECEITA LÍQUIDA</td>
                 <td className="py-3 text-right font-bold">{formatCurrency(netRevenue)}</td>
               </tr>
 
               {/* CUSTOS */}
               <tr className="border-b border-foreground">
                 <td className="py-3 font-bold pt-6">(-) CUSTOS DOS PRODUTOS VENDIDOS</td>
                 <td className="py-3 text-right font-bold text-destructive pt-6">({formatCurrency(cogs)})</td>
               </tr>
               <tr className="border-b border-dashed border-muted-foreground/30">
                 <td className="py-2 pl-4 text-muted-foreground">(-) Custo das Mercadorias</td>
                 <td className="py-2 text-right text-destructive">({formatCurrency(cogs)})</td>
               </tr>
 
               {/* LUCRO BRUTO */}
               <tr className="bg-muted/50">
                 <td className="py-3 font-bold">(=) LUCRO BRUTO</td>
                 <td className={`py-3 text-right font-bold ${grossProfit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                   {formatCurrency(grossProfit)}
                 </td>
               </tr>
               <tr className="border-b border-dashed border-muted-foreground/30">
                 <td className="py-1 pl-4 text-xs text-muted-foreground">Margem Bruta</td>
                 <td className="py-1 text-right text-xs text-muted-foreground">{summary.grossMargin.toFixed(1)}%</td>
               </tr>
 
               {/* DESPESAS OPERACIONAIS */}
               <tr className="border-b border-foreground">
                 <td className="py-3 font-bold pt-6">(-) DESPESAS OPERACIONAIS</td>
                 <td className="py-3 text-right font-bold text-destructive pt-6">({formatCurrency(operatingExpenses)})</td>
               </tr>
               <tr className="border-b border-dashed border-muted-foreground/30">
                 <td className="py-2 pl-4 text-muted-foreground">(-) Despesas Administrativas</td>
                 <td className="py-2 text-right text-destructive">({formatCurrency(operatingExpenses)})</td>
               </tr>
 
               {/* LUCRO LÍQUIDO */}
               <tr className="border-t-2 border-foreground bg-muted">
                 <td className="py-4 font-bold text-base">(=) LUCRO LÍQUIDO DO EXERCÍCIO</td>
                 <td className={`py-4 text-right font-bold text-base ${netProfit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                   {formatCurrency(netProfit)}
                 </td>
               </tr>
               <tr>
                 <td className="py-1 pl-4 text-xs text-muted-foreground">Margem Líquida</td>
                 <td className="py-1 text-right text-xs text-muted-foreground">{summary.netMargin.toFixed(1)}%</td>
               </tr>
             </tbody>
           </table>
 
           {/* Summary Box */}
           <div className="mt-6 p-4 border rounded-lg bg-muted/30">
             <h3 className="font-bold mb-3">RESUMO DO PERÍODO</h3>
             <div className="grid grid-cols-2 gap-4 text-sm">
               <div>
                 <p className="text-muted-foreground">Total de Pedidos</p>
                 <p className="font-bold">{summary.ordersCount}</p>
               </div>
               <div>
                 <p className="text-muted-foreground">Ticket Médio</p>
                 <p className="font-bold">{formatCurrency(summary.averageOrderValue)}</p>
               </div>
               <div>
                 <p className="text-muted-foreground">Margem Bruta</p>
                 <p className={`font-bold ${summary.grossMargin >= 30 ? 'text-emerald-600' : summary.grossMargin >= 15 ? 'text-amber-600' : 'text-destructive'}`}>
                   {summary.grossMargin.toFixed(1)}%
                 </p>
               </div>
               <div>
                 <p className="text-muted-foreground">Margem Líquida</p>
                 <p className={`font-bold ${summary.netMargin >= 20 ? 'text-emerald-600' : summary.netMargin >= 10 ? 'text-amber-600' : 'text-destructive'}`}>
                   {summary.netMargin.toFixed(1)}%
                 </p>
               </div>
             </div>
           </div>
         </div>
       </DialogContent>
     </Dialog>
   );
 }