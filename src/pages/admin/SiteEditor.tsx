 import { useState, useEffect, useCallback } from 'react';
 import { 
   useCMSPages, 
   useCMSPage, 
   useUpdateCMSPage,
   useCreateCMSSection,
   useUpdateCMSSection,
   useDeleteCMSSection,
   useReorderCMSSections,
   BLOCK_DEFINITIONS,
   type CMSSection,
   type CMSPage,
 } from '@/hooks/useCMS';
 import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
 import { BlockPalette } from '@/components/cms/BlockPalette';
 import { EditorCanvas } from '@/components/cms/EditorCanvas';
 import { BlockEditor } from '@/components/cms/BlockEditor';
 import { PageManager } from '@/components/cms/PageManager';
 import { Button } from '@/components/ui/button';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Loader2, Eye, Globe, EyeOff, FileText, Palette, PanelLeft } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { useIsMobile } from '@/hooks/use-mobile';
 import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
 import type { Json } from '@/integrations/supabase/types';
 
 export default function SiteEditor() {
   const isMobile = useIsMobile();
   const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
   const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
   const [leftPanelOpen, setLeftPanelOpen] = useState(false);
   const [rightPanelOpen, setRightPanelOpen] = useState(false);
   
   const { data: pages, isLoading: loadingPages } = useCMSPages();
   const { data: currentPage, isLoading: loadingPage } = useCMSPage(selectedPageId);
 	const updatePage = useUpdateCMSPage();
   const createSection = useCreateCMSSection();
   const updateSection = useUpdateCMSSection();
   const deleteSection = useDeleteCMSSection();
   const reorderSections = useReorderCMSSections();
 
   // Auto-select first page
   useEffect(() => {
     if (pages?.length && !selectedPageId) {
       setSelectedPageId(pages[0].id);
     }
   }, [pages, selectedPageId]);
 
   const selectedSection = currentPage?.sections?.find(s => s.id === selectedSectionId) || null;
 
   const handlePreview = useCallback(() => {
     if (currentPage?.slug) {
       window.open(`/p/${currentPage.slug}?preview=true`, '_blank');
     }
   }, [currentPage?.slug]);
 
   const handlePublish = useCallback(async () => {
     if (currentPage) {
       await updatePage.mutateAsync({
         id: currentPage.id,
         is_published: !currentPage.is_published
       });
     }
   }, [currentPage, updatePage]);
 
   const handleToggleVisibility = useCallback(async (sectionId: string, isVisible: boolean) => {
     await updateSection.mutateAsync({ id: sectionId, is_visible: isVisible });
   }, [updateSection]);
 
   const handleAddBlock = async (type: string) => {
     if (!selectedPageId) return;
     const blockDef = BLOCK_DEFINITIONS.find(b => b.type === type);
     if (!blockDef) return;
 
     const position = (currentPage?.sections?.length || 0);
     await createSection.mutateAsync({
       page_id: selectedPageId,
       type,
       position,
       content: blockDef.defaultContent as Json,
       settings: blockDef.defaultSettings as Json,
     });
   };
 
   const handleUpdateSection = async (sectionId: string, content: Json, settings: Json) => {
     await updateSection.mutateAsync({ id: sectionId, content, settings });
   };
 
   const handleDeleteSection = async (sectionId: string) => {
     if (!selectedPageId) return;
     await deleteSection.mutateAsync({ id: sectionId, pageId: selectedPageId });
     if (selectedSectionId === sectionId) {
       setSelectedSectionId(null);
     }
   };
 
   const handleReorder = async (sections: CMSSection[]) => {
     if (!selectedPageId) return;
     const updates = sections.map((s, index) => ({ id: s.id, position: index }));
     await reorderSections.mutateAsync({ sections: updates, pageId: selectedPageId });
   };
 
   if (loadingPages) {
     return (
       <div className="flex items-center justify-center h-96">
         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
       </div>
     );
   }
 
   // Left Panel Content
   const LeftPanelContent = (
     <Tabs defaultValue="blocks" className="h-full flex flex-col">
       <TabsList className="w-full grid grid-cols-2 shrink-0">
         <TabsTrigger value="blocks" className="text-xs gap-1">
           <Palette className="h-3 w-3" />
           Blocos
         </TabsTrigger>
         <TabsTrigger value="pages" className="text-xs gap-1">
           <FileText className="h-3 w-3" />
           Páginas
         </TabsTrigger>
       </TabsList>
       <TabsContent value="blocks" className="flex-1 overflow-auto mt-0 p-3">
         <BlockPalette onAddBlock={handleAddBlock} />
       </TabsContent>
       <TabsContent value="pages" className="flex-1 overflow-auto mt-0 p-3">
         <PageManager 
           pages={pages || []} 
           selectedPageId={selectedPageId}
           onSelectPage={setSelectedPageId}
         />
       </TabsContent>
     </Tabs>
   );
 
   // Right Panel Content
   const RightPanelContent = selectedSection ? (
     <BlockEditor 
       section={selectedSection} 
       onUpdate={handleUpdateSection}
       onToggleVisibility={handleToggleVisibility}
       onClose={() => setSelectedSectionId(null)}
     />
   ) : (
     <div className="p-4 text-center text-muted-foreground text-sm">
       <p>Selecione um bloco para editar suas propriedades</p>
     </div>
   );
 
   return (
     <div className="h-[calc(100vh-4rem)] flex flex-col">
       <AdminPageHeader
         title="Editor do Site"
         subtitle="Personalize páginas, blocos e conteúdo"
         actions={
           <div className="flex items-center gap-2">
             {currentPage && (
               <span className={`text-xs px-2 py-1 rounded ${currentPage.is_published ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                 {currentPage.is_published ? 'Publicado' : 'Rascunho'}
               </span>
             )}
             <Button variant="outline" size="sm" className="gap-2" onClick={handlePreview} disabled={!currentPage}>
               <Eye className="h-4 w-4" />
               <span className="hidden sm:inline">Visualizar</span>
             </Button>
             <Button 
               size="sm" 
               className="gap-2"
               variant={currentPage?.is_published ? 'outline' : 'default'}
               onClick={handlePublish}
               disabled={!currentPage || updatePage.isPending}
             >
               {currentPage?.is_published ? (
                 <>
                   <EyeOff className="h-4 w-4" />
                   <span className="hidden sm:inline">Despublicar</span>
                 </>
               ) : (
                 <>
                   <Globe className="h-4 w-4" />
                   <span className="hidden sm:inline">Publicar</span>
                 </>
               )}
             </Button>
           </div>
         }
       />
 
       {/* Mobile Layout */}
       {isMobile ? (
         <div className="flex-1 flex flex-col overflow-hidden">
           {/* Mobile toolbar */}
           <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
             <Sheet open={leftPanelOpen} onOpenChange={setLeftPanelOpen}>
               <SheetTrigger asChild>
                 <Button variant="outline" size="sm" className="gap-2">
                   <PanelLeft className="h-4 w-4" />
                   Blocos
                 </Button>
               </SheetTrigger>
               <SheetContent side="left" className="w-72 p-0">
                 {LeftPanelContent}
               </SheetContent>
             </Sheet>
             
             {selectedSection && (
               <Sheet open={rightPanelOpen} onOpenChange={setRightPanelOpen}>
                 <SheetTrigger asChild>
                   <Button variant="outline" size="sm">
                     Editar Bloco
                   </Button>
                 </SheetTrigger>
                 <SheetContent side="right" className="w-80 p-0">
                   {RightPanelContent}
                 </SheetContent>
               </Sheet>
             )}
           </div>
           
           {/* Canvas */}
           <div className="flex-1 overflow-auto bg-muted/20 p-4">
             <EditorCanvas
               sections={(currentPage?.sections as CMSSection[]) || []}
               selectedSectionId={selectedSectionId}
               onSelectSection={setSelectedSectionId}
               onReorder={handleReorder}
               onDeleteSection={handleDeleteSection}
               isLoading={loadingPage}
             />
           </div>
         </div>
       ) : (
         /* Desktop Layout - 3 columns */
         <div className="flex-1 flex overflow-hidden">
           {/* Left Panel - Blocks/Pages */}
           <div className="w-64 border-r bg-background shrink-0 flex flex-col">
             {LeftPanelContent}
           </div>
 
           {/* Center - Canvas */}
           <div className="flex-1 overflow-auto bg-muted/20 p-6">
             <EditorCanvas
               sections={(currentPage?.sections as CMSSection[]) || []}
               selectedSectionId={selectedSectionId}
               onSelectSection={setSelectedSectionId}
               onReorder={handleReorder}
               onDeleteSection={handleDeleteSection}
               isLoading={loadingPage}
             />
           </div>
 
           {/* Right Panel - Properties */}
           <div className={cn(
             "w-80 border-l bg-background shrink-0 transition-all overflow-auto",
             !selectedSection && "w-0 border-l-0"
           )}>
             {RightPanelContent}
           </div>
         </div>
       )}
     </div>
   );
 }