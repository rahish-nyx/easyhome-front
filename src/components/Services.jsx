export default function Services({ data, onSelect }) {
  return (
    <>
      <h3 className="section-title">Select Services</h3>

      <div className="services">
        {data.map((s, i) => (
          <div key={i} className="service-card" onClick={onSelect}>
            <span>{s.icon}</span>
            <p>{s.name}</p>
          </div>
        ))}
      </div>
    </>
  );
}
