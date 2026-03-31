function CardDark({ children, className = "", style = {} }) {
  return (
    <div
      className={`card-dark p-4 ${className}`}
      style={{
        transition: "transform 0.45s ease, box-shadow 0.45s ease, border 0.45s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default CardDark;