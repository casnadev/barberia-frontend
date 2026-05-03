export default function AvatarCircle({
  src,
  alt = "Imagen",
  fallback = "✂",
  selected = false,
  size = "md",
}) {
  const className = `avatar-circle ${size} ${selected ? "selected" : ""}`;

  if (src) {
    return <img src={src} alt={alt} className={className} />;
  }

  return (
    <div className={`avatar-placeholder ${size} ${selected ? "selected" : ""}`}>
      {fallback}
    </div>
  );
}