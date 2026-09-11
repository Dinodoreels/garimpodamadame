import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  phase: string;
}

export function InboundComingSoon({ title, subtitle, phase }: Props) {
  return (
    <div className="space-y-6">
      <AdminPageHeader title={title} subtitle={subtitle} />
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <Construction className="h-12 w-12 mx-auto mb-4 opacity-30" strokeWidth={1.5} />
          <p className="font-medium text-foreground">Em breve</p>
          <p className="text-sm mt-1">Esta etapa faz parte da {phase} do módulo Inbound.</p>
        </CardContent>
      </Card>
    </div>
  );
}
