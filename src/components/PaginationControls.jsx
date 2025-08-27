import "./PaginationControls.css";

const PaginationControls = ({ setPage, currentPage, totalPages }) => (
  <>
    <div className="page-change-container">
      <button
        disabled={currentPage === 1 || totalPages === 0}
        onClick={() => setPage((p) => p - 1)}
        className="page-button"
      >
        Edellinen
      </button>

      <span className="page-info">
        Sivu {currentPage} / {totalPages}
      </span>
      
      <button
        disabled={currentPage === totalPages || totalPages === 0}
        onClick={() => setPage((p) => p + 1)}
        className="page-button"
      >
        Seuraava
      </button>
    </div>

    <div className="to-home-page-container">
      <button
        disabled={currentPage === 1 || totalPages === 0}
        onClick={() => setPage(1)}
        className={
          currentPage === 1 || totalPages === 0
            ? "hide-button"
            : "to-home-page-button"
        }
      >
        Etusivulle
      </button>
    </div>
  </>
);

export default PaginationControls;
