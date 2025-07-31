import "./PaginationControls.css";

const PaginationControls = ({
    setPage,
    currentPage,
    totalPages
}) => (
    <div className="page-change-container">
      <button
        disabled={currentPage === 1}
        onClick={() => setPage((p) => p - 1)}
        className="page-button"
      >
        Edellinen
      </button>
      <span className="page-info">
        Sivu {currentPage} / {totalPages}
      </span>
      <button
        disabled={currentPage === totalPages}
        onClick={() => setPage((p) => p + 1)}
        className="page-button"
      >
        Seuraava
      </button>
    </div>
  );

  export default PaginationControls;