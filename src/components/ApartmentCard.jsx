import './ApartmentCard.css';

function ApartmentCard({ apartment }) {
  const {
    url,
    image,
    address,
    district,
    city,
    roomConfiguration,
    size,
    rooms,
    year,
    price,
    pricePerSqm,
    visits,
    visitsWeekly,
    description
  } = apartment;

  return (
    <a href={url} target="_blank" rel="noreferrer" className="apartment-card">
      <img src={image || '/placeholder.jpg'} alt="Apartment" className="apartment-image" />
      <div className="apartment-content">
        <h2 className="apartment-title">{address}</h2>
        <p className="apartment-location">{district}, {city}</p>
        <p className="apartment-description">{description}</p>
        <div className="apartment-info">
          <span>{roomConfiguration}</span>
          <span>{size}</span>
          <span>{rooms} huonetta</span>
          <span>Rakennettu {year}</span>
        </div>
        <div className="apartment-price">
          <strong>{price}</strong>
          {pricePerSqm && <div>{pricePerSqm} €/m²</div>}
        </div>
        <div className="apartment-visits">yht {visits} katselukertaa / {visitsWeekly} tällä viikolla</div>
      </div>
    </a>
  );
}

export default ApartmentCard;
