import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Cuando este valor cambia y hay un error activo, el boundary se recupera solo.
   * Se usa con la ruta actual para que navegar a otra sección salga de la
   * pantalla de error sin recargar. No provoca remontajes cuando no hay error.
   */
  resetKey?: string;
  /**
   * "app" cubre toda la aplicación y ocupa la pantalla completa.
   * "route" vive dentro del layout, así que el sidebar y el header siguen usables.
   */
  variant?: "app" | "route";
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Contiene los errores de render para que un fallo en un módulo no desmonte
 * toda la aplicación. React 18 sólo permite hacer esto con un componente de
 * clase: no existe equivalente en hooks.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Error de render no controlado:", error, errorInfo.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    const { children, variant = "route" } = this.props;

    if (!error) return children;

    const isAppLevel = variant === "app";

    return (
      <div
        className={
          isAppLevel
            ? "min-h-screen flex items-center justify-center bg-background px-4"
            : "flex items-center justify-center py-16 px-4"
        }
        role="alert"
      >
        <div className="w-full max-w-lg bg-white rounded-lg border border-secondary-medium shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary-900">
                {isAppLevel ? "La aplicación no pudo cargarse" : "Esta sección no pudo mostrarse"}
              </h2>
              <p className="text-sm text-secondary-dark">
                {isAppLevel
                  ? "Ocurrió un error inesperado al iniciar. Recarga la página para intentarlo de nuevo."
                  : "Ocurrió un error inesperado en este módulo. El resto del sistema sigue disponible."}
              </p>
            </div>
          </div>

          {import.meta.env.DEV && (
            <pre className="text-xs bg-secondary-light border border-secondary-medium rounded p-3 overflow-x-auto text-secondary-dark">
              {error.message}
            </pre>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {!isAppLevel && (
              <Button onClick={this.handleRetry} className="bg-primary hover:bg-primary-600 text-white">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
            )}
            <Button variant="outline" onClick={this.handleReload}>
              Recargar la página
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
