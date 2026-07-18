import React, { useState } from 'react';
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/modules/core/ui/primitives/button';

interface BiometricUnlockPageProps {
  onUnlock: () => Promise<boolean>;
  onUsePassword: () => Promise<void> | void;
}

const BiometricUnlockPage: React.FC<BiometricUnlockPageProps> = ({
  onUnlock,
  onUsePassword,
}) => {
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async () => {
    setIsUnlocking(true);
    setError(null);

    try {
      await onUnlock();
    } catch (err: any) {
      setError(err?.message || 'Face ID verification was cancelled or failed.');
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1113] px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#1a1c1e] p-8 shadow-2xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
          <ShieldCheck className="h-8 w-8" />
        </div>

        <h1 className="text-center text-3xl font-bold text-white">Unlock Shiftopia</h1>
        <p className="mt-3 text-center text-sm text-gray-400">
          Use Face ID to unlock your saved session on this device.
        </p>

        {error && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <Button
            type="button"
            onClick={handleUnlock}
            disabled={isUnlocking}
            className="h-12 w-full rounded-xl bg-purple-600 hover:bg-purple-500"
          >
            {isUnlocking ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Unlock with Face ID'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onUsePassword}
            disabled={isUnlocking}
            className="h-12 w-full rounded-xl border-gray-700 text-white"
          >
            Use password instead
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BiometricUnlockPage;
