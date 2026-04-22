import React from "react";

export default function Layout({ title = "TallyBackup Pro", actions = null, children }) {
  return (
    <div className="container">
      <header className="card card-header">
        <h1>{title}</h1>
        {actions ? <div className="flex gap-2">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}

