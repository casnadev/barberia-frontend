import LogoAnimado from "./LogoAnimado";

function PageHeader({ title, subtitle }) {
  return (
    <div className="header-dashboard">
      
      {/* LOGO GRANDE */}
      <div className="header-logo">
        <LogoAnimado />
      </div>

      {/* TEXTO */}
      <div className="header-text">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>

    </div>
  );
}

export default PageHeader;