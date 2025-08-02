import './Spinner.css';

export default function Spinner() {
  return (
    <div className='spinner-text'>
      <span>Ladataan asuntoja...</span>
      <div className="spinner" />
    </div>
  )
}
