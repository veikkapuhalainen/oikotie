import { useEffect, useState } from 'react';
import ApartmentCard from './components/ApartmentCard.jsx';
import Filters from './components/Filters.jsx';
import PaginationControls from './components/PaginationControls.jsx';
import Spinner from './components/Spinner.jsx';
import './App.css';

const PAGE_SIZE = 50;

// default filters
const DEFAULTS = {
  sortKey: 'published_sort_desc',
  minPrice: '',
  maxPrice: '',
  minSize: '',
  maxSize: '',
  minPricePerSqm: '',
  maxPricePerSqm: '',
  rooms: [],
  conditions: [],
};

function App() {
  const [apartments, setApartments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState('published_sort_desc');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minSize, setMinSize] = useState('');
  const [maxSize, setMaxSize] = useState('');
  const [minPricePerSqm, setMinPricePerSqm] = useState('');
  const [maxPricePerSqm, setMaxPricePerSqm] = useState('');
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0); // filtered/correct total
  const [loading, setLoading] = useState(false);

  const [applied, setApplied] = useState({ ...DEFAULTS });


  // ✅ Backend filtering + sorting + pagination
  const fetchApartments = async () => {
    if (!applied) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (applied.minPrice) params.append('minPrice', applied.minPrice);
    if (applied.maxPrice) params.append('maxPrice', applied.maxPrice);

    if (applied.minSize) params.append('minSize', applied.minSize);
    if (applied.maxSize) params.append('maxSize', applied.maxSize);

    if (applied.minPricePerSqm) params.append('minPricePerSqm', applied.minPricePerSqm);
    if (applied.maxPricePerSqm) params.append('maxPricePerSqm', applied.maxPricePerSqm);

    if (applied.rooms?.length) params.append('rooms', applied.rooms.join(','));
    if (applied.conditions?.length) params.append('conditions', applied.conditions.join(','));

    params.append('sort', applied.sortKey);
    params.append('page', currentPage);
    params.append('pageSize', PAGE_SIZE);

    try {
      const res = await fetch(`/api/apartments?${params.toString()}`);
      const data = await res.json();
      setApartments(data.apartments || []);
      setTotalResults(data.total || 0);
      setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
    } catch (err) {
      console.error('❌ Failed to fetch apartments:', err);
      setApartments([]);
      setTotalResults(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch on first load (applied is initialized) + whenever applied snapshot or page changes
  useEffect(() => {
    fetchApartments();
  }, [applied, currentPage]);

  // ♻️ Nollaa suodattimet: reset drafts only (no fetch until Haku)
  const handleClearFilters = () => {
    setSortKey(DEFAULTS.sortKey);
    setMinPrice(DEFAULTS.minPrice);
    setMaxPrice(DEFAULTS.maxPrice);
    setMinSize(DEFAULTS.minSize);
    setMaxSize(DEFAULTS.maxSize);
    setMinPricePerSqm(DEFAULTS.minPricePerSqm);
    setMaxPricePerSqm(DEFAULTS.maxPricePerSqm);
    setSelectedRooms(DEFAULTS.rooms);
    setSelectedConditions(DEFAULTS.conditions);
    setCurrentPage(1);
    
    setApplied({ ...DEFAULTS });
  };


  return (
    <div className="p-4 bg-blue-50 min-h-screen">
      <header className="app-header">
        <h1 className="app-title">🏠 Oikotie-Haku</h1>
        <div className="results-count">
          <span>{loading ? "..." : totalResults}</span> asuntoa löytyi {totalResults === 0 ? '❌' : '✅'}
        </div>
      </header>

      <Filters
        sortKey={sortKey}
        setSortKey={setSortKey}
        minPrice={minPrice}
        setMinPrice={setMinPrice}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
        minSize={minSize}
        setMinSize={setMinSize}
        maxSize={maxSize}
        setMaxSize={setMaxSize}
        minPricePerSqm={minPricePerSqm}
        setMinPricePerSqm={setMinPricePerSqm}
        maxPricePerSqm={maxPricePerSqm}
        setMaxPricePerSqm={setMaxPricePerSqm}
        selectedRooms={selectedRooms}
        setSelectedRooms={setSelectedRooms}
        selectedConditions={selectedConditions}
        setSelectedConditions={setSelectedConditions}
        
        onSearch={handleSearch}
        onClear={handleClearFilters}
      />

      <PaginationControls
        setPage={setCurrentPage}
        currentPage={totalPages === 0 ? 0 : currentPage}
        totalPages={totalPages}
      />

      {loading ? (
        <Spinner />
      ) : (
        <div className="apartment-grid responsive-grid">
          {apartments.map((apt, i) => (
            <ApartmentCard key={i} apartment={apt} />
          ))}
        </div>
      )}

      <PaginationControls
        setPage={setCurrentPage}
        currentPage={totalPages === 0 ? 0 : currentPage}
        totalPages={totalPages}
      />
    </div>
  );
}

export default App;
