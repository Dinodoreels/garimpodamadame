import { ExternalLink, BookOpen, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export interface SetupStep {
  text: string;
  link?: { label: string; url: string };
}

export interface ProviderGuide {
  intro?: string;
  steps: SetupStep[];
  docsUrl?: string;
  videoUrl?: string;
}

export function ProviderSetupGuide({ guide }: { guide: ProviderGuide }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-primary/10 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Como configurar — passo a passo</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2 text-sm">
          {guide.intro && (
            <p className="text-xs text-muted-foreground leading-relaxed">{guide.intro}</p>
          )}
          <ol className="space-y-2 list-none">
            {guide.steps.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 space-y-1">
                  <p className="text-xs leading-relaxed text-foreground/90">{step.text}</p>
                  {step.link && (
                    <a
                      href={step.link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {step.link.label}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {(guide.docsUrl || guide.videoUrl) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-primary/20">
              {guide.docsUrl && (
                <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                  <a href={guide.docsUrl} target="_blank" rel="noopener noreferrer">
                    <BookOpen className="h-3 w-3 mr-1" />
                    Documentação oficial
                  </a>
                </Button>
              )}
              {guide.videoUrl && (
                <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                  <a href={guide.videoUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Tutorial em vídeo
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
