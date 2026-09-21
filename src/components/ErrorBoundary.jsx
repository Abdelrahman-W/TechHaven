import React from 'react';
import { RotateCcw, Home, AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('TechHaven ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: 'radial-gradient(ellipse at 50% 30%, #151824 0%, #0A0B0E 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '30px 20px',
            direction: 'rtl',
            fontFamily: 'var(--font-cairo, sans-serif)',
          }}
        >
          <div
            style={{
              maxWidth: 520,
              width: '100%',
              background: '#13151F',
              border: '1px solid rgba(255, 94, 20, 0.25)',
              borderRadius: '20px',
              padding: '40px 32px',
              textAlign: 'center',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(255, 94, 20, 0.08)',
            }}
          >
            {/* Warning Icon with Glow */}
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'rgba(255, 94, 20, 0.12)',
                border: '1px solid rgba(255, 94, 20, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                color: 'var(--brand-orange, #FF5E14)',
                boxShadow: '0 0 25px rgba(255, 94, 20, 0.3)',
              }}
            >
              <AlertTriangle size={36} />
            </div>

            <h2
              style={{
                fontSize: '1.45rem',
                fontWeight: 900,
                color: '#FFFFFF',
                marginBottom: 12,
                letterSpacing: '-0.3px',
              }}
            >
              حدث خطأ غير متوقع في العرض
            </h2>

            <p
              style={{
                color: '#9CA3AF',
                fontSize: '0.92rem',
                lineHeight: 1.7,
                marginBottom: 20,
              }}
            >
              لا تقلق، بياناتك وحسابك في أمان تام. يمكنك إعادة المحاولة لتحديث الصفحة فوراً أو العودة إلى الصفحة الرئيسية لمواصلة التسوق.
            </p>

            {this.state.error && (
              <pre
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #EF4444',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#FCA5A5',
                  fontSize: '0.8rem',
                  textAlign: 'left',
                  direction: 'ltr',
                  overflowX: 'auto',
                  marginBottom: '20px',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {this.state.error.toString()}
                {this.state.error.stack ? `\n${this.state.error.stack}` : ''}
              </pre>
            )}

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={this.handleReload}
                style={{
                  flex: 1,
                  minWidth: 160,
                  background: 'var(--brand-orange, #FF5E14)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 18px rgba(255, 94, 20, 0.4)',
                  transition: 'transform 0.15s ease, background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <RotateCcw size={17} />
                <span>إعادة تحميل الصفحة</span>
              </button>

              <button
                onClick={this.handleGoHome}
                style={{
                  flex: 1,
                  minWidth: 160,
                  background: 'rgba(255, 255, 255, 0.07)',
                  color: '#E5E7EB',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)')}
              >
                <Home size={17} />
                <span>الرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
