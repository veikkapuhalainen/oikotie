// App.jsx
import { useEffect, useState } from 'react';
import apartmentsData from "./apartments.json"
import ApartmentCard from './components/ApartmentCard';
import Filters from './components/Filters';
import PaginationControls from './components/PaginationControls';
import './App.css';


const PAGE_SIZE = 50;

function App() {
  const [apartments, setApartments] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState('price');
  const [sortOrder, setSortOrder] = useState('asc');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedRooms, setSelectedRooms] = useState([]);

  useEffect(() => {
    setApartments(apartmentsData);
  }, []);

  const handleRefresh = async () => {
    const res = await fetch('http://localhost:3001/api/load-apartments', { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      const updated = await fetch('./apartments.json').then(res => res.json());
      setApartments(updated);
      setCurrentPage(1);
    }
  };

  if (!apartments) return <div className="p-4">Loading apartments...</div>;

  const filtered = apartments.filter(apt => {
    const price = parseFloat((apt.price || '').toString().replace(/[^\d.]/g, '')) || 0;
    const rooms = apt.rooms || 0;
    return (
      (!minPrice || price >= minPrice) &&
      (!maxPrice || price <= maxPrice) &&
      (selectedRooms.length === 0 || selectedRooms.includes(rooms))
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const aVal = parseFloat((a[sortKey] || '').toString().replace(/[^\d.]/g, ''));
    const bVal = parseFloat((b[sortKey] || '').toString().replace(/[^\d.]/g, ''));
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const start = (currentPage - 1) * PAGE_SIZE;
  const paged = sorted.slice(start, start + PAGE_SIZE);

  return (
    <div className="p-4 bg-blue-50 min-h-screen">
      <header className="app-header">
        <h1 className="app-title">🏠 Oikotie-Haku</h1>
        <div className="results-count"><span>{sorted.length}</span> asuntoa löydetty✅</div>
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
        selectedRooms={selectedRooms}
        setSelectedRooms={setSelectedRooms}
        handleRefresh={handleRefresh}
      />

      <PaginationControls 
        setPage={setCurrentPage}
        currentPage={currentPage}
        totalPages={totalPages}
      />

      <div className="apartment-grid responsive-grid">
        {paged.map((apt, i) => (
          <ApartmentCard key={i} apartment={apt} />
        ))}
      </div>

      <PaginationControls 
        setPage={setCurrentPage}
        currentPage={currentPage}
        totalPages={totalPages}
      />
    </div>
  );
}

export default App;