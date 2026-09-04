import { formatWhatsApp } from '@/lib/messagePreview';
import { Check } from 'lucide-react';

interface Props {
  template?: string;
  storeName?: string;
}

export function WhatsAppPreview({ template, storeName }: Props) {
  const name = storeName || 'Sua Loja';
  const html = formatWhatsApp(template || '');
  const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="rounded-lg overflow-hidden border max-w-[380px] mx-auto shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 bg-[#075E54] text-white">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-medium">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{name}</div>
          <div className="text-[11px] text-white/80">online</div>
        </div>
      </div>

      {/* Conversation area */}
      <div className="p-3 min-h-[140px] bg-[#ECE5DD]">
        <div className="flex justify-end">
          <div className="relative max-w-[85%] bg-[#DCF8C6] text-[#111] rounded-lg rounded-tr-sm px-3 py-2 shadow-sm">
            <div
              className="text-[14px] leading-[1.45] whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{ __html: html || '<span style="color:#777">(mensagem vazia)</span>' }}
            />
            <div className="flex items-center gap-1 justify-end mt-1 text-[10px] text-[#667781]">
              <span>{time}</span>
              <span className="inline-flex -space-x-1.5 text-[#34B7F1]">
                <Check className="h-3 w-3" strokeWidth={3} />
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}