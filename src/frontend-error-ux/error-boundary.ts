/**
 * Lightweight React error boundary (ADR-028).
 * Contracts tsconfig is `.ts`-only — use createElement (no JSX).
 */

import {
  Component,
  createElement,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { ERROR_UX_IRANIAN_RULES } from "./presentation.js";
import { sanitizeUserErrorMessage } from "./sanitize.js";

export const ERROR_BOUNDARY_COPY_FA = {
  title: "مشکلی پیش آمد",
  body: "لطفاً دوباره تلاش کنید. اگر ادامه داشت با پشتیبانی تماس بگیرید.",
  retry: "تلاش مجدد",
} as const;

export type MerchantErrorBoundaryProps = {
  children: ReactNode;
  /** Optional override for fallback body (must already be safe Persian). */
  fallbackMessageFa?: string;
  /** Called after sanitize — never receives raw stack to show users. */
  onError?: (info: {
    messageFa: string;
    /** Dev-only diagnostic; do not render to users. */
    diagnosticName?: string;
  }) => void;
  onRetry?: () => void;
};

type MerchantErrorBoundaryState = {
  hasError: boolean;
  messageFa: string;
};

/**
 * Catches render errors and shows Persian RTL fallback — never English stacks.
 */
export class MerchantErrorBoundary extends Component<
  MerchantErrorBoundaryProps,
  MerchantErrorBoundaryState
> {
  override state: MerchantErrorBoundaryState = {
    hasError: false,
    messageFa: ERROR_BOUNDARY_COPY_FA.body,
  };

  static getDerivedStateFromError(): Partial<MerchantErrorBoundaryState> {
    return {
      hasError: true,
      messageFa: ERROR_BOUNDARY_COPY_FA.body,
    };
  }

  override componentDidCatch(error: Error, _info: ErrorInfo): void {
    const sanitized = sanitizeUserErrorMessage(
      this.props.fallbackMessageFa ?? ERROR_BOUNDARY_COPY_FA.body,
    );
    this.setState({ messageFa: sanitized.message });
    this.props.onError?.({
      messageFa: sanitized.message,
      diagnosticName: error.name,
    });
    // Intentionally do not expose error.stack / error.message to UI.
    void _info;
  }

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      messageFa: ERROR_BOUNDARY_COPY_FA.body,
    });
    this.props.onRetry?.();
  };

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const message =
      this.props.fallbackMessageFa?.trim() || this.state.messageFa;

    return createElement(
      "div",
      {
        role: "alert",
        "aria-live": "assertive",
        dir: ERROR_UX_IRANIAN_RULES.dir,
        lang: ERROR_UX_IRANIAN_RULES.lang,
        "data-error-presentation": "boundary",
      },
      createElement("h2", null, ERROR_BOUNDARY_COPY_FA.title),
      createElement("p", null, message),
      createElement(
        "button",
        {
          type: "button",
          onClick: this.handleRetry,
          style: {
            minHeight: ERROR_UX_IRANIAN_RULES.minRetryTouchTargetPx,
            minWidth: ERROR_UX_IRANIAN_RULES.minRetryTouchTargetPx,
          },
        },
        ERROR_BOUNDARY_COPY_FA.retry,
      ),
    );
  }
}

/**
 * Factory for tests / non-JSX hosts — same component class.
 */
export function createMerchantErrorBoundaryElement(
  props: MerchantErrorBoundaryProps,
): ReactNode {
  return createElement(MerchantErrorBoundary, props);
}
