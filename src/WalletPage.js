import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import useTelegram from "./useTelegram";
import MenuComponent from "./MenuComponent";
import "./TasksPage.css";

const WalletPage = () => {
  const navigate = useNavigate();
  const tg = useTelegram();
  const [score, setScore] = useState(0);
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (tg) {
      tg.ready();
      const user = tg.initDataUnsafe.user;
      setUsername(user.username);
      console.log("Username:", user.username);
    }
  }, [tg]);

  useEffect(() => {
    if (username) {
      fetchScore();
    }
  }, [username]);

  const fetchScore = async () => {
    try {
      const response = await axios.get(`https://app.pooldegens.com/api/get_user_score?username=${username}`);
      setScore(response.data.score);
    } catch (error) {
      console.error("Error fetching score:", error);
    }
  };

  const onHOMEContainerClick = useCallback(() => {
    navigate("/home");
  }, [navigate]);

  const onEARNContainerClick = useCallback(() => {
    navigate("/earn");
  }, [navigate]);

  const onWALLETContainerClick = useCallback(() => {
    navigate("/wallet");
  }, [navigate]);

  const onFRENSContainerClick = useCallback(() => {
    navigate("/frens");
  }, [navigate]);

  return (
    <div className="tasks-page">
      <img className="background-icon2" alt="" src="/background@2x.png" />
      <div className="tasks-section">
        <div className="task">Wallet</div>
        <div className="earn-rewards-and">Coming Soon</div>
      </div>
      <div className="game-balance-section">
        <div className="game-balance-frame">
          <div className="frame-parent">
            <div className="frame-group">
              <div className="ellipse-parent">
                <img className="frame-child" alt="" src="/ellipse-1@2x.png" />
                <div className="start">{username}</div>
              </div>
              <img className="refresh-icon1" alt="" src="/refresh1.svg" />
            </div>
            <div className="frame-container">
              <div className="poold-01-1-group">
                <img
                  className="poold-01-1-icon2"
                  alt=""
                  src="/poold01-11@2x.png"
                />
                <div className="div1">{score}</div>
              </div>
              <b className="game-balance2">GAME BALANCE</b>
            </div>
          </div>
        </div>
        <img className="logo-icon2" alt="" src="/logo2@2x.png" />
      </div>
        <MenuComponent />
    </div>
  );
};

export default WalletPage;
