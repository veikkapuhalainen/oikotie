import '../App.css';
import "./Filters.css";

export default function Filters({
  sortKey,
  setSortKey,
  sortOrder,
  setSortOrder,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  selectedRooms,
  setSelectedRooms,
  handleRefresh
}) {
  return (
    <div className="filter-container">
      <div className="filter-container-header">⚙️ Suodata & Järjestä</div>
      <div className="filters">
        <select value={sortKey} onChange={e => setSortKey(e.target.value)} className="sort-selector">
          <option value="price">Hinta: Pieni-Suuri</option>
          <option value="pricePerSqm">Neliöhinta</option>
          <option value="size">Koko</option>
          <option value="rooms">Huoneita</option>
          <option value="year">Vuosi</option>
          <option value="visits">Käyntejä</option>
        </select>
        <input type="number" placeholder="Min Hinta (€)" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="price-selector" />
        <input type="number" placeholder="Max Hinta (€)" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="price-selector" />
        <div className="room-selector">
          {[1,2,3,4,5,6].map(n => (
            <label key={n} className="room-nro">
              <input
                type="checkbox"
                checked={selectedRooms.includes(n)}
                onChange={() =>
                  setSelectedRooms(prev =>
                    prev.includes(n) ? prev.filter(r => r !== n) : [...prev, n]
                  )
                }
              /> {n}
            </label>
          ))}
        </div>
        <div className="refresh-reset-container">
          <button onClick={handleRefresh} className="refresh-btn">🔄 Lataa asunnot</button>
          <button onClick={() => {
            setMinPrice('');
            setMaxPrice('');
            setSelectedRooms([]);
          }} className="reset-btn">Palauta suodattimet</button>
        </div>
      </div>
    </div>
  );
}
