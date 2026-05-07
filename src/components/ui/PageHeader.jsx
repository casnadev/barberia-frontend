function PageHeader({ title, subtitle }) {
  return (
    <div className="header-dashboard">
      <div className="header-text">
        <h1 className="page-title">{title}</h1>

        {subtitle && (
          <p className="page-subtitle">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

export default PageHeader;