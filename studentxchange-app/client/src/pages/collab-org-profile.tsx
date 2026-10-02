import { useLocation as useWouterLocation } from 'wouter';
import { MultiProfileBuilder } from '@/components/collab/multi-profile-builder';
import { useState } from 'react';

export default function CollabOrgProfile() {
  const [location, setLocation] = useWouterLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const orgType = searchParams.get('type') || 'Club';
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    setLocation('/collab-org-profile-view');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <MultiProfileBuilder 
          initialRole={orgType as 'Club' | 'Community' | 'Company'}
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleClose();
            }
          }}
        />
      </div>
    </div>
  );
}
