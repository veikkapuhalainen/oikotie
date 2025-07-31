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
  handleRefresh,
}) {
  return (
    <div className="filter-container">
      <div className="filter-container-header">⚙️ Suodata & Järjestä</div>
      <div className="filters">
        <select
          value={`${sortKey}_${sortOrder}`}
          onChange={e => {
            const [key, order] = e.target.value.split('_');
            setSortKey(key);
            setSortOrder(order);
          }}
          className="sort-selector"
        >
          <option value="price_asc">Hinta: Pieni-Suuri</option>
          <option value="price_desc">Hinta: Suuri-Pieni</option>
          <option value="pricePerSqm_asc">Neliöhinta: Pieni-Suuri</option>
          <option value="pricePerSqm_desc">Neliöhinta: Suuri-Pieni</option>
          <option value="size_asc">Koko: Pieni-Suuri</option>
          <option value="size_desc">Koko: Suuri-Pieni</option>
          <option value="rooms_asc">Huoneita: Vähän-Enemmän</option>
          <option value="rooms_desc">Huoneita: Enemmän-Vähemmän</option>
          <option value="year_asc">Vuosi: Vanhin-Uusin</option>
          <option value="year_desc">Vuosi: Uusin-Vanhin</option>
          <option value="visits_asc">Käyntejä: Vähän-Paljon</option>
          <option value="visits_desc">Käyntejä: Paljon-Vähän</option>
        </select>


        <input type="number" placeholder="Min Hinta (€)" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="price-selector" />
        <input type="number" placeholder="Max Hinta (€)" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="price-selector" />

        <div className="room-selector">
          <p>Huoneita</p>
          {[1, 2, 3, 4, 5, 6].map(n => (
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
            setSortKey('price');
            setSortOrder('asc');
          }} className="reset-btn">Palauta suodattimet</button>
        </div>
      </div>
    </div>
  );
}
