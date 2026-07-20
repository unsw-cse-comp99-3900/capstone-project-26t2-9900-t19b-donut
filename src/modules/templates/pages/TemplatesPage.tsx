// src/pages/TemplatesPage.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTemplates } from '../state/useTemplates';

// Components
import TemplatesSidebar from '../ui/components/TemplatesSidebar';
import TemplateEditor from '../ui/components/TemplateEditor';
import CreateTemplateDialog from '../ui/dialogs/CreateTemplateDialog';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/modules/core/ui/primitives/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/modules/core/ui/primitives/alert-dialog';
import { useToast } from '@/modules/core/hooks/use-toast';
import { useScopeFilter } from '@/platform/auth/useScopeFilter';
import { PersonalPageHeader } from '@/modules/core/ui/components/PersonalPageHeader';
import { PageState } from '@/modules/core/ui/components/PageState';
import { TemplateFunctionBar } from '../ui/components/TemplateFunctionBar';
import { cn } from '@/modules/core/lib/utils';
import { useTheme } from '@/modules/core/contexts/ThemeContext';

const TemplatesPage: React.FC = () => {
  const { toast } = useToast();
  const { scope, setScope, isGammaLocked, isLoading: isScopeLoading } = useScopeFilter('managerial');

  const {
    templates,
    currentTemplate,
    localTemplate,
    isLoading,
    isSaving,
    error,
    hasUnsavedChanges,
    fetchTemplates,
    fetchTemplate,
    createTemplate,
    saveTemplate,
    deleteTemplate,
    duplicateTemplate,
    updateTemplateStatus,
    renameTemplate,
    setCurrentTemplate,
    updateLocalGroup,
    addLocalSubgroup,
    updateLocalSubgroup,
    deleteLocalSubgroup,
    cloneLocalSubgroup,
    addLocalShift,
    updateLocalShift,
    deleteLocalShift,
    discardChanges,
    validateName,
    checkVersion,
  } = useTemplates();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [unsavedChangesDialog, setUnsavedChangesDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const [versionConflictDialog, setVersionConflictDialog] = useState(false);
  const [versionConflictInfo, setVersionConflictInfo] = useState<{
    currentVersion: number;
    serverVersion: number;
  } | null>(null);

  const organizationId = scope.org_ids[0] ?? '';
  const departmentId = scope.dept_ids[0] || '';
  const subDepartmentId = scope.subdept_ids[0] || '';

  useEffect(() => {
    if (organizationId) {
      fetchTemplates({
        organizationId,
        departmentId: departmentId || undefined,
        subDepartmentId: subDepartmentId || undefined,
      });
    }
  }, [fetchTemplates, organizationId, departmentId, subDepartmentId]);

  // Handle scope change mid-editing: Clear selection if it no longer matches the filter
  useEffect(() => {
    if (currentTemplate) {
      const isCorrectOrg = currentTemplate.organizationId === organizationId;
      // If department is selected, template must match it. If not, any template in the org is fine.
      const isCorrectDept = !departmentId || currentTemplate.departmentId === departmentId;
      // If sub-department is selected, template must match it.
      const isCorrectSubDept = !subDepartmentId || currentTemplate.subDepartmentId === subDepartmentId;

      if (!isCorrectOrg || !isCorrectDept || !isCorrectSubDept) {
        console.log('[TemplatesPage] Scope mismatch detected, clearing selected template');
        setCurrentTemplate(null);
      }
    }
  }, [organizationId, departmentId, subDepartmentId, currentTemplate, setCurrentTemplate]);

  const confirmAction = useCallback(
    (action: () => void) => {
      if (hasUnsavedChanges) {
        setPendingAction(() => action);
        setUnsavedChangesDialog(true);
      } else {
        action();
      }
    },
    [hasUnsavedChanges]
  );

  const executePendingAction = useCallback(() => {
    pendingAction?.();
    setPendingAction(null);
    setUnsavedChangesDialog(false);
  }, [pendingAction]);

  const handleSelectTemplate = useCallback(
    async (id: number | string) => {
      const action = async () => {
        const template = await fetchTemplate(String(id));
        if (template) setCurrentTemplate(template);
      };
      confirmAction(action);
    },
    [fetchTemplate, setCurrentTemplate, confirmAction]
  );

  const handleCreateTemplate = useCallback(
    async (input: {
      name: string;
      description: string;
      organizationId: string;
      departmentId: string;
      subDepartmentId: string;
    }) => {
      const result = await createTemplate({
        name: input.name,
        description: input.description,
        organizationId: input.organizationId,
        departmentId: input.departmentId,
        subDepartmentId: input.subDepartmentId,
      });

      if (result) setCreateDialogOpen(false);
    },
    [createTemplate]
  );

  // ✅ FIXED: Always return boolean
  const handleSaveChanges = useCallback(async (): Promise<boolean> => {
    const versionCheck = await checkVersion();

    if (versionCheck && !versionCheck.version_match) {
      setVersionConflictInfo({
        currentVersion: currentTemplate?.version || 0,
        serverVersion: versionCheck.current_version ?? 0,
      });
      setVersionConflictDialog(true);
      return false;
    }

    const result = await saveTemplate();
    return Boolean(result);
  }, [saveTemplate, checkVersion, currentTemplate?.version]);

  const handleVersionConflictRefresh = useCallback(async () => {
    if (!currentTemplate) return;

    const refreshed = await fetchTemplate(String(currentTemplate.id));
    if (refreshed) setCurrentTemplate(refreshed);

    setVersionConflictDialog(false);
    setVersionConflictInfo(null);
  }, [currentTemplate, fetchTemplate, setCurrentTemplate]);

  const handleBack = useCallback(() => {
    confirmAction(() => setCurrentTemplate(null));
  }, [setCurrentTemplate, confirmAction]);

  const handleArchiveTemplate = useCallback(
    async (id: string) => {
      await updateTemplateStatus(id, 'archived');
    },
    [updateTemplateStatus]
  );

  const handleUpdateStatus = useCallback(
    async (id: string, status: string) => {
      return await updateTemplateStatus(id, status);
    },
    [updateTemplateStatus]
  );

  const sidebarTemplates = templates.map((t) => ({
    id: String(t.id),
    name: t.name,
    description: t.description,
    status: t.status,
    version: t.version,
    startDate: t.startDate ?? null,
    endDate: t.endDate ?? null,
    updatedAt: t.updatedAt,
    publishedAt: t.publishedAt ?? null,
    organizationName: t.organizationName,
    departmentName: t.departmentName,
    subDepartmentName: t.subDepartmentName,
    groupCount: t.groups?.length ?? 0,
    subgroupCount:
      t.groups?.reduce((a, g) => a + (g.subGroups?.length ?? 0), 0) ?? 0,
    shiftCount:
      t.groups?.reduce(
        (a, g) =>
          a +
          (g.subGroups?.reduce((sa, sg) => sa + (sg.shifts?.length ?? 0), 0) ??
            0),
        0
      ) ?? 0,
  }));

  const [statusFilter, setStatusFilter] = useState<'published' | 'draft' | 'archived'>('published');
  const [searchQuery, setSearchQuery] = useState('');
  const { isDark } = useTheme();

  const counts = useMemo(
    () => ({
      draft: templates.filter((t) => t.status === 'draft').length,
      published: templates.filter((t) => t.status === 'published').length,
      archived: templates.filter((t) => t.status === 'archived').length,
    }),
    [templates]
  );

  const sidebarProps = {
    templates: sidebarTemplates,
    selectedTemplateId: currentTemplate?.id ? String(currentTemplate.id) : null,
    isLoading: isLoading,
    onSelectTemplate: handleSelectTemplate,
    onCreateTemplate: () => setCreateDialogOpen(true),
    onDeleteTemplate: deleteTemplate,
    onDuplicateTemplate: duplicateTemplate,
    onRenameTemplate: renameTemplate,
    onArchiveTemplate: handleArchiveTemplate,
    statusFilter,
    searchQuery,
  };

  return (
    <div className="h-full flex flex-col overflow-hidden px-0 md:px-8 pb-24 md:pb-0 gap-2 md:gap-4">
      {/* ── Unified Header ────────────────────────────────────────────── */}
      <div className="hidden md:block sticky top-0 z-30 pt-4 pb-4 lg:pb-6">
        <div className={cn(
          "rounded-[32px] p-4 lg:p-6 transition-all border",
          isDark 
            ? "bg-[#1c2333]/40 border-white/5 shadow-2xl shadow-black/20" 
            : "bg-white/70 backdrop-blur-md border-white shadow-xl shadow-slate-200/50"
        )}>
          {/* Row 1: Identity & Clock + Row 2: Scope Filter */}
          <PersonalPageHeader
            title="My Templates"
            Icon={FileText}
            scope={scope}
            setScope={setScope}
            isGammaLocked={isGammaLocked}
            mode="managerial"
          />

          {/* Row 3: Function Bar */}
          <div className="mt-4 lg:mt-6">
            <TemplateFunctionBar
              transparent
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onCreateTemplate={() => setCreateDialogOpen(true)}
              counts={counts}
            />
          </div>
        </div>
      </div>

      {/* Mobile keeps only the primary creation action. */}
      <div className="md:hidden shrink-0 flex justify-end px-4 pt-3">
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="h-10 rounded-xl px-4 font-bold shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* ── Main Content Area ─────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className={cn(
          "h-full overflow-hidden transition-all flex flex-col md:flex-row md:rounded-[32px] md:border",
          isDark 
            ? "bg-[#1c2333]/40 border-white/5 shadow-2xl shadow-black/20" 
            : "bg-white/70 backdrop-blur-md border-white shadow-xl shadow-slate-200/50"
        )}>
          <PageState 
            isLoading={isLoading || isScopeLoading}
            isError={!!error}
            errorMsg={error || undefined}
            onRetry={() => fetchTemplates({
              organizationId,
              departmentId: departmentId || undefined,
              subDepartmentId: subDepartmentId || undefined,
            })}
            isEmpty={templates.length === 0}
            emptyTitle="No Templates Found"
            emptyDesc="There are no templates matching your current filters. Create a new one to get started."
          >
            <>
              {/* Desktop sidebar — always visible */}
              <div className="hidden md:flex border-r border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/10">
                <TemplatesSidebar {...sidebarProps} />
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                {localTemplate ? (
                  <TemplateEditor
                    template={localTemplate}
                    isSaving={isSaving}
                    hasUnsavedChanges={hasUnsavedChanges}
                    onBack={handleBack}
                    onUpdateGroup={updateLocalGroup}
                    onAddSubgroup={addLocalSubgroup}
                    onUpdateSubgroup={updateLocalSubgroup}
                    onDeleteSubgroup={deleteLocalSubgroup}
                    onCloneSubgroup={cloneLocalSubgroup}
                    onAddShift={addLocalShift}
                    onUpdateShift={updateLocalShift}
                    onDeleteShift={deleteLocalShift}
                    onSaveChanges={handleSaveChanges}
                    onUpdateStatus={handleUpdateStatus}
                    onDiscardChanges={discardChanges}
                  />
                ) : (
                  <>
                    {/* On mobile, the template list is the primary panel. */}
                    <div className="md:hidden flex-1 min-h-0">
                      <TemplatesSidebar {...sidebarProps} className="w-full" />
                    </div>

                    {/* Desktop keeps the persistent sidebar/detail layout. */}
                    <div className="hidden md:flex flex-col flex-1 items-center justify-center h-full text-muted-foreground bg-muted/5">
                      <FileText className="h-16 w-16 mb-4 opacity-50" />
                      <p className="text-lg font-medium">Select a template to view details</p>
                      <p className="text-sm opacity-60">
                        Or create a new one from the functional bar
                      </p>
                    </div>
                  </>
                )}
              </div>
            </>
          </PageState>
        </div>
      </div>

      <CreateTemplateDialog
        isOpen={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateTemplate={handleCreateTemplate}
        initialScope={{ organizationId, departmentId, subDepartmentId }}
      />

      <AlertDialog open={unsavedChangesDialog} onOpenChange={setUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              Discard your changes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executePendingAction}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={versionConflictDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Version conflict</AlertDialogTitle>
            <AlertDialogDescription>
              Server version is newer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleVersionConflictRefresh}>
              Refresh
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TemplatesPage;
