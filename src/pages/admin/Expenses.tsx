 import { useState } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Badge } from '@/components/ui/badge';
 import { 
   Plus, 
   Search, 
   CheckCircle2, 
   Clock, 
   AlertCircle,
   Pencil,
   Trash2,
   ArrowLeft,
   Filter
 } from 'lucide-react';
 import { useExpenses, Expense, ExpenseFormData } from '@/hooks/useExpenses';
 import { ExpenseDialog } from '@/components/admin/ExpenseDialog';
 import { format, isAfter, isBefore, addDays } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import { Link } from 'react-router-dom';
 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
 } from '@/components/ui/alert-dialog';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 
 export default function Expenses() {
   const { 
     expenses, 
     categories, 
     totalPending, 
     totalPaid,
     isLoading,
     createExpense,
     updateExpense,
     deleteExpense,
     markAsPaid,
   } = useExpenses();
 
   const [dialogOpen, setDialogOpen] = useState(false);
   const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
   const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
   const [search, setSearch] = useState('');
   const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
   const [categoryFilter, setCategoryFilter] = useState<string>('all');
 
   const formatCurrency = (value: number) => {
     return new Intl.NumberFormat('pt-BR', {
       style: 'currency',
       currency: 'BRL',
     }).format(value);
   };
 
   const getExpenseStatus = (expense: Expense) => {
     if (expense.paid_at) return 'paid';
     const dueDate = new Date(expense.due_date);
     const today = new Date();
     today.setHours(0, 0, 0, 0);
     if (isBefore(dueDate, today)) return 'overdue';
     if (isBefore(dueDate, addDays(today, 7))) return 'upcoming';
     return 'pending';
   };
 
   const filteredExpenses = expenses.filter(expense => {
     const matchesSearch = expense.description.toLowerCase().includes(search.toLowerCase()) ||
       expense.supplier?.toLowerCase().includes(search.toLowerCase());
     
     const status = getExpenseStatus(expense);
     const matchesStatus = statusFilter === 'all' || 
       (statusFilter === 'paid' && status === 'paid') ||
       (statusFilter === 'pending' && status !== 'paid') ||
       (statusFilter === 'overdue' && status === 'overdue');
 
     const matchesCategory = categoryFilter === 'all' || expense.category_id === categoryFilter;
 
     return matchesSearch && matchesStatus && matchesCategory;
   });
 
   const handleOpenDialog = (expense?: Expense) => {
     setSelectedExpense(expense || null);
     setDialogOpen(true);
   };
 
   const handleSave = (data: ExpenseFormData & { id?: string }) => {
     if (data.id) {
       updateExpense.mutate(data as ExpenseFormData & { id: string }, {
         onSuccess: () => setDialogOpen(false),
       });
     } else {
       createExpense.mutate(data, {
         onSuccess: () => setDialogOpen(false),
       });
     }
   };
 
   const handleDelete = () => {
     if (expenseToDelete) {
       deleteExpense.mutate(expenseToDelete, {
         onSuccess: () => {
           setDeleteDialogOpen(false);
           setExpenseToDelete(null);
         },
       });
     }
   };
 
   const StatusBadge = ({ expense }: { expense: Expense }) => {
     const status = getExpenseStatus(expense);
     
     if (status === 'paid') {
       return (
         <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
           <CheckCircle2 className="h-3 w-3 mr-1" />
           Pago
         </Badge>
       );
     }
     if (status === 'overdue') {
       return (
         <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
           <AlertCircle className="h-3 w-3 mr-1" />
           Vencido
         </Badge>
       );
     }
     if (status === 'upcoming') {
       return (
         <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
           <Clock className="h-3 w-3 mr-1" />
           Próximo
         </Badge>
       );
     }
     return (
       <Badge variant="outline" className="bg-muted text-muted-foreground">
         <Clock className="h-3 w-3 mr-1" />
         Pendente
       </Badge>
     );
   };
 
   return (
     <div className="space-y-6">
       {/* Header */}
       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
         <div className="flex items-center gap-4">
           <Link to="/admin/finance">
             <Button variant="ghost" size="icon">
               <ArrowLeft className="h-4 w-4" />
             </Button>
           </Link>
           <div>
             <h1 className="text-2xl font-light tracking-tight">Despesas</h1>
             <p className="text-sm text-muted-foreground">
               Gerencie contas a pagar e despesas
             </p>
           </div>
         </div>
         <Button onClick={() => handleOpenDialog()}>
           <Plus className="h-4 w-4 mr-2" />
           Nova Despesa
         </Button>
       </div>
 
       {/* Summary Cards */}
       <div className="grid gap-4 md:grid-cols-3">
         <Card>
           <CardContent className="p-6">
             <p className="text-sm text-muted-foreground">Total Pendente</p>
             <p className="text-2xl font-light text-amber-600">{formatCurrency(totalPending)}</p>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="p-6">
             <p className="text-sm text-muted-foreground">Total Pago (Este Mês)</p>
             <p className="text-2xl font-light text-emerald-600">{formatCurrency(totalPaid)}</p>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="p-6">
             <p className="text-sm text-muted-foreground">Total de Despesas</p>
             <p className="text-2xl font-light">{expenses.length}</p>
           </CardContent>
         </Card>
       </div>
 
       {/* Filters */}
       <Card>
         <CardContent className="p-4">
           <div className="flex flex-col md:flex-row gap-4">
             <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                 placeholder="Buscar despesa..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="pl-9"
               />
             </div>
             <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
               <SelectTrigger className="w-40">
                 <SelectValue placeholder="Status" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Todos</SelectItem>
                 <SelectItem value="pending">Pendentes</SelectItem>
                 <SelectItem value="paid">Pagos</SelectItem>
                 <SelectItem value="overdue">Vencidos</SelectItem>
               </SelectContent>
             </Select>
             <Select value={categoryFilter} onValueChange={setCategoryFilter}>
               <SelectTrigger className="w-40">
                 <SelectValue placeholder="Categoria" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Todas</SelectItem>
                 {categories.map((cat) => (
                   <SelectItem key={cat.id} value={cat.id}>
                     <div className="flex items-center gap-2">
                       <div 
                         className="w-2 h-2 rounded-full" 
                         style={{ backgroundColor: cat.color }}
                       />
                       {cat.name}
                     </div>
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
         </CardContent>
       </Card>
 
       {/* Expenses List */}
       <Card>
         <CardContent className="p-0">
           {filteredExpenses.length === 0 ? (
             <div className="p-8 text-center">
               <p className="text-muted-foreground">Nenhuma despesa encontrada</p>
             </div>
           ) : (
             <div className="divide-y">
               {filteredExpenses.map((expense) => (
                 <div 
                   key={expense.id} 
                   className="p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-muted/50"
                 >
                   <div className="flex-1">
                     <div className="flex items-center gap-2 mb-1">
                       {expense.category && (
                         <div 
                           className="w-2 h-2 rounded-full" 
                           style={{ backgroundColor: expense.category.color }}
                         />
                       )}
                       <span className="font-medium">{expense.description}</span>
                       {expense.is_recurring && (
                         <Badge variant="secondary" className="text-xs">
                           Recorrente
                         </Badge>
                       )}
                     </div>
                     <div className="flex items-center gap-4 text-sm text-muted-foreground">
                       <span>Vence: {format(new Date(expense.due_date), 'dd/MM/yyyy')}</span>
                       {expense.supplier && <span>• {expense.supplier}</span>}
                       {expense.category && <span>• {expense.category.name}</span>}
                     </div>
                   </div>
 
                   <div className="flex items-center gap-4">
                     <StatusBadge expense={expense} />
                     <span className="font-medium min-w-[100px] text-right">
                       {formatCurrency(expense.amount)}
                     </span>
                     <div className="flex items-center gap-2">
                       {!expense.paid_at && (
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => markAsPaid.mutate(expense.id)}
                           disabled={markAsPaid.isPending}
                         >
                           <CheckCircle2 className="h-4 w-4 mr-1" />
                           Pagar
                         </Button>
                       )}
                       <Button
                         variant="ghost"
                         size="icon"
                         onClick={() => handleOpenDialog(expense)}
                       >
                         <Pencil className="h-4 w-4" />
                       </Button>
                       <Button
                         variant="ghost"
                         size="icon"
                         onClick={() => {
                           setExpenseToDelete(expense.id);
                           setDeleteDialogOpen(true);
                         }}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           )}
         </CardContent>
       </Card>
 
       {/* Dialogs */}
       <ExpenseDialog
         open={dialogOpen}
         onOpenChange={setDialogOpen}
         expense={selectedExpense}
         categories={categories}
         onSave={handleSave}
         isLoading={createExpense.isPending || updateExpense.isPending}
       />
 
       <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Excluir Despesa</AlertDialogTitle>
             <AlertDialogDescription>
               Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Cancelar</AlertDialogCancel>
             <AlertDialogAction onClick={handleDelete}>
               Excluir
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </div>
   );
 }