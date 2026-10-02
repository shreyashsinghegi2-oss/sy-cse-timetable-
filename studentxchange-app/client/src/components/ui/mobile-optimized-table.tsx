import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface MobileTableProps {
  children: ReactNode;
  className?: string;
}

interface MobileRowProps {
  children: ReactNode;
  className?: string;
}

interface MobileFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function MobileTable({ children, className = "" }: MobileTableProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {children}
    </div>
  );
}

export function MobileRow({ children, className = "" }: MobileRowProps) {
  return (
    <Card className={`${className}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export function MobileField({ label, children, className = "" }: MobileFieldProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center ${className}`}>
      <span className="text-sm font-medium text-gray-600 mb-1 sm:mb-0">{label}:</span>
      <div className="text-sm text-gray-900">{children}</div>
    </div>
  );
}

interface ResponsiveTableProps {
  desktopTable: ReactNode;
  mobileTable: ReactNode;
  className?: string;
}

export function ResponsiveTable({ desktopTable, mobileTable, className = "" }: ResponsiveTableProps) {
  return (
    <div className={className}>
      {/* Desktop Table */}
      <div className="hidden lg:block">
        {desktopTable}
      </div>
      
      {/* Mobile Table */}
      <div className="lg:hidden">
        {mobileTable}
      </div>
    </div>
  );
}