 import { useState } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { 
   DollarSign, 
   TrendingUp, 
   TrendingDown, 
   ShoppingBag,
   Package,
   Wallet,
   AlertCircle,
   ArrowUpRight,
  ArrowDownRight,
  FileText,
  TrendingUp as TrendingUpIcon,
  ArrowRight,
  Calendar
 } from 'lucide-react';
 import { useFinance } from '@/hooks/useFinance';
 import { useExpenses } from '@/hooks/useExpenses';
 import { 
   BarChart, 
   Bar, 
   XAxis, 
   YAxis, 
   CartesianGrid, 
   Tooltip, 
   ResponsiveContainer,
   LineChart,
   Line,
   Legend
 } from 'recharts';
 import { format } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import { Link } from 'react-router-dom';
import { DREReport } from '@/components/admin/DREReport';
import { PaymentMethodsChart } from '@/components/admin/finance/PaymentMethodsChart';
import { ExpensesByCategoryChart } from '@/components/admin/finance/ExpensesByCategoryChart';
import { RevenueBySourceChart } from '@/components/admin/finance/RevenueBySourceChart';
 
 export default function Finance() {
   const [period, setPeriod] = useState<'current' | 'last' | 'year'>('current');
  const [showDRE, setShowDRE] = useState(false);
  const { summary, monthlyData, productProfitability, cashFlow, paymentMethods, expensesByCategory, revenueBySource, isLoading } = useFinance(period);
   const { overdueExpenses, upcomingExpenses, totalPending } = useExpenses();
 
   const formatCurrency = (value: number) => {
     return new Intl.NumberFormat('pt-BR', {
       style: 'currency',
       currency: 'BRL',
     }).format(value);
   };
 
   const periodLabel = {
     current: 'Este Mês',
     last: 'Mês Anterior',
     year: 'Este Ano',
   };

  const renderGrowthBadge = (growth: number) => {
    if (growth === 0) return null;
    const isPositive = growth > 0;
    return (
      <Badge 
        variant="secondary" 
        className={`text-xs flex items-center gap-0.5 ${
          isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-destructive/10 text-destructive'
        }`}
      >
        {isPositive ? (
          <ArrowUpRight className="h-3 w-3" />
        ) : (
          <ArrowDownRight className="h-3 w-3" />
        )}
        {Math.abs(growth).toFixed(1)}%
      </Badge>
    );
  };
 
   return (
     <div className="space-y-6">
       {/* Header */}
       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
         <div>
           <h1 className="text-2xl font-light tracking-tight">Dashboard Financeiro</h1>
           <p className="text-sm text-muted-foreground">
             Visão geral das finanças da loja
           </p>
         </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Este Mês</SelectItem>
                <SelectItem value="last">Mês Anterior</SelectItem>
                <SelectItem value="year">Este Ano</SelectItem>
              </SelectContent>
            </Select>
             <Button variant="outline" onClick={() => setShowDRE(true)} className="flex-1 sm:flex-none">
               <FileText className="h-4 w-4 mr-2" />
               Ver DRE
             </Button>
            <Link to="/admin/expenses" className="flex-1 sm:flex-none">
              <Button variant="outline" className="w-full">
                <Wallet className="h-4 w-4 mr-2" />
                Ver Despesas
              </Button>
            </Link>
          </div>
       </div>
 
       {/* Alerts */}
       {(overdueExpenses.length > 0 || upcomingExpenses.length > 0) && (
         <div className="grid gap-4 md:grid-cols-2">
           {overdueExpenses.length > 0 && (
             <Card className="border-destructive/50 bg-destructive/5">
               <CardContent className="p-4">
                 <div className="flex items-center gap-3">
                   <AlertCircle className="h-5 w-5 text-destructive" />
                   <div>
                     <p className="font-medium text-destructive">
                       {overdueExpenses.length} despesa(s) vencida(s)
                     </p>
                     <p className="text-sm text-muted-foreground">
                       Total: {formatCurrency(overdueExpenses.reduce((s, e) => s + e.amount, 0))}
                     </p>
                   </div>
                 </div>
               </CardContent>
             </Card>
           )}
           {upcomingExpenses.length > 0 && (
             <Card className="border-amber-500/50 bg-amber-500/5">
               <CardContent className="p-4">
                 <div className="flex items-center gap-3">
                   <AlertCircle className="h-5 w-5 text-amber-500" />
                   <div>
                     <p className="font-medium text-amber-600">
                       {upcomingExpenses.length} despesa(s) próxima(s) do vencimento
                     </p>
                     <p className="text-sm text-muted-foreground">
                       Próximos 7 dias: {formatCurrency(upcomingExpenses.reduce((s, e) => s + e.amount, 0))}
                     </p>
                   </div>
                 </div>
               </CardContent>
             </Card>
           )}
         </div>
       )}
 
       {/* Summary Cards */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-3 md:p-6">
             <div className="flex items-center justify-between">
               <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Receita</p>
                    {renderGrowthBadge(summary.revenueGrowth)}
                  </div>
                 <p className="text-base md:text-2xl font-light truncate">{formatCurrency(summary.revenue)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {summary.ordersCount} pedidos
                    </p>
                    {renderGrowthBadge(summary.ordersGrowth)}
                  </div>
               </div>
               <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                 <ShoppingBag className="h-5 w-5 text-primary" />
               </div>
             </div>
           </CardContent>
         </Card>
 
          <Card>
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Custo Produtos</p>
                  <p className="text-base md:text-2xl font-light truncate">{formatCurrency(summary.productCosts)}</p>
                 <p className="text-xs text-muted-foreground mt-1">
                   {summary.productCosts > 0 ? `${((summary.productCosts / summary.revenue) * 100).toFixed(1)}% da receita` : 'Sem custos'}
                 </p>
               </div>
               <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                 <Package className="h-5 w-5 text-amber-500" />
               </div>
             </div>
           </CardContent>
         </Card>
 
          <Card>
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Lucro Bruto</p>
                  <p className="text-base md:text-2xl font-light truncate">{formatCurrency(summary.grossProfit)}</p>
                 <div className="flex items-center gap-1 mt-1">
                   {summary.grossMargin >= 0 ? (
                     <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                   ) : (
                     <ArrowDownRight className="h-3 w-3 text-destructive" />
                   )}
                   <span className={`text-xs ${summary.grossMargin >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                     {summary.grossMargin.toFixed(1)}% margem
                   </span>
                 </div>
               </div>
               <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                 <TrendingUp className="h-5 w-5 text-emerald-500" />
               </div>
             </div>
           </CardContent>
         </Card>
 
          <Card>
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Lucro Líquido</p>
                  <p className={`text-base md:text-2xl font-light truncate ${summary.netProfit < 0 ? 'text-destructive' : ''}`}>
                   {formatCurrency(summary.netProfit)}
                 </p>
                 <div className="flex items-center gap-1 mt-1">
                   {summary.netMargin >= 0 ? (
                     <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                   ) : (
                     <ArrowDownRight className="h-3 w-3 text-destructive" />
                   )}
                   <span className={`text-xs ${summary.netMargin >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                     {summary.netMargin.toFixed(1)}% margem
                   </span>
                 </div>
               </div>
               <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                 summary.netProfit >= 0 ? 'bg-emerald-500/10' : 'bg-destructive/10'
               }`}>
                 <DollarSign className={`h-5 w-5 ${
                   summary.netProfit >= 0 ? 'text-emerald-500' : 'text-destructive'
                 }`} />
               </div>
             </div>
           </CardContent>
         </Card>
       </div>
 
        {/* Cash Flow Projection */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-light flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Fluxo de Caixa (Próximos 30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-3">
              <div className="p-4 bg-background rounded-lg border">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                  Entradas Esperadas
                </p>
                <p className="text-xl font-light text-emerald-600">{formatCurrency(cashFlow.expectedRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {cashFlow.pendingOrdersCount} pedido(s) pendente(s)
                </p>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <ArrowDownRight className="h-3 w-3 text-destructive" />
                  Saídas Previstas
                </p>
                <p className="text-xl font-light text-destructive">{formatCurrency(cashFlow.expectedExpenses)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {cashFlow.upcomingExpensesCount} despesa(s) a vencer
                </p>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <ArrowRight className="h-3 w-3" />
                  Saldo Projetado
                </p>
                <p className={`text-xl font-light ${cashFlow.projectedBalance >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {formatCurrency(cashFlow.projectedBalance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Diferença entre entradas e saídas</p>
              </div>
            </div>
          </CardContent>
        </Card>

       {/* Secondary Stats */}
        <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardContent className="p-3 md:p-6">
             <div className="flex items-center justify-between">
               <div>
                  <p className="text-sm text-muted-foreground">Despesas (Período)</p>
                  <p className="text-xl font-light">{formatCurrency(summary.totalExpenses)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pagas: {formatCurrency(summary.expenses)} | Pendentes: {formatCurrency(summary.pendingExpenses)}
                  </p>
               </div>
               <TrendingDown className="h-5 w-5 text-muted-foreground" />
             </div>
           </CardContent>
         </Card>
 
          <Card>
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Despesas Pendentes</p>
                 <p className="text-xl font-light">{formatCurrency(totalPending)}</p>
               </div>
               <Wallet className="h-5 w-5 text-muted-foreground" />
             </div>
           </CardContent>
         </Card>
 
          <Card>
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                   <div className="flex items-center gap-2">
                     <p className="text-sm text-muted-foreground">Ticket Médio</p>
                    {renderGrowthBadge(summary.averageGrowth)}
                  </div>
                 <p className="text-xl font-light">{formatCurrency(summary.averageOrderValue)}</p>
               </div>
               <ShoppingBag className="h-5 w-5 text-muted-foreground" />
             </div>
           </CardContent>
         </Card>
       </div>
 
       {/* New breakdown charts */}
        <div className="grid gap-3 md:gap-4 grid-cols-1 lg:grid-cols-3">
          <PaymentMethodsChart data={paymentMethods} />
          <ExpensesByCategoryChart data={expensesByCategory} />
          <RevenueBySourceChart data={revenueBySource} />
        </div>

       {/* Charts */}
       <div className="grid gap-6 lg:grid-cols-2">
         {/* Monthly Revenue vs Expenses */}
         <Card>
           <CardHeader>
             <CardTitle className="text-lg font-light">Receita vs Despesas (6 meses)</CardTitle>
           </CardHeader>
           <CardContent>
              <div className="h-[200px] md:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                   <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                   <XAxis dataKey="month" className="text-xs" />
                   <YAxis 
                     className="text-xs" 
                     tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`}
                   />
                   <Tooltip 
                     formatter={(value: number) => formatCurrency(value)}
                     labelFormatter={(label) => `Mês: ${label}`}
                   />
                   <Legend />
                   <Bar dataKey="revenue" name="Receita" fill="hsl(var(--primary))" />
                   <Bar dataKey="expenses" name="Despesas" fill="hsl(var(--destructive))" />
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </CardContent>
         </Card>
 
         {/* Profit Trend */}
         <Card>
           <CardHeader>
             <CardTitle className="text-lg font-light">Evolução do Lucro</CardTitle>
           </CardHeader>
           <CardContent>
              <div className="h-[200px] md:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                   <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                   <XAxis dataKey="month" className="text-xs" />
                   <YAxis 
                     className="text-xs" 
                     tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`}
                   />
                   <Tooltip 
                     formatter={(value: number) => formatCurrency(value)}
                     labelFormatter={(label) => `Mês: ${label}`}
                   />
                   <Line 
                     type="monotone" 
                     dataKey="profit" 
                     name="Lucro"
                     stroke="hsl(142, 76%, 36%)" 
                     strokeWidth={2}
                     dot={{ fill: 'hsl(142, 76%, 36%)' }}
                   />
                 </LineChart>
               </ResponsiveContainer>
             </div>
           </CardContent>
         </Card>
       </div>
 
       {/* Product Profitability */}
       <Card>
         <CardHeader>
           <CardTitle className="text-lg font-light">
             Produtos Mais Lucrativos ({periodLabel[period]})
           </CardTitle>
         </CardHeader>
         <CardContent>
           {productProfitability.length === 0 ? (
             <p className="text-muted-foreground text-center py-8">
               Nenhuma venda no período selecionado
             </p>
           ) : (
             <div className="overflow-x-auto">
               <table className="w-full">
                 <thead>
                   <tr className="border-b">
                     <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Produto</th>
                     <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Qtd</th>
                     <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Receita</th>
                     <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Custo</th>
                     <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Lucro</th>
                     <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Margem</th>
                   </tr>
                 </thead>
                 <tbody>
                   {productProfitability.map((product) => (
                     <tr key={product.id} className="border-b hover:bg-muted/50">
                       <td className="py-3 px-4 text-sm">{product.title}</td>
                       <td className="py-3 px-4 text-sm text-right">{product.quantity}</td>
                       <td className="py-3 px-4 text-sm text-right">{formatCurrency(product.revenue)}</td>
                       <td className="py-3 px-4 text-sm text-right text-muted-foreground">
                         {formatCurrency(product.cost)}
                       </td>
                       <td className={`py-3 px-4 text-sm text-right font-medium ${
                         product.profit >= 0 ? 'text-emerald-600' : 'text-destructive'
                       }`}>
                         {formatCurrency(product.profit)}
                       </td>
                       <td className={`py-3 px-4 text-sm text-right ${
                         product.margin >= 30 ? 'text-emerald-600' : 
                         product.margin >= 15 ? 'text-amber-600' : 'text-destructive'
                       }`}>
                         {product.margin.toFixed(1)}%
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}
         </CardContent>
       </Card>

      {/* DRE Report Modal */}
      <DREReport
        open={showDRE}
        onOpenChange={setShowDRE}
        period={period}
        summary={summary}
        expenses={totalPending}
        periodLabel={periodLabel[period]}
      />
     </div>
   );
 }