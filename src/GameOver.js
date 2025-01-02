import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import useTelegram from "./useTelegram";
import Home from "./components/Home";
import "./GameOver.css";

const GameOver = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
    // Get the score from the location state (passed from PoolTap component)
    const gameScore = location.state?.score || 0;
    setScore(gameScore);
  }, [location]);

  const onDAvatarsClick = useCallback(() => {
    navigate("/profile");
  }, [navigate]);

  const onRestartContainerClick = useCallback(() => {
    navigate("/pooltap");
  }, [navigate]);

  const onHomeButtonClick = useCallback(() => {
    navigate("/home");
  }, [navigate]);

  return (
    <div className="gameover">
      <img className="background-icon1" alt="" src="/background1@2x.png" />
      <div className="gameover-child" />
      <div className="coinholder1">
        <img className="coinholder-item" alt="" src="/group-19.svg" />
        <b className="b1">{score}</b>
        <img className="poold-01-2-icon" alt="" src="/poold01-1@2x.png" />
      </div>
      <div className="xpholder">
        <b className="b2">{score * 200}</b>
        <div className="xp">XP</div>
      </div>
      <img
        className="d-avatars-131"
        alt=""
        src="/3d-avatars--13@2x.png"
        onClick={onDAvatarsClick}
      />
      <div className="poold-balance">
        <div className="user">
          <div className="d-avatars-13-parent">
            <img
              className="d-avatars-132"
              alt=""
              src="/3d-avatars--131@2x.png"
              onClick={onDAvatarsClick}
            />
            <div className="username">{username}</div>
          </div>
        </div>
        <div className="game-balance">
          <div className="poold-01-1-parent">
            <img className="poold-01-1-icon1" alt="" src="/poold01-11@2x.png" />
            <div className="div">{score}</div>
          </div>
          <b className="game-balance1">GAME BALANCE</b>
        </div>
      </div>
      <img className="logo-icon1" alt="" src="/logo1@2x.png" />
      <img className="gameover-png-icon" alt="" src="/gameover-png@2x.png" />
      <Home />
      <div className="restart" onClick={onRestartContainerClick}>
        <b className="restart1">RESTART</b>
        <img className="refresh-icon" alt="" src="/refresh.svg" />
      </div>
      <img
        className="home-button-icon"
        alt=""
        src="/home-button.svg"
        onClick={onHomeButtonClick}
      />
    </div>
  );
};

export default GameOver;