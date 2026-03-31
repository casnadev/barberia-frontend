function PageHeader({ title, subtitle }) {
  return (
    <div className="topbar-dark px-4 py-4">
      <div className="container-fluid">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}

export default PageHeader;