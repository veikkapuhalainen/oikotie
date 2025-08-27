import '../App.css';
import "./Filters.css";

export default function Filters({
  sortKey,
  setSortKey,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  minSize,
  setMinSize,
  maxSize,
  setMaxSize,
  minPricePerSqm,
  setMinPricePerSqm,
  maxPricePerSqm,
  setMaxPricePerSqm,
  selectedRooms,
  setSelectedRooms,
  selectedConditions,
  setSelectedConditions,
  onSearch, 
  onClear, 
}) {

  // Condition values that are supprted by Oikotie
  const CONDITION_OPTIONS = [
    { label: 'Uusi', value: 32 },
    { label: 'Hyvä', value: 2 },
    { label: 'Tyydyttävä', value: 4 },
    { label: 'Välttävä', value: 8 },
  ];

  return (
    <div className="filter-container">
      <div className="filter-container-header">⚙️ Suodata & Järjestä</div>
      <div className="filters">
        <select
          value={sortKey}
          onChange={e => setSortKey(e.target.value)}
          className="sort-selector"
        >
          <option value="published_sort_desc">Uusin ilmoitus ensin</option>
          <option value="published_sort_asc">Vanhin ilmoitus ensin</option>
          <option value="price_asc">Halvin ilmoitus ensin</option>
          <option value="price_desc">Kallein ilmoitus ensin</option>
          <option value="size_asc">Pienin ilmoitus ensin</option>
          <option value="size_desc">Suurin ilmoitus ensin</option>
          <option value="popularity_week_desc">Suosituin ilmoitus ensin</option>
        </select>


        <input type="number" placeholder="Min Hinta (€)" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="price-selector" />
        <input type="number" placeholder="Max Hinta (€)" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="price-selector" />

        <input type="number" placeholder="Min Koko (m²)" value={minSize} onChange={e => setMinSize(e.target.value)} className="size-selector" />
        <input type="number" placeholder="Max Koko (m²)" value={maxSize} onChange={e => setMaxSize(e.target.value)} className="size-selector" />

        <input type="number" placeholder="Min Neliöhinta (€/m²)" value={minPricePerSqm} onChange={e => setMinPricePerSqm(e.target.value)} className="size-selector" />
        <input type="number" placeholder="Max Neliöhinta (€/m²)" value={maxPricePerSqm} onChange={e => setMaxPricePerSqm(e.target.value)} className="size-selector" />

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

        <div className="condition-selector">
          <p>Kunto</p>
          {CONDITION_OPTIONS.map(opt => (
            <label key={opt.value} className="condition-item">
              <input
                type="checkbox"
                checked={selectedConditions.includes(opt.value)}
                onChange={() =>
                  setSelectedConditions(prev =>
                    prev.includes(opt.value)
                      ? prev.filter(v => v !== opt.value)
                      : [...prev, opt.value]
                  )
                }
              />{' '}
            {opt.label}
          </label>
        ))}
        </div>

        <div className="refresh-reset-container">
          <button onClick={onSearch} className="search-btn">🔎 Haku</button>
          <button onClick={onClear} className="reset-btn">🗑️ Nollaa suodattimet</button>
        </div>
      </div>
    </div>
    
  );
}
