import React from "react";
import { useNavigate } from "react-router-dom";
import "./MenuComponent.css";

const MenuComponent = () => {
  const navigate = useNavigate();

  return (
    <div className="menu-component">
      <div className="menu-item" onClick={() => navigate("/home")}>
        <img src="/homeoutline.png" alt="Home" className="menu-icon" />
        <span className="menu-text">Home</span>
      </div>
      <div className="menu-item" onClick={() => navigate("/earn")}>
        <img src="/payments.png" alt="Earn" className="menu-icon" />
        <span className="menu-text">Earn</span>
      </div>
      <div className="menu-item" onClick={() => navigate("/wallet")}>
        <img src="/wallet3line.png" alt="Wallet" className="menu-icon" />
        <span className="menu-text">Wallet</span>
      </div>
      <div className="menu-item" onClick={() => navigate("/frens")}>
        <img src="/usergroupoutline.png" alt="Frens" className="menu-icon" />
        <span className="menu-text">Frens</span>
      </div>
    </div>
  );
};

export default MenuComponent;