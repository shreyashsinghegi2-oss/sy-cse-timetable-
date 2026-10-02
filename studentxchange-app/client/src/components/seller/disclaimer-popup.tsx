import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";

interface DisclaimerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export function DisclaimerPopup({ isOpen, onClose, onAccept }: DisclaimerPopupProps) {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    if (accepted) {
      onAccept();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Seller Disclaimer
          </DialogTitle>
          <DialogDescription className="text-left space-y-3 text-sm">
            <p>By selling on StudentXchange, you confirm that:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>You own the rights to sell these materials</li>
              <li>The content is not copyrighted or plagiarized</li>
              <li>Information provided is accurate and truthful</li>
              <li>You agree to our 20% service charges policy</li>
              <li>You understand the platform terms and conditions</li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center space-x-2 mt-4">
          <Checkbox 
            id="accept-terms"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
          />
          <label 
            htmlFor="accept-terms" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I agree to these terms and conditions
          </label>
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAccept} 
            disabled={!accepted}
            className={!accepted ? "opacity-50 cursor-not-allowed" : ""}
          >
            Accept & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}