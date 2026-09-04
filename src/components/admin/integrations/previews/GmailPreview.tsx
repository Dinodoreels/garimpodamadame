import { formatEmailBody, fillSubject } from '@/lib/messagePreview';

interface Props {
  subject?: string;
  template?: string;
  fromName?: string;
  fromEmail?: string;
}

function initials(name: string): string {
  return (name || 'L').trim().charAt(0).toUpperCase();
}

function colorFor(name: string): string {
  const colors = ['#1a73e8', '#d93025', '#188038', '#e8710a', '#9334e6', '#129eaf'];
  let h = 0;
  for (let i = 0; i < (name || 'x').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff;
  return colors[Math.abs(h) % colors.length];
}

export function GmailPreview({ subject, template, fromName, fromEmail }: Props) {
  const sender = fromName || 'Sua Loja';
  const email = fromEmail || 'loja@exemplo.com';
  const subj = fillSubject(subject || '(sem assunto)');
  const body = formatEmailBody(template || '');

  return (
    <div className="rounded-lg overflow-hidden border bg-white text-[#202124] max-w-[640px] mx-auto shadow-sm">
      {/* Top bar mimicking Gmail */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-[#f6f8fc]">
        <div className="flex gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ea4335]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#fbbc04]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#34a853]" />
        </div>
        <span className="text-[11px] text-[#5f6368] ml-2">Gmail — Caixa de entrada</span>
      </div>

      <div className="p-4">
        <h2 className="text-[18px] font-normal text-[#202124] mb-3 leading-snug" dangerouslySetInnerHTML={{ __html: subj }} />

        <div className="flex gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0"
            style={{ background: colorFor(sender) }}
          >
            {initials(sender)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[13px]">
              <span className="font-medium text-[#202124]">{sender}</span>
              <span className="text-[#5f6368] truncate">&lt;{email}&gt;</span>
              <span className="text-[#5f6368] ml-auto text-[12px]">agora</span>
            </div>
            <div className="text-[12px] text-[#5f6368] mb-3">para mim</div>

            <div
              className="text-[14px] leading-[1.6] text-[#202124]"
              dangerouslySetInnerHTML={{ __html: body || '<span style="color:#5f6368">(mensagem vazia)</span>' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}