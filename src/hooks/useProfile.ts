import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async (): Promise<Profile | null> => {
    if (!user) return null;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
      return null;
    }

    if (!data) {
      const metadataName = typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name.trim()
        : '';
      const metadataPhone = typeof user.user_metadata?.phone === 'string'
        ? user.user_metadata.phone.trim()
        : '';
      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: metadataName && !metadataName.includes('@') ? metadataName : null,
          phone: metadataPhone || null,
        }, { onConflict: 'id' })
        .select('*')
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        setLoading(false);
        return null;
      }

      setProfile(createdProfile);
      setLoading(false);
      return createdProfile;
    }

    setProfile(data);
    setLoading(false);
    return data;
  };

  const updateProfile = async (updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...updates }, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      return { error };
    }

    setProfile(data);
    return { error: null };
  };

  return {
    profile,
    loading,
    updateProfile,
    refetch: fetchProfile
  };
}
