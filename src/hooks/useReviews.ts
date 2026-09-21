import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from './useAdmin';

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  product?: {
    title: string;
    handle: string;
  };
  profile?: {
    full_name: string | null;
  };
}

export function useReviews() {
  const { isAdmin } = useAdmin();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    if (!isAdmin) return;

    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        product:products(title, handle),
        profile:profiles(full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return;
    }

    const formattedReviews = data?.map(review => ({
      ...review,
      product: review.product as any,
      profile: review.profile as any,
    })) || [];

    setReviews(formattedReviews as Review[]);
  }, [isAdmin]);

  const updateReviewStatus = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('reviews')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
    await fetchReviews();
  };

  const addAdminReply = async (id: string, reply: string) => {
    const { error } = await supabase
      .from('reviews')
      .update({ admin_reply: reply })
      .eq('id', id);

    if (error) throw error;
    await fetchReviews();
  };

  const deleteReview = async (id: string) => {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchReviews();
  };

  useEffect(() => {
    if (isAdmin) {
      fetchReviews().finally(() => setLoading(false));
    }
  }, [isAdmin, fetchReviews]);

  const pendingCount = reviews.filter(r => r.status === 'pending').length;

  return {
    reviews,
    loading,
    pendingCount,
    updateReviewStatus,
    addAdminReply,
    deleteReview,
    refetch: fetchReviews,
  };
}

export function useProductReviews(productId: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ average: 0, total: 0 });

  const fetchReviews = useCallback(async () => {
    if (!productId) return;

    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching product reviews:', error);
      return;
    }

    const formattedReviews = data || [];

    setReviews(formattedReviews as Review[]);

    // Calculate stats
    if (formattedReviews.length > 0) {
      const total = formattedReviews.length;
      const sum = formattedReviews.reduce((acc, r) => acc + r.rating, 0);
      setStats({ average: sum / total, total });
    }
  }, [productId]);

  const createReview = async (review: {
    rating: number;
    title?: string;
    comment: string;
    order_id?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('reviews')
      .insert({
        product_id: productId,
        user_id: user.id,
        rating: review.rating,
        title: review.title || null,
        comment: review.comment,
        order_id: review.order_id || null,
        status: 'pending',
      });

    if (error) throw error;
    await fetchReviews();
  };

  useEffect(() => {
    fetchReviews().finally(() => setLoading(false));
  }, [fetchReviews]);

  return {
    reviews,
    loading,
    stats,
    createReview,
    refetch: fetchReviews,
  };
}
