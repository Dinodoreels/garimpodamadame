 import { useState } from 'react';
 import { format, startOfMonth, startOfYear, subDays, subMonths } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import { CalendarIcon, Download, FileBarChart, Search } from 'lucide-react';
 import { 
   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
   PieChart, Pie, Cell, BarChart, Bar, Legend
 } from 'recharts';
 
 import { Button } from '@/components/ui/button';
 import { Calendar } from '@/components/ui/calendar';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Input } from '@/components/ui/input';
 import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { Skeleton } from '@/components/ui/skeleton';
 import { StatsCard } from '@/components/admin/StatsCard';
 import { useSalesReport } from '@/hooks/useSalesReport';
 import { cn } from '@/lib/utils';
 import { DollarSign, ShoppingBag, TrendingUp, Package } from 'lucide-react';
 
 const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
 
 const STATUS_LABELS: Record<string, string> = {
   paid: 'Pago',
   shipped: 'Enviado',
   delivered: 'Entregue',
   pending: 'Pendente',
   cancelled: 'Cancelado'
 };
 
 const QUICK_PERIODS = [
   { label: 'Hoje', days: 0 },
   { label: '7 dias', days: 7 },
   { label: '30 dias', days: 30 },
   { label: '90 dias', days: 90 },
   { label: 'Este mês', value: 'month' },
   { label: 'Este ano', value: 'year' }
 ];
 
 export default function Reports() {
   const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
     from: startOfMonth(new Date()),
     to: new Date()
   });
   const [category, setCategory] = useState<string>('all');
   const [productSearch, setProductSearch] = useState('');
   const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['paid', 'shipped', 'delivered']);
   
   const { data, isLoading } = useSalesReport({
     startDate: dateRange.from,
     endDate: dateRange.to,
     category: category !== 'all' ? category : undefined,
     status: selectedStatuses.length > 0 ? selectedStatuses : undefined
   });
   
   const handleQuickPeriod = (period: typeof QUICK_PERIODS[number]) => {
     const today = new Date();
     if (period.value === 'month') {
       setDateRange({ from: startOfMonth(today), to: today });
     } else if (period.value === 'year') {
       setDateRange({ from: startOfYear(today), to: today });
     } else if (period.days === 0) {
       setDateRange({ from: today, to: today });
     } else {
       setDateRange({ from: subDays(today, period.days!), to: today });
     }
   };
   
   const calculateTrend = (current: number, previous: number) => {
     if (previous === 0) return current > 0 ? 100 : 0;
     return Math.round(((current - previous) / previous) * 100);
   };
   
   const exportToCSV = () => {
     if (!data?.orders.length) return;
     
     const headers = ['Data', 'Pedido', 'Cliente', 'Produtos', 'Valor', 'Status'];
     const rows = data.orders.map(order => [
       format(new Date(order.created_at), 'dd/MM/yyyy HH:mm'),
       order.order_number,
       order.customer_name,
       order.items.map(i => `${i.product_title} (${i.quantity})`).join('; '),
       order.total.toFixed(2).replace('.', ','),
       STATUS_LABELS[order.status] || order.status
     ]);
     
     const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
     const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.href = url;
     link.download = `relatorio-vendas-${format(dateRange.from, 'yyyy-MM-dd')}-${format(dateRange.to, 'yyyy-MM-dd')}.csv`;
     link.click();
     URL.revokeObjectURL(url);
   };
   
   const formatCurrency = (value: number) => 
     new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
   
   const revenueTrend = data ? calculateTrend(data.summary.revenue, data.summary.previousRevenue) : 0;
   const ordersTrend = data ? calculateTrend(data.summary.ordersCount, data.summary.previousOrders) : 0;
   const unitsTrend = data ? calculateTrend(data.summary.unitsSold, data.summary.previousUnits) : 0;
   const ticketTrend = data && data.summary.previousOrders > 0 
     ? calculateTrend(data.summary.averageTicket, data.summary.previousRevenue / data.summary.previousOrders)
     : 0;
   
   // Filter orders by product search
   const filteredOrders = data?.orders.filter(order => {
     if (!productSearch) return true;
     const searchLower = productSearch.toLowerCase();
     return order.items.some(item => 
       item.product_title.toLowerCase().includes(searchLower)
     ) || order.order_number.toLowerCase().includes(searchLower)
       || order.customer_name.toLowerCase().includes(searchLower);
   }) || [];
 
   return (
     <div className="space-y-6">
       {/* Header */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div className="flex items-center gap-3">
           <FileBarChart className="h-6 w-6" strokeWidth={1.5} />
           <h1 className="text-xl md:text-2xl font-light tracking-tight">
             Relatórios de Vendas
           </h1>
         </div>
         <Button 
           onClick={exportToCSV} 
           variant="outline" 
           className="gap-2"
           disabled={!data?.orders.length}
         >
           <Download className="h-4 w-4" />
           Exportar CSV
         </Button>
       </div>
       
       {/* Filters */}
       <Card>
         <CardContent className="p-4">
           <div className="flex flex-wrap gap-4">
             {/* Date Range */}
             <div className="flex gap-2 items-center">
               <Popover>
                 <PopoverTrigger asChild>
                   <Button variant="outline" className="w-[140px] justify-start text-left font-normal">
                     <CalendarIcon className="mr-2 h-4 w-4" />
                     {format(dateRange.from, 'dd/MM/yyyy')}
                   </Button>
                 </PopoverTrigger>
                 <PopoverContent className="w-auto p-0" align="start">
                   <Calendar
                     mode="single"
                     selected={dateRange.from}
                     onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                     locale={ptBR}
                     className="pointer-events-auto"
                   />
                 </PopoverContent>
               </Popover>
               <span className="text-muted-foreground">até</span>
               <Popover>
                 <PopoverTrigger asChild>
                   <Button variant="outline" className="w-[140px] justify-start text-left font-normal">
                     <CalendarIcon className="mr-2 h-4 w-4" />
                     {format(dateRange.to, 'dd/MM/yyyy')}
                   </Button>
                 </PopoverTrigger>
                 <PopoverContent className="w-auto p-0" align="start">
                   <Calendar
                     mode="single"
                     selected={dateRange.to}
                     onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                     locale={ptBR}
                     className="pointer-events-auto"
                   />
                 </PopoverContent>
               </Popover>
             </div>
             
             {/* Quick Periods */}
             <div className="flex gap-1 flex-wrap">
               {QUICK_PERIODS.map((period) => (
                 <Button
                   key={period.label}
                   variant="ghost"
                   size="sm"
                   onClick={() => handleQuickPeriod(period)}
                   className="text-xs"
                 >
                   {period.label}
                 </Button>
               ))}
             </div>
             
             {/* Category Filter */}
             <Select value={category} onValueChange={setCategory}>
               <SelectTrigger className="w-[180px]">
                 <SelectValue placeholder="Categoria" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Todas as categorias</SelectItem>
                 {data?.categories.map(cat => (
                   <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
             
             {/* Product Search */}
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                 placeholder="Buscar pedido, cliente ou produto..."
                 value={productSearch}
                 onChange={(e) => setProductSearch(e.target.value)}
                 className="pl-9 w-[280px]"
               />
             </div>
           </div>
         </CardContent>
       </Card>
       
       {/* Summary Cards */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         {isLoading ? (
           <>
             <Skeleton className="h-28" />
             <Skeleton className="h-28" />
             <Skeleton className="h-28" />
             <Skeleton className="h-28" />
           </>
         ) : (
           <>
             <StatsCard
               title="Receita Total"
               value={formatCurrency(data?.summary.revenue || 0)}
               icon={DollarSign}
               trend={{ value: revenueTrend, isPositive: revenueTrend >= 0 }}
             />
             <StatsCard
               title="Pedidos"
               value={data?.summary.ordersCount || 0}
               icon={ShoppingBag}
               trend={{ value: ordersTrend, isPositive: ordersTrend >= 0 }}
             />
             <StatsCard
               title="Ticket Médio"
               value={formatCurrency(data?.summary.averageTicket || 0)}
               icon={TrendingUp}
               trend={{ value: ticketTrend, isPositive: ticketTrend >= 0 }}
             />
             <StatsCard
               title="Unidades Vendidas"
               value={data?.summary.unitsSold || 0}
               icon={Package}
               trend={{ value: unitsTrend, isPositive: unitsTrend >= 0 }}
             />
           </>
         )}
       </div>
       
       {/* Charts Row 1 */}
       <div className="grid md:grid-cols-2 gap-6">
         {/* Daily Sales Chart */}
         <Card>
           <CardHeader>
             <CardTitle className="text-sm font-medium">Vendas por Dia</CardTitle>
           </CardHeader>
           <CardContent>
             {isLoading ? (
               <Skeleton className="h-[250px]" />
             ) : (
               <ResponsiveContainer width="100%" height={250}>
                 <AreaChart data={data?.dailySales || []}>
                   <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                   <XAxis 
                     dataKey="date" 
                     tickFormatter={(val) => format(new Date(val), 'dd/MM')}
                     className="text-xs"
                   />
                   <YAxis 
                     tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                     className="text-xs"
                   />
                   <Tooltip 
                     labelFormatter={(val) => format(new Date(val), 'dd/MM/yyyy')}
                     formatter={(val: number) => [formatCurrency(val), 'Receita']}
                   />
                   <Area 
                     type="monotone" 
                     dataKey="revenue" 
                     stroke="hsl(var(--primary))" 
                     fill="hsl(var(--primary) / 0.2)" 
                     strokeWidth={2}
                   />
                 </AreaChart>
               </ResponsiveContainer>
             )}
           </CardContent>
         </Card>
         
         {/* Category Breakdown */}
         <Card>
           <CardHeader>
             <CardTitle className="text-sm font-medium">Vendas por Categoria</CardTitle>
           </CardHeader>
           <CardContent>
             {isLoading ? (
               <Skeleton className="h-[250px]" />
             ) : data?.categoryBreakdown.length ? (
               <ResponsiveContainer width="100%" height={250}>
                 <PieChart>
                   <Pie
                     data={data.categoryBreakdown}
                     dataKey="revenue"
                     nameKey="category"
                     cx="50%"
                     cy="50%"
                     outerRadius={80}
                     label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                     labelLine={false}
                   >
                     {data.categoryBreakdown.map((_, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip formatter={(val: number) => formatCurrency(val)} />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                 Sem dados para exibir
               </div>
             )}
           </CardContent>
         </Card>
       </div>
       
       {/* Charts Row 2 */}
       <div className="grid md:grid-cols-2 gap-6">
         {/* Top Products */}
         <Card>
           <CardHeader>
             <CardTitle className="text-sm font-medium">Top 10 Produtos</CardTitle>
           </CardHeader>
           <CardContent>
             {isLoading ? (
               <Skeleton className="h-[300px]" />
             ) : data?.topProducts.length ? (
               <div className="space-y-3">
                 {data.topProducts.map((product, index) => (
                   <div key={product.id} className="flex items-center gap-3">
                     <span className="text-sm font-medium text-muted-foreground w-6">
                       {index + 1}.
                     </span>
                     <div className="flex-1 min-w-0">
                       <p className="text-sm truncate">{product.title}</p>
                       <p className="text-xs text-muted-foreground">
                         {product.quantity} unidades
                       </p>
                     </div>
                     <span className="text-sm font-medium">
                       {formatCurrency(product.revenue)}
                     </span>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                 Sem dados para exibir
               </div>
             )}
           </CardContent>
         </Card>
         
         {/* Hourly Distribution */}
         <Card>
           <CardHeader>
             <CardTitle className="text-sm font-medium">Vendas por Hora do Dia</CardTitle>
           </CardHeader>
           <CardContent>
             {isLoading ? (
               <Skeleton className="h-[300px]" />
             ) : (
               <ResponsiveContainer width="100%" height={300}>
                 <BarChart data={data?.hourlyDistribution || []}>
                   <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                   <XAxis 
                     dataKey="hour" 
                     tickFormatter={(val) => `${val}h`}
                     className="text-xs"
                   />
                   <YAxis className="text-xs" />
                   <Tooltip 
                     labelFormatter={(val) => `${val}:00 - ${val}:59`}
                     formatter={(val: number, name: string) => [
                       name === 'orders' ? `${val} pedidos` : formatCurrency(val),
                       name === 'orders' ? 'Pedidos' : 'Receita'
                     ]}
                   />
                   <Legend />
                   <Bar dataKey="orders" name="Pedidos" fill="hsl(var(--chart-2))" />
                 </BarChart>
               </ResponsiveContainer>
             )}
           </CardContent>
         </Card>
       </div>
       
       {/* Orders Table */}
       <Card>
         <CardHeader>
           <CardTitle className="text-sm font-medium">
             Detalhes das Vendas ({filteredOrders.length} pedidos)
           </CardTitle>
         </CardHeader>
         <CardContent>
           {isLoading ? (
             <Skeleton className="h-[300px]" />
           ) : filteredOrders.length ? (
             <div className="overflow-x-auto">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Data</TableHead>
                     <TableHead>Pedido</TableHead>
                     <TableHead>Cliente</TableHead>
                     <TableHead>Produtos</TableHead>
                     <TableHead className="text-right">Valor</TableHead>
                     <TableHead>Status</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filteredOrders.slice(0, 50).map((order) => (
                     <TableRow key={order.id}>
                       <TableCell className="text-sm">
                         {format(new Date(order.created_at), 'dd/MM/yyyy')}
                       </TableCell>
                       <TableCell className="font-mono text-sm">
                         {order.order_number}
                       </TableCell>
                       <TableCell className="text-sm">
                         {order.customer_name}
                       </TableCell>
                       <TableCell className="text-sm max-w-[200px] truncate">
                         {order.items.map(i => i.product_title).join(', ')}
                       </TableCell>
                       <TableCell className="text-right font-medium">
                         {formatCurrency(order.total)}
                       </TableCell>
                       <TableCell>
                         <span className={cn(
                           "text-xs px-2 py-1 rounded-full",
                           order.status === 'paid' && "bg-primary/10 text-primary",
                           order.status === 'shipped' && "bg-accent text-accent-foreground",
                           order.status === 'delivered' && "bg-muted text-foreground",
                           order.status === 'pending' && "bg-secondary text-secondary-foreground",
                           order.status === 'cancelled' && "bg-destructive/10 text-destructive"
                         )}>
                           {STATUS_LABELS[order.status] || order.status}
                         </span>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
               {filteredOrders.length > 50 && (
                 <p className="text-sm text-muted-foreground text-center mt-4">
                   Mostrando 50 de {filteredOrders.length} pedidos. Exporte para ver todos.
                 </p>
               )}
             </div>
           ) : (
             <div className="h-[200px] flex items-center justify-center text-muted-foreground">
               Nenhum pedido encontrado para os filtros selecionados
             </div>
           )}
         </CardContent>
       </Card>
     </div>
   );
 }