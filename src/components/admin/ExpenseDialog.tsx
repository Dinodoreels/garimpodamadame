 import { useState, useEffect } from 'react';
 import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Switch } from '@/components/ui/switch';
 import { Expense, ExpenseCategory, ExpenseFormData } from '@/hooks/useExpenses';
 
 interface ExpenseDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   expense?: Expense | null;
   categories: ExpenseCategory[];
   onSave: (data: ExpenseFormData & { id?: string }) => void;
   isLoading?: boolean;
 }
 
 export function ExpenseDialog({
   open,
   onOpenChange,
   expense,
   categories,
   onSave,
   isLoading,
 }: ExpenseDialogProps) {
   const [formData, setFormData] = useState<ExpenseFormData>({
     category_id: null,
     description: '',
     amount: 0,
     due_date: new Date().toISOString().split('T')[0],
     is_recurring: false,
     recurrence_type: null,
     supplier: null,
     notes: null,
   });
 
   useEffect(() => {
     if (expense) {
       setFormData({
         category_id: expense.category_id,
         description: expense.description,
         amount: expense.amount,
         due_date: expense.due_date,
         is_recurring: expense.is_recurring,
         recurrence_type: expense.recurrence_type,
         supplier: expense.supplier,
         notes: expense.notes,
       });
     } else {
       setFormData({
         category_id: null,
         description: '',
         amount: 0,
         due_date: new Date().toISOString().split('T')[0],
         is_recurring: false,
         recurrence_type: null,
         supplier: null,
         notes: null,
       });
     }
   }, [expense, open]);
 
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     if (expense) {
       onSave({ ...formData, id: expense.id });
     } else {
       onSave(formData);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-md">
         <DialogHeader>
           <DialogTitle>
             {expense ? 'Editar Despesa' : 'Nova Despesa'}
           </DialogTitle>
         </DialogHeader>
 
         <form onSubmit={handleSubmit} className="space-y-4">
           <div className="space-y-2">
             <Label htmlFor="description">Descrição *</Label>
             <Input
               id="description"
               value={formData.description}
               onChange={(e) => setFormData({ ...formData, description: e.target.value })}
               placeholder="Ex: Aluguel Janeiro"
               required
             />
           </div>
 
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="amount">Valor (R$) *</Label>
               <Input
                 id="amount"
                 type="number"
                 step="0.01"
                 min="0"
                 value={formData.amount}
                 onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                 required
               />
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="due_date">Vencimento *</Label>
               <Input
                 id="due_date"
                 type="date"
                 value={formData.due_date}
                 onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                 required
               />
             </div>
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="category">Categoria</Label>
             <Select
               value={formData.category_id || ''}
               onValueChange={(value) => setFormData({ ...formData, category_id: value || null })}
             >
               <SelectTrigger>
                 <SelectValue placeholder="Selecione uma categoria" />
               </SelectTrigger>
               <SelectContent>
                 {categories.map((cat) => (
                   <SelectItem key={cat.id} value={cat.id}>
                     <div className="flex items-center gap-2">
                       <div 
                         className="w-3 h-3 rounded-full" 
                         style={{ backgroundColor: cat.color }}
                       />
                       {cat.name}
                     </div>
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="supplier">Fornecedor</Label>
             <Input
               id="supplier"
               value={formData.supplier || ''}
               onChange={(e) => setFormData({ ...formData, supplier: e.target.value || null })}
               placeholder="Nome do fornecedor"
             />
           </div>
 
           <div className="flex items-center justify-between">
             <Label htmlFor="is_recurring">Despesa Recorrente</Label>
             <Switch
               id="is_recurring"
               checked={formData.is_recurring}
               onCheckedChange={(checked) => setFormData({ 
                 ...formData, 
                 is_recurring: checked,
                 recurrence_type: checked ? 'monthly' : null 
               })}
             />
           </div>
 
           {formData.is_recurring && (
             <div className="space-y-2">
               <Label htmlFor="recurrence">Frequência</Label>
               <Select
                 value={formData.recurrence_type || 'monthly'}
                 onValueChange={(value) => setFormData({ ...formData, recurrence_type: value })}
               >
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="weekly">Semanal</SelectItem>
                   <SelectItem value="monthly">Mensal</SelectItem>
                   <SelectItem value="yearly">Anual</SelectItem>
                 </SelectContent>
               </Select>
             </div>
           )}
 
           <div className="space-y-2">
             <Label htmlFor="notes">Observações</Label>
             <Textarea
               id="notes"
               value={formData.notes || ''}
               onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
               placeholder="Anotações adicionais..."
               rows={3}
             />
           </div>
 
           <div className="flex justify-end gap-3 pt-4">
             <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
               Cancelar
             </Button>
             <Button type="submit" disabled={isLoading}>
               {isLoading ? 'Salvando...' : 'Salvar'}
             </Button>
           </div>
         </form>
       </DialogContent>
     </Dialog>
   );
 }