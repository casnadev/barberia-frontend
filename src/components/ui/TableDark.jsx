function TableDark({ headers = [], children }) {
  return (
    <div className="table-responsive">
      <table className="table-dark-pro">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>

        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export default TableDark;