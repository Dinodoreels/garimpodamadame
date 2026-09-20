import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Mail, MessageCircle, Bell } from 'lucide-react';
import { GmailPreview } from './GmailPreview';
import { WhatsAppPreview } from './WhatsAppPreview';
import { fillTemplate, fillSubject } from '@/lib/messagePreview';

type Channel = 'whatsapp' | 'email' | 'both' | 'push' | 'whatsapp_push' | 'email_push' | 'all';

interface Props {
  channel: Channel;
  subject?: string;
  template?: string;
  storeName?: string;
  fromName?: string;
  fromEmail?: string;
}

function PushPreview({ subject, template, storeName }: Props) {
  const title = fillSubject(subject || storeName || 'Notificação');
  const body = fillTemplate(template || '');
  return (
    <div className="max-w-[380px] mx-auto rounded-2xl border bg-white/90 backdrop-blur p-3 shadow-sm flex gap-3">
      <div className="w-9 h-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
        {(storeName || 'L').charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0 text-[#111]">
        <div className="text-[13px] font-semibold truncate">{title}</div>
        <div className="text-[12px] text-[#444] line-clamp-2 whitespace-pre-wrap">{body}</div>
      </div>
      <div className="text-[10px] text-[#888] self-start">agora</div>
    </div>
  );
}

export function PreviewTabs(props: Props) {
  const { channel } = props;
  const [val, setVal] = useState('email');
  const showEmail = ['email', 'both', 'email_push', 'all'].includes(channel);
  const showWhats = ['whatsapp', 'both', 'whatsapp_push', 'all'].includes(channel);
  const showPush = ['push', 'whatsapp_push', 'email_push', 'all'].includes(channel);

  const tabs: { value: string; label: string; icon: any; node: React.ReactNode }[] = [];
  if (showEmail) tabs.push({ value: 'email', label: 'Gmail', icon: Mail, node: <GmailPreview {...props} /> });
  if (showWhats) tabs.push({ value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, node: <WhatsAppPreview {...props} /> });
  if (showPush) tabs.push({ value: 'push', label: 'Push', icon: Bell, node: <PushPreview {...props} /> });

  const firstTabValue = tabs[0]?.value;

  useEffect(() => {
    if (firstTabValue && !tabs.some((tab) => tab.value === val)) {
      setVal(firstTabValue);
    }
  }, [firstTabValue, tabs, val]);

  if (tabs.length === 0) return null;

  return (
    <Tabs value={val} onValueChange={setVal} className="w-full">
      <TabsList className="h-8">
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="text-xs gap-1.5 h-6">
            <t.icon className="h-3 w-3" />
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.value} value={t.value} className="mt-3">
          {t.node}
        </TabsContent>
      ))}
    </Tabs>
  );
}