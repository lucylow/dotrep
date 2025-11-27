import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  icon?: React.ReactNode;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred while loading this content. Please try again.",
  onRetry,
  retryLabel = "Try Again",
  className,
  icon,
}: ErrorStateProps) {
  return (
    <Card className={cn("border-destructive/50", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon || <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />}
          {title}
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      {onRetry && (
        <CardContent>
          <Button onClick={onRetry} variant="outline" className="w-full sm:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            {retryLabel}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title = "No data available",
  message = "There is no content to display at this time.",
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-center", className)}>
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">{message}</p>
      {action}
    </div>
  );
}

