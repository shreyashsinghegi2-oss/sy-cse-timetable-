// Simple toast implementation without complex state management
export function useSimpleToast() {
  const toast = ({ title, description, variant = "default" }: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => {
    // For now, just use browser alert for simplicity
    if (variant === "destructive") {
      alert(`Error: ${title}\n${description || ""}`);
    } else {
      alert(`${title}\n${description || ""}`);
    }
  };

  return { toast };
}