import { useEffect, useState } from 'react';
import ApartmentCard from './components/ApartmentCard';
import Filters from './components/Filters';
import PaginationControls from './components/PaginationControls';
import Spinner from './components/Spinner';
import ErrorComponent from './components/ErrorComponent';
import './App.css';

const PAGE_SIZE = 50;

function App() {
  const [apartments, setApartments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState('price');
  const [sortOrder, setSortOrder] = useState('asc');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minSize, setMinSize] = useState('');
  const [maxSize, setMaxSize] = useState('');
  const [minPricePerSqm, setMinPricePerSqm] = useState('');
  const [maxPricePerSqm, setMaxPricePerSqm] = useState('');
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);

  // ✅ Refresh data only on full reload (e.g. F5)
  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      await fetch('http://localhost:3001/api/refresh', { method: 'POST' });
      setLoading(false);
    };
    fetchInitial();
  }, []); // Run only once when the app loads

  // ✅ Backend filtering + sorting + pagination
  useEffect(() => {
    const fetchApartments = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);

      if (minSize) params.append('minSize', minSize);
      if (maxSize) params.append('maxSize', maxSize);

      if (minPricePerSqm) params.append('minPricePerSqm', minPricePerSqm);
      if (maxPricePerSqm) params.append('maxPricePerSqm', maxPricePerSqm);

      if (selectedRooms.length > 0) params.append('rooms', selectedRooms.join(','));
      params.append('sort', sortKey);
      params.append('order', sortOrder);
      params.append('page', currentPage);
      params.append('pageSize', PAGE_SIZE);

      try {
        const res = await fetch(`http://localhost:3001/api/apartments?${params.toString()}`);
        const data = await res.json();
        setApartments(data.apartments);
        setTotalResults(data.total);
        setTotalPages(Math.ceil(data.total / PAGE_SIZE));
      } catch (err) {
        console.error('❌ Failed to fetch apartments:', err);
        setApartments([]);
      }
      setLoading(false);
    };

    fetchApartments();
  }, [minPrice, maxPrice, minSize, maxSize, minPricePerSqm, maxPricePerSqm, selectedRooms, sortKey, sortOrder, currentPage]);

   // 👇 Reset to first page on filter/sort changes only
  useEffect(() => {
    setCurrentPage(1);
  }, [minPrice, maxPrice, minSize, maxSize, minPricePerSqm, maxPricePerSqm, selectedRooms, sortKey, sortOrder]);

  const handleRefresh = async () => {
    setLoading(true);
    await fetch('http://localhost:3001/api/refresh', { method: 'POST' });
    setCurrentPage(1); // reset page
    setLoading(false);
  };


  return (
    <div className="p-4 bg-blue-50 min-h-screen">
      <header className="app-header">
        <h1 className="app-title">🏠 Oikotie-Haku</h1>
        <div className="results-count">
          <span>{loading ? "..." : totalResults}</span> asuntoa löytyi✅
        </div>
      </header>

      <Filters
        sortKey={sortKey}
        setSortKey={setSortKey}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
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
        handleRefresh={handleRefresh}
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
