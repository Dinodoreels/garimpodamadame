 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
import { addWeeks, addMonths, addYears, format } from 'date-fns';
 
 export interface ExpenseCategory {
   id: string;
   name: string;
   color: string;
   created_at: string;
 }
 
 export interface Expense {
   id: string;
   category_id: string | null;
   description: string;
   amount: number;
   due_date: string;
   paid_at: string | null;
   is_recurring: boolean;
   recurrence_type: string | null;
   supplier: string | null;
   notes: string | null;
   created_at: string;
   updated_at: string;
   category?: ExpenseCategory;
 }
 
 export interface ExpenseFormData {
   category_id: string | null;
   description: string;
   amount: number;
   due_date: string;
   is_recurring: boolean;
   recurrence_type: string | null;
   supplier: string | null;
   notes: string | null;
 }
 
 export function useExpenses() {
   const queryClient = useQueryClient();
 
   // Fetch categories
   const { data: categories = [], isLoading: categoriesLoading } = useQuery({
     queryKey: ['expense-categories'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('expense_categories')
         .select('*')
         .order('name');
       
       if (error) throw error;
       return data as ExpenseCategory[];
     },
   });
 
   // Fetch expenses
   const { data: expenses = [], isLoading: expensesLoading } = useQuery({
     queryKey: ['expenses'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('expenses')
         .select(`
           *,
           category:expense_categories(*)
         `)
         .order('due_date', { ascending: false });
       
       if (error) throw error;
       return data as Expense[];
     },
   });
 
   // Create expense
   const createExpense = useMutation({
     mutationFn: async (expense: ExpenseFormData) => {
       const { data, error } = await supabase
         .from('expenses')
         .insert(expense)
         .select()
         .single();
       
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['expenses'] });
       queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
       toast.success('Despesa criada com sucesso!');
     },
     onError: (error) => {
       toast.error('Erro ao criar despesa: ' + error.message);
     },
   });
 
   // Update expense
   const updateExpense = useMutation({
     mutationFn: async ({ id, ...expense }: ExpenseFormData & { id: string }) => {
       const { data, error } = await supabase
         .from('expenses')
         .update(expense)
         .eq('id', id)
         .select()
         .single();
       
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['expenses'] });
       queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
       toast.success('Despesa atualizada com sucesso!');
     },
     onError: (error) => {
       toast.error('Erro ao atualizar despesa: ' + error.message);
     },
   });
 
   // Delete expense
   const deleteExpense = useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase
         .from('expenses')
         .delete()
         .eq('id', id);
       
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['expenses'] });
       queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
       toast.success('Despesa excluída com sucesso!');
     },
     onError: (error) => {
       toast.error('Erro ao excluir despesa: ' + error.message);
     },
   });
 
   // Mark expense as paid
   const markAsPaid = useMutation({
    mutationFn: async (id: string) => {
      // First, get the expense to check if it's recurring
      const { data: expense, error: fetchError } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Mark as paid
      const { data, error } = await supabase
         .from('expenses')
         .update({ paid_at: new Date().toISOString() })
         .eq('id', id)
         .select()
         .single();
       
       if (error) throw error;

      // If recurring, create the next expense
      if (expense.is_recurring && expense.recurrence_type) {
        const currentDueDate = new Date(expense.due_date);
        let nextDueDate: Date;

        switch (expense.recurrence_type) {
          case 'weekly':
            nextDueDate = addWeeks(currentDueDate, 1);
            break;
          case 'monthly':
            nextDueDate = addMonths(currentDueDate, 1);
            break;
          case 'yearly':
            nextDueDate = addYears(currentDueDate, 1);
            break;
          default:
            nextDueDate = addMonths(currentDueDate, 1);
        }

        // Create next recurring expense
        const { error: createError } = await supabase
          .from('expenses')
          .insert({
            category_id: expense.category_id,
            description: expense.description,
            amount: expense.amount,
            due_date: format(nextDueDate, 'yyyy-MM-dd'),
            is_recurring: true,
            recurrence_type: expense.recurrence_type,
            supplier: expense.supplier,
            notes: expense.notes,
          });

        if (createError) {
          console.error('Error creating next recurring expense:', createError);
          // Don't throw - the main action succeeded
        }
      }

      return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['expenses'] });
       queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success('Despesa marcada como paga!');
     },
     onError: (error) => {
       toast.error('Erro ao marcar como paga: ' + error.message);
     },
   });
 
   // Summary calculations
   const pendingExpenses = expenses.filter(e => !e.paid_at);
   const paidExpenses = expenses.filter(e => e.paid_at);
   const totalPending = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);
   const totalPaid = paidExpenses.reduce((sum, e) => sum + e.amount, 0);
 
   // Upcoming expenses (next 7 days)
   const today = new Date();
   const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
   const upcomingExpenses = pendingExpenses.filter(e => {
     const dueDate = new Date(e.due_date);
     return dueDate >= today && dueDate <= nextWeek;
   });
 
   // Overdue expenses
   const overdueExpenses = pendingExpenses.filter(e => {
     const dueDate = new Date(e.due_date);
     return dueDate < today;
   });
 
   return {
     categories,
     expenses,
     pendingExpenses,
     paidExpenses,
     upcomingExpenses,
     overdueExpenses,
     totalPending,
     totalPaid,
     isLoading: categoriesLoading || expensesLoading,
     createExpense,
     updateExpense,
     deleteExpense,
     markAsPaid,
   };
 }