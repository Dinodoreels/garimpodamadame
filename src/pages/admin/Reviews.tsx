import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Star, Check, X, MessageSquare, Loader2, Trash2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StarRating } from '@/components/products/StarRating';
import { useReviews, Review } from '@/hooks/useReviews';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Aprovado', className: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejeitado', className: 'bg-red-100 text-red-800' },
};

export default function Reviews() {
  const { reviews, loading, pendingCount, updateReviewStatus, addAdminReply, deleteReview } = useReviews();
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const filteredReviews = reviews.filter(r => filter === 'all' || r.status === filter);

  const handleApprove = async (id: string) => {
    setUpdating(true);
    try {
      await updateReviewStatus(id, 'approved');
      toast.success('Avaliação aprovada');
    } catch (error) {
      toast.error('Erro ao aprovar');
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async (id: string) => {
    setUpdating(true);
    try {
      await updateReviewStatus(id, 'rejected');
      toast.success('Avaliação rejeitada');
    } catch (error) {
      toast.error('Erro ao rejeitar');
    } finally {
      setUpdating(false);
    }
  };

  const handleReply = async () => {
    if (!selectedReview || !replyText.trim()) return;
    
    setUpdating(true);
    try {
      await addAdminReply(selectedReview.id, replyText);
      toast.success('Resposta adicionada');
      setSelectedReview(null);
      setReplyText('');
    } catch (error) {
      toast.error('Erro ao responder');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteReview(deleteId);
      toast.success('Avaliação excluída');
    } catch (error) {
      toast.error('Erro ao excluir');
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-wide">Avaliações</h1>
        <p className="text-sm text-muted-foreground">
          Modere as avaliações dos clientes
          {pendingCount > 0 && (
            <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800">
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </Badge>
          )}
        </p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">Todas ({reviews.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pendentes ({reviews.filter(r => r.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Aprovadas ({reviews.filter(r => r.status === 'approved').length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejeitadas ({reviews.filter(r => r.status === 'rejected').length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Avaliação</TableHead>
                <TableHead className="hidden md:table-cell">Cliente</TableHead>
                <TableHead className="hidden sm:table-cell">Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma avaliação encontrada</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredReviews.map((review) => {
                  const status = statusConfig[review.status];
                  return (
                    <TableRow key={review.id}>
                      <TableCell>
                        <Link 
                          to={`/product/${review.product?.handle}`}
                          className="text-sm hover:underline flex items-center gap-1"
                        >
                          {review.product?.title?.slice(0, 30) || 'Produto'}...
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <StarRating rating={review.rating} size="sm" />
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {review.comment.slice(0, 50)}...
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {review.profile?.full_name || 'Cliente'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {format(new Date(review.created_at), 'dd/MM/yy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={status.className}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {review.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleApprove(review.id)}
                                disabled={updating}
                              >
                                <Check className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleReject(review.id)}
                                disabled={updating}
                              >
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedReview(review);
                              setReplyText(review.admin_reply || '');
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(review.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reply Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={(open) => { if (!open) setSelectedReview(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder Avaliação</DialogTitle>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{selectedReview.profile?.full_name}</span>
                  <StarRating rating={selectedReview.rating} size="sm" />
                </div>
                {selectedReview.title && (
                  <p className="font-medium mb-1">{selectedReview.title}</p>
                )}
                <p className="text-sm text-muted-foreground">{selectedReview.comment}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sua resposta:</label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Obrigado pelo seu feedback..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReview(null)}>
              Cancelar
            </Button>
            <Button onClick={handleReply} disabled={updating || !replyText.trim()}>
              {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Resposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir avaliação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
