import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useSimpleToast } from "@/hooks/use-simple-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CreditCard } from "lucide-react";

interface PayUButtonProps {
  amount: number;
  productinfo: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  onBeforeRedirect?: () => Promise<number>;
  onError?: (error: any) => void;
  disabled?: boolean;
  className?: string;
}

const PAYU_TIMEOUT_MS = 15000;

export default function PayUButton({
  amount,
  productinfo,
  customerName,
  customerEmail,
  customerPhone = "",
  onBeforeRedirect,
  onError,
  disabled = false,
  className = "",
}: PayUButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useSimpleToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState<any>(null);
  const [payuBaseUrl, setPayuBaseUrl] = useState<string>("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (formData && payuBaseUrl && formRef.current) {
      formRef.current.submit();
    }
  }, [formData, payuBaseUrl]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handlePayment = async () => {
    if (!customerName || !customerEmail) {
      toast({
        title: "Missing Information",
        description: "Please provide your name and email address.",
        variant: "destructive",
      });
      return;
    }

    if (amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Payment amount must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      let pendingOrderId: number | undefined;

      if (onBeforeRedirect) {
        pendingOrderId = await onBeforeRedirect();
      }

      if (!pendingOrderId) {
        throw new Error("Failed to create pending order");
      }

      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        toast({
          title: "Gateway Timeout",
          description: "PayU gateway took too long to respond. Please try again.",
          variant: "destructive",
        });
      }, PAYU_TIMEOUT_MS);

      const response = await apiRequest("POST", "/api/payu/pay", {
        amount,
        productinfo,
        firstname: customerName,
        email: customerEmail,
        phone: customerPhone,
        pendingOrderId,
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to initiate payment");
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setFormData(response.formData);
      setPayuBaseUrl(response.payuBaseUrl);

    } catch (error) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      console.error("[PAYU] Payment initiation failed:", error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });

      if (onError) {
        onError(error);
      }
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handlePayment}
        disabled={disabled || isLoading}
        className={className}
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Opening PayU Gateway...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay ₹{amount}
          </>
        )}
      </Button>

      {formData && payuBaseUrl && (
        <form
          ref={formRef}
          action={payuBaseUrl}
          method="POST"
          style={{ display: "none" }}
        >
          {Object.entries(formData).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value as string} />
          ))}
        </form>
      )}
    </>
  );
}
