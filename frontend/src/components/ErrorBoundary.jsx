import React from 'react';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('💥 [React Error Boundary] Excepción capturada:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-card" style={{
          padding: '40px 24px',
          textAlign: 'center',
          margin: '24px auto',
          maxWidth: '650px',
          borderRadius: 'var(--border-radius-lg)',
          backgroundColor: 'rgba(26, 26, 26, 0.95)',
          border: '1px solid rgba(230, 57, 70, 0.3)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
        }}>
          <div style={{
            display: 'inline-flex',
            padding: '16px',
            borderRadius: '50%',
            backgroundColor: 'rgba(230, 57, 70, 0.15)',
            color: 'var(--danger)',
            marginBottom: '20px'
          }}>
            <ShieldAlert size={48} />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Inconveniente Inesperado en este Módulo
          </h2>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 20px auto', lineHeight: '1.6' }}>
            Ocurrió un evento no contemplado al procesar la vista. La aplicación continuará funcionando en los demás módulos.
          </p>

          <button 
            onClick={this.handleReset}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontWeight: 700 }}
          >
            <RefreshCw size={16} /> Reintentar Vista
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
