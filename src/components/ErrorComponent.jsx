import './ErrorComponent.css';

const ErrorComponent = ({ message = 'Asuntojen lataus epäonnistui. Yritä uudestaan.' }) => {
  return (
    <div className="error-container">
      <h2 className="error-title">Error</h2>
      <p className="error-message">{message}</p>
    </div>
  );
};

export default ErrorComponent;
