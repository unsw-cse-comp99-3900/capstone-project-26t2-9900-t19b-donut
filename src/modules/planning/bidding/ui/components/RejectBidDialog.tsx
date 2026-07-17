import React, { useEffect, useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/modules/core/ui/primitives/alert-dialog';
import { Button } from '@/modules/core/ui/primitives/button';
import { Textarea } from '@/modules/core/ui/primitives/textarea';

interface RejectBidDialogProps {
  open: boolean;
  employeeName: string;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
}

export const RejectBidDialog: React.FC<RejectBidDialogProps> = ({
  open,
  employeeName,
  isSubmitting,
  onOpenChange,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={isSubmitting ? undefined : onOpenChange}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-rose-500" />
            Reject and withdraw bid
          </AlertDialogTitle>
          <AlertDialogDescription>
            {employeeName}&apos;s application will be withdrawn by management. They will receive the reason below, and the shift will remain open to other employees.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Explain why this application was not approved…"
          maxLength={1000}
          rows={5}
          disabled={isSubmitting}
          aria-label="Bid rejection reason"
        />
        <p className="text-right text-[10px] text-muted-foreground">{reason.trim().length}/1000</p>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={!reason.trim() || isSubmitting}
            onClick={() => void onConfirm(reason.trim())}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reject bid
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
