import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, Send, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { StarRating } from './StarRating';
import { useProductReviews } from '@/hooks/useReviews';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ProductReviewsProps {
  productId: string;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { reviews, loading, stats, createReview } = useProductReviews(productId);
  const { user } = useAuth();
  
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    rating: 5,
    title: '',
    comment: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Faça login para avaliar');
      return;
    }

    if (!formData.comment.trim()) {
      toast.error('Escreva um comentário');
      return;
    }

    setSubmitting(true);
    try {
      await createReview({
        rating: formData.rating,
        title: formData.title || undefined,
        comment: formData.comment,
      });
      
      toast.success('Avaliação enviada! Aguarde aprovação.');
      setFormData({ rating: 5, title: '', comment: '' });
      setShowForm(false);
    } catch (error) {
      toast.error('Erro ao enviar avaliação');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Avaliações</h2>
          {stats.total > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={stats.average} size="sm" />
              <span className="text-sm text-muted-foreground">
                {stats.average.toFixed(1)} ({stats.total} {stats.total === 1 ? 'avaliação' : 'avaliações'})
              </span>
            </div>
          )}
        </div>
        
        {user && !showForm && (
          <Button variant="outline" onClick={() => setShowForm(true)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Avaliar
          </Button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Sua avaliação</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nota</label>
                <StarRating
                  rating={formData.rating}
                  size="lg"
                  interactive
                  onRatingChange={(rating) => setFormData({ ...formData, rating })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Título (opcional)</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Resumo da sua experiência"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Comentário</label>
                <Textarea
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  placeholder="Conte sobre sua experiência com o produto..."
                  rows={4}
                />
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Enviar Avaliação
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {review.profile?.full_name || 'Cliente'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(review.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <StarRating rating={review.rating} size="sm" />
              </div>
              
              {review.title && (
                <h4 className="font-medium mb-1">{review.title}</h4>
              )}
              
              <p className="text-sm text-muted-foreground">{review.comment}</p>
              
              {review.admin_reply && (
                <>
                  <Separator className="my-3" />
                  <div className="bg-muted/50 rounded-md p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Resposta da loja:
                    </p>
                    <p className="text-sm">{review.admin_reply}</p>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 md:py-12 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Ainda não há avaliações para este produto.</p>
          {user && (
            <p className="text-sm mt-1">Seja o primeiro a avaliar!</p>
          )}
        </div>
      )}
    </div>
  );
}
